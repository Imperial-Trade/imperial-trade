// Utility functions for coaching edge functions

export function smartTruncateNotes(notes: string, maxChars: number): string {
  if (notes.length <= maxChars) return notes;
  
  // Smart truncation: keep first 40% + keyword sentences + last 20%
  const firstPart = Math.floor(maxChars * 0.4);
  const lastPart = Math.floor(maxChars * 0.2);
  const middlePart = maxChars - firstPart - lastPart;
  
  const first = notes.substring(0, firstPart);
  const last = notes.substring(notes.length - lastPart);
  
  // Find keyword sentences in the middle section
  const middleSection = notes.substring(firstPart, notes.length - lastPart);
  const sentences = middleSection.split(/[.!?]+/).filter(s => s.trim());
  
  const keywords = ['FVG', 'liquidity', 'equal highs', 'equal lows', 'entry', 'exit', 'stop', 'take profit', 'TP', 'SL'];
  const keywordSentences = sentences.filter(sentence => 
    keywords.some(keyword => sentence.toLowerCase().includes(keyword.toLowerCase()))
  ).slice(0, 2); // Max 2 keyword sentences
  
  const keywordText = keywordSentences.join('. ');
  const remainingSpace = middlePart - keywordText.length;
  
  if (remainingSpace > 0 && keywordText) {
    return `${first} ${keywordText}. ${last}`.substring(0, maxChars);
  }
  
  return `${first}... ${last}`;
}

export interface FallbackContext {
  userName: string;
  asset: string;
  tradeType?: string;
  isWin: boolean;
  pnlAmount: number;
  notes: string;
  hasScreenshot: boolean;
}

export function generatePersonalizedFallback(context: FallbackContext): string {
  const { userName, asset, tradeType, isWin, pnlAmount, notes, hasScreenshot } = context;
  
  // Extract meaningful snippet from notes (12-20 words)
  const noteSnippet = extractMeaningfulSnippet(notes);
  const direction = tradeType?.includes('buy') ? 'long' : tradeType?.includes('sell') ? 'short' : '';
  const screenshotRef = hasScreenshot ? ' That chart tells the story perfectly.' : '';
  
  if (isWin) {
    // Winning trade variants
    const variants = [
      `Nice ${direction} play on ${asset}, ${userName}! That $${pnlAmount} win came from solid execution. ${noteSnippet} shows you're reading the market well.${screenshotRef} Keep trusting your process and stacking these wins.`,
      
      `${userName}, that ${asset} trade delivered $${pnlAmount} in profit because you stayed disciplined. Your notes on \"${noteSnippet}\" reveal sharp market awareness.${screenshotRef} This is how consistent traders are built.`,
      
      `Strong work on ${asset}, ${userName}! $${pnlAmount} profit from executing your plan. The way you analyzed \"${noteSnippet}\" shows real market insight.${screenshotRef} This edge will serve you well.`
    ];
    
    return variants[Math.floor(Math.random() * variants.length)];
  } else {
    // Losing trade variants
    const variants = [
      `Tough ${direction} on ${asset} today, ${userName}, but you logged that $${pnlAmount} loss with courage. Your reflection on \"${noteSnippet}\" shows real self-awareness.${screenshotRef} This kind of honest analysis builds champion traders.`,
      
      `${userName}, that $${pnlAmount} sting on ${asset} hurts, but you're facing it head-on. Your notes about \"${noteSnippet}\" show you're extracting the lesson.${screenshotRef} Every pro has scars like this - it's how you respond that matters.`,
      
      `Brutal day on ${asset}, ${userName}, losing $${pnlAmount} is never easy. But documenting \"${noteSnippet}\" shows you're committed to growth over comfort.${screenshotRef} This resilience separates traders from gamblers.`
    ];
    
    return variants[Math.floor(Math.random() * variants.length)];
  }
}

function extractMeaningfulSnippet(notes: string): string {
  if (!notes || notes.length < 20) return 'your market analysis';
  
  // Find first meaningful sentence (not just a fragment)
  const sentences = notes.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length > 0) {
    const firstSentence = sentences[0].trim();
    // Limit to 12-20 words
    const words = firstSentence.split(' ').slice(0, 18);
    return words.join(' ') + (words.length < firstSentence.split(' ').length ? '...' : '');
  }
  
  // Fallback: take first 15 words
  return notes.split(' ').slice(0, 15).join(' ') + '...';
}
