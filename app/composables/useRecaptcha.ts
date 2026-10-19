type RecaptchaTheme = "light" | "dark";

interface Grecaptcha {
  ready: (callback: () => void) => void;
  render: (
    container: HTMLElement,
    parameters: { sitekey: string; theme: RecaptchaTheme },
  ) => number;
  getResponse: (widgetId?: number) => string;
  reset: (widgetId?: number) => void;
}

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

const SCRIPT_SRC = "https://www.google.com/recaptcha/api.js?render=explicit&hl=el";

let scriptPromise: Promise<void> | null = null;

function loadRecaptchaScript(): Promise<void> {
  if (!import.meta.client) return Promise.resolve();
  if (window.grecaptcha?.ready) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const rejectLoad = (script?: HTMLScriptElement) => {
      if (script) {
        script.dataset.failed = "1";
        script.remove();
      }
      scriptPromise = null;
      reject(new Error("recaptcha script"));
    };

    let existing = document.querySelector<HTMLScriptElement>(
      "script[data-recaptcha='v2']",
    );
    if (existing?.dataset.failed === "1") {
      existing.remove();
      existing = null;
    }
    if (existing) {
      const script = existing;
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => rejectLoad(script), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.dataset.recaptcha = "v2";
    script.onload = () => resolve();
    script.onerror = () => rejectLoad(script);
    document.head.appendChild(script);
  });

  return scriptPromise;
}

function waitUntilReady(): Promise<void> {
  return new Promise((resolve, reject) => {
    const grecaptcha = window.grecaptcha;
    if (!grecaptcha?.ready) {
      reject(new Error("recaptcha missing"));
      return;
    }
    grecaptcha.ready(() => resolve());
  });
}

export function useRecaptcha(theme: Readonly<Ref<RecaptchaTheme>>) {
  const config = useRuntimeConfig();
  const siteKey = computed(() => config.public.recaptchaSiteKey.trim());
  const box = ref<HTMLElement | null>(null);
  const widgetId = ref<number | null>(null);
  const unavailable = ref(false);
  let renderGeneration = 0;

  async function renderWidget() {
    const generation = ++renderGeneration;
    await nextTick();
    const el = box.value;
    const key = siteKey.value;
    if (!import.meta.client || !el || !key) return;
    if (el.dataset.rendered === "1") return;

    try {
      await loadRecaptchaScript();
      if (generation !== renderGeneration || box.value !== el) return;
      await waitUntilReady();
      if (generation !== renderGeneration || box.value !== el) return;
      if (el.dataset.rendered === "1") return;
      const grecaptcha = window.grecaptcha;
      if (!grecaptcha) return;
      const id = grecaptcha.render(el, {
        sitekey: key,
        theme: theme.value === "dark" ? "dark" : "light",
      });
      widgetId.value = id;
      el.dataset.rendered = "1";
      unavailable.value = false;
    } catch (error) {
      unavailable.value = true;
      const message = error instanceof Error ? error.message : "recaptcha widget";
      console.error("[recaptcha] widget:", message);
    }
  }

  function getToken(): string {
    if (!import.meta.client || widgetId.value == null) return "";
    return window.grecaptcha?.getResponse(widgetId.value) ?? "";
  }

  function reset() {
    if (!import.meta.client || widgetId.value == null) return;
    window.grecaptcha?.reset(widgetId.value);
  }

  onMounted(() => {
    void renderWidget();
  });

  watch(
    theme,
    () => {
      void renderWidget();
    },
    { flush: "post" },
  );

  return { siteKey, box, unavailable, getToken, reset };
}
