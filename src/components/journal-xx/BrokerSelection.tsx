/**
 * Broker Selection Component
 * Allows users to choose from XS.com or EC Markets
 */

import React from 'react';
import { CheckIcon } from './ui/Icons';

export type BrokerType = 'XS' | 'EC_MARKETS';

interface Broker {
  id: BrokerType;
  name: string;
  logo?: string;
  description: string;
  serverExamples: string[];
}

const BROKERS: Broker[] = [
  {
    id: 'XS',
    name: 'XS.com',
    description: 'Global multi-asset broker with competitive spreads',
    serverExamples: ['XSFintech-REAL-1 (Live)', 'XSFintech-DEMO']
  },
  {
    id: 'EC_MARKETS',
    name: 'EC Markets',
    description: 'Premium forex and CFD broker',
    serverExamples: ['ECMarkets-MT5-Live01 (Live)', 'ECMarketsLtd-Demo']
  }
];

interface BrokerSelectionProps {
  selectedBroker: BrokerType | null;
  onSelect: (broker: BrokerType) => void;
  isDarkMode: boolean;
}

export const BrokerSelection: React.FC<BrokerSelectionProps> = ({
  selectedBroker,
  onSelect,
  isDarkMode
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4 text-foreground">
        Select Your Broker
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-2xl mx-auto">
        {BROKERS.map((broker) => {
          const isSelected = selectedBroker === broker.id;
          return (
            <button
              key={broker.id}
              onClick={() => onSelect(broker.id)}
              className={`
                relative p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all duration-300
                w-full text-left
                ${isSelected
                  ? isDarkMode
                    ? 'border-bronze-500 bg-bronze-500/10 shadow-[0_0_20px_rgba(205,127,50,0.3)]'
                    : 'border-yellow-500 bg-yellow-500/10 shadow-[0_0_20px_rgba(234,179,8,0.3)]'
                  : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 active:scale-[0.98]'
                }
              `}
            >
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <div className={`
                    w-6 h-6 rounded-full flex items-center justify-center
                    ${isDarkMode ? 'bg-bronze-500' : 'bg-yellow-500'}
                  `}>
                    <CheckIcon className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
              
              <div className="text-left w-full">
                <h4 className="text-lg sm:text-xl font-bold mb-2 text-foreground">
                  {broker.name}
                </h4>
                <p className="text-xs sm:text-sm text-foreground/70 mb-3">
                  {broker.description}
                </p>
                <div className="text-xs text-foreground/50">
                  <p className="font-semibold mb-1">Server Examples:</p>
                  {broker.serverExamples.map((server, idx) => (
                    <p key={idx} className="font-mono text-[10px] sm:text-xs break-all">{server}</p>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export { BROKERS };
export type { Broker };
