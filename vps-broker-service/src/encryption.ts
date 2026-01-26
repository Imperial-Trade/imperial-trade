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
 * Also handles plain credentials (for testing/development)
 */
export function decryptCredentials(encryptedData: string, userId: string): string {
  try {
    if (!encryptedData || !userId) {
      throw new Error('Missing encryptedData or userId');
    }

    // Check if data looks like plain text (not base64 encrypted)
    // Encrypted data is base64 and should be at least 28 bytes when decoded
    // Plain text is typically shorter and not valid base64
    let combined: Buffer;
    try {
      combined = Buffer.from(encryptedData, 'base64');
      
      // If decoded length is too short, it's likely plain text
      if (combined.length < 28) {
        console.log('📝 Detected plain text credentials (length < 28), using as-is');
        return encryptedData; // Return as plain text
      }
    } catch (e) {
      // Not valid base64, assume plain text
      console.log('📝 Detected plain text credentials (invalid base64), using as-is');
      return encryptedData; // Return as plain text
    }
    
    // Extract IV (first 12 bytes) and encrypted data (rest includes auth tag)
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    // Get encryption key
    const key = getEncryptionKey(userId);
    const encryptionSecret = process.env.ENCRYPTION_SECRET || 'ImperialTrade_BrokerEncryption_2025_v1';
    console.log(`🔑 Using encryption secret: ${encryptionSecret.substring(0, 10)}... (length: ${encryptionSecret.length})`);
    
    // Decrypt using AES-256-GCM
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    
    // GCM auth tag is last 16 bytes of encrypted data
    const authTag = encrypted.slice(-16);
    const ciphertext = encrypted.slice(0, -16);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error: any) {
    console.error('❌ Decryption failed:', {
      error: error?.message || error,
      stack: error?.stack,
      encryptedDataLength: encryptedData?.length,
      userIdLength: userId?.length,
      encryptionSecret: process.env.ENCRYPTION_SECRET ? 'SET' : 'NOT SET'
    });
    throw new Error(`Failed to decrypt credentials: ${error?.message || 'Unknown error'}`);
  }
}


