import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import { env } from "../config/env";

const key = createHash("sha256")
  .update(env.SENDER_ENCRYPTION_KEY ?? env.JWT_SECRET)
  .digest();

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);

  return [iv, cipher.getAuthTag(), data]
    .map((part) => part.toString("base64"))
    .join(".");
}

export function decryptSecret(payload: string): string {
  const [iv, tag, data] = payload
    .split(".")
    .map((part) => Buffer.from(part, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}
