import React from 'react';
import { Typewriter } from './Typewriter';
import { SparklesIcon } from './ui/Icons';

interface AnalysisDisplayProps {
  analysis: string;
}

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ analysis }) => {
  if (!analysis) return null;

  return (
    <div className="relative mt-8 group">
      {/* Decorative gradient border effect */}
      <div className="absolute -inset-[1px] bg-gradient-to-r from-yellow-400 via-emerald-500 to-yellow-400 dark:from-bronze-500 dark:via-emerald-500 dark:to-bronze-500 rounded-3xl opacity-50 group-hover:opacity-80 transition duration-1000"></div>
      
      <div className="relative bg-slate-900 rounded-3xl p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
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
        <div className="text-slate-300 font-mono text-sm leading-relaxed max-h-[400px] overflow-y-auto custom-scrollbar">
           <Typewriter text={analysis} speed={15} />
        </div>
      </div>
    </div>
  );
};
