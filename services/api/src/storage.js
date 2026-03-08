import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function sanitizeName(name) {
  return String(name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function buildS3Client(config) {
  const clientConfig = {
    region: config.s3Region,
    credentials: {
      accessKeyId: config.s3AccessKeyId,
      secretAccessKey: config.s3SecretAccessKey,
    },
  };

  if (config.s3Endpoint) clientConfig.endpoint = config.s3Endpoint;
  if (config.s3ForcePathStyle) clientConfig.forcePathStyle = true;

  return new S3Client(clientConfig);
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
    const client = buildS3Client(config);
    const resolvedContentType = contentType || "application/octet-stream";

    const command = new PutObjectCommand({
      Bucket: config.s3Bucket,
      Key: key,
      ContentType: resolvedContentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });

    const base = config.s3PublicBaseUrl || `https://${config.s3Bucket}.s3.${config.s3Region}.amazonaws.com`;
    const fileUrl = `${base}/${key}`;

    return {
      key,
      uploadUrl,
      fileUrl,
      method: "PUT",
      headers: {
        "Content-Type": resolvedContentType,
      },
      expiresInSeconds: 900,
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
