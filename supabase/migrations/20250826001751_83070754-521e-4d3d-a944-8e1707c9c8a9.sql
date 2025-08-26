-- Enable realtime for trade_journal_entries table
ALTER TABLE public.trade_journal_entries REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_journal_entries;