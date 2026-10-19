import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    const config = useRuntimeConfig();
    const key =
      (config.resendApiKey as string) ||
      process.env.RESEND_API_KEY ||
      process.env.NUXT_RESEND_API_KEY;
    if (!key) {
      throw new Error(
        "RESEND_API_KEY or NUXT_RESEND_API_KEY is not configured",
      );
    }
    resendClient = new Resend(key);
  }
  return resendClient;
}

const DEFAULT_FROM =
  "Μάθε Παιδί Μου Αρχαία <noreply@mathearchaia.gr>";

export async function sendVerificationEmail(to: string, link: string): Promise<void> {
  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: DEFAULT_FROM,
    to,
    subject: "Επιβεβαίωση email — Μάθε Παιδί Μου Αρχαία",
    html: `
      <p>Πάτησε τον σύνδεσμο για να επιβεβαιώσεις το email σου:</p>
      <p><a href="${link}">${link}</a></p>
      <p>Ο σύνδεσμος λήγει σε 24 ώρες.</p>
    `,
  });
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("Failed to send verification email");
}

const RESET_SEND_TIMEOUT_MS = 20_000

export async function sendPasswordResetEmail(to: string, link: string): Promise<void> {
  const resend = getResend();
  const send = resend.emails.send({
    from: DEFAULT_FROM,
    to,
    subject: "Επαναφορά κωδικού — Μάθε Παιδί Μου Αρχαία",
    html: `
      <p>Πάτησε τον σύνδεσμο για να ορίσεις νέο κωδικό:</p>
      <p><a href="${link}">${link}</a></p>
      <p>Ο σύνδεσμος λήγει σε 1 ώρα.</p>
    `,
  });
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const { data, error } = await Promise.race([
    send.finally(() => clearTimeout(timeoutId)),
    new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Password reset email timed out")), RESET_SEND_TIMEOUT_MS)
    }),
  ])
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("Failed to send password reset email");
}

export async function sendContactEmail(params: {
  to: string;
  replyTo: string;
  subject: string;
  html: string;
}): Promise<void> {
  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: DEFAULT_FROM,
    to: params.to,
    replyTo: params.replyTo,
    subject: params.subject,
    html: params.html,
  });
  if (error) {
    throw new Error(error.message);
  }
  if (!data?.id) {
    throw new Error("Failed to send email");
  }
}
