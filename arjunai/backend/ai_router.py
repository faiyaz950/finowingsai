import os
import re
import base64
import logging
from typing import Generator, Optional, List
from google import genai
from google.genai import types as genai_types
from openai import OpenAI
import anthropic
from dotenv import load_dotenv
from system_prompt import get_arjunai_prompt
from market_data import build_market_context, is_market_news_question
from grounding import needs_google_search, extract_grounding_sources, extract_search_queries

load_dotenv()

CRYPTO_KEYWORDS = {
    "bitcoin", "btc", "ethereum", "eth", "crypto", "cryptocurrency", "altcoin",
    "defi", "nft", "blockchain", "solana", "sol", "bnb", "xrp", "ripple",
    "cardano", "ada", "polygon", "matic", "doge", "shib", "web3", "token",
    "staking", "yield", "wallet", "coinmarketcap", "wazirx", "coindcx",
    "halving", "dominance", "memecoin", "usdt", "usdc", "stablecoin",
}

MF_KEYWORDS = {
    "mutual fund", "sip", "nav", "elss", "index fund", "nfo", "amc",
    "large cap", "mid cap", "small cap", "flexi cap", "debt fund",
    "liquid fund", "hybrid fund", "expense ratio", "sharpe", "sortino",
    "sbi mf", "hdfc mf", "mirae", "parag parikh", "quant mf", "nippon",
    "stp", "swp", "idcw", "growth plan", "direct plan", "regular plan",
    "lumpsum", "corpus", "cagr", "xirr",
}

STOCK_KEYWORDS = {
    "nse", "bse", "nifty", "sensex", "stock", "share", "equity",
    "ipo", "p/e", "pe ratio", "roe", "roce", "eps", "market cap",
    "fii", "dii", "bulk deal", "block deal", "f&o", "futures", "options",
    "put", "call", "oi", "open interest", "dividend", "buyback", "bonus",
    "technical analysis", "support", "resistance", "rsi", "macd", "ema", "sma",
    "reliance", "tcs", "infosys", "hdfc", "icici", "sbi", "wipro", "adani",
    "tata", "bajaj", "kotak", "maruti", "hul", "itc", "axis bank",
}

COMMODITY_KEYWORDS = {
    "gold", "silver", "crude", "oil", "mcx", "commodity", "ncdex",
    "sgb", "sovereign gold", "gold etf", "copper", "zinc", "natural gas",
}

GEMINI_DEFAULT_MODEL = "gemini-3.6-flash"
GEMINI_FALLBACK_MODELS = ("gemini-flash-latest", "gemini-3.5-flash")

MODEL_NAMES = {
    "gemini": "Gemini 3.6 Flash + Search",
    "grok": "Grok 3 Fast",
    "groq": "Groq Llama 3.3",
    "openai": "GPT-4o Mini",
    "claude": "Claude Haiku 4.5",
}

MODEL_DESCRIPTIONS = {
    "auto": "Pehle Gemini, fail hone par backup model",
    "gemini": "Google Search grounding + image/file support",
    "grok": "xAI — fast general answers",
    "groq": "Free tier friendly, fast responses",
    "openai": "OpenAI GPT — strong reasoning + image vision",
    "claude": "Pro users ke liye — detailed analysis",
}

VALID_MODEL_IDS = {"auto", "gemini", "grok", "groq", "openai", "claude"}
VISION_MODEL_IDS = {"auto", "gemini", "openai"}


def _pretty_gemini_name(model_id: str, grounded: bool = False) -> str:
    raw = (model_id or GEMINI_DEFAULT_MODEL).replace("models/", "").strip()
    parts = raw.split("-")
    if parts and parts[0].lower() == "gemini":
        rest = []
        for part in parts[1:]:
            if part.isalpha():
                rest.append(part.capitalize())
            else:
                rest.append(part)
        name = "Gemini " + " ".join(rest)
    else:
        name = raw
    if grounded and "+ Search" not in name:
        name += " + Search"
    return name


