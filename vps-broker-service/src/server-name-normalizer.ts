/**
 * Server Name Normalizer
 * 
 * Handles variations in MT5 server names to ensure consistent connection
 * - ECMarketsLtd-Demo -> ECMarketsLtd-Demo (keep as-is, but allow variations)
 * - ECMarkets-MT5-Demo -> ECMarketsLtd-Demo (normalize common variations)
 * - Case-insensitive matching
 */

export interface ServerNormalization {
  original: string;
  normalized: string;
  matched: boolean;
}

/**
 * Known server name mappings
 * Maps common variations to canonical server names
 */
const SERVER_NAME_MAPPINGS: Record<string, string> = {
  // EC Markets variations - prioritize ECMarketsLtd-* format (actual MT5 terminal format)
  'ecmarketsltd-demo': 'ECMarketsLtd-Demo',  // Actual format from MT5 terminal
  'ecmarkets-mt5-demo': 'ECMarketsLtd-Demo',  // Map email format to terminal format
  'ecmarkets-demo': 'ECMarketsLtd-Demo',
  'ec markets ltd-demo': 'ECMarketsLtd-Demo',
  'ecmarkets mt5 demo': 'ECMarketsLtd-Demo',
  
  'ecmarkets-mt5-live01': 'ECMarkets-MT5-Live01',
  'ecmarketsltd-live01': 'ECMarkets-MT5-Live01',  // Map old format to new
  'ecmarkets-live01': 'ECMarkets-MT5-Live01',
  'ecmarkets mt5 live01': 'ECMarkets-MT5-Live01',
  
  // XS.com variations
  'xs.com-demo': 'XS.com-Demo',
  'xs-com-demo': 'XS.com-Demo',
  'xsdemo': 'XS.com-Demo',
  
  'xs.com-live': 'XS.com-Live',
  'xs-com-live': 'XS.com-Live',
  'xslive': 'XS.com-Live',
  
  // PU Prime variations - prioritize formats from mobile app
  'puprime-demo': 'PUPrime-Demo',
  'pu-prime-demo': 'PUPrime-Demo',
  
  'puprime-live4': 'PUPrime-Live 4',  // Database format -> Mobile app format (with space)
  'puprime-live 4': 'PUPrime-Live 4',  // Mobile app format
  'puprime-live': 'PUPrime-Live 4',  // Generic -> try Live 4 first
  'pu-prime-live': 'PUPrime-Live 4',
  'puprimetrading-live': 'PUPrimeTrading-Live',  // Alternative format from mobile app
};

/**
 * Normalize server name
 * - Converts to lowercase for matching
 * - Removes extra spaces and special characters
 * - Maps known variations to canonical names
 * - Returns original if no mapping found
 */
export function normalizeServerName(serverName: string): ServerNormalization {
  if (!serverName || typeof serverName !== 'string') {
    return {
      original: serverName || '',
      normalized: serverName || '',
      matched: false,
    };
  }

  const original = serverName.trim();
  
  // Normalize for matching (lowercase, remove extra spaces)
  const normalizedKey = original
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
  
  // Check if we have a mapping
  const canonicalName = SERVER_NAME_MAPPINGS[normalizedKey];
  
  if (canonicalName) {
    return {
      original,
      normalized: canonicalName,
      matched: true,
    };
  }
  
  // No mapping found - return original (case-preserved)
  return {
    original,
    normalized: original,
    matched: false,
  };
}

/**
 * Try multiple server name variations
 * Useful when user enters a server name that might have slight variations
 * For EC Markets, tries both ECMarkets-MT5-* and ECMarketsLtd-* formats
 */
export function tryServerVariations(
  login: string,
  password: string,
  originalServer: string
): Array<{ server: string; priority: number }> {
  const normalized = normalizeServerName(originalServer);
  const variations: Array<{ server: string; priority: number }> = [];
  
  // Priority 1: Original name (user entered what they think is correct)
  variations.push({ server: originalServer, priority: 1 });
  
  // Priority 2: Normalized name (if different from original)
  if (normalized.matched && normalized.normalized !== normalized.original) {
    variations.push({ server: normalized.normalized, priority: 2 });
  }
  
  // Priority 3: Try common format variations for EC Markets
  const serverLower = originalServer.toLowerCase();
  if (serverLower.includes('ecmarkets')) {
    // Try ECMarketsLtd-* format (actual MT5 terminal format - shown in image)
    if (serverLower.includes('mt5') && !serverLower.includes('ltd')) {
      const ltdFormat = originalServer.replace(/mt5/gi, 'Ltd');
      if (ltdFormat !== originalServer) {
        variations.push({ server: ltdFormat, priority: 3 });
      }
    }
    // Try ECMarkets-MT5-* format (email format)
    if (serverLower.includes('ltd')) {
      const mt5Format = originalServer.replace(/ltd/gi, 'MT5');
      if (mt5Format !== originalServer) {
        variations.push({ server: mt5Format, priority: 4 });
      }
    }
  }
  
  // Priority 3: Try PU Prime format variations (with/without spaces)
  if (serverLower.includes('puprime')) {
    // Try with space: "PUPrime-Live 4" (mobile app format)
    if (serverLower.includes('live4') || serverLower.includes('live 4')) {
      const withSpace = originalServer.replace(/live4/gi, 'Live 4').replace(/live 4/gi, 'Live 4');
      if (withSpace !== originalServer) {
        variations.push({ server: withSpace, priority: 3 });
      }
      // Try without space: "PUPrime-Live4"
      const withoutSpace = originalServer.replace(/live 4/gi, 'Live4');
      if (withoutSpace !== originalServer && withoutSpace !== withSpace) {
        variations.push({ server: withoutSpace, priority: 4 });
      }
    }
    // Try PUPrimeTrading format
    if (serverLower.includes('live') && !serverLower.includes('trading')) {
      const tradingFormat = originalServer.replace(/puprime/gi, 'PUPrimeTrading');
      if (tradingFormat !== originalServer) {
        variations.push({ server: tradingFormat, priority: 4 });
      }
    }
  }
  
  // Priority 4: Common variations (if original doesn't match known pattern)
  if (!normalized.matched) {
    // Try with/without spaces, hyphens, etc.
    const commonVariations = [
      originalServer.replace(/[\s-]/g, ''),
      originalServer.replace(/\s+/g, '-'),
      originalServer.replace(/-/g, ''),
    ];
    
    for (const variation of commonVariations) {
      if (variation !== originalServer && variation.length > 0) {
        variations.push({ server: variation, priority: 4 });
      }
    }
  }
  
  // Remove duplicates (case-insensitive)
  const seen = new Set<string>();
  return variations.filter((v) => {
    const key = v.server.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}


