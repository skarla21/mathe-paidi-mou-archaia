import { notifyContactMessage } from "../utils/adminNotifications";
import { sendContactEmail } from "../utils/email";
import { checkRateLimit } from "../utils/rateLimit";
import {
  allowedRecaptchaHostnames,
  recaptchaErrorStatus,
  verifyRecaptchaToken,
} from "../utils/recaptcha";
import { serverSupabaseService } from "../utils/supabaseServer";
import { EMAIL_REGEX } from "../utils/validation";

const MESSAGE_MAX = 4000;
const RECAPTCHA_MESSAGE =
  "Η επαλήθευση απέτυχε. Συμπλήρωσε ξανά το «Δεν είμαι ρομπότ» και δοκίμασε πάλι.";
const RECAPTCHA_UNAVAILABLE =
  "Η επαλήθευση δεν είναι διαθέσιμη. Δοκίμασε ξανά αργότερα.";

export default defineEventHandler(async (event) => {
  checkRateLimit(event, {
    name: "contact",
    maxRequests: 3,
    windowMs: 60 * 1000,
    message: "Πάρα πολλές αιτήσεις. Παρακαλώ δοκίμασε ξανά αργότερα.",
  });

  const body = await readBody<{
    email?: unknown;
    message?: unknown;
    name?: unknown;
    phone?: unknown;
    gradeId?: unknown;
    honey?: unknown;
    recaptchaToken?: unknown;
  }>(event);

  if (typeof body?.honey === "string" && body.honey.trim()) {
    return { success: true };
  }

  if (
    !body ||
    typeof body.email !== "string" ||
    typeof body.message !== "string"
  ) {
    throw createError({
      statusCode: 400,
      message: "Το email και το μήνυμα είναι υποχρεωτικά",
    });
  }

  const message = body.message.trim();
  if (!body.email.trim() || !message) {
    throw createError({
      statusCode: 400,
      message: "Το email και το μήνυμα είναι υποχρεωτικά",
    });
  }

  if (message.length > MESSAGE_MAX) {
    throw createError({
      statusCode: 400,
      message: "Το μήνυμα είναι πολύ μεγάλο",
    });
  }

  if (!EMAIL_REGEX.test(body.email)) {
    throw createError({ statusCode: 400, message: "Μη έγκυρο email" });
  }

  const config = useRuntimeConfig();
  const recaptchaSecret =
    typeof config.recaptchaSecretKey === "string"
      ? config.recaptchaSecretKey.trim()
      : "";
  if (!recaptchaSecret) {
    console.error("[contact] missing recaptcha secret");
    throw createError({
      statusCode: 503,
      message: RECAPTCHA_UNAVAILABLE,
    });
  }

  const recaptcha = await verifyRecaptchaToken(
    body.recaptchaToken,
    recaptchaSecret,
    allowedRecaptchaHostnames(),
  );
  if (!recaptcha.ok) {
    throw createError({
      statusCode: recaptchaErrorStatus(recaptcha.errorCodes),
      message: RECAPTCHA_MESSAGE,
      data: { recaptcha: true },
    });
  }

  const sanitizedEmail = body.email.replace(/[\r\n]/g, "");
  const name = cleanLine(body.name, 120);
  const phone = cleanLine(body.phone, 40);
  const gradeId = cleanLine(body.gradeId, 80);
  let gradeName = "";
  if (gradeId) {
    const supabase = serverSupabaseService();
    const { data } = await supabase
      .from("grades")
      .select("name")
      .eq("id", gradeId)
      .maybeSingle();
    gradeName = typeof data?.name === "string" ? data.name : "";
  }
  const contactEmail =
    (config.contactEmail as string) || "antwnis_skarlatos@yahoo.com";
  const subject = "Μήνυμα από το mathe-paidi-mou-archaia.com!";

  const html = `
    <p><strong>Από:</strong> ${escapeHtml(sanitizedEmail)}</p>
    ${name ? `<p><strong>Όνομα:</strong> ${escapeHtml(name)}</p>` : ""}
    ${phone ? `<p><strong>Τηλέφωνο:</strong> ${escapeHtml(phone)}</p>` : ""}
    ${gradeName ? `<p><strong>Τάξη:</strong> ${escapeHtml(gradeName)}</p>` : ""}
    <p><strong>Μήνυμα:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
  `;

  try {
    await sendContactEmail({
      to: contactEmail,
      replyTo: sanitizedEmail,
      subject,
      html,
    });
  } catch (e) {
    console.error("[contact] Resend error:", e);
    throw createError({
      statusCode: 502,
      message: "Αποτυχία αποστολής μηνύματος",
    });
  }

  try {
    const supabase = serverSupabaseService();
    await notifyContactMessage(supabase, {
      email: sanitizedEmail,
      message,
      name,
      phone,
      gradeName,
    });
  } catch (e) {
    console.error("[contact] admin notification:", e);
  }

  return { success: true };
});

function cleanLine(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\r\n]/g, "")
    .trim()
    .slice(0, max);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
