export interface TradeEntry {
  id: string;
  date: string;
  asset: string;
  pnl: number;
  notes: string;
  imageUrl?: string; // Base64 for display
  aiFeedback?: string;
  // Pro Fields
  direction?: 'Long' | 'Short';
  outcome?: 'Win' | 'Loss' | 'Break Even';
  strategy?: string;
  emotion?: string;
  session?: string;
  ai_rating?: 'A' | 'B' | 'C' | 'F';
}

export interface TradeFormData {
  date: string; // YYYY-MM-DD
  asset: string;
  pnl: string; // Keep as string for input handling
  notes: string;
  image: File | null;
  // Pro Fields
  direction?: 'Long' | 'Short';
  outcome?: 'Win' | 'Loss' | 'Break Even';
  strategy?: string;
  emotion?: string;
  session?: string;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}
