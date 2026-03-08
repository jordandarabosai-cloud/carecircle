export function loadConfig() {
  const config = {
    port: Number(process.env.PORT || 4010),
    jwtSecret: process.env.JWT_SECRET || "carecircle-dev-secret",
    databaseUrl: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/carecircle",
    authCodeDeliveryMode: process.env.AUTH_CODE_DELIVERY_MODE || "dev",
    smtpHost: process.env.SMTP_HOST || "",
    smtpPort: Number(process.env.SMTP_PORT || 587),
    smtpUser: process.env.SMTP_USER || "",
    smtpPass: process.env.SMTP_PASS || "",
    smtpFrom: process.env.SMTP_FROM || "",
  };

  const validModes = new Set(["dev", "log", "smtp"]);
  if (!validModes.has(config.authCodeDeliveryMode)) {
    throw new Error(`Invalid AUTH_CODE_DELIVERY_MODE: ${config.authCodeDeliveryMode}`);
  }

  if (config.authCodeDeliveryMode === "smtp") {
    if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
      throw new Error("SMTP mode requires SMTP_HOST, SMTP_USER, and SMTP_PASS");
    }
  }

  return config;
}
