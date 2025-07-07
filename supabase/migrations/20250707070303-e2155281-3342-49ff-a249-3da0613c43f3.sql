
-- Create additional enum types for new entities
CREATE TYPE public.trade_alert_type AS ENUM ('buy', 'sell', 'buy_limit', 'sell_limit');
CREATE TYPE public.trade_alert_status AS ENUM ('pending', 'active', 'closed');
CREATE TYPE public.close_reason AS ENUM ('manual', 'stop_loss', 'tp1', 'tp2', 'tp3', 'tp4', 'tp5', 'reversal_after_tp');
CREATE TYPE public.account_type AS ENUM ('user', 'admin');
CREATE TYPE public.social_provider AS ENUM ('gmail', 'facebook', 'manual');
CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.course_difficulty AS ENUM ('Beginner', 'Intermediate', 'Advanced');

-- Create user_pathway_progress table
CREATE TABLE public.user_pathway_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pathway_id UUID REFERENCES public.learning_pathways(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL,
  current_module INTEGER DEFAULT 0 NOT NULL,
  completion_percentage DECIMAL DEFAULT 0 NOT NULL,
  started_date DATE DEFAULT CURRENT_DATE NOT NULL,
  completed_date DATE,
  certificate_earned BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, pathway_id)
);

-- Create trading_strategies table
CREATE TABLE public.trading_strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  strategy_name TEXT NOT NULL,
  description TEXT NOT NULL,
  rules JSONB NOT NULL,
  indicators TEXT[] DEFAULT '{}',
  backtest_results JSONB,
  is_public BOOLEAN DEFAULT false NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  likes INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create athena_interactions table
CREATE TABLE public.athena_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  context TEXT,
  feedback_score INTEGER DEFAULT 0,
  interaction_time TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create trade_alerts table
CREATE TABLE public.trade_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  asset_name TEXT NOT NULL,
  finnhub_symbol TEXT NOT NULL,
  trade_type trade_alert_type NOT NULL,
  entry_price DECIMAL NOT NULL,
  stop_loss DECIMAL NOT NULL,
  tp1 DECIMAL,
  tp2 DECIMAL,
  tp3 DECIMAL,
  tp4 DECIMAL,
  tp5 DECIMAL,
  status trade_alert_status DEFAULT 'active' NOT NULL,
  tp_hits INTEGER[] DEFAULT '{}',
  close_reason close_reason,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create account_requests table
CREATE TABLE public.account_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  username TEXT,
  email TEXT NOT NULL,
  account_type account_type NOT NULL,
  reason TEXT,
  social_provider social_provider,
  social_id TEXT,
  status request_status DEFAULT 'pending' NOT NULL,
  approved_by TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create courses table
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT,
  difficulty course_difficulty,
  lessons JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security on new tables
ALTER TABLE public.user_pathway_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athena_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user-specific tables
CREATE POLICY "Users can manage their own pathway progress" ON public.user_pathway_progress USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own trading strategies" ON public.trading_strategies USING (auth.uid() = user_id);
CREATE POLICY "Users can view public trading strategies" ON public.trading_strategies FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can manage their own athena interactions" ON public.athena_interactions USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own trade alerts" ON public.trade_alerts USING (auth.uid() = user_id);

-- Create RLS policies for admin-only tables
CREATE POLICY "Anyone can create account requests" ON public.account_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view their own account requests" ON public.account_requests FOR SELECT USING (true);
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Admins can create audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- Create RLS policies for public/shared tables
CREATE POLICY "Anyone can view courses" ON public.courses FOR SELECT USING (true);

-- Create triggers for updated_at timestamps on new tables
CREATE TRIGGER update_user_pathway_progress_updated_at BEFORE UPDATE ON public.user_pathway_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trading_strategies_updated_at BEFORE UPDATE ON public.trading_strategies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_athena_interactions_updated_at BEFORE UPDATE ON public.athena_interactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trade_alerts_updated_at BEFORE UPDATE ON public.trade_alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_account_requests_updated_at BEFORE UPDATE ON public.account_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_audit_logs_updated_at BEFORE UPDATE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
