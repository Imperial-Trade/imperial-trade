/**
 * 🔐 SERVER-SIDE DECRYPTION UTILITIES
 * 
 * Decrypts credentials encrypted by client-side encryption
 * Uses same key derivation as client (user_id + secret)
 */

import crypto from 'crypto';

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || 'ImperialTrade_BrokerEncryption_2025_v1';

/**
 * Derive encryption key from user ID (same as client-side)
 */
function getEncryptionKey(userId: string): Buffer {
  const keyMaterial = `${userId}-${ENCRYPTION_SECRET}`;
  return crypto.createHash('sha256').update(keyMaterial).digest();
}

/**
 * Decrypt credentials encrypted by client-side AES-256-GCM
 */
export function decryptCredentials(encryptedData: string, userId: string): string {
  try {
    // Decode base64
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract IV (first 12 bytes) and encrypted data (rest includes auth tag)
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    // Get encryption key
    const key = getEncryptionKey(userId);
    
    // Decrypt using AES-256-GCM
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    
    // GCM auth tag is last 16 bytes of encrypted data
    const authTag = encrypted.slice(-16);
    const ciphertext = encrypted.slice(0, -16);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('❌ Decryption failed:', error);
    throw new Error('Failed to decrypt credentials');
  }
}