def _extract_gemini_text(response) -> str:
    """Read visible text parts and skip thought / thought_signature chunks."""
    if not response:
        return ""
    texts = []
    for cand in getattr(response, "candidates", None) or []:
        content = getattr(cand, "content", None)
        for part in getattr(content, "parts", None) or []:
            if getattr(part, "thought", False):
                continue
            text = getattr(part, "text", None)
            if text:
                texts.append(text)
    if texts:
        return "".join(texts)
    try:
        return getattr(response, "text", None) or ""
    except Exception:
        return ""


def _kw_matches(kw: str, q: str) -> bool:
    """Word-boundary match for single words; substring for multi-word phrases."""
    if " " in kw:
        return kw in q
    return bool(re.search(r"\b" + re.escape(kw) + r"\b", q))


def detect_topic(question: str) -> str:
    q = question.lower()
    scores = {"crypto": 0, "mutual_fund": 0, "stock": 0, "commodity": 0}
    for kw in CRYPTO_KEYWORDS:
        if _kw_matches(kw, q):
            scores["crypto"] += 1
    for kw in MF_KEYWORDS:
        if _kw_matches(kw, q):
            scores["mutual_fund"] += 1
    for kw in STOCK_KEYWORDS:
        if _kw_matches(kw, q):
            scores["stock"] += 1
    for kw in COMMODITY_KEYWORDS:
        if _kw_matches(kw, q):
            scores["commodity"] += 1
    best = max(scores, key=lambda k: scores[k])
    return best if scores[best] > 0 else "general"


