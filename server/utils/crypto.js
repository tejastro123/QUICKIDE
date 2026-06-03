const crypto = require('crypto');

// ENCRYPTION_KEY must be set in the environment — never use a hardcoded fallback.
// Generate one with: node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
if (!process.env.ENCRYPTION_KEY) {
  throw new Error(
    '[FATAL] ENCRYPTION_KEY is not set in the environment. ' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(16).toString(\'hex\'))" ' +
    'and add it to your .env file.'
  );
}

const ALGORITHM = 'aes-256-cbc';
// Derive a 32-byte key from whatever length ENCRYPTION_KEY the user provides
const KEY = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY).digest();

/**
 * Encrypt plain text using AES-256-CBC
 * @param {string} text
 * @returns {string} iv:encryptedData format
 */
function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt cipher text using AES-256-CBC
 * Supports fallback to plain text if not in iv:encryptedData format
 * (for migrating previously unencrypted tokens)
 * @param {string} cipherText
 * @returns {string} decrypted plain text
 */
function decrypt(cipherText) {
  if (!cipherText) return '';
  if (!cipherText.includes(':')) {
    // Migration fallback: token was stored as plain text before encryption was added
    return cipherText;
  }
  try {
    const [ivHex, encryptedHex] = cipherText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    // Decryption failed — token may be corrupted or from a different key
    return '';
  }
}

module.exports = { encrypt, decrypt };
