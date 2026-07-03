import hashlib
import redis
import os
from dotenv import load_dotenv

load_dotenv()

CACHE_TTL = 7200  # 2 hours

redis_client = None

def get_redis():
    global redis_client
    if redis_client is None:
        redis_url = os.getenv("REDIS_URL")
        if redis_url:
            try:
                redis_client = redis.from_url(redis_url, decode_responses=True)
                redis_client.ping()
            except Exception:
                redis_client = None
    return redis_client


def make_cache_key(question: str) -> str:
    normalized = question.strip().lower()
    return f"arjunai:{hashlib.md5(normalized.encode()).hexdigest()}"


def get_cached_response(question: str):
    r = get_redis()
    if r is None:
        return None
    try:
        key = make_cache_key(question)
        return r.get(key)
    except Exception:
        return None


def set_cached_response(question: str, answer: str) -> None:
    r = get_redis()
    if r is None:
        return
    try:
        key = make_cache_key(question)
        r.setex(key, CACHE_TTL, answer)
    except Exception:
        pass
