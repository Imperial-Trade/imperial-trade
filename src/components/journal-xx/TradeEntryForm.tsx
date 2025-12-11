import React, { useState, useRef, useEffect } from 'react';
import { TradeFormData, TradeEntry, AnalysisStatus } from './types';
import { UploadIcon, SparklesIcon, CalendarIcon } from './ui/Icons';
import { PhaseLoader } from './PhaseLoader';

interface TradeEntryFormProps {
  onSubmit: (data: TradeFormData) => void;
  initialData?: TradeEntry | null;
  isEditing?: boolean;
  onCancelEdit?: () => void;
  analysisStatus?: AnalysisStatus;
  isAnalysisReady?: boolean; // New prop
  onAnalysisComplete?: () => void;
}

// Helper to get local date string YYYY-MM-DD
const getLocalDateString = (date?: Date) => {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const TradeEntryForm: React.FC<TradeEntryFormProps> = ({ 
  onSubmit, 
  initialData, 
  isEditing = false, 
  onCancelEdit,
  analysisStatus = AnalysisStatus.IDLE,
  isAnalysisReady = false,
  onAnalysisComplete
}) => {
  // Initialize with local date
  const [date, setDate] = useState(getLocalDateString());
  const [asset, setAsset] = useState('');
  const [pnl, setPnl] = useState('');
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAnalyzing = analysisStatus === AnalysisStatus.ANALYZING;

  // Populate form when initialData changes (Edit Mode)
  useEffect(() => {
    if (initialData) {
      try {
        const d = new Date(initialData.date);
        setDate(getLocalDateString(d));
      } catch (e) {
        setDate(getLocalDateString());
      }
      setAsset(initialData.asset);
      setPnl(initialData.pnl.toString());
      setNotes(initialData.notes);
      setPreviewUrl(initialData.imageUrl || null);
      setImage(null);
    } else if (!isEditing) {
      setDate(getLocalDateString());
      setAsset('');
      setPnl('');
      setNotes('');
      setPreviewUrl(null);
      setImage(null);
    }
  }, [initialData, isEditing]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAnalyzing) return; // Prevent double submit
    if (!asset || !pnl) return;
    
    onSubmit({
      date,
      asset,
      pnl,
      notes,
      image
    });

    if (!isEditing) {
        // Clear logic handled by parent if needed, but safe to clear here
        setDate(getLocalDateString());
        setAsset('');
        setPnl('');
        setNotes('');
        setImage(null);
        setPreviewUrl(null);
    }
  };

  const handleCancel = () => {
    if (onCancelEdit) {
        onCancelEdit();
        setDate(getLocalDateString());
        setAsset('');
        setPnl('');
        setNotes('');
        setImage(null);
        setPreviewUrl(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      {/* Header Section with Date Picker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
         <h2 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-3 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-yellow-500 dark:bg-bronze-500 rotate-45"></span>
            {isEditing ? 'Edit Trade' : 'Log Entry'}
         </h2>
         
         <div className="relative group">
             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 dark:text-slate-500 pointer-events-none group-focus-within:text-yellow-500 dark:group-focus-within:text-bronze-500 transition-colors">
                <CalendarIcon className="w-4 h-4" />
             </div>
             <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isAnalyzing}
                className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-sm font-mono font-bold text-stone-900 dark:text-white focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 focus:border-yellow-500 dark:focus:border-bronze-500 outline-none shadow-sm transition-all hover:border-yellow-500/50 dark:hover:border-bronze-500/50 [color-scheme:light] dark:[color-scheme:dark] w-full md:w-auto cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                required
             />
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Asset Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-500 dark:text-dirty-white uppercase tracking-wider">Asset</label>
          <input
            type="text"
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            disabled={isAnalyzing}
            placeholder="e.g. BTC/USD"
            className="w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl px-4 py-3 text-lg font-semibold text-stone-900 dark:text-white focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 focus:border-yellow-500 dark:focus:border-bronze-500 transition-all shadow-sm placeholder-stone-400 dark:placeholder-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
            required
          />
        </div>

        {/* PnL Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-stone-500 dark:text-dirty-white uppercase tracking-wider">Profit / Loss ($)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 dark:text-slate-500 font-bold">$</span>
            <input
              type="number"
              value={pnl}
              onChange={(e) => setPnl(e.target.value)}
              disabled={isAnalyzing}
              placeholder="0.00"
              step="0.01"
              className={`w-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl pl-8 pr-4 py-3 text-lg font-semibold focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 focus:border-yellow-500 dark:focus:border-bronze-500 transition-all shadow-sm placeholder-stone-400 dark:placeholder-slate-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                Number(pnl) > 0 ? 'text-emerald-500' : Number(pnl) < 0 ? 'text-rose-500' : 'text-stone-900 dark:text-white'
              }`}
              required
            />
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="space-y-2 flex-1">
        <label className="text-xs font-bold text-stone-500 dark:text-dirty-white uppercase tracking-wider">Strategy & Psychology Notes</label>
        <div className="relative group h-full">
            <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isAnalyzing}
            placeholder="Why did you take this trade? How did you feel?"
            className="w-full h-full bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-xl px-4 py-3 text-stone-900 dark:text-white focus:ring-1 focus:ring-yellow-500 dark:focus:ring-bronze-500 focus:border-yellow-500 dark:focus:border-bronze-500 transition-all leading-7 shadow-sm resize-none placeholder-stone-400 dark:placeholder-slate-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[120px]"
            />
        </div>
      </div>

      {/* Image Upload */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-stone-500 dark:text-dirty-white uppercase tracking-wider">Chart Snapshot</label>
        <div 
          onClick={() => !isAnalyzing && fileInputRef.current?.click()}
          className={`w-full bg-white dark:bg-slate-900 border-2 border-dashed border-stone-200 ${!isAnalyzing ? 'hover:border-yellow-500 dark:hover:border-bronze-500 cursor-pointer' : 'cursor-not-allowed opacity-60'} dark:border-bronze-500/40 rounded-xl p-6 flex items-center justify-center transition-all group min-h-[100px]`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageChange} 
            className="hidden" 
            accept="image/*"
            disabled={isAnalyzing}
          />
          
          {previewUrl ? (
            <div className="relative w-full h-32 overflow-hidden rounded-xl">
              <img src={previewUrl} alt="Chart preview" className="w-full h-full object-cover" />
              {!isAnalyzing && (
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                   <span className="bg-white/90 dark:bg-slate-900/90 px-3 py-1 rounded-xl text-xs font-bold shadow-sm text-yellow-600 dark:text-bronze-500 border border-yellow-500/30 dark:border-bronze-500/30">Change Image</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <UploadIcon 
                className="w-6 h-6 text-stone-400 dark:text-bronze-500 animate-bounce" 
                style={{ animationDuration: '3s' }}
              />
              <span className="text-xs font-bold text-stone-500 dark:text-bronze-500 tracking-wide">Click to upload chart</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons / Loader Area */}
      <div className="flex gap-4 h-[68px] animate-in fade-in duration-300 mt-2 shrink-0">
        {isAnalyzing ? (
           <div className="flex-1 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-900/50 flex items-center justify-center shadow-inner">
               <PhaseLoader 
                  isReady={isAnalysisReady}
                  onComplete={() => onAnalysisComplete && onAnalysisComplete()} 
               />
           </div>
        ) : isEditing ? (
            <>
                <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 py-4 rounded-xl font-bold text-lg border border-stone-200 dark:border-slate-700 text-stone-500 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800 transition-all uppercase tracking-wide"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="flex-1 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-yellow-500/20 dark:hover:shadow-bronze-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 bg-yellow-500 dark:bg-bronze-500 hover:bg-yellow-400 dark:hover:bg-bronze-400 border border-yellow-600 dark:border-bronze-600 text-black dark:text-black uppercase tracking-wide"
                >
                    Update Trade
                </button>
            </>
        ) : (
            <button
                type="submit"
                className="flex-1 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-yellow-500/20 dark:hover:shadow-bronze-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 bg-yellow-500 dark:bg-bronze-500 hover:bg-yellow-400 dark:hover:bg-bronze-400 border border-yellow-600 dark:border-bronze-600 text-black dark:text-black uppercase tracking-wide"
            >
                <SparklesIcon className="w-5 h-5 text-black" />
                <span>ANALYZE TRADE</span>
            </button>
        )}
      </div>
    </form>
  );
};
