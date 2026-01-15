/**
 * Decrypt credentials in Edge Functions
 * Uses same encryption method as client-side: AES-256-GCM
 */

const ENCRYPTION_SECRET = Deno.env.get('ENCRYPTION_SECRET') || 'ImperialTrade_BrokerEncryption_2025_v1'

/**
 * Decrypt encrypted credential using user_id as key material
 */
export async function decryptCredential(encryptedData: string, userId: string): Promise<string> {
  try {
    // Decode base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))
    
    if (combined.length < 28) {
      // Too short to be encrypted data, return as-is (might be plaintext for testing)
      return encryptedData
    }
    
    // Extract IV (first 12 bytes) and encrypted data
    const iv = combined.slice(0, 12)
    const encrypted = combined.slice(12)
    
    // Derive key from user_id + secret (same as client-side)
    const keyMaterial = `${userId}-${ENCRYPTION_SECRET}`
    const encoder = new TextEncoder()
    const keyData = encoder.encode(keyMaterial)
    
    // Hash key material
    const keyBuffer = await crypto.subtle.digest('SHA-256', keyData)
    
    // Import as AES-GCM key
    const key = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    )
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    )
    
    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (error) {
    console.error('❌ Decryption failed:', error)
    throw new Error('Failed to decrypt credential')
  }
}
