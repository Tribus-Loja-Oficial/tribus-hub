import "server-only";

/** CDS access token payload (HS256), aligned with tribus-cds `src/auth/jwt.ts`. */
export type CdsJwtPayload = {
  sub: string;
  sid: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  grants: Record<string, { role: string; niche?: string | null }>;
};

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

export class CdsTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CdsTokenError";
  }
}

export async function verifyCdsAccessToken(
  token: string,
  secret: string,
  expected?: { issuer?: string; audience?: string },
): Promise<CdsJwtPayload> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new CdsTokenError("Malformed token");

  const [encodedHeader, encodedPayload, encodedSignature] = parts as [string, string, string];
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await importKey(secret);
  const signatureBytes = new Uint8Array(base64urlDecode(encodedSignature));
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    new TextEncoder().encode(signingInput),
  );
  if (!valid) throw new CdsTokenError("Invalid token signature");

  let payload: CdsJwtPayload;
  try {
    payload = JSON.parse(
      new TextDecoder().decode(base64urlDecode(encodedPayload)),
    ) as CdsJwtPayload;
  } catch {
    throw new CdsTokenError("Could not decode token payload");
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new CdsTokenError("Token expired");
  }

  if (expected?.issuer && payload.iss !== expected.issuer) {
    throw new CdsTokenError("Invalid issuer");
  }
  if (expected?.audience && payload.aud !== expected.audience) {
    throw new CdsTokenError("Invalid audience");
  }

  return payload;
}
