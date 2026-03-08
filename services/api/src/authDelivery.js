import nodemailer from "nodemailer";

function buildTransportFromEnv() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const transporter = buildTransportFromEnv();

export async function deliverAuthCode({ email, code, expiresAt }) {
  const mode = process.env.AUTH_CODE_DELIVERY_MODE || "dev";

  if (mode === "dev") {
    return { mode, delivered: false, devCode: code };
  }

  if (mode === "log") {
    console.log(`[AUTH_CODE] email=${email} code=${code} expiresAt=${expiresAt}`);
    return { mode, delivered: true };
  }

  if (mode === "smtp") {
    if (!transporter) {
      throw new Error("SMTP mode enabled but SMTP_HOST/SMTP_USER/SMTP_PASS are not configured");
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    await transporter.sendMail({
      from,
      to: email,
      subject: "Your CareCircle sign-in code",
      text: `Your CareCircle verification code is ${code}. It expires at ${expiresAt}.`,
      html: `<p>Your CareCircle verification code is <b>${code}</b>.</p><p>It expires at ${expiresAt}.</p>`,
    });

    return { mode, delivered: true };
  }

  throw new Error(`Unknown AUTH_CODE_DELIVERY_MODE: ${mode}`);
}
