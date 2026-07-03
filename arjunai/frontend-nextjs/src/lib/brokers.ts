export interface Broker {
  id: string;
  name: string;
  color: string;
  initials: string;
  /** OAuth via Smallcase Gateway — set SMALLCASE_GATEWAY_KEY in env */
  gatewaySlug?: string;
  csvHint: string;
}

export const INDIAN_BROKERS: Broker[] = [
  {
    id: "zerodha",
    name: "Zerodha",
    color: "#387ed1",
    initials: "Z",
    gatewaySlug: "kite",
    csvHint: "Kite → Holdings → Download CSV (Symbol, Qty, Avg. cost columns)",
  },
  {
    id: "upstox",
    name: "Upstox",
    color: "#7b2cbf",
    initials: "up",
    gatewaySlug: "upstox",
    csvHint: "Upstox app → Portfolio → Export holdings CSV",
  },
  {
    id: "angelone",
    name: "Angel One",
    color: "#3b82f6",
    initials: "A1",
    gatewaySlug: "angel",
    csvHint: "Angel One → Reports → Holdings statement → CSV",
  },
  {
    id: "groww",
    name: "Groww",
    color: "#00d09c",
    initials: "G",
    csvHint: "Groww → Reports → Stocks Order History (Excel) ya Holdings statement",
  },
  {
    id: "paytm",
    name: "Paytm Money",
    color: "#00baf2",
    initials: "₹",
    gatewaySlug: "paytmmoney",
    csvHint: "Paytm Money → Portfolio → Export holdings",
  },
  {
    id: "hdfcsky",
    name: "HDFC SKY",
    color: "#004c8f",
    initials: "H",
    csvHint: "HDFC SKY → Holdings → Download report",
  },
  {
    id: "5paisa",
    name: "5paisa",
    color: "#e31837",
    initials: "5",
    gatewaySlug: "5paisa",
    csvHint: "5paisa → Portfolio → Export CSV",
  },
  {
    id: "motilal",
    name: "Motilal Oswal",
    color: "#1e3a8a",
    initials: "mo",
    csvHint: "MO Investor → Holdings → Export",
  },
  {
    id: "iifl",
    name: "IIFL Capital",
    color: "#c9a227",
    initials: "I",
    csvHint: "IIFL → Portfolio → Holdings export",
  },
  {
    id: "dhan",
    name: "Dhan",
    color: "#00c853",
    initials: "ध",
    gatewaySlug: "dhan",
    csvHint: "Dhan app → Portfolio → Download holdings",
  },
  {
    id: "trustline",
    name: "Trustline",
    color: "#2563eb",
    initials: "TL",
    csvHint: "Trustline → Holdings report → CSV",
  },
  {
    id: "kotak",
    name: "Kotak Securities",
    color: "#ed1c24",
    initials: "K",
    gatewaySlug: "kotak",
    csvHint: "Kotak Neo → Portfolio → Export",
  },
];

export function getBroker(id: string): Broker | undefined {
  return INDIAN_BROKERS.find((b) => b.id === id);
}

/** Smallcase Gateway — production mein API key chahiye */
export function isBrokerOAuthAvailable(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SMALLCASE_GATEWAY_KEY);
}

export function getBrokerOAuthUrl(broker: Broker): string | null {
  const key = process.env.NEXT_PUBLIC_SMALLCASE_GATEWAY_KEY;
  if (!key || !broker.gatewaySlug) return null;
  const redirect = encodeURIComponent(
    typeof window !== "undefined"
      ? `${window.location.origin}/portfolio?broker=${broker.id}&connected=1`
      : ""
  );
  return `https://gatewayapi.smallcase.com/v1/brokerLogin?apiKey=${key}&broker=${broker.gatewaySlug}&redirectUrl=${redirect}`;
}
