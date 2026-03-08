import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

function sanitizeName(name) {
  return String(name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function createUploadTarget({ config, caseId, fileName, contentType }) {
  const safe = sanitizeName(fileName || "upload.bin");
  const key = `${caseId}/${Date.now()}-${randomUUID()}-${safe}`;

  if (config.storageMode === "local") {
    const uploadUrl = `${config.publicBaseUrl}/uploads/${encodeURIComponent(key)}`;
    const fileUrl = `${config.publicBaseUrl}/files/${encodeURIComponent(key)}`;
    return {
      key,
      uploadUrl,
      fileUrl,
      method: "PUT",
      headers: {
        "Content-Type": contentType || "application/octet-stream",
      },
    };
  }

  if (config.storageMode === "s3") {
    // MVP scaffold: caller uploads directly to object storage URL pattern.
    // Replace with signed URL generation in production hardening pass.
    const base = config.s3PublicBaseUrl || `https://${config.s3Bucket}.s3.${config.s3Region}.amazonaws.com`;
    const fileUrl = `${base}/${key}`;
    return {
      key,
      uploadUrl: fileUrl,
      fileUrl,
      method: "PUT",
      headers: {
        "Content-Type": contentType || "application/octet-stream",
      },
      note: "S3 mode currently returns direct object URL scaffold; add signed URL generation for production",
    };
  }

  throw new Error(`Unsupported storage mode: ${config.storageMode}`);
}

export async function saveLocalUpload({ config, key, buffer }) {
  const fullPath = path.join(config.localStoragePath, key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
  return fullPath;
}
