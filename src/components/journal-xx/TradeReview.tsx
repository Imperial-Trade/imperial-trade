import React from 'react';
import { Typewriter } from './Typewriter';
import { SparklesIcon } from './ui/Icons';

interface TradeReviewProps {
  analysis: string;
  onEdit: () => void;
  onDone: () => void;
}

export const TradeReview: React.FC<TradeReviewProps> = ({ analysis, onEdit, onDone }) => {
  return (
    <div className="flex flex-col h-full w-full animate-in fade-in duration-500 overflow-hidden">
      
      {/* AI Mentor Insight Card - Gradient Border Wrapper */}
      <div className="flex-1 min-h-0 relative group rounded-3xl p-[2px] bg-gradient-to-r from-yellow-400 via-emerald-500 to-yellow-400 dark:from-bronze-500 dark:via-emerald-500 dark:to-bronze-500">
         {/* Inner Content - Dark Terminal Style */}
         <div className="relative bg-slate-900 rounded-[22px] p-6 shadow-2xl overflow-hidden flex flex-col h-full border border-slate-800/50">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3 shrink-0">
                <div className="p-1.5 bg-yellow-500/10 border-yellow-500/20 dark:bg-bronze-500/10 rounded-lg border dark:border-bronze-500/20">
                    <SparklesIcon className="w-4 h-4 text-yellow-500 dark:text-bronze-500" />
                </div>
                <span className="text-dirty-white font-mono text-sm font-bold tracking-widest uppercase">AI Mentor Insight</span>
                
                <div className="ml-auto flex gap-1.5 opacity-30">
                    <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                    <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar text-slate-300 font-mono text-sm leading-relaxed pr-2 whitespace-pre-wrap">
                <Typewriter text={analysis.replace(/(\d+\.)/g, '$1 ')} speed={15} />
            </div>
         </div>
      </div>

      {/* Action Buttons - Fixed at bottom of the flex container */}
      <div className="flex gap-3 mt-4 shrink-0">
        <button
            onClick={onEdit}
            className="flex-1 py-2 rounded-xl font-bold text-sm tracking-wide uppercase border border-stone-300 dark:border-slate-700 text-stone-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
        >
            EDIT
        </button>
        <button
            onClick={onDone}
            className="flex-[2] py-2 rounded-xl font-bold text-sm tracking-wide uppercase bg-bronze-500 text-black shadow-lg hover:bg-bronze-400 transition-colors"
        >
            DONE
        </button>
      </div>
    </div>
  );
};
