/**
 * Initiates Google OAuth sign-in via POST (Auth.js requires POST for OAuth providers).
 * Fetches CSRF token, creates a form, and submits it. The browser follows the 302
 * redirect to Google.
 */
export function useGoogleSignIn() {
  async function signInWithGoogle(callbackUrl = "/", csrfToken?: string) {
    if (!import.meta.client) return

    const token = csrfToken ?? (await $fetch<{ csrfToken: string }>("/api/auth/csrf", {
      credentials: "include",
    })).csrfToken;

    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/auth/signin/google";

    const csrfInput = document.createElement("input");
    csrfInput.type = "hidden";
    csrfInput.name = "csrfToken";
    csrfInput.value = token;
    form.appendChild(csrfInput);

    const callbackInput = document.createElement("input");
    callbackInput.type = "hidden";
    callbackInput.name = "callbackUrl";
    callbackInput.value = callbackUrl;
    form.appendChild(callbackInput);

    document.body.appendChild(form);
    form.submit();
  }

  return { signInWithGoogle };
}
