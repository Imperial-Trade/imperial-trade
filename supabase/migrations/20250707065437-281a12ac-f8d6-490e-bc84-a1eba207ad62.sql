
-- Create additional enum types
CREATE TYPE public.alert_condition AS ENUM ('above', 'below');
CREATE TYPE public.alert_status AS ENUM ('active', 'triggered');
CREATE TYPE public.impact_level AS ENUM ('High', 'Medium', 'Low');
CREATE TYPE public.mood_type AS ENUM ('Confident', 'Anxious', 'Greedy', 'Fearful', 'Neutral');
CREATE TYPE public.progress_status AS ENUM ('completed', 'in_progress');
CREATE TYPE public.upload_status AS ENUM ('pending', 'analyzed', 'error');
CREATE TYPE public.signal_type AS ENUM ('breakout', 'reversal', 'news_event', 'pattern');
CREATE TYPE public.signal_status AS ENUM ('active', 'expired', 'triggered');
CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE public.session_status AS ENUM ('scheduled', 'live', 'completed');
CREATE TYPE public.difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Create market_alerts table
CREATE TABLE public.market_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  asset_ticker TEXT NOT NULL,
  target_price DECIMAL NOT NULL,
  condition alert_condition NOT NULL,
  status alert_status DEFAULT 'active' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create economic_events table
CREATE TABLE public.economic_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  country TEXT NOT NULL,
  impact impact_level NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create psychology_logs table
CREATE TABLE public.psychology_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mood mood_type NOT NULL,
  confidence_level INTEGER CHECK (confidence_level >= 1 AND confidence_level <= 10) NOT NULL,
  notes TEXT,
  log_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  questions JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create quiz_attempts table
CREATE TABLE public.quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL,
  score DECIMAL NOT NULL,
  answers JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_progress table
CREATE TABLE public.user_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  status progress_status NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, video_id)
);

-- Create trade_history table
CREATE TABLE public.trade_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  analysis_result TEXT,
  upload_date DATE DEFAULT CURRENT_DATE NOT NULL,
  status upload_status DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create opportunity_signals table
CREATE TABLE public.opportunity_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  instrument TEXT NOT NULL,
  signal_type signal_type NOT NULL,
  description TEXT NOT NULL,
  probability DECIMAL CHECK (probability >= 0 AND probability <= 100) NOT NULL,
  key_levels DECIMAL[] DEFAULT '{}',
  time_frame TEXT,
  expiry_date TIMESTAMP WITH TIME ZONE,
  status signal_status DEFAULT 'active' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create risk_simulations table
CREATE TABLE public.risk_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  instrument TEXT NOT NULL,
  entry_price DECIMAL NOT NULL,
  stop_loss DECIMAL NOT NULL,
  take_profit DECIMAL NOT NULL,
  position_size DECIMAL NOT NULL,
  probability_analysis TEXT,
  risk_reward_ratio DECIMAL,
  simulation_date DATE DEFAULT CURRENT_DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create verified_traders table
CREATE TABLE public.verified_traders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trader_name TEXT NOT NULL,
  verification_status verification_status DEFAULT 'pending' NOT NULL,
  total_pnl DECIMAL NOT NULL,
  win_rate DECIMAL CHECK (win_rate >= 0 AND win_rate <= 100) NOT NULL,
  risk_score INTEGER CHECK (risk_score >= 1 AND risk_score <= 10) NOT NULL,
  trade_count INTEGER NOT NULL,
  vt_account_linked BOOLEAN DEFAULT false NOT NULL,
  rank_position INTEGER,
  verification_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create trading_groups table
CREATE TABLE public.trading_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_name TEXT NOT NULL,
  description TEXT,
  is_private BOOLEAN DEFAULT true NOT NULL,
  max_members INTEGER DEFAULT 5 NOT NULL,
  current_members INTEGER DEFAULT 1 NOT NULL,
  invite_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create group_journal_entries table
CREATE TABLE public.group_journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.trading_groups(id) ON DELETE CASCADE NOT NULL,
  trade_entry_id UUID REFERENCES public.trade_journal_entries(id) ON DELETE CASCADE NOT NULL,
  shared_notes TEXT,
  comments JSONB DEFAULT '[]',
  shared_date DATE DEFAULT CURRENT_DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create live_sessions table
CREATE TABLE public.live_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_title TEXT NOT NULL,
  host_name TEXT NOT NULL,
  session_date TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT,
  zoom_meeting_url TEXT NOT NULL,
  zoom_meeting_id TEXT,
  zoom_passcode TEXT,
  status session_status DEFAULT 'scheduled' NOT NULL,
  auto_start_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create learning_pathways table
CREATE TABLE public.learning_pathways (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pathway_name TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty_level difficulty_level NOT NULL,
  estimated_hours DECIMAL,
  modules JSONB NOT NULL,
  certificate_name TEXT,
  completion_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security on new tables
ALTER TABLE public.market_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.psychology_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_traders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_pathways ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user-specific tables
CREATE POLICY "Users can manage their own market alerts" ON public.market_alerts USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own psychology logs" ON public.psychology_logs USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own quiz attempts" ON public.quiz_attempts USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own progress" ON public.user_progress USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own trade history" ON public.trade_history USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own opportunity signals" ON public.opportunity_signals USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own risk simulations" ON public.risk_simulations USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own verified trader profile" ON public.verified_traders USING (auth.uid() = user_id);
CREATE POLICY "Users can manage trading groups they created" ON public.trading_groups USING (auth.uid() = created_by);
CREATE POLICY "Users can manage their own group journal entries" ON public.group_journal_entries USING (auth.uid() = user_id);

-- Create RLS policies for public/shared tables
CREATE POLICY "Anyone can view economic events" ON public.economic_events FOR SELECT USING (true);
CREATE POLICY "Anyone can view quizzes" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "Anyone can view live sessions" ON public.live_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can view learning pathways" ON public.learning_pathways FOR SELECT USING (true);

-- Create triggers for updated_at timestamps on new tables
CREATE TRIGGER update_market_alerts_updated_at BEFORE UPDATE ON public.market_alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_economic_events_updated_at BEFORE UPDATE ON public.economic_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_psychology_logs_updated_at BEFORE UPDATE ON public.psychology_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quiz_attempts_updated_at BEFORE UPDATE ON public.quiz_attempts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON public.user_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trade_history_updated_at BEFORE UPDATE ON public.trade_history FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_opportunity_signals_updated_at BEFORE UPDATE ON public.opportunity_signals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_risk_simulations_updated_at BEFORE UPDATE ON public.risk_simulations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_verified_traders_updated_at BEFORE UPDATE ON public.verified_traders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trading_groups_updated_at BEFORE UPDATE ON public.trading_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_group_journal_entries_updated_at BEFORE UPDATE ON public.group_journal_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_live_sessions_updated_at BEFORE UPDATE ON public.live_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_learning_pathways_updated_at BEFORE UPDATE ON public.learning_pathways FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
