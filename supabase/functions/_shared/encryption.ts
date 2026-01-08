// Encryption utility for securing sensitive data like access tokens
// Uses AES-GCM encryption with the Web Crypto API (built into Deno)

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for GCM

/**
 * Derives an encryption key from the environment variable
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('ENCRYPTION_SECRET');

  if (!secret) {
    throw new Error('ENCRYPTION_SECRET environment variable not set');
  }

  // Use PBKDF2 to derive a key from the secret
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive the actual encryption key
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('tandril-encryption-salt-v1'), // Static salt for deterministic key
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );

  return key;
}

/**
 * Encrypts a string value using AES-GCM
 * Returns base64-encoded string in format: iv:ciphertext
 */
export async function encrypt(plaintext: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Encrypt the data
    const ciphertext = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );

    // Combine IV and ciphertext, encode as base64
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('[Encryption] Error encrypting data:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts a base64-encoded encrypted string
 * Expects format: iv:ciphertext
 */
export async function decrypt(encrypted: string): Promise<string> {
  try {
    const key = await getEncryptionKey();

    // Decode from base64
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));

    // Extract IV and ciphertext
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );

    // Convert back to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('[Encryption] Error decrypting data:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Helper to check if a value is encrypted (base64 format check)
 */
export function isEncrypted(value: string): boolean {
  // Basic check: encrypted values should be base64 and longer than plain tokens
  try {
    const decoded = atob(value);
    return decoded.length > IV_LENGTH;
  } catch {
    return false;
  }
}
