/**
 * Decrypt credentials in Edge Functions
 * Uses same encryption method as client-side: AES-256-GCM
 * 
 * Supports two formats:
 * 1. Base64: base64(IV[12] + ciphertext + authTag[16])
 * 2. Hex with colons: hex(IV):hex(nonce):hex(ciphertext+tag) - legacy format
 */

const ENCRYPTION_SECRET = Deno.env.get('ENCRYPTION_SECRET') || 'ImperialTrade_BrokerEncryption_2025_v1'

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}

/**
 * Decrypt encrypted credential using user_id as key material
 */
export async function decryptCredential(encryptedData: string, userId: string): Promise<string> {
  try {
    let combined: Uint8Array
    
    // Check if it's hex format with colons (legacy format)
    if (encryptedData.includes(':')) {
      const parts = encryptedData.split(':')
      if (parts.length === 3) {
        // Parse hex parts: iv:nonce:ciphertext
        const iv = hexToBytes(parts[0])
        const nonce = hexToBytes(parts[1])
        const ciphertext = hexToBytes(parts[2])
        
        // Combine into standard format: IV + ciphertext (nonce is part of IV in some implementations)
        // Try IV directly with ciphertext
        combined = new Uint8Array(iv.length + nonce.length + ciphertext.length)
        combined.set(iv, 0)
        combined.set(nonce, iv.length)
        combined.set(ciphertext, iv.length + nonce.length)
        
        console.log(`[DECRYPT] Hex format detected: ${iv.length}+${nonce.length}+${ciphertext.length} = ${combined.length} bytes`)
      } else {
        console.warn('[DECRYPT] Invalid hex format, returning as-is')
        return encryptedData
      }
    } else {
      // Standard base64 format
      try {
        combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))
      } catch {
        // Not valid base64, return as-is (might be plaintext for testing)
        console.warn('[DECRYPT] Not valid base64, returning as-is')
        return encryptedData
      }
    }
    
    if (combined.length < 28) {
      // Too short to be encrypted data, return as-is (might be plaintext for testing)
      console.warn(`[DECRYPT] Data too short (${combined.length} bytes), returning as-is`)
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
    const result = decoder.decode(decrypted)
    console.log(`[DECRYPT] Successfully decrypted to: ${result.substring(0, 3)}***`)
    return result
  } catch (error) {
    console.error('❌ Decryption failed:', error)
    // Return empty string on failure (don't expose encrypted data)
    return ''
  }
}
