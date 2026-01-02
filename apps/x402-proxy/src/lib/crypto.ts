import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get the encryption key from environment
 * Must be 32 bytes (64 hex characters)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  if (key.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }
  return Buffer.from(key, "hex");
}

/**
 * Encrypt a string value using AES-256-GCM
 * @returns Object with encrypted value and IV (both as hex strings)
 */
export function encrypt(plaintext: string): { encrypted: string; iv: string } {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Get auth tag and append to encrypted data
  const authTag = cipher.getAuthTag();
  const encryptedWithTag = encrypted + authTag.toString("hex");

  return {
    encrypted: encryptedWithTag,
    iv: iv.toString("hex"),
  };
}

/**
 * Decrypt a value encrypted with AES-256-GCM
 * @param encrypted Encrypted value with auth tag (hex string)
 * @param iv Initialization vector (hex string)
 * @returns Decrypted plaintext
 */
export function decrypt(encrypted: string, iv: string): string {
  const key = getEncryptionKey();
  const ivBuffer = Buffer.from(iv, "hex");

  // Extract auth tag from end of encrypted data
  const authTagStart = encrypted.length - AUTH_TAG_LENGTH * 2;
  const encryptedData = encrypted.slice(0, authTagStart);
  const authTag = Buffer.from(encrypted.slice(authTagStart), "hex");

  const decipher = createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generate a random encryption key (for .env setup)
 * @returns 64-character hex string (32 bytes)
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Resolve secret references in a string
 * Replaces {{SECRET:name}} with the actual decrypted value
 */
export async function resolveSecretReferences(
  template: string,
  getSecret: (name: string) => Promise<{ encryptedValue: string; iv: string } | null>
): Promise<string> {
  const secretPattern = /\{\{SECRET:([^}]+)\}\}/g;
  const matches = template.matchAll(secretPattern);

  let result = template;

  for (const match of matches) {
    const fullMatch = match[0];
    const secretName = match[1];
    if (!secretName) continue;
    
    const secret = await getSecret(secretName);

    if (secret) {
      const decryptedValue = decrypt(secret.encryptedValue, secret.iv);
      result = result.replace(fullMatch, decryptedValue);
    } else {
      // If secret not found, leave placeholder (or throw error)
      console.warn(`Secret "${secretName}" not found`);
    }
  }

  return result;
}

/**
 * Check if a string contains secret references
 */
export function hasSecretReferences(str: string): boolean {
  return /\{\{SECRET:[^}]+\}\}/.test(str);
}

/**
 * Extract secret names from a string
 */
export function extractSecretNames(str: string): string[] {
  const secretPattern = /\{\{SECRET:([^}]+)\}\}/g;
  const names: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = secretPattern.exec(str)) !== null) {
    if (match[1]) {
      names.push(match[1]);
    }
  }

  return [...new Set(names)]; // Remove duplicates
}