class ArjunAI:
    def __init__(self):
        gemini_key = os.getenv("GEMINI_API_KEY")
        self.gemini_client = genai.Client(api_key=gemini_key) if gemini_key else None
        self.gemini_model = (os.getenv("GEMINI_MODEL") or GEMINI_DEFAULT_MODEL).strip() or GEMINI_DEFAULT_MODEL
        self.gemini_model_ids = [self.gemini_model]
        for fallback in GEMINI_FALLBACK_MODELS:
            if fallback not in self.gemini_model_ids:
                self.gemini_model_ids.append(fallback)

        grok_key = os.getenv("GROK_API_KEY")
        self.grok = OpenAI(api_key=grok_key, base_url="https://api.x.ai/v1") if grok_key else None

        groq_key = os.getenv("GROQ_API_KEY")
        self.groq = OpenAI(api_key=groq_key, base_url="https://api.groq.com/openai/v1") if groq_key else None

        openai_key = os.getenv("OPENAI_API_KEY")
        self.openai = OpenAI(api_key=openai_key) if openai_key else None
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

        claude_key = os.getenv("CLAUDE_API_KEY")
        self.claude = anthropic.Anthropic(api_key=claude_key) if claude_key else None

    def _openai_label(self) -> str:
        labels = {
            "gpt-4o-mini": "GPT-4o Mini",
            "gpt-4o": "GPT-4o",
            "gpt-4.1-mini": "GPT-4.1 Mini",
            "gpt-4.1": "GPT-4.1",
        }
        return labels.get(self.openai_model, f"OpenAI ({self.openai_model})")

    def _friendly_agent_error(self, agent_name: str, err: str) -> Optional[str]:
        err_lower = err.lower()
        if agent_name == "openai" and ("insufficient_quota" in err_lower or "exceeded your current quota" in err_lower):
            return (
                "⚠️ **OpenAI account mein balance/quota nahi hai.**\n\n"
                "[platform.openai.com](https://platform.openai.com/settings/organization/billing) par jao → "
                "**Billing** → payment method add karo (minimum $5 credit).\n\n"
                "Tab tak model selector se **Groq Llama 3.3** choose karein — wo free hai."
            )
        if agent_name == "openai" and ("invalid_api_key" in err_lower or "incorrect api key" in err_lower):
            return "⚠️ **OpenAI API key galat hai.** `.env` file mein `OPENAI_API_KEY` check karein."
        if agent_name == "gemini" and ("429" in err or "resource_exhausted" in err_lower):
            return (
                "⚠️ **Gemini API quota/rate limit hit ho gayi.** "
                "Thodi der baad try karein, ya model selector se **Groq** choose karein."
            )
        if agent_name == "gemini" and ("404" in err or "not_found" in err_lower):
            return (
                "⚠️ **Gemini model available nahi hai.** "
                f"`.env` mein `GEMINI_MODEL={GEMINI_DEFAULT_MODEL}` set karke backend restart karein."
            )
        if agent_name == "openai" and "429" in err:
            return (
                "⚠️ **OpenAI rate limit hit ho gayi.** Thodi der baad try karein, "
                "ya **Groq** model use karein."
            )
        return None

    def _is_configured(self, agent: str) -> bool:
        return {
            "gemini": bool(self.gemini_client),
            "grok": bool(self.grok),
            "groq": bool(self.groq),
            "openai": bool(self.openai),
            "claude": bool(self.claude),
        }.get(agent, False)

    def get_available_models(self, user_type: str = "free") -> list[dict]:
        models = [{
            "id": "auto",
            "label": "Auto (Smart)",
            "description": MODEL_DESCRIPTIONS["auto"],
            "available": True,
        }]
        for agent_id in ("gemini", "openai", "grok", "groq"):
            if self._is_configured(agent_id):
                if agent_id == "openai":
                    label = self._openai_label()
                elif agent_id == "gemini":
                    label = _pretty_gemini_name(self.gemini_model, grounded=True)
                else:
                    label = MODEL_NAMES[agent_id]
                models.append({
                    "id": agent_id,
                    "label": label,
                    "description": MODEL_DESCRIPTIONS[agent_id],
                    "available": True,
                })
        if user_type == "pro" and self._is_configured("claude"):
            models.append({
                "id": "claude",
                "label": MODEL_NAMES["claude"],
                "description": MODEL_DESCRIPTIONS["claude"],
                "available": True,
                "pro_only": True,
            })
        return models

    def _build_agent_list(self, preferred_model: Optional[str], user_type: str, streaming: bool) -> list:
        fallback_order = ["gemini", "openai", "grok", "groq"]
        if user_type == "pro":
            fallback_order.append("claude")

        prefix = "_stream_" if streaming else "_try_"
        method_map = {name: getattr(self, prefix + name) for name in fallback_order}

        model = (preferred_model or "auto").strip().lower()
        if model not in VALID_MODEL_IDS:
            model = "auto"

        if model == "claude" and user_type != "pro":
            return []

        if model == "auto":
            return [(n, method_map[n]) for n in fallback_order if self._is_configured(n)]

        if not self._is_configured(model):
            return []
        return [(model, method_map[model])]

    def _build_messages(self, question: str, history: list) -> list:
        messages = []
        for msg in history[-12:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": question})
        return messages

    def _build_openai_messages(
        self,
        question: str,
        history: list,
        portfolio_context: Optional[str] = None,
        market_context: Optional[str] = None,
        file_data: Optional[List[dict]] = None,
    ) -> list:
        messages = [{"role": "system", "content": get_arjunai_prompt(portfolio_context, market_context)}]
        for msg in history[-12:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})

        if file_data:
            parts: list = []
            for fd in file_data:
                if fd.get("is_image"):
                    parts.append({
                        "type": "image_url",
                        "image_url": {"url": f"data:{fd['mime_type']};base64,{fd['data']}"},
                    })
                elif fd["mime_type"] in ("text/plain", "text/csv"):
                    text_content = base64.b64decode(fd["data"]).decode("utf-8", errors="ignore")
                    parts.append({
                        "type": "text",
                        "text": f"[File: {fd['name']}]\n```\n{text_content[:10000]}\n```",
                    })
                else:
                    parts.append({
                        "type": "text",
                        "text": f"[Attached: {fd['name']} — PDF ke liye Gemini model best hai]",
                    })
            parts.append({"type": "text", "text": question})
            messages.append({"role": "user", "content": parts})
        else:
            messages.append({"role": "user", "content": question})
        return messages

    def _build_gemini_contents(self, question: str, history: list, file_data: Optional[List[dict]] = None) -> list:
        contents = []
        for msg in history[-12:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if content:
                gemini_role = "user" if role == "user" else "model"
                contents.append(genai_types.Content(
                    role=gemini_role,
                    parts=[genai_types.Part(text=content)],
                ))
        
        # Build parts for current message
        parts = []
        
        # Add images/files first
        if file_data:
            for fd in file_data:
                if fd.get("is_image"):
                    # Add image as inline data
                    parts.append(genai_types.Part(
                        inline_data=genai_types.Blob(
                            mime_type=fd["mime_type"],
                            data=base64.b64decode(fd["data"]),
                        )
                    ))
                else:
                    # For text files (pdf, txt, csv), extract text and add as context
                    try:
                        if fd["mime_type"] == "text/plain" or fd["mime_type"] == "text/csv":
                            text_content = base64.b64decode(fd["data"]).decode("utf-8", errors="ignore")
                            parts.append(genai_types.Part(
                                text=f"[File: {fd['name']}]\n```\n{text_content[:10000]}\n```\n"
                            ))
                        elif fd["mime_type"] == "application/pdf":
                            # PDF needs special handling - add as inline data for Gemini
                            parts.append(genai_types.Part(
                                inline_data=genai_types.Blob(
                                    mime_type=fd["mime_type"],
                                    data=base64.b64decode(fd["data"]),
                                )
                            ))
                    except Exception:
                        pass
        
        # Add the question text
        parts.append(genai_types.Part(text=question))
        
        contents.append(genai_types.Content(role="user", parts=parts))
        return contents

    def _gemini_config(self, portfolio_context: Optional[str], market_context: Optional[str], question: str, enable_search: bool = False):
        search_note = ""
        tools = None
        if enable_search:
            search_note = (
                "\n\n🔍 GOOGLE SEARCH REQUIRED: Is sawaal ke liye pehle Google Search chalao — "
                "latest news, IPO, NAV, RBI policy, earnings ya aaj ki market updates fetch karo. "
                "Kam se kam 6-8 detailed points ke saath poora jawab do — kabhi beech mein mat ruko."
            )
            tools = [genai_types.Tool(google_search=genai_types.GoogleSearch())]
        kwargs = {
            "system_instruction": get_arjunai_prompt(portfolio_context, market_context) + search_note,
            "max_output_tokens": 8192,
            "thinking_config": genai_types.ThinkingConfig(thinking_budget=1024),
        }
        if tools:
            kwargs["tools"] = tools
        return genai_types.GenerateContentConfig(**kwargs)

    def _gemini_meta(self, response) -> dict:
        sources = extract_grounding_sources(response)
        queries = extract_search_queries(response)
        return {"sources": sources, "search_queries": queries, "grounded": bool(sources or queries)}

    def _gemini_should_retry_without_search(self, err: str) -> bool:
        lower = err.lower()
        return (
            "429" in err
            or "resource_exhausted" in lower
            or "empty gemini response" in lower
        )

    def _gemini_is_missing_model(self, err: str) -> bool:
        lower = err.lower()
        return "404" in err or "not_found" in lower or "no longer available" in lower

    # ── Non-streaming (fallback / cache path) ────────────────────────────────

    def _try_gemini(self, question: str, history: list, portfolio_context: Optional[str] = None, market_context: Optional[str] = None, file_data: Optional[List[dict]] = None):
        if not self.gemini_client:
            raise Exception("Gemini not configured")

        want_search = needs_google_search(question)
        last_err: Optional[Exception] = None
        for model_id in self.gemini_model_ids:
            for enable_search in ([True, False] if want_search else [False]):
                try:
                    response = self.gemini_client.models.generate_content(
                        model=model_id,
                        contents=self._build_gemini_contents(question, history, file_data),
                        config=self._gemini_config(portfolio_context, market_context, question, enable_search),
                    )
                    text = _extract_gemini_text(response)
                    if not text.strip():
                        raise Exception("Empty Gemini response")
                    meta = self._gemini_meta(response)
                    meta["model_id"] = model_id
                    return text, _pretty_gemini_name(model_id, bool(meta.get("grounded"))), meta
                except Exception as e:
                    last_err = e
                    err = str(e)
                    logging.warning("Gemini %s search=%s failed: %s", model_id, enable_search, err[:300])
                    if enable_search and self._gemini_should_retry_without_search(err):
                        continue
                    if self._gemini_is_missing_model(err):
                        break
                    raise
        raise last_err or Exception("Gemini request failed")

    def _try_grok(self, question: str, history: list, portfolio_context: Optional[str] = None):
        if not self.grok:
            raise Exception("Grok not configured")
        messages = [{"role": "system", "content": get_arjunai_prompt(portfolio_context)}]
        messages.extend(self._build_messages(question, history))
        response = self.grok.chat.completions.create(
            model="grok-3-fast", messages=messages, max_tokens=4096,
        )
        return response.choices[0].message.content, MODEL_NAMES["grok"]

    def _try_groq(self, question: str, history: list, portfolio_context: Optional[str] = None):
        if not self.groq:
            raise Exception("Groq not configured")
        messages = [{"role": "system", "content": get_arjunai_prompt(portfolio_context)}]
        messages.extend(self._build_messages(question, history))
        response = self.groq.chat.completions.create(
            model="llama-3.3-70b-versatile", messages=messages, max_tokens=4096,
        )
        return response.choices[0].message.content, MODEL_NAMES["groq"]

    def _try_openai(
        self,
        question: str,
        history: list,
        portfolio_context: Optional[str] = None,
        market_context: Optional[str] = None,
        file_data: Optional[List[dict]] = None,
    ):
        if not self.openai:
            raise Exception("OpenAI not configured")
        messages = self._build_openai_messages(
            question, history, portfolio_context, market_context, file_data
        )
        response = self.openai.chat.completions.create(
            model=self.openai_model,
            messages=messages,
            max_tokens=4096,
        )
        text = response.choices[0].message.content or ""
        if not text.strip():
            raise Exception("Empty OpenAI response")
        return text, self._openai_label()

    def _try_claude(self, question: str, history: list, portfolio_context: Optional[str] = None):
        if not self.claude:
            raise Exception("Claude not configured")
        response = self.claude.messages.create(
            model="claude-haiku-4-5",
            max_tokens=4096,
            system=get_arjunai_prompt(portfolio_context),
            messages=self._build_messages(question, history),
        )
        return response.content[0].text, MODEL_NAMES["claude"]

    # ── Streaming ─────────────────────────────────────────────────────────────

    def _stream_gemini(self, question: str, history: list, portfolio_context: Optional[str] = None, market_context: Optional[str] = None, file_data: Optional[List[dict]] = None):
        if not self.gemini_client:
            raise Exception("Gemini not configured")

        contents = self._build_gemini_contents(question, history, file_data)
        want_search = needs_google_search(question)
        has_images = file_data and any(fd.get("is_image") for fd in file_data)
        use_buffered = want_search or is_market_news_question(question) or bool(has_images)

        last_err: Optional[Exception] = None
        for model_id in self.gemini_model_ids:
            for enable_search in ([True, False] if want_search else [False]):
                config = self._gemini_config(portfolio_context, market_context, question, enable_search)
                try:
                    if use_buffered or enable_search:
                        response = self.gemini_client.models.generate_content(
                            model=model_id, contents=contents, config=config,
                        )
                        text = _extract_gemini_text(response)
                        if not text.strip():
                            raise Exception("Empty Gemini response")
                        meta = self._gemini_meta(response)
                        meta["model_id"] = model_id
                        chunk_size = 48
                        for i in range(0, len(text), chunk_size):
                            yield text[i:i + chunk_size], None
                        yield "", {"agent": "gemini", **meta}
                        return

                    response = self.gemini_client.models.generate_content_stream(
                        model=model_id, contents=contents, config=config,
                    )
                    last_chunk = None
                    any_text = False
                    for chunk in response:
                        last_chunk = chunk
                        token = _extract_gemini_text(chunk)
                        if token:
                            any_text = True
                            yield token, None
                    if not any_text:
                        raise Exception("Empty Gemini response")
                    meta = self._gemini_meta(last_chunk)
                    meta["model_id"] = model_id
                    yield "", {"agent": "gemini", **meta}
                    return
                except Exception as e:
                    last_err = e
                    err = str(e)
                    logging.warning("Gemini stream %s search=%s failed: %s", model_id, enable_search, err[:300])
                    if enable_search and self._gemini_should_retry_without_search(err):
                        continue
                    if self._gemini_is_missing_model(err):
                        break
                    raise
        raise last_err or Exception("Gemini request failed")

    def _stream_grok(self, question: str, history: list, portfolio_context: Optional[str] = None) -> Generator[str, None, None]:
        if not self.grok:
            raise Exception("Grok not configured")
        messages = [{"role": "system", "content": get_arjunai_prompt(portfolio_context)}]
        messages.extend(self._build_messages(question, history))
        stream = self.grok.chat.completions.create(
            model="grok-3-fast", messages=messages, max_tokens=4096, stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta, None
        yield "", {"agent": "grok"}

    def _stream_groq(self, question: str, history: list, portfolio_context: Optional[str] = None):
        if not self.groq:
            raise Exception("Groq not configured")
        messages = [{"role": "system", "content": get_arjunai_prompt(portfolio_context)}]
        messages.extend(self._build_messages(question, history))
        stream = self.groq.chat.completions.create(
            model="llama-3.3-70b-versatile", messages=messages, max_tokens=4096, stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta, None
        yield "", {"agent": "groq"}

    def _stream_openai(
        self,
        question: str,
        history: list,
        portfolio_context: Optional[str] = None,
        market_context: Optional[str] = None,
        file_data: Optional[List[dict]] = None,
    ):
        if not self.openai:
            raise Exception("OpenAI not configured")
        messages = self._build_openai_messages(
            question, history, portfolio_context, market_context, file_data
        )
        use_buffered = bool(file_data)

        if use_buffered:
            response = self.openai.chat.completions.create(
                model=self.openai_model,
                messages=messages,
                max_tokens=4096,
            )
            text = response.choices[0].message.content or ""
            if not text.strip():
                raise Exception("Empty OpenAI response")
            chunk_size = 48
            for i in range(0, len(text), chunk_size):
                yield text[i:i + chunk_size], None
            yield "", {"agent": "openai"}
            return

        stream = self.openai.chat.completions.create(
            model=self.openai_model,
            messages=messages,
            max_tokens=4096,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta, None
        yield "", {"agent": "openai"}

    def _stream_claude(self, question: str, history: list, portfolio_context: Optional[str] = None):
        if not self.claude:
            raise Exception("Claude not configured")
        with self.claude.messages.stream(
            model="claude-haiku-4-5",
            max_tokens=4096,
            system=get_arjunai_prompt(portfolio_context),
            messages=self._build_messages(question, history),
        ) as stream:
            for text in stream.text_stream:
                yield text, None
        yield "", {"agent": "claude"}

    # ── Public API ────────────────────────────────────────────────────────────

    def ask(self, question: str, user_type: str = "free", history: list = None, portfolio_context: Optional[str] = None, file_data: Optional[List[dict]] = None, preferred_model: Optional[str] = None):
        if history is None:
            history = []

        topic = detect_topic(question)
        market_context = build_market_context(question)
        model_pref = (preferred_model or "auto").strip().lower()

        if file_data:
            if model_pref not in VISION_MODEL_IDS:
                return {
                    "answer": "Image/file analysis ke liye **Gemini** ya **OpenAI** model choose karein (Auto bhi chalega).",
                    "model": "Error",
                    "topic": topic,
                    "cached": False,
                }

            file_agents = []
            if model_pref in ("gemini", "auto") and self._is_configured("gemini"):
                file_agents.append(("gemini", self._try_gemini))
            if model_pref in ("openai", "auto") and self._is_configured("openai"):
                file_agents.append(("openai", self._try_openai))
            if model_pref == "gemini" and not file_agents:
                file_agents = []
            elif model_pref == "openai" and not file_agents:
                file_agents = []

            errors = []
            for agent_name, agent_fn in file_agents:
                try:
                    kwargs = {
                        "portfolio_context": portfolio_context,
                        "market_context": market_context,
                        "file_data": file_data,
                    }
                    result = agent_fn(question, history, **kwargs)
                    if len(result) == 3:
                        answer, model_name, meta = result
                    else:
                        answer, model_name = result
                        meta = {}
                    return {
                        "answer": answer,
                        "model": model_name,
                        "topic": topic,
                        "cached": False,
                        "sources": meta.get("sources", []),
                        "search_queries": meta.get("search_queries", []),
                        "grounded": meta.get("grounded", False),
                    }
                except Exception as e:
                    errors.append("%s: %s" % (agent_name, str(e)))
                    if model_pref != "auto":
                        break

            return {
                "answer": "Image/file process karne mein error aaya. Gemini quota ho to **OpenAI** model try karein.",
                "model": "Error",
                "topic": topic,
                "cached": False,
                "errors": errors,
            }

        agents = self._build_agent_list(preferred_model, user_type, streaming=False)
        if not agents:
            label = MODEL_NAMES.get(model_pref, model_pref)
            return {
                "answer": f"**{label}** abhi configure nahi hai ya available nahi. Auto model try karein.",
                "model": "Error",
                "topic": topic,
                "cached": False,
            }

        errors = []
        for agent_name, agent_fn in agents:
            try:
                kwargs = {"portfolio_context": portfolio_context}
                if agent_name in ("gemini", "openai"):
                    kwargs["market_context"] = market_context
                result = agent_fn(question, history, **kwargs)
                if len(result) == 3:
                    answer, model_name, meta = result
                else:
                    answer, model_name = result
                    meta = {}
                return {
                    "answer": answer,
                    "model": model_name,
                    "topic": topic,
                    "cached": False,
                    "sources": meta.get("sources", []),
                    "search_queries": meta.get("search_queries", []),
                    "grounded": meta.get("grounded", False),
                }
            except Exception as e:
                err = str(e)
                errors.append("%s: %s" % (agent_name, err))
                friendly = self._friendly_agent_error(agent_name, err)
                if friendly and model_pref != "auto":
                    return {
                        "answer": friendly,
                        "model": "Quota Limit" if "quota" in err.lower() else "Error",
                        "topic": topic,
                        "cached": False,
                        "errors": errors,
                    }
                if model_pref != "auto":
                    break

        return {
            "answer": "Abhi mujhe jawab dene mein problem ho rahi hai. Thodi der mein dobara koshish karein.",
            "model": "Error",
            "topic": topic,
            "cached": False,
            "errors": errors,
        }

    def stream(self, question: str, user_type: str = "free", history: list = None, portfolio_context: Optional[str] = None, file_data: Optional[List[dict]] = None, preferred_model: Optional[str] = None):
        """
        Yields (token: str, agent_name: str | None, meta: dict | None) tuples.
        agent_name is set on completion; meta has sources/search_queries for Gemini.
        """
        if history is None:
            history = []

        market_context = build_market_context(question)
        model_pref = (preferred_model or "auto").strip().lower()

        if file_data:
            if model_pref not in VISION_MODEL_IDS:
                yield "Image/file analysis ke liye **Gemini** ya **OpenAI** model choose karein (Auto bhi chalega).", "Error", None
                return

            file_agents = []
            if model_pref in ("gemini", "auto") and self._is_configured("gemini"):
                file_agents.append(("gemini", self._stream_gemini))
            if model_pref in ("openai", "auto") and self._is_configured("openai"):
                file_agents.append(("openai", self._stream_openai))

            for agent_name, agent_fn in file_agents:
                try:
                    completion_meta: dict = {}
                    for token, done_meta in agent_fn(
                        question, history,
                        portfolio_context=portfolio_context,
                        market_context=market_context,
                        file_data=file_data,
                    ):
                        if done_meta:
                            completion_meta = done_meta
                        elif token:
                            yield token, None, None
                    agent = completion_meta.get("agent", agent_name)
                    if agent == "gemini":
                        model_name = _pretty_gemini_name(
                            completion_meta.get("model_id") or self.gemini_model,
                            bool(completion_meta.get("grounded")),
                        )
                    elif agent == "openai":
                        model_name = self._openai_label()
                    else:
                        model_name = MODEL_NAMES.get(agent, "Error")
                    yield "", model_name, completion_meta
                    return
                except Exception as e:
                    import logging
                    logging.warning("File agent %s failed: %s", agent_name, e)
                    if model_pref != "auto":
                        break

            yield "Image/file process karne mein error aaya. Gemini quota ho to **OpenAI** model try karein.", "Error", None
            return

        agents = self._build_agent_list(preferred_model, user_type, streaming=True)
        if not agents:
            label = MODEL_NAMES.get(model_pref, model_pref)
            yield f"**{label}** abhi configure nahi hai ya available nahi. Auto model try karein.", "Error", None
            return

        errors = []
        gemini_failed_quota = False
        for agent_name, agent_fn in agents:
            try:
                kwargs = {"portfolio_context": portfolio_context}
                if agent_name in ("gemini", "openai"):
                    kwargs["market_context"] = market_context
                completion_meta: dict = {}
                for token, done_meta in agent_fn(question, history, **kwargs):
                    if done_meta:
                        completion_meta = done_meta
                    elif token:
                        yield token, None, None
                agent = completion_meta.get("agent", agent_name)
                if agent == "openai":
                    model_name = self._openai_label()
                elif agent == "gemini":
                    model_name = _pretty_gemini_name(
                        completion_meta.get("model_id") or self.gemini_model,
                        bool(completion_meta.get("grounded")),
                    )
                else:
                    model_name = MODEL_NAMES.get(agent, "Error")
                yield "", model_name, completion_meta
                return
            except Exception as e:
                err = str(e)
                errors.append("%s: %s" % (agent_name, err))
                if agent_name == "gemini" and "429" in err:
                    gemini_failed_quota = True
                    if model_pref == "auto" and (needs_google_search(question) or is_market_news_question(question)):
                        break
                friendly = self._friendly_agent_error(agent_name, err)
                if friendly and model_pref != "auto":
                    yield friendly, "Quota Limit" if "quota" in err.lower() else "Error", None
                    return
                import logging
                logging.warning("Agent %s failed: %s", agent_name, e)
                if model_pref != "auto":
                    break

        if gemini_failed_quota and model_pref == "auto":
            yield (
                "⚠️ **Gemini API quota/rate limit hit ho gayi.** "
                "Google Search grounding abhi available nahi hai. "
                "Thodi der baad dobara try karein.\n\n"
                "Tab tak Yahoo Finance live data ke liye specific stock poochho "
                "(jaise: *HDFC Bank ka current price?*), ya model selector se **Groq** choose karein.",
                "Quota Limit",
                None,
            )
            return

        yield "Abhi jawab nahi aa raha. Thodi der mein dobara koshish karein.", "error", None
