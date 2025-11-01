
import React from 'react';
import { TradeJournalProvider } from '@/contexts/TradeJournalContext';
import TradingJournal from '@/components/tools/TradingJournal';

const TradingJournalPage: React.FC = () => {
  return (
    <TradeJournalProvider>
      <TradingJournal />
    </TradeJournalProvider>
  );
};

export default TradingJournalPage;
