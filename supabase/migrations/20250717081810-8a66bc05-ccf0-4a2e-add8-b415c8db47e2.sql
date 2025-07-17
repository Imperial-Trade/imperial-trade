
-- Phase 1: Database Foundation Enhancements

-- Add gamification fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS learning_streak integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_learning_date date,
ADD COLUMN IF NOT EXISTS trading_points integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS trading_identity_level text DEFAULT 'Aspiring Trader';

-- Enhance user_progress table for detailed lesson tracking
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id),
ADD COLUMN IF NOT EXISTS completed_lessons jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
ADD COLUMN IF NOT EXISTS current_lesson_index integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_timestamp integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_watched timestamp with time zone,
ADD COLUMN IF NOT EXISTS completion_date timestamp with time zone;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_progress_course_id ON public.user_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_course ON public.user_progress(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_profiles_learning_streak ON public.profiles(learning_streak);

-- Insert the 10 Imperial Academy courses
INSERT INTO public.courses (title, description, category, difficulty, lessons, thumbnail_url) VALUES
('Module 1: Trading for Beginners', 'Master the fundamentals of trading with professional techniques', 'foundation', 'beginner', '[
  {"title": "Introduction to Trading", "duration": 15, "youtube_video_id": "demo1", "summary": "Learn the basics of financial markets"},
  {"title": "Market Structure", "duration": 20, "youtube_video_id": "demo2", "summary": "Understanding how markets work"},
  {"title": "Trading Terminology", "duration": 18, "youtube_video_id": "demo3", "summary": "Essential trading vocabulary"},
  {"title": "Getting Started", "duration": 25, "youtube_video_id": "demo4", "summary": "Your first steps in trading"}
]'::jsonb, 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=225&fit=crop'),

('Module 2: First Mission - Place a Trade Like a Pro', 'Execute your first professional trade with confidence', 'execution', 'beginner', '[
  {"title": "Trade Setup", "duration": 22, "youtube_video_id": "demo5", "summary": "How to set up a winning trade"},
  {"title": "Order Types", "duration": 18, "youtube_video_id": "demo6", "summary": "Understanding different order types"},
  {"title": "Risk Management", "duration": 25, "youtube_video_id": "demo7", "summary": "Protecting your capital"}
]'::jsonb, 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&h=225&fit=crop'),

('Module 3: Gold Rush - Mastering Safe Havens', 'Navigate safe haven assets during market volatility', 'safe-havens', 'intermediate', '[
  {"title": "Understanding Gold", "duration": 20, "youtube_video_id": "demo8", "summary": "Gold as a safe haven asset"},
  {"title": "Safe Haven Strategies", "duration": 28, "youtube_video_id": "demo9", "summary": "Trading strategies for volatile times"},
  {"title": "Market Correlation", "duration": 22, "youtube_video_id": "demo10", "summary": "How assets correlate during crisis"}
]'::jsonb, 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400&h=225&fit=crop'),

('Module 4: Timing the Market - Master the Global Clock', 'Perfect your market timing with global session analysis', 'timing', 'intermediate', '[
  {"title": "Trading Sessions", "duration": 25, "youtube_video_id": "demo11", "summary": "Understanding global trading sessions"},
  {"title": "Volume Analysis", "duration": 30, "youtube_video_id": "demo12", "summary": "Using volume to time entries"},
  {"title": "Market Hours Strategy", "duration": 22, "youtube_video_id": "demo13", "summary": "Optimizing trades by time"}
]'::jsonb, 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=225&fit=crop'),

('Module 5: Trading Rules', 'Establish and follow professional trading rules', 'discipline', 'intermediate', '[
  {"title": "Rule Development", "duration": 20, "youtube_video_id": "demo14", "summary": "Creating your trading rules"},
  {"title": "Discipline & Psychology", "duration": 25, "youtube_video_id": "demo15", "summary": "Mental aspects of trading"},
  {"title": "Rule Testing", "duration": 18, "youtube_video_id": "demo16", "summary": "Backtesting your rules"},
  {"title": "Rule Refinement", "duration": 22, "youtube_video_id": "demo17", "summary": "Improving your strategy"}
]'::jsonb, 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=225&fit=crop'),

('Module 6: Fast Pips Formula', 'Quick scalping strategies for fast profits', 'scalping', 'advanced', '[
  {"title": "Scalping Basics", "duration": 15, "youtube_video_id": "demo18", "summary": "Introduction to scalping"},
  {"title": "Fast Entry Techniques", "duration": 20, "youtube_video_id": "demo19", "summary": "Quick entry strategies"},
  {"title": "Exit Strategies", "duration": 18, "youtube_video_id": "demo20", "summary": "When and how to exit"}
]'::jsonb, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=225&fit=crop'),

('Module 7: Ghost in the Chart - Liquidity', 'Master liquidity concepts and smart money moves', 'liquidity', 'advanced', '[
  {"title": "Understanding Liquidity", "duration": 25, "youtube_video_id": "demo21", "summary": "What is market liquidity"},
  {"title": "Liquidity Zones", "duration": 30, "youtube_video_id": "demo22", "summary": "Identifying key liquidity areas"},
  {"title": "Smart Money Concepts", "duration": 28, "youtube_video_id": "demo23", "summary": "Following institutional moves"},
  {"title": "Liquidity Trading", "duration": 32, "youtube_video_id": "demo24", "summary": "Trading around liquidity"}
]'::jsonb, 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=225&fit=crop'),

('Module 8: Bank-Level Trading - Smart Money Flow', 'Trade like institutions with advanced flow analysis', 'institutional', 'advanced', '[
  {"title": "Institutional Thinking", "duration": 35, "youtube_video_id": "demo25", "summary": "How banks trade"},
  {"title": "Order Flow Analysis", "duration": 40, "youtube_video_id": "demo26", "summary": "Reading market flow"},
  {"title": "Smart Money Strategy", "duration": 38, "youtube_video_id": "demo27", "summary": "Following big money"}
]'::jsonb, 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=225&fit=crop'),

('Module 9: Order Flow Mastery', 'Advanced order flow reading and interpretation', 'order-flow', 'expert', '[
  {"title": "Order Flow Mastery", "duration": 45, "youtube_video_id": "demo28", "summary": "Complete order flow analysis"}
]'::jsonb, 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=400&h=225&fit=crop'),

('Module 10: Protecting Your Capital', 'Advanced risk management and capital preservation', 'risk-management', 'expert', '[
  {"title": "Risk Assessment", "duration": 30, "youtube_video_id": "demo29", "summary": "Evaluating trading risks"},
  {"title": "Position Sizing", "duration": 25, "youtube_video_id": "demo30", "summary": "Optimal position sizing"},
  {"title": "Drawdown Management", "duration": 28, "youtube_video_id": "demo31", "summary": "Managing losing periods"},
  {"title": "Capital Preservation", "duration": 35, "youtube_video_id": "demo32", "summary": "Long-term wealth protection"}
]'::jsonb, 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&h=225&fit=crop')

ON CONFLICT (title) DO NOTHING;

-- Enable realtime for progress tracking
ALTER TABLE public.user_progress REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_progress;

-- Create function to update learning streak
CREATE OR REPLACE FUNCTION public.update_learning_streak()
RETURNS trigger AS $$
BEGIN
  -- Update learning streak when user completes a lesson
  IF NEW.completion_date IS NOT NULL AND OLD.completion_date IS NULL THEN
    UPDATE public.profiles 
    SET 
      last_learning_date = CURRENT_DATE,
      learning_streak = CASE 
        WHEN last_learning_date = CURRENT_DATE - INTERVAL '1 day' THEN learning_streak + 1
        WHEN last_learning_date = CURRENT_DATE THEN learning_streak
        ELSE 1
      END,
      trading_points = trading_points + 10
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for learning streak updates
CREATE TRIGGER update_learning_streak_trigger
  AFTER UPDATE ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_learning_streak();
