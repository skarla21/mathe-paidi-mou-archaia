const SITEVERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const SITEVERIFY_TIMEOUT_MS = 5000;

const PRODUCTION_HOSTS = [
  "mathe-paidi-mou-archaia.com",
  "www.mathe-paidi-mou-archaia.com",
] as const;

const DEV_HOSTS = ["localhost", "127.0.0.1"] as const;

type SiteverifyResponse = {
  success?: boolean;
  hostname?: string;
  "error-codes"?: string[];
};

export function allowedRecaptchaHostnames(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): readonly string[] {
  if (nodeEnv === "production") return PRODUCTION_HOSTS;
  return [...PRODUCTION_HOSTS, ...DEV_HOSTS];
}

export function recaptchaErrorStatus(
  errorCodes: readonly string[],
): 400 | 503 {
  return errorCodes.includes("siteverify-unavailable") ? 503 : 400;
}

export async function verifyRecaptchaToken(
  token: unknown,
  secret: string,
  allowedHostnames: readonly string[],
): Promise<{ ok: true } | { ok: false; errorCodes: string[] }> {
  if (typeof token !== "string" || !token.trim()) {
    return { ok: false, errorCodes: ["missing-input-response"] };
  }

  let result: SiteverifyResponse;
  try {
    result = await $fetch<SiteverifyResponse>(SITEVERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: token.trim(),
      }).toString(),
      timeout: SITEVERIFY_TIMEOUT_MS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "siteverify failed";
    console.error("[contact] recaptcha siteverify:", message);
    return { ok: false, errorCodes: ["siteverify-unavailable"] };
  }

  if (result.success === true) {
    const hostname =
      typeof result.hostname === "string" ? result.hostname.toLowerCase() : "";
    const allowed = new Set(
      allowedHostnames.map((host) => host.toLowerCase()),
    );
    if (hostname && allowed.has(hostname)) return { ok: true };
    console.error("[contact] recaptcha hostname:", hostname || "missing");
    return { ok: false, errorCodes: ["hostname-mismatch"] };
  }

  const errorCodes = Array.isArray(result["error-codes"])
    ? result["error-codes"].filter((code) => typeof code === "string")
    : [];
  console.error("[contact] recaptcha rejected:", errorCodes);
  return { ok: false, errorCodes };
}
