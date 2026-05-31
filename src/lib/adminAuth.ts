import type { APIContext, AstroCookies } from "astro";

const COOKIE_NAME = "vt_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

type SessionPayload = {
  userId: string;
  exp: number;
};

function getSecret() {
  return import.meta.env.ADMIN_SESSION_SECRET || "";
}

function base64UrlEncode(input: string | ArrayBuffer) {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : new Uint8Array(input);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function sign(value: string) {
  const secret = getSecret();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64UrlEncode(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

async function verify(value: string, signature: string) {
  const expected = await sign(value);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

console.log("ADMIN_USER_ID =", import.meta.env.ADMIN_USER_ID);
console.log("ADMIN_PASSWORD =", import.meta.env.ADMIN_PASSWORD);
console.log("MONGODB_URI =", import.meta.env.MONGODB_URI);
console.log("ADMIN_SESSION_SECRET =", import.meta.env.ADMIN_SESSION_SECRET)

export function isAdminConfigured() {
  return Boolean(
    import.meta.env.ADMIN_USER_ID &&
      import.meta.env.ADMIN_PASSWORD &&
      import.meta.env.MONGODB_URI &&
      getSecret(),
  );
}

export function credentialsAreValid(userId: string, password: string) {
  const expectedUserId = import.meta.env.ADMIN_USER_ID || "";
  const expectedPassword = import.meta.env.ADMIN_PASSWORD || "";
  const supplied = `${userId}\u0000${password}`;
  const expected = `${expectedUserId}\u0000${expectedPassword}`;
  if (supplied.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export async function createAdminSessionCookie(userId: string) {
  const payload: SessionPayload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function setAdminCookie(cookies: AstroCookies, value: string) {
  cookies.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "strict",
    secure: import.meta.env.PROD,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearAdminCookie(cookies: AstroCookies) {
  cookies.delete(COOKIE_NAME, { path: "/" });
}

export async function getAdminSession(cookies: AstroCookies) {
  if (!isAdminConfigured()) return null;
  const raw = cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature || !(await verify(payload, signature))) return null;
  try {
    const data = JSON.parse(base64UrlDecode(payload)) as SessionPayload;
    if (!data.userId || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export async function requireAdmin(context: APIContext) {
  const session = await getAdminSession(context.cookies);
  if (!session) {
    return {
      session: null,
      response: new Response(JSON.stringify({ error: "Authentication required." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  return { session, response: null };
}
