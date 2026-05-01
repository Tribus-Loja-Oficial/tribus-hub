import { createHmac, randomUUID } from "crypto";
import { env } from "@/lib/config/env";
import { AppError, ValidationError } from "@/lib/errors";

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

/** hub-api verifies HMAC using `URL(request.url).pathname` only (no query string). */
function signingPathFromRequestPath(path: string): string {
  const q = path.indexOf("?");
  return q === -1 ? path : path.slice(0, q);
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
    path: signingPathFromRequestPath(input.path),
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
    if (res.status === 400) {
      throw new ValidationError(message);
    }
    const status = res.status >= 400 && res.status < 600 ? res.status : 502;
    throw new AppError(message, "HUB_API_ERROR", status);
  }

  return (payload?.data ?? payload) as T;
}
