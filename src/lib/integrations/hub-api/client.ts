import { createHmac, randomUUID } from "crypto";
import { env } from "@/lib/config/env";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export class HubApiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HubApiConfigError";
  }
}

function requireHubApiConfig() {
  if (!env.HUB_API_URL) {
    throw new HubApiConfigError("HUB_API_URL is required");
  }
  if (!env.HUB_API_INTERNAL_SECRET) {
    throw new HubApiConfigError("HUB_API_INTERNAL_SECRET is required");
  }
  return { baseUrl: env.HUB_API_URL, secret: env.HUB_API_INTERNAL_SECRET };
}

function buildSignature(input: {
  secret: string;
  method: HttpMethod;
  path: string;
  timestamp: string;
  nonce: string;
  body: string;
}) {
  const canonical = [input.method, input.path, input.timestamp, input.nonce, input.body].join("\n");
  return createHmac("sha256", input.secret).update(canonical).digest("hex");
}

export async function hubApiFetch<T>(input: {
  method?: HttpMethod;
  path: string;
  workspaceId?: string;
  actorUserId?: string;
  body?: unknown;
}): Promise<T> {
  const { baseUrl, secret } = requireHubApiConfig();
  const method = input.method ?? "GET";
  const timestamp = new Date().toISOString();
  const nonce = randomUUID();
  const bodyString = input.body ? JSON.stringify(input.body) : "";
  const signature = buildSignature({
    secret,
    method,
    path: input.path,
    timestamp,
    nonce,
    body: bodyString,
  });

  const res = await fetch(`${baseUrl}${input.path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(input.workspaceId ? { "x-workspace-id": input.workspaceId } : {}),
      ...(input.actorUserId ? { "x-actor-user-id": input.actorUserId } : {}),
      "x-hub-ts": timestamp,
      "x-hub-nonce": nonce,
      "x-hub-signature": signature,
    },
    body: bodyString || undefined,
    cache: "no-store",
  });

  const payload = (await res.json().catch(() => null)) as {
    data?: T;
    error?: { message?: string };
  } | null;

  if (!res.ok) {
    const message = payload?.error?.message ?? `hub-api request failed: ${res.status}`;
    throw new Error(message);
  }

  return (payload?.data ?? payload) as T;
}
