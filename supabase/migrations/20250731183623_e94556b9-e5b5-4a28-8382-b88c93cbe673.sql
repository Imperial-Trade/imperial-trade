-- Phase 1: Database Schema Migration for Tradermade
-- Rename finnhub_symbol to tradermade_symbol in trade_alerts table
ALTER TABLE public.trade_alerts 
RENAME COLUMN finnhub_symbol TO tradermade_symbol;

-- Update existing data to use Tradermade symbol format
UPDATE public.trade_alerts 
SET tradermade_symbol = CASE 
  WHEN tradermade_symbol = 'XAU/USD' THEN 'XAUUSD'
  WHEN tradermade_symbol = 'BTC/USD' THEN 'BTCUSD'
  ELSE tradermade_symbol
END;

-- Update alert_monitoring table symbol column to match new format
UPDATE public.alert_monitoring 
SET symbol = CASE 
  WHEN symbol = 'XAU/USD' THEN 'XAUUSD'
  WHEN symbol = 'BTC/USD' THEN 'BTCUSD'
  ELSE symbol
END;