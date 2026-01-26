// ============================================
// PHASE 4: ENHANCED ERROR LOGGING
// ============================================

export interface DatabaseLogPayload {
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';
  table: string;
  id?: string;
  data?: Record<string, unknown>;
  timestamp: string;
  userId?: string;
}

/**
 * Logs database operations with detailed payload information
 * Helps diagnose issues like empty strings in boolean fields
 */
export function logDatabaseOperation(payload: DatabaseLogPayload): void {
  const logPrefix = `🔍 [DB ${payload.operation}] ${payload.table}`;
  
  console.group(logPrefix);
  console.log('Timestamp:', payload.timestamp);
  
  if (payload.id) {
    console.log('Record ID:', payload.id);
  }
  
  if (payload.userId) {
    console.log('User ID:', payload.userId);
  }
  
  if (payload.data) {
    console.log('Payload Data:', JSON.stringify(payload.data, null, 2));
    
    // Detect potentially problematic values
    const issues: string[] = [];
    
    Object.entries(payload.data).forEach(([key, value]) => {
      // Check for empty strings in fields that should be boolean/number/null
      if (value === '' && !key.includes('note') && !key.includes('text') && !key.includes('name')) {
        issues.push(`⚠️ Empty string in field: ${key}`);
      }
      
      // Check for invalid boolean representations
      if (typeof value === 'string' && (value === 'true' || value === 'false')) {
        issues.push(`⚠️ String boolean in field: ${key} = "${value}"`);
      }
    });
    
    if (issues.length > 0) {
      console.warn('Potential Issues Detected:');
      issues.forEach(issue => console.warn(issue));
    }
  }
  
  console.groupEnd();
}

/**
 * Logs database errors with detailed context
 */
export function logDatabaseError(
  operation: string,
  table: string,
  error: Error | unknown,
  context?: Record<string, unknown>
): void {
  console.error(`❌ [DB ERROR] ${operation} on ${table}`);
  console.error('Error:', error);
  
  if (context) {
    console.error('Context:', JSON.stringify(context, null, 2));
  }
  
  // Specific error pattern detection
  if (error?.message?.includes('invalid input syntax for type boolean')) {
    console.error('🔴 BOOLEAN TYPE ERROR DETECTED!');
    console.error('This typically means an empty string "" was passed to a boolean field.');
    console.error('Check the payload data above for empty strings.');
  }
}
