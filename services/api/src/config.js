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
    storageMode: process.env.STORAGE_MODE || "local",
    localStoragePath: process.env.LOCAL_STORAGE_PATH || "uploads",
    publicBaseUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${Number(process.env.PORT || 4010)}`,
    s3Bucket: process.env.S3_BUCKET || "",
    s3Region: process.env.S3_REGION || "us-east-1",
    s3PublicBaseUrl: process.env.S3_PUBLIC_BASE_URL || "",
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

  const validStorageModes = new Set(["local", "s3"]);
  if (!validStorageModes.has(config.storageMode)) {
    throw new Error(`Invalid STORAGE_MODE: ${config.storageMode}`);
  }

  if (config.storageMode === "s3" && !config.s3Bucket) {
    throw new Error("S3 mode requires S3_BUCKET");
  }

  return config;
}
