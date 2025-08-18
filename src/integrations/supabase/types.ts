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
      account_request_audit: {
        Row: {
          account_request_id: string
          change_type: string
          changed_by: string
          changed_fields: Json | null
          created_at: string | null
          id: string
          new_values: Json | null
          notes: string | null
          old_values: Json | null
        }
        Insert: {
          account_request_id: string
          change_type: string
          changed_by: string
          changed_fields?: Json | null
          created_at?: string | null
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
        }
        Update: {
          account_request_id?: string
          change_type?: string
          changed_by?: string
          changed_fields?: Json | null
          created_at?: string | null
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "account_request_audit_account_request_id_fkey"
            columns: ["account_request_id"]
            isOneToOne: false
            referencedRelation: "account_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      account_requests: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          approved_by: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          last_resubmitted_at: string | null
          original_rejection_reason: string | null
          phone_number: string | null
          reason: string | null
          referrer: string | null
          rejection_reason: string | null
          resubmission_count: number | null
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
          last_resubmitted_at?: string | null
          original_rejection_reason?: string | null
          phone_number?: string | null
          reason?: string | null
          referrer?: string | null
          rejection_reason?: string | null
          resubmission_count?: number | null
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
          last_resubmitted_at?: string | null
          original_rejection_reason?: string | null
          phone_number?: string | null
          reason?: string | null
          referrer?: string | null
          rejection_reason?: string | null
          resubmission_count?: number | null
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
      agent_outputs: {
        Row: {
          agent_name: string
          created_at: string
          id: string
          metadata: Json | null
          output_text: string
          updated_at: string
          user_id: string
          user_readable_text: string | null
        }
        Insert: {
          agent_name: string
          created_at?: string
          id?: string
          metadata?: Json | null
          output_text: string
          updated_at?: string
          user_id: string
          user_readable_text?: string | null
        }
        Update: {
          agent_name?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          output_text?: string
          updated_at?: string
          user_id?: string
          user_readable_text?: string | null
        }
        Relationships: []
      }
      ai_coach_feedback: {
        Row: {
          coaching_analysis: Json
          created_at: string
          feedback_type: string
          id: string
          journal_entry_id: string
          model_used: string
          updated_at: string
          user_id: string
        }
        Insert: {
          coaching_analysis: Json
          created_at?: string
          feedback_type?: string
          id?: string
          journal_entry_id: string
          model_used?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          coaching_analysis?: Json
          created_at?: string
          feedback_type?: string
          id?: string
          journal_entry_id?: string
          model_used?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_coach_feedback_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "trade_journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_monitoring: {
        Row: {
          alert_type: string
          created_at: string
          current_price: number | null
          id: string
          is_active: boolean | null
          last_checked_at: string | null
          priority_level: number | null
          signal_id: string
          symbol: string
          target_price: number
          updated_at: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          current_price?: number | null
          id?: string
          is_active?: boolean | null
          last_checked_at?: string | null
          priority_level?: number | null
          signal_id: string
          symbol: string
          target_price: number
          updated_at?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          current_price?: number | null
          id?: string
          is_active?: boolean | null
          last_checked_at?: string | null
          priority_level?: number | null
          signal_id?: string
          symbol?: string
          target_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_monitoring_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "trade_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_notifications: {
        Row: {
          alert_monitoring_id: string
          delivery_channels: string[] | null
          delivery_status: Json | null
          id: string
          notification_type: string
          sent_at: string
          signal_id: string
          target_price: number
          triggered_price: number
        }
        Insert: {
          alert_monitoring_id: string
          delivery_channels?: string[] | null
          delivery_status?: Json | null
          id?: string
          notification_type: string
          sent_at?: string
          signal_id: string
          target_price: number
          triggered_price: number
        }
        Update: {
          alert_monitoring_id?: string
          delivery_channels?: string[] | null
          delivery_status?: Json | null
          id?: string
          notification_type?: string
          sent_at?: string
          signal_id?: string
          target_price?: number
          triggered_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "alert_notifications_alert_monitoring_id_fkey"
            columns: ["alert_monitoring_id"]
            isOneToOne: false
            referencedRelation: "alert_monitoring"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_notifications_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "trade_alerts"
            referencedColumns: ["id"]
          },
        ]
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
      celebration_history: {
        Row: {
          celebration_data: Json | null
          celebration_preference: string | null
          celebration_type: string
          created_at: string | null
          id: string
          module_number: number | null
          user_id: string
          user_interaction: string | null
        }
        Insert: {
          celebration_data?: Json | null
          celebration_preference?: string | null
          celebration_type: string
          created_at?: string | null
          id?: string
          module_number?: number | null
          user_id: string
          user_interaction?: string | null
        }
        Update: {
          celebration_data?: Json | null
          celebration_preference?: string | null
          celebration_type?: string
          created_at?: string | null
          id?: string
          module_number?: number | null
          user_id?: string
          user_interaction?: string | null
        }
        Relationships: []
      }
      coach_message_cache: {
        Row: {
          cached_message: Json
          created_at: string | null
          expires_at: string
          id: string
          message_type: string
          user_id: string
        }
        Insert: {
          cached_message: Json
          created_at?: string | null
          expires_at: string
          id?: string
          message_type: string
          user_id: string
        }
        Update: {
          cached_message?: Json
          created_at?: string | null
          expires_at?: string
          id?: string
          message_type?: string
          user_id?: string
        }
        Relationships: []
      }
      collection_posts: {
        Row: {
          added_at: string
          collection_id: string
          id: string
          post_id: string
        }
        Insert: {
          added_at?: string
          collection_id: string
          id?: string
          post_id: string
        }
        Update: {
          added_at?: string
          collection_id?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_posts_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "post_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_published: boolean | null
          module_number: number
          order_index: number
          prerequisites: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          module_number: number
          order_index?: number
          prerequisites?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          module_number?: number
          order_index?: number
          prerequisites?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string
          difficulty: Database["public"]["Enums"]["course_difficulty"] | null
          enrollment_count: number | null
          id: string
          is_published: boolean | null
          lessons: Json | null
          order_index: number | null
          prerequisites: Json | null
          thumbnail_url: string | null
          title: string
          total_duration_minutes: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          difficulty?: Database["public"]["Enums"]["course_difficulty"] | null
          enrollment_count?: number | null
          id?: string
          is_published?: boolean | null
          lessons?: Json | null
          order_index?: number | null
          prerequisites?: Json | null
          thumbnail_url?: string | null
          title: string
          total_duration_minutes?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          difficulty?: Database["public"]["Enums"]["course_difficulty"] | null
          enrollment_count?: number | null
          id?: string
          is_published?: boolean | null
          lessons?: Json | null
          order_index?: number | null
          prerequisites?: Json | null
          thumbnail_url?: string | null
          title?: string
          total_duration_minutes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      cron_job_logs: {
        Row: {
          created_at: string
          error_message: string | null
          execution_time: string
          id: string
          job_name: string
          records_affected: number
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          execution_time?: string
          id?: string
          job_name: string
          records_affected?: number
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          execution_time?: string
          id?: string
          job_name?: string
          records_affected?: number
          status?: string
        }
        Relationships: []
      }
      economic_events: {
        Row: {
          actual_value: string | null
          category: string | null
          country: string
          created_at: string
          currency_code: string | null
          description: string | null
          difficulty_level: string | null
          event_date: string
          event_name: string
          event_time: string | null
          external_id: string | null
          forecast: string | null
          formatted_actual: string | null
          formatted_forecast: string | null
          formatted_previous: string | null
          human_readable_title: string | null
          id: string
          impact: Database["public"]["Enums"]["impact_level"]
          last_updated: string | null
          previous_value: string | null
          source: string | null
          trader_explanation: string | null
          typical_reaction: string | null
          updated_at: string
        }
        Insert: {
          actual_value?: string | null
          category?: string | null
          country: string
          created_at?: string
          currency_code?: string | null
          description?: string | null
          difficulty_level?: string | null
          event_date: string
          event_name: string
          event_time?: string | null
          external_id?: string | null
          forecast?: string | null
          formatted_actual?: string | null
          formatted_forecast?: string | null
          formatted_previous?: string | null
          human_readable_title?: string | null
          id?: string
          impact: Database["public"]["Enums"]["impact_level"]
          last_updated?: string | null
          previous_value?: string | null
          source?: string | null
          trader_explanation?: string | null
          typical_reaction?: string | null
          updated_at?: string
        }
        Update: {
          actual_value?: string | null
          category?: string | null
          country?: string
          created_at?: string
          currency_code?: string | null
          description?: string | null
          difficulty_level?: string | null
          event_date?: string
          event_name?: string
          event_time?: string | null
          external_id?: string | null
          forecast?: string | null
          formatted_actual?: string | null
          formatted_forecast?: string | null
          formatted_previous?: string | null
          human_readable_title?: string | null
          id?: string
          impact?: Database["public"]["Enums"]["impact_level"]
          last_updated?: string | null
          previous_value?: string | null
          source?: string | null
          trader_explanation?: string | null
          typical_reaction?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          category: Database["public"]["Enums"]["post_category"]
          content: string
          created_at: string
          difficulty: string | null
          id: string
          images: string[] | null
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
          difficulty?: string | null
          id?: string
          images?: string[] | null
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
          difficulty?: string | null
          id?: string
          images?: string[] | null
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
      learning_streaks: {
        Row: {
          created_at: string | null
          id: string
          last_activity: string | null
          longest_streak: number | null
          monthly_consistency: number | null
          streak_count: number | null
          total_learning_time: number | null
          updated_at: string | null
          user_id: string
          weekly_goals_met: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_activity?: string | null
          longest_streak?: number | null
          monthly_consistency?: number | null
          streak_count?: number | null
          total_learning_time?: number | null
          updated_at?: string | null
          user_id: string
          weekly_goals_met?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_activity?: string | null
          longest_streak?: number | null
          monthly_consistency?: number | null
          streak_count?: number | null
          total_learning_time?: number | null
          updated_at?: string | null
          user_id?: string
          weekly_goals_met?: number | null
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
          vimeo_event_id: string | null
          vimeo_playback_url: string | null
          vimeo_rtmp_url: string | null
          vimeo_stream_key: string | null
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
          vimeo_event_id?: string | null
          vimeo_playback_url?: string | null
          vimeo_rtmp_url?: string | null
          vimeo_stream_key?: string | null
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
          vimeo_event_id?: string | null
          vimeo_playback_url?: string | null
          vimeo_rtmp_url?: string | null
          vimeo_stream_key?: string | null
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
      module_videos: {
        Row: {
          created_at: string
          id: string
          is_required: boolean | null
          module_id: string
          order_index: number
          updated_at: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean | null
          module_id: string
          order_index?: number
          updated_at?: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean | null
          module_id?: string
          order_index?: number
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_videos_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_videos_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          admin_id: string
          created_at: string
          daily_digest: boolean
          id: string
          new_requests: boolean
          resubmissions: boolean
          updated_at: string
          weekly_report: boolean
        }
        Insert: {
          admin_id: string
          created_at?: string
          daily_digest?: boolean
          id?: string
          new_requests?: boolean
          resubmissions?: boolean
          updated_at?: string
          weekly_report?: boolean
        }
        Update: {
          admin_id?: string
          created_at?: string
          daily_digest?: boolean
          id?: string
          new_requests?: boolean
          resubmissions?: boolean
          updated_at?: string
          weekly_report?: boolean
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
      post_collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
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
          bio: string | null
          birthdate: string | null
          comments_count: number | null
          community_tier: number | null
          cover_photo_url: string | null
          cover_position_x: string | null
          cover_position_y: string | null
          created_at: string | null
          display_name: string | null
          engagement_score: number | null
          id: string
          last_login: string | null
          location: string | null
          phone_number: string | null
          profile_type: string | null
          real_name: string | null
          registration_source:
            | Database["public"]["Enums"]["registration_source_enum"]
            | null
          role: string | null
          trader_level: string | null
          unique_posts_commented: number | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type_enum"] | null
          work_info: string | null
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["access_level_enum"] | null
          account_status?:
            | Database["public"]["Enums"]["account_status_enum"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          comments_count?: number | null
          community_tier?: number | null
          cover_photo_url?: string | null
          cover_position_x?: string | null
          cover_position_y?: string | null
          created_at?: string | null
          display_name?: string | null
          engagement_score?: number | null
          id: string
          last_login?: string | null
          location?: string | null
          phone_number?: string | null
          profile_type?: string | null
          real_name?: string | null
          registration_source?:
            | Database["public"]["Enums"]["registration_source_enum"]
            | null
          role?: string | null
          trader_level?: string | null
          unique_posts_commented?: number | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type_enum"] | null
          work_info?: string | null
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level_enum"] | null
          account_status?:
            | Database["public"]["Enums"]["account_status_enum"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          comments_count?: number | null
          community_tier?: number | null
          cover_photo_url?: string | null
          cover_position_x?: string | null
          cover_position_y?: string | null
          created_at?: string | null
          display_name?: string | null
          engagement_score?: number | null
          id?: string
          last_login?: string | null
          location?: string | null
          phone_number?: string | null
          profile_type?: string | null
          real_name?: string | null
          registration_source?:
            | Database["public"]["Enums"]["registration_source_enum"]
            | null
          role?: string | null
          trader_level?: string | null
          unique_posts_commented?: number | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type_enum"] | null
          work_info?: string | null
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
      screenshot_analysis_history: {
        Row: {
          analysis_session_id: string | null
          assets_identified: string[] | null
          created_at: string
          extracted_data: Json | null
          id: string
          patterns_detected: Json | null
          performance_metrics: Json | null
          platform_identified: string | null
          screenshot_urls: string[]
          timeframe_detected: string | null
          trading_style_indicators: Json | null
          user_feedback_score: number | null
          user_id: string
        }
        Insert: {
          analysis_session_id?: string | null
          assets_identified?: string[] | null
          created_at?: string
          extracted_data?: Json | null
          id?: string
          patterns_detected?: Json | null
          performance_metrics?: Json | null
          platform_identified?: string | null
          screenshot_urls: string[]
          timeframe_detected?: string | null
          trading_style_indicators?: Json | null
          user_feedback_score?: number | null
          user_id: string
        }
        Update: {
          analysis_session_id?: string | null
          assets_identified?: string[] | null
          created_at?: string
          extracted_data?: Json | null
          id?: string
          patterns_detected?: Json | null
          performance_metrics?: Json | null
          platform_identified?: string | null
          screenshot_urls?: string[]
          timeframe_detected?: string | null
          trading_style_indicators?: Json | null
          user_feedback_score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      session_chat_messages: {
        Row: {
          created_at: string
          id: string
          message_source: string
          message_text: string
          message_type: string
          session_id: string
          sync_status: string | null
          updated_at: string
          user_id: string
          zoom_message_id: string | null
          zoom_participant_id: string | null
          zoom_participant_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message_source?: string
          message_text: string
          message_type?: string
          session_id: string
          sync_status?: string | null
          updated_at?: string
          user_id: string
          zoom_message_id?: string | null
          zoom_participant_id?: string | null
          zoom_participant_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message_source?: string
          message_text?: string
          message_type?: string
          session_id?: string
          sync_status?: string | null
          updated_at?: string
          user_id?: string
          zoom_message_id?: string | null
          zoom_participant_id?: string | null
          zoom_participant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_alerts: {
        Row: {
          activated_at: string | null
          activation_price: number | null
          asset_name: string
          close_reason: Database["public"]["Enums"]["close_reason"] | null
          created_at: string
          entry_price: number
          expires_at: string | null
          expiry_type: string | null
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
          tradermade_symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          activation_price?: number | null
          asset_name: string
          close_reason?: Database["public"]["Enums"]["close_reason"] | null
          created_at?: string
          entry_price: number
          expires_at?: string | null
          expiry_type?: string | null
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
          tradermade_symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          activation_price?: number | null
          asset_name?: string
          close_reason?: Database["public"]["Enums"]["close_reason"] | null
          created_at?: string
          entry_price?: number
          expires_at?: string | null
          expiry_type?: string | null
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
          tradermade_symbol?: string
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
      trades: {
        Row: {
          created_at: string
          direction: string
          duration: unknown | null
          entry_date: string
          entry_price: number
          exit_date: string | null
          exit_price: number | null
          id: number
          position_size: number
          profit_loss: number | null
          profit_loss_percentage: number | null
          strategy: string | null
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          direction: string
          duration?: unknown | null
          entry_date: string
          entry_price: number
          exit_date?: string | null
          exit_price?: number | null
          id?: never
          position_size: number
          profit_loss?: number | null
          profit_loss_percentage?: number | null
          strategy?: string | null
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          duration?: unknown | null
          entry_date?: string
          entry_price?: number
          exit_date?: string | null
          exit_price?: number | null
          id?: never
          position_size?: number
          profit_loss?: number | null
          profit_loss_percentage?: number | null
          strategy?: string | null
          symbol?: string
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
      user_achievements: {
        Row: {
          achievement_data: Json | null
          achievement_type: string
          created_at: string | null
          earned_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achievement_data?: Json | null
          achievement_type: string
          created_at?: string | null
          earned_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achievement_data?: Json | null
          achievement_type?: string
          created_at?: string | null
          earned_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_engagement: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          target_post_id: string | null
          target_user_id: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          target_post_id?: string | null
          target_user_id?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          target_post_id?: string | null
          target_user_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_engagement_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      user_personalization_preferences: {
        Row: {
          analysis_depth: string | null
          benchmark_comparisons: boolean | null
          created_at: string
          feedback_style: string | null
          focus_areas: string[] | null
          historical_context: boolean | null
          id: string
          notification_preferences: Json | null
          preferred_charts: string[] | null
          progressive_difficulty: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_depth?: string | null
          benchmark_comparisons?: boolean | null
          created_at?: string
          feedback_style?: string | null
          focus_areas?: string[] | null
          historical_context?: boolean | null
          id?: string
          notification_preferences?: Json | null
          preferred_charts?: string[] | null
          progressive_difficulty?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_depth?: string | null
          benchmark_comparisons?: boolean | null
          created_at?: string
          feedback_style?: string | null
          focus_areas?: string[] | null
          historical_context?: boolean | null
          id?: string
          notification_preferences?: Json | null
          preferred_charts?: string[] | null
          progressive_difficulty?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          watch_time_minutes: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          status: Database["public"]["Enums"]["progress_status"]
          updated_at?: string
          user_email: string
          user_id: string
          video_id: string
          watch_time_minutes?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["progress_status"]
          updated_at?: string
          user_email?: string
          user_id?: string
          video_id?: string
          watch_time_minutes?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_saved_posts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_saved_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          total_activities: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          total_activities?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          total_activities?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_trading_profiles: {
        Row: {
          chart_preferences: Json | null
          created_at: string
          entry_patterns: Json | null
          exit_patterns: Json | null
          id: string
          learning_progress: Json | null
          performance_benchmarks: Json | null
          platform_detected: string | null
          preferred_assets: Json | null
          risk_tolerance: string | null
          session_patterns: Json | null
          trading_style: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chart_preferences?: Json | null
          created_at?: string
          entry_patterns?: Json | null
          exit_patterns?: Json | null
          id?: string
          learning_progress?: Json | null
          performance_benchmarks?: Json | null
          platform_detected?: string | null
          preferred_assets?: Json | null
          risk_tolerance?: string | null
          session_patterns?: Json | null
          trading_style?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chart_preferences?: Json | null
          created_at?: string
          entry_patterns?: Json | null
          exit_patterns?: Json | null
          id?: string
          learning_progress?: Json | null
          performance_benchmarks?: Json | null
          platform_detected?: string | null
          preferred_assets?: Json | null
          risk_tolerance?: string | null
          session_patterns?: Json | null
          trading_style?: string | null
          updated_at?: string
          user_id?: string
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
          access_settings: Json | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: string | null
          duration: number | null
          duration_minutes: number | null
          embed_code: string | null
          id: string
          is_active: boolean | null
          key_concepts: string[] | null
          learning_outcomes: string[] | null
          next_steps: string[] | null
          practical_applications: string[] | null
          prerequisites: string[] | null
          skills_mastered: string[] | null
          source_type: Database["public"]["Enums"]["video_source_type"]
          source_url: string | null
          storage_bucket: string | null
          storage_path: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_metadata: Json | null
          video_segments: Json | null
          video_url: string
        }
        Insert: {
          access_settings?: Json | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          duration?: number | null
          duration_minutes?: number | null
          embed_code?: string | null
          id?: string
          is_active?: boolean | null
          key_concepts?: string[] | null
          learning_outcomes?: string[] | null
          next_steps?: string[] | null
          practical_applications?: string[] | null
          prerequisites?: string[] | null
          skills_mastered?: string[] | null
          source_type?: Database["public"]["Enums"]["video_source_type"]
          source_url?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_metadata?: Json | null
          video_segments?: Json | null
          video_url: string
        }
        Update: {
          access_settings?: Json | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          duration?: number | null
          duration_minutes?: number | null
          embed_code?: string | null
          id?: string
          is_active?: boolean | null
          key_concepts?: string[] | null
          learning_outcomes?: string[] | null
          next_steps?: string[] | null
          practical_applications?: string[] | null
          prerequisites?: string[] | null
          skills_mastered?: string[] | null
          source_type?: Database["public"]["Enums"]["video_source_type"]
          source_url?: string | null
          storage_bucket?: string | null
          storage_path?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_metadata?: Json | null
          video_segments?: Json | null
          video_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_account_request_rate_limit: {
        Args: { p_email: string; p_ip_address?: string }
        Returns: Json
      }
      cleanup_old_economic_events: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      expire_limit_orders: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_community_tier_info: {
        Args: { tier_level: number }
        Returns: Json
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      process_price_alerts: {
        Args: { p_symbol: string; p_current_price: number }
        Returns: {
          alert_id: string
          signal_id: string
          alert_type: string
          target_price: number
          triggered: boolean
        }[]
      }
      update_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      update_trading_profile_from_analysis: {
        Args: { p_user_id: string; p_analysis_data: Json }
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
      app_role: "admin" | "moderator" | "user"
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
      progress_status: "completed" | "in_progress" | "started"
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
      video_source_type:
        | "youtube"
        | "vimeo"
        | "supabase_storage"
        | "digitalocean_storage"
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
      app_role: ["admin", "moderator", "user"],
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
      progress_status: ["completed", "in_progress", "started"],
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
      video_source_type: [
        "youtube",
        "vimeo",
        "supabase_storage",
        "digitalocean_storage",
      ],
    },
  },
} as const
