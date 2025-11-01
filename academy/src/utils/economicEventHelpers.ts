export interface EventDescription {
  title: string;
  explanation: string;
  traderImpact: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  typicalReaction: 'bullish' | 'bearish' | 'mixed';
  category: string;
}

export const eventDescriptions: Record<string, EventDescription> = {
  'non_farm_payrolls': {
    title: 'US Jobs Report',
    explanation: 'Shows how many new jobs were created in the US last month (excluding farm workers).',
    traderImpact: 'More jobs = stronger economy = USD usually goes up. Fewer jobs = weaker economy = USD usually goes down.',
    difficulty: 'beginner',
    typicalReaction: 'bullish',
    category: 'Employment'
  },
  'unemployment_rate': {
    title: 'Unemployment Rate',
    explanation: 'Percentage of people actively looking for work but can\'t find a job.',
    traderImpact: 'Lower unemployment = stronger economy = currency goes up. Higher unemployment = weaker economy = currency goes down.',
    difficulty: 'beginner',
    typicalReaction: 'bearish',
    category: 'Employment'
  },
  'consumer_price_index': {
    title: 'Inflation Rate (CPI)',
    explanation: 'Measures how much prices have increased compared to last year.',
    traderImpact: 'Higher inflation often leads to higher interest rates, which can strengthen the currency but hurt stocks.',
    difficulty: 'beginner',
    typicalReaction: 'mixed',
    category: 'Inflation'
  },
  'gdp': {
    title: 'Economic Growth (GDP)',
    explanation: 'Shows how fast the country\'s economy is growing compared to the previous period.',
    traderImpact: 'Faster growth = stronger economy = currency and stocks usually go up.',
    difficulty: 'beginner',
    typicalReaction: 'bullish',
    category: 'Growth'
  },
  'federal_funds_rate': {
    title: 'Interest Rate Decision',
    explanation: 'The central bank sets the cost of borrowing money for banks.',
    traderImpact: 'Higher rates = stronger currency but can hurt stocks. Lower rates = weaker currency but can boost stocks.',
    difficulty: 'intermediate',
    typicalReaction: 'mixed',
    category: 'Monetary Policy'
  },
  'manufacturing_pmi': {
    title: 'Manufacturing Health Index',
    explanation: 'Shows if manufacturing companies are expanding (above 50) or contracting (below 50).',
    traderImpact: 'Above 50 = manufacturing growing = positive for currency and stocks. Below 50 = manufacturing shrinking = negative.',
    difficulty: 'intermediate',
    typicalReaction: 'bullish',
    category: 'Manufacturing'
  },
  'retail_sales': {
    title: 'Consumer Spending',
    explanation: 'How much money people spent at stores and online last month.',
    traderImpact: 'Higher spending = strong consumer confidence = positive for economy and currency.',
    difficulty: 'beginner',
    typicalReaction: 'bullish',
    category: 'Consumer'
  },
  'trade_balance': {
    title: 'Trade Balance',
    explanation: 'Difference between what a country exports vs imports.',
    traderImpact: 'Trade surplus (more exports) = positive for currency. Trade deficit (more imports) = negative for currency.',
    difficulty: 'intermediate',
    typicalReaction: 'mixed',
    category: 'Trade'
  }
};

export function getEventDescription(eventName: string): EventDescription {
  const normalized = eventName.toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  // Try exact match first
  if (eventDescriptions[normalized]) {
    return eventDescriptions[normalized];
  }
  
  // Try partial matches
  for (const [key, description] of Object.entries(eventDescriptions)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return description;
    }
  }
  
  // Default fallback
  return {
    title: formatEventTitle(eventName),
    explanation: 'This economic indicator provides insight into the health of the economy.',
    traderImpact: 'Check the forecast vs actual values to gauge potential market impact.',
    difficulty: 'intermediate',
    typicalReaction: 'mixed',
    category: 'Economic Data'
  };
}

export function formatEventTitle(eventName: string): string {
  return eventName
    .split(/[_\s-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function formatValue(value: string | undefined, eventType: string): string {
  if (!value) return 'N/A';
  
  const numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
  
  if (isNaN(numValue)) return value;
  
  // Format based on event type
  if (eventType.toLowerCase().includes('rate') || eventType.toLowerCase().includes('percentage')) {
    return `${numValue}%`;
  }
  
  if (eventType.toLowerCase().includes('payroll') || eventType.toLowerCase().includes('job')) {
    if (numValue >= 1000000) {
      return `${(numValue / 1000000).toFixed(1)}M jobs`;
    } else if (numValue >= 1000) {
      return `${(numValue / 1000).toFixed(0)}K jobs`;
    }
    return `${numValue} jobs`;
  }
  
  if (eventType.toLowerCase().includes('sales') || eventType.toLowerCase().includes('spending')) {
    return `${numValue > 0 ? '+' : ''}${numValue}%`;
  }
  
  return value;
}

export function getImpactExplanation(impact: string, actual?: string, forecast?: string): string {
  if (!actual || !forecast) {
    return `This is a ${impact} impact event that typically moves markets.`;
  }
  
  const actualNum = parseFloat(actual.replace(/[^0-9.-]/g, ''));
  const forecastNum = parseFloat(forecast.replace(/[^0-9.-]/g, ''));
  
  if (isNaN(actualNum) || isNaN(forecastNum)) {
    return `This is a ${impact} impact event that typically moves markets.`;
  }
  
  const diff = actualNum - forecastNum;
  const diffPercent = Math.abs(diff / forecastNum * 100);
  
  if (Math.abs(diff) < 0.01) {
    return 'Came in exactly as expected - minimal market reaction likely.';
  }
  
  const direction = diff > 0 ? 'better than' : 'worse than';
  const magnitude = diffPercent > 10 ? 'significantly' : diffPercent > 5 ? 'moderately' : 'slightly';
  
  return `Came in ${magnitude} ${direction} expected (${diff > 0 ? '+' : ''}${diff.toFixed(2)}) - expect ${magnitude} market movement.`;
}

export function getTimeUntilEvent(eventDate: string, eventTime?: string): string {
  const now = new Date();
  const eventDateTime = new Date(eventDate);
  
  if (eventTime) {
    const [hours, minutes] = eventTime.split(':').map(Number);
    eventDateTime.setHours(hours, minutes, 0, 0);
  }
  
  const diffMs = eventDateTime.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffMs < 0) {
    return 'Released';
  }
  
  if (diffHours < 1) {
    return `In ${diffMinutes}m`;
  }
  
  if (diffHours < 24) {
    return `In ${diffHours}h ${diffMinutes}m`;
  }
  
  const diffDays = Math.floor(diffHours / 24);
  return `In ${diffDays}d ${diffHours % 24}h`;
}

export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'beginner': return 'text-green-400 bg-green-500/10 border-green-500/20';
    case 'intermediate': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    case 'advanced': return 'text-red-400 bg-red-500/10 border-red-500/20';
    default: return 'text-muted-foreground bg-muted/10 border-border';
  }
}

export function getReactionIcon(reaction: string): string {
  switch (reaction) {
    case 'bullish': return '📈';
    case 'bearish': return '📉';
    case 'mixed': return '⚖️';
    default: return '📊';
  }
}