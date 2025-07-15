export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      account_requests: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          approved_by: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone_number: string | null
          reason: string | null
          referrer: string | null
          rejection_reason: string | null
          social_id: string | null
          social_provider: Database["public"]["Enums"]["social_provider"] | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          username: string | null
          vt_market_account_number: string | null
          website: string | null
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          approved_by?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone_number?: string | null
          reason?: string | null
          referrer?: string | null
          rejection_reason?: string | null
          social_id?: string | null
          social_provider?:
            | Database["public"]["Enums"]["social_provider"]
            | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          username?: string | null
          vt_market_account_number?: string | null
          website?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          approved_by?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone_number?: string | null
          reason?: string | null
          referrer?: string | null
          rejection_reason?: string | null
          social_id?: string | null
          social_provider?:
            | Database["public"]["Enums"]["social_provider"]
            | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          username?: string | null
          vt_market_account_number?: string | null
          website?: string | null
        }
        Relationships: []
      }
      athena_interactions: {
        Row: {
          context: string | null
          created_at: string
          feedback_score: number | null
          id: string
          interaction_time: string
          prompt: string
          response: string
          updated_at: string
          user_email: string
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          feedback_score?: number | null
          id?: string
          interaction_time?: string
          prompt: string
          response: string
          updated_at?: string
          user_email: string
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          feedback_score?: number | null
          id?: string
          interaction_time?: string
          prompt?: string
          response?: string
          updated_at?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_email: string
          created_at: string
          details: Json | null
          id: string
          target_entity: string
          target_id: string
          updated_at: string
        }
        Insert: {
          action: string
          admin_email: string
          created_at?: string
          details?: Json | null
          id?: string
          target_entity: string
          target_id: string
          updated_at?: string
        }
        Update: {
          action?: string
          admin_email?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_entity?: string
          target_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          category: string | null
          created_at: string
          description: string
          difficulty: Database["public"]["Enums"]["course_difficulty"] | null
          id: string
          lessons: Json | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description: string
          difficulty?: Database["public"]["Enums"]["course_difficulty"] | null
          id?: string
          lessons?: Json | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string
          difficulty?: Database["public"]["Enums"]["course_difficulty"] | null
          id?: string
          lessons?: Json | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      economic_events: {
        Row: {
          country: string
          created_at: string
          event_date: string
          event_name: string
          id: string
          impact: Database["public"]["Enums"]["impact_level"]
          updated_at: string
        }
        Insert: {
          country: string
          created_at?: string
          event_date: string
          event_name: string
          id?: string
          impact: Database["public"]["Enums"]["impact_level"]
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          event_date?: string
          event_name?: string
          id?: string
          impact?: Database["public"]["Enums"]["impact_level"]
          updated_at?: string
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          category: Database["public"]["Enums"]["post_category"]
          content: string
          created_at: string
          id: string
          likes: number
          replies_count: number
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["post_category"]
          content: string
          created_at?: string
          id?: string
          likes?: number
          replies_count?: number
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["post_category"]
          content?: string
          created_at?: string
          id?: string
          likes?: number
          replies_count?: number
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      group_journal_entries: {
        Row: {
          comments: Json | null
          created_at: string
          group_id: string
          id: string
          shared_date: string
          shared_notes: string | null
          trade_entry_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comments?: Json | null
          created_at?: string
          group_id: string
          id?: string
          shared_date?: string
          shared_notes?: string | null
          trade_entry_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comments?: Json | null
          created_at?: string
          group_id?: string
          id?: string
          shared_date?: string
          shared_notes?: string | null
          trade_entry_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_journal_entries_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "trading_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_journal_entries_trade_entry_id_fkey"
            columns: ["trade_entry_id"]
            isOneToOne: false
            referencedRelation: "trade_journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_pathways: {
        Row: {
          certificate_name: string | null
          completion_count: number
          created_at: string
          description: string
          difficulty_level: Database["public"]["Enums"]["difficulty_level"]
          estimated_hours: number | null
          id: string
          modules: Json
          pathway_name: string
          updated_at: string
        }
        Insert: {
          certificate_name?: string | null
          completion_count?: number
          created_at?: string
          description: string
          difficulty_level: Database["public"]["Enums"]["difficulty_level"]
          estimated_hours?: number | null
          id?: string
          modules: Json
          pathway_name: string
          updated_at?: string
        }
        Update: {
          certificate_name?: string | null
          completion_count?: number
          created_at?: string
          description?: string
          difficulty_level?: Database["public"]["Enums"]["difficulty_level"]
          estimated_hours?: number | null
          id?: string
          modules?: Json
          pathway_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      live_sessions: {
        Row: {
          auto_start_enabled: boolean
          created_at: string
          description: string | null
          host_name: string
          id: string
          session_date: string
          session_title: string
          status: Database["public"]["Enums"]["session_status"]
          stream_embed_url: string | null
          updated_at: string
          zoom_meeting_id: string | null
          zoom_meeting_number: string | null
          zoom_meeting_url: string
          zoom_passcode: string | null
          zoom_sdk_enabled: boolean | null
        }
        Insert: {
          auto_start_enabled?: boolean
          created_at?: string
          description?: string | null
          host_name: string
          id?: string
          session_date: string
          session_title: string
          status?: Database["public"]["Enums"]["session_status"]
          stream_embed_url?: string | null
          updated_at?: string
          zoom_meeting_id?: string | null
          zoom_meeting_number?: string | null
          zoom_meeting_url: string
          zoom_passcode?: string | null
          zoom_sdk_enabled?: boolean | null
        }
        Update: {
          auto_start_enabled?: boolean
          created_at?: string
          description?: string | null
          host_name?: string
          id?: string
          session_date?: string
          session_title?: string
          status?: Database["public"]["Enums"]["session_status"]
          stream_embed_url?: string | null
          updated_at?: string
          zoom_meeting_id?: string | null
          zoom_meeting_number?: string | null
          zoom_meeting_url?: string
          zoom_passcode?: string | null
          zoom_sdk_enabled?: boolean | null
        }
        Relationships: []
      }
      market_alerts: {
        Row: {
          asset_ticker: string
          condition: Database["public"]["Enums"]["alert_condition"]
          created_at: string
          id: string
          status: Database["public"]["Enums"]["alert_status"]
          target_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_ticker: string
          condition: Database["public"]["Enums"]["alert_condition"]
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["alert_status"]
          target_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_ticker?: string
          condition?: Database["public"]["Enums"]["alert_condition"]
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["alert_status"]
          target_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunity_signals: {
        Row: {
          created_at: string
          description: string
          expiry_date: string | null
          id: string
          instrument: string
          key_levels: number[] | null
          probability: number
          signal_type: Database["public"]["Enums"]["signal_type"]
          status: Database["public"]["Enums"]["signal_status"]
          time_frame: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          expiry_date?: string | null
          id?: string
          instrument: string
          key_levels?: number[] | null
          probability: number
          signal_type: Database["public"]["Enums"]["signal_type"]
          status?: Database["public"]["Enums"]["signal_status"]
          time_frame?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          expiry_date?: string | null
          id?: string
          instrument?: string
          key_levels?: number[] | null
          probability?: number
          signal_type?: Database["public"]["Enums"]["signal_type"]
          status?: Database["public"]["Enums"]["signal_status"]
          time_frame?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          asset_name: string
          asset_type: Database["public"]["Enums"]["asset_type"]
          avg_buy_price: number
          created_at: string
          id: string
          quantity: number
          ticker: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_name: string
          asset_type: Database["public"]["Enums"]["asset_type"]
          avg_buy_price: number
          created_at?: string
          id?: string
          quantity: number
          ticker: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_name?: string
          asset_type?: Database["public"]["Enums"]["asset_type"]
          avg_buy_price?: number
          created_at?: string
          id?: string
          quantity?: number
          ticker?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level_enum"] | null
          account_status:
            | Database["public"]["Enums"]["account_status_enum"]
            | null
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string
          last_login: string | null
          phone_number: string | null
          registration_source:
            | Database["public"]["Enums"]["registration_source_enum"]
            | null
          role: string | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type_enum"] | null
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["access_level_enum"] | null
          account_status?:
            | Database["public"]["Enums"]["account_status_enum"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          last_login?: string | null
          phone_number?: string | null
          registration_source?:
            | Database["public"]["Enums"]["registration_source_enum"]
            | null
          role?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type_enum"] | null
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level_enum"] | null
          account_status?:
            | Database["public"]["Enums"]["account_status_enum"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          last_login?: string | null
          phone_number?: string | null
          registration_source?:
            | Database["public"]["Enums"]["registration_source_enum"]
            | null
          role?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type_enum"] | null
        }
        Relationships: []
      }
      psychology_logs: {
        Row: {
          confidence_level: number
          created_at: string
          id: string
          log_date: string
          mood: Database["public"]["Enums"]["mood_type"]
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence_level: number
          created_at?: string
          id?: string
          log_date: string
          mood: Database["public"]["Enums"]["mood_type"]
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence_level?: number
          created_at?: string
          id?: string
          log_date?: string
          mood?: Database["public"]["Enums"]["mood_type"]
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          created_at: string
          id: string
          quiz_id: string
          score: number
          updated_at: string
          user_email: string
          user_id: string
        }
        Insert: {
          answers: Json
          created_at?: string
          id?: string
          quiz_id: string
          score: number
          updated_at?: string
          user_email: string
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          quiz_id?: string
          score?: number
          updated_at?: string
          user_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          id: string
          questions: Json
          title: string
          updated_at: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          questions: Json
          title: string
          updated_at?: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          questions?: Json
          title?: string
          updated_at?: string
          video_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          attempt_count: number
          blocked_until: string | null
          created_at: string
          id: string
          identifier: string
          last_attempt: string
          limit_type: string
          updated_at: string
          window_start: string
        }
        Insert: {
          attempt_count?: number
          blocked_until?: string | null
          created_at?: string
          id?: string
          identifier: string
          last_attempt?: string
          limit_type: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          attempt_count?: number
          blocked_until?: string | null
          created_at?: string
          id?: string
          identifier?: string
          last_attempt?: string
          limit_type?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      replies: {
        Row: {
          content: string
          created_at: string
          id: string
          likes: number
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          likes?: number
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          likes?: number
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_simulations: {
        Row: {
          created_at: string
          entry_price: number
          id: string
          instrument: string
          position_size: number
          probability_analysis: string | null
          risk_reward_ratio: number | null
          simulation_date: string
          stop_loss: number
          take_profit: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_price: number
          id?: string
          instrument: string
          position_size: number
          probability_analysis?: string | null
          risk_reward_ratio?: number | null
          simulation_date?: string
          stop_loss: number
          take_profit: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_price?: number
          id?: string
          instrument?: string
          position_size?: number
          probability_analysis?: string | null
          risk_reward_ratio?: number | null
          simulation_date?: string
          stop_loss?: number
          take_profit?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trade_alerts: {
        Row: {
          asset_name: string
          close_reason: Database["public"]["Enums"]["close_reason"] | null
          created_at: string
          entry_price: number
          finnhub_symbol: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["trade_alert_status"]
          stop_loss: number
          tp_hits: number[] | null
          tp1: number | null
          tp2: number | null
          tp3: number | null
          tp4: number | null
          tp5: number | null
          trade_type: Database["public"]["Enums"]["trade_alert_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_name: string
          close_reason?: Database["public"]["Enums"]["close_reason"] | null
          created_at?: string
          entry_price: number
          finnhub_symbol: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["trade_alert_status"]
          stop_loss: number
          tp_hits?: number[] | null
          tp1?: number | null
          tp2?: number | null
          tp3?: number | null
          tp4?: number | null
          tp5?: number | null
          trade_type: Database["public"]["Enums"]["trade_alert_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_name?: string
          close_reason?: Database["public"]["Enums"]["close_reason"] | null
          created_at?: string
          entry_price?: number
          finnhub_symbol?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["trade_alert_status"]
          stop_loss?: number
          tp_hits?: number[] | null
          tp1?: number | null
          tp2?: number | null
          tp3?: number | null
          tp4?: number | null
          tp5?: number | null
          trade_type?: Database["public"]["Enums"]["trade_alert_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trade_history: {
        Row: {
          analysis_result: string | null
          created_at: string
          file_url: string
          id: string
          status: Database["public"]["Enums"]["upload_status"]
          updated_at: string
          upload_date: string
          user_id: string
        }
        Insert: {
          analysis_result?: string | null
          created_at?: string
          file_url: string
          id?: string
          status?: Database["public"]["Enums"]["upload_status"]
          updated_at?: string
          upload_date?: string
          user_id: string
        }
        Update: {
          analysis_result?: string | null
          created_at?: string
          file_url?: string
          id?: string
          status?: Database["public"]["Enums"]["upload_status"]
          updated_at?: string
          upload_date?: string
          user_id?: string
        }
        Relationships: []
      }
      trade_journal_entries: {
        Row: {
          ai_positive_feedback: string | null
          asset_ticker: string
          created_at: string
          entry_price: number | null
          exit_price: number | null
          id: string
          notes: string | null
          pnl: number
          position_size: number | null
          screenshot_url: string | null
          trade_date: string
          trade_type: Database["public"]["Enums"]["trade_type"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_positive_feedback?: string | null
          asset_ticker: string
          created_at?: string
          entry_price?: number | null
          exit_price?: number | null
          id?: string
          notes?: string | null
          pnl: number
          position_size?: number | null
          screenshot_url?: string | null
          trade_date: string
          trade_type?: Database["public"]["Enums"]["trade_type"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_positive_feedback?: string | null
          asset_ticker?: string
          created_at?: string
          entry_price?: number | null
          exit_price?: number | null
          id?: string
          notes?: string | null
          pnl?: number
          position_size?: number | null
          screenshot_url?: string | null
          trade_date?: string
          trade_type?: Database["public"]["Enums"]["trade_type"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trading_groups: {
        Row: {
          created_at: string
          created_by: string
          current_members: number
          description: string | null
          group_name: string
          id: string
          invite_code: string | null
          is_private: boolean
          max_members: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_members?: number
          description?: string | null
          group_name: string
          id?: string
          invite_code?: string | null
          is_private?: boolean
          max_members?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_members?: number
          description?: string | null
          group_name?: string
          id?: string
          invite_code?: string | null
          is_private?: boolean
          max_members?: number
          updated_at?: string
        }
        Relationships: []
      }
      trading_strategies: {
        Row: {
          backtest_results: Json | null
          created_at: string
          created_by: string
          description: string
          id: string
          indicators: string[] | null
          is_public: boolean
          likes: number
          rules: Json
          strategy_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          backtest_results?: Json | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          indicators?: string[] | null
          is_public?: boolean
          likes?: number
          rules: Json
          strategy_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          backtest_results?: Json | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          indicators?: string[] | null
          is_public?: boolean
          likes?: number
          rules?: Json
          strategy_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_pathway_progress: {
        Row: {
          certificate_earned: boolean
          completed_date: string | null
          completion_percentage: number
          created_at: string
          current_module: number
          id: string
          pathway_id: string
          started_date: string
          updated_at: string
          user_email: string
          user_id: string
        }
        Insert: {
          certificate_earned?: boolean
          completed_date?: string | null
          completion_percentage?: number
          created_at?: string
          current_module?: number
          id?: string
          pathway_id: string
          started_date?: string
          updated_at?: string
          user_email: string
          user_id: string
        }
        Update: {
          certificate_earned?: boolean
          completed_date?: string | null
          completion_percentage?: number
          created_at?: string
          current_module?: number
          id?: string
          pathway_id?: string
          started_date?: string
          updated_at?: string
          user_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_pathway_progress_pathway_id_fkey"
            columns: ["pathway_id"]
            isOneToOne: false
            referencedRelation: "learning_pathways"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          created_at: string
          id: string
          status: Database["public"]["Enums"]["progress_status"]
          updated_at: string
          user_email: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status: Database["public"]["Enums"]["progress_status"]
          updated_at?: string
          user_email: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["progress_status"]
          updated_at?: string
          user_email?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      verified_traders: {
        Row: {
          created_at: string
          id: string
          rank_position: number | null
          risk_score: number
          total_pnl: number
          trade_count: number
          trader_name: string
          updated_at: string
          user_id: string
          verification_date: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
          vt_account_linked: boolean
          win_rate: number
        }
        Insert: {
          created_at?: string
          id?: string
          rank_position?: number | null
          risk_score: number
          total_pnl: number
          trade_count: number
          trader_name: string
          updated_at?: string
          user_id: string
          verification_date?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          vt_account_linked?: boolean
          win_rate: number
        }
        Update: {
          created_at?: string
          id?: string
          rank_position?: number | null
          risk_score?: number
          total_pnl?: number
          trade_count?: number
          trader_name?: string
          updated_at?: string
          user_id?: string
          verification_date?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          vt_account_linked?: boolean
          win_rate?: number
        }
        Relationships: []
      }
      videos: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          difficulty: string | null
          duration: number | null
          id: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          duration?: number | null
          id?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          duration?: number | null
          id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      access_level_enum: "user" | "moderator" | "admin"
      account_status_enum:
        | "active"
        | "suspended"
        | "pending_verification"
        | "inactive"
      account_type: "user" | "admin" | "educator"
      alert_condition: "above" | "below"
      alert_status: "active" | "triggered"
      asset_type: "Stock" | "Crypto" | "Forex" | "Commodity"
      close_reason:
        | "manual"
        | "stop_loss"
        | "tp1"
        | "tp2"
        | "tp3"
        | "tp4"
        | "tp5"
        | "reversal_after_tp"
      course_difficulty: "Beginner" | "Intermediate" | "Advanced"
      difficulty_level: "beginner" | "intermediate" | "advanced"
      impact_level: "High" | "Medium" | "Low"
      mood_type: "Confident" | "Anxious" | "Greedy" | "Fearful" | "Neutral"
      post_category:
        | "discussion"
        | "question"
        | "analysis"
        | "news"
        | "strategy"
      progress_status: "completed" | "in_progress"
      registration_source_enum:
        | "direct"
        | "account_request"
        | "social"
        | "admin_created"
        | "invitation"
      request_status: "pending" | "approved" | "rejected"
      session_status: "scheduled" | "live" | "completed"
      signal_status: "active" | "expired" | "triggered"
      signal_type: "breakout" | "reversal" | "news_event" | "pattern"
      social_provider: "gmail" | "facebook" | "manual"
      trade_alert_status: "pending" | "active" | "closed"
      trade_alert_type: "buy" | "sell" | "buy_limit" | "sell_limit"
      trade_type: "Long" | "Short"
      upload_status: "pending" | "analyzed" | "error"
      user_type_enum: "member" | "educator" | "admin"
      verification_status: "pending" | "verified" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      access_level_enum: ["user", "moderator", "admin"],
      account_status_enum: [
        "active",
        "suspended",
        "pending_verification",
        "inactive",
      ],
      account_type: ["user", "admin", "educator"],
      alert_condition: ["above", "below"],
      alert_status: ["active", "triggered"],
      asset_type: ["Stock", "Crypto", "Forex", "Commodity"],
      close_reason: [
        "manual",
        "stop_loss",
        "tp1",
        "tp2",
        "tp3",
        "tp4",
        "tp5",
        "reversal_after_tp",
      ],
      course_difficulty: ["Beginner", "Intermediate", "Advanced"],
      difficulty_level: ["beginner", "intermediate", "advanced"],
      impact_level: ["High", "Medium", "Low"],
      mood_type: ["Confident", "Anxious", "Greedy", "Fearful", "Neutral"],
      post_category: ["discussion", "question", "analysis", "news", "strategy"],
      progress_status: ["completed", "in_progress"],
      registration_source_enum: [
        "direct",
        "account_request",
        "social",
        "admin_created",
        "invitation",
      ],
      request_status: ["pending", "approved", "rejected"],
      session_status: ["scheduled", "live", "completed"],
      signal_status: ["active", "expired", "triggered"],
      signal_type: ["breakout", "reversal", "news_event", "pattern"],
      social_provider: ["gmail", "facebook", "manual"],
      trade_alert_status: ["pending", "active", "closed"],
      trade_alert_type: ["buy", "sell", "buy_limit", "sell_limit"],
      trade_type: ["Long", "Short"],
      upload_status: ["pending", "analyzed", "error"],
      user_type_enum: ["member", "educator", "admin"],
      verification_status: ["pending", "verified", "rejected"],
    },
  },
} as const
