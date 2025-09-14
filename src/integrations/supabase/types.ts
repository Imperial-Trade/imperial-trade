export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
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
          legal_accepted: boolean
          legal_accepted_at: string | null
          legal_version: string | null
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
          legal_accepted?: boolean
          legal_accepted_at?: string | null
          legal_version?: string | null
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
          legal_accepted?: boolean
          legal_accepted_at?: string | null
          legal_version?: string | null
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
      admin_notification_events: {
        Row: {
          channels: string[]
          created_at: string
          delivery_status: string
          error: string | null
          event_type: string
          id: string
          message: string
          metadata: Json
          recipients: Json
          sent_at: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          channels?: string[]
          created_at?: string
          delivery_status?: string
          error?: string | null
          event_type: string
          id?: string
          message: string
          metadata?: Json
          recipients: Json
          sent_at?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          channels?: string[]
          created_at?: string
          delivery_status?: string
          error?: string | null
          event_type?: string
          id?: string
          message?: string
          metadata?: Json
          recipients?: Json
          sent_at?: string
          subject?: string | null
          updated_at?: string
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
      alert_cooldowns: {
        Row: {
          alert_type: string
          asset_symbol: string
          created_at: string
          id: string
          last_triggered_at: string
        }
        Insert: {
          alert_type: string
          asset_symbol: string
          created_at?: string
          id?: string
          last_triggered_at?: string
        }
        Update: {
          alert_type?: string
          asset_symbol?: string
          created_at?: string
          id?: string
          last_triggered_at?: string
        }
        Relationships: []
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
          priority_order: number | null
          requires_bid_ask_precision: boolean | null
          signal_id: string
          simultaneous_trigger_handled: boolean | null
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
          priority_order?: number | null
          requires_bid_ask_precision?: boolean | null
          signal_id: string
          simultaneous_trigger_handled?: boolean | null
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
          priority_order?: number | null
          requires_bid_ask_precision?: boolean | null
          signal_id?: string
          simultaneous_trigger_handled?: boolean | null
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
      device_subscriptions: {
        Row: {
          browser_name: string | null
          browser_version: string | null
          created_at: string | null
          device_capabilities: Json | null
          device_fingerprint: string
          device_info: Json | null
          id: string
          is_active: boolean | null
          is_mobile: boolean | null
          last_seen_at: string | null
          notification_performance: Json | null
          onesignal_player_id: string | null
          platform: string | null
          updated_at: string | null
          user_id: string
          welcome_sent: boolean | null
        }
        Insert: {
          browser_name?: string | null
          browser_version?: string | null
          created_at?: string | null
          device_capabilities?: Json | null
          device_fingerprint: string
          device_info?: Json | null
          id?: string
          is_active?: boolean | null
          is_mobile?: boolean | null
          last_seen_at?: string | null
          notification_performance?: Json | null
          onesignal_player_id?: string | null
          platform?: string | null
          updated_at?: string | null
          user_id: string
          welcome_sent?: boolean | null
        }
        Update: {
          browser_name?: string | null
          browser_version?: string | null
          created_at?: string | null
          device_capabilities?: Json | null
          device_fingerprint?: string
          device_info?: Json | null
          id?: string
          is_active?: boolean | null
          is_mobile?: boolean | null
          last_seen_at?: string | null
          notification_performance?: Json | null
          onesignal_player_id?: string | null
          platform?: string | null
          updated_at?: string | null
          user_id?: string
          welcome_sent?: boolean | null
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
      edge_function_telemetry: {
        Row: {
          batch_id: string | null
          count: number
          created_at: string
          function_name: string
          id: string
          metadata: Json
          metric: string
        }
        Insert: {
          batch_id?: string | null
          count?: number
          created_at?: string
          function_name: string
          id?: string
          metadata?: Json
          metric: string
        }
        Update: {
          batch_id?: string | null
          count?: number
          created_at?: string
          function_name?: string
          id?: string
          metadata?: Json
          metric?: string
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          category: Database["public"]["Enums"]["post_category"]
          content: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
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
          deleted_at?: string | null
          deleted_by?: string | null
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
      function_deprecation_hits: {
        Row: {
          created_at: string
          function_name: string
          http_method: string | null
          id: string
          metadata: Json | null
          route: string | null
          source: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          function_name: string
          http_method?: string | null
          id?: string
          metadata?: Json | null
          route?: string | null
          source?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          function_name?: string
          http_method?: string | null
          id?: string
          metadata?: Json | null
          route?: string | null
          source?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "function_deprecation_hits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "function_deprecation_hits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "xeon_subscribers_public"
            referencedColumns: ["id"]
          },
        ]
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
      market_prices: {
        Row: {
          ask: number
          bid: number
          created_at: string
          id: string
          mid: number
          source: string
          symbol: string
          timestamp: string
          updated_at: string
        }
        Insert: {
          ask: number
          bid: number
          created_at?: string
          id?: string
          mid: number
          source?: string
          symbol: string
          timestamp: string
          updated_at?: string
        }
        Update: {
          ask?: number
          bid?: number
          created_at?: string
          id?: string
          mid?: number
          source?: string
          symbol?: string
          timestamp?: string
          updated_at?: string
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
      notification_analytics: {
        Row: {
          avg_delivery_time_seconds: number | null
          created_at: string
          date: string
          error_breakdown: Json | null
          id: string
          platform_breakdown: Json | null
          total_delivered: number
          total_failed: number
          total_opened: number
          total_sent: number
          updated_at: string
        }
        Insert: {
          avg_delivery_time_seconds?: number | null
          created_at?: string
          date: string
          error_breakdown?: Json | null
          id?: string
          platform_breakdown?: Json | null
          total_delivered?: number
          total_failed?: number
          total_opened?: number
          total_sent?: number
          updated_at?: string
        }
        Update: {
          avg_delivery_time_seconds?: number | null
          created_at?: string
          date?: string
          error_breakdown?: Json | null
          id?: string
          platform_breakdown?: Json | null
          total_delivered?: number
          total_failed?: number
          total_opened?: number
          total_sent?: number
          updated_at?: string
        }
        Relationships: []
      }
      notification_audit_trail: {
        Row: {
          attempts: number | null
          created_at: string | null
          delivered_at: string | null
          delivery_channel: string
          error_message: string | null
          id: string
          last_attempt_at: string | null
          metadata: Json | null
          notification_type: string
          signal_id: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_channel: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          metadata?: Json | null
          notification_type: string
          signal_id?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_channel?: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          metadata?: Json | null
          notification_type?: string
          signal_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_audit_trail_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "trade_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_batch_queue: {
        Row: {
          asset_symbol: string | null
          batch_key: string | null
          created_at: string
          delivery_status: Json | null
          device_preferences: Json | null
          id: string
          market_session: string | null
          max_retries: number | null
          next_retry_at: string | null
          notification_category: string | null
          notification_types: string[]
          priority_level: number | null
          processed_at: string | null
          retry_count: number | null
          scheduled_at: string
          signal_id: string
          user_id: string
        }
        Insert: {
          asset_symbol?: string | null
          batch_key?: string | null
          created_at?: string
          delivery_status?: Json | null
          device_preferences?: Json | null
          id?: string
          market_session?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          notification_category?: string | null
          notification_types?: string[]
          priority_level?: number | null
          processed_at?: string | null
          retry_count?: number | null
          scheduled_at?: string
          signal_id: string
          user_id: string
        }
        Update: {
          asset_symbol?: string | null
          batch_key?: string | null
          created_at?: string
          delivery_status?: Json | null
          device_preferences?: Json | null
          id?: string
          market_session?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          notification_category?: string | null
          notification_types?: string[]
          priority_level?: number | null
          processed_at?: string | null
          retry_count?: number | null
          scheduled_at?: string
          signal_id?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_delivery_attempts: {
        Row: {
          attempt_at: string
          attempt_number: number
          created_at: string
          delivered_at: string | null
          delivery_channel: string
          error_code: string | null
          error_message: string | null
          id: string
          notification_id: string | null
          response_data: Json | null
          retry_after: string | null
          status: string
        }
        Insert: {
          attempt_at?: string
          attempt_number?: number
          created_at?: string
          delivered_at?: string | null
          delivery_channel: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string | null
          response_data?: Json | null
          retry_after?: string | null
          status?: string
        }
        Update: {
          attempt_at?: string
          attempt_number?: number
          created_at?: string
          delivered_at?: string | null
          delivery_channel?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string | null
          response_data?: Json | null
          retry_after?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_attempts_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notification_delivery_log"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_delivery_log: {
        Row: {
          created_at: string
          delivered_at: string | null
          delivery_channel: string
          error_message: string | null
          event_key: string | null
          id: string
          metadata: Json | null
          notification_type: string
          opened_at: string | null
          sent_at: string
          signal_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivery_channel: string
          error_message?: string | null
          event_key?: string | null
          id?: string
          metadata?: Json | null
          notification_type: string
          opened_at?: string | null
          sent_at?: string
          signal_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivery_channel?: string
          error_message?: string | null
          event_key?: string | null
          id?: string
          metadata?: Json | null
          notification_type?: string
          opened_at?: string | null
          sent_at?: string
          signal_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          batch_notifications: boolean | null
          created_at: string | null
          delivery_preferences: Json | null
          id: string
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          signal_closed: boolean | null
          signal_created: boolean | null
          signal_updated: boolean | null
          stop_loss_hits: boolean | null
          timezone: string | null
          tp_hits: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          batch_notifications?: boolean | null
          created_at?: string | null
          delivery_preferences?: Json | null
          id?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          signal_closed?: boolean | null
          signal_created?: boolean | null
          signal_updated?: boolean | null
          stop_loss_hits?: boolean | null
          timezone?: string | null
          tp_hits?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          batch_notifications?: boolean | null
          created_at?: string | null
          delivery_preferences?: Json | null
          id?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          signal_closed?: boolean | null
          signal_created?: boolean | null
          signal_updated?: boolean | null
          stop_loss_hits?: boolean | null
          timezone?: string | null
          tp_hits?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_rate_limits: {
        Row: {
          count_in_window: number | null
          created_at: string | null
          id: string
          last_sent_at: string | null
          notification_type: string
          user_id: string
          window_start: string | null
        }
        Insert: {
          count_in_window?: number | null
          created_at?: string | null
          id?: string
          last_sent_at?: string | null
          notification_type: string
          user_id: string
          window_start?: string | null
        }
        Update: {
          count_in_window?: number | null
          created_at?: string | null
          id?: string
          last_sent_at?: string | null
          notification_type?: string
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      notification_read_receipts: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
          read_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
          read_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
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
      notification_ui_telemetry: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          metric: string
          user_id: string
          value: number | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          metric: string
          user_id: string
          value?: number | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          metric?: string
          user_id?: string
          value?: number | null
        }
        Relationships: []
      }
      notification_user_state: {
        Row: {
          created_at: string
          last_cleared_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          last_cleared_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          last_cleared_at?: string | null
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
          device_fingerprint: string | null
          display_name: string | null
          email_notifications: boolean
          engagement_score: number | null
          id: string
          in_app_notifications_enabled: boolean | null
          last_device_info: Json | null
          last_login: string | null
          legal_accepted: boolean
          legal_accepted_at: string | null
          legal_version: string | null
          location: string | null
          notification_preferences: Json | null
          notification_prompt_dismissed_at: string | null
          notification_stats: Json | null
          onesignal_last_sync_at: string | null
          onesignal_player_id: string | null
          onesignal_subscription_status: string | null
          phone_number: string | null
          profile_type: string | null
          push_subscription_active: boolean | null
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
          xeon_stream_activated_at: string | null
          xeon_stream_subscription: boolean | null
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
          device_fingerprint?: string | null
          display_name?: string | null
          email_notifications?: boolean
          engagement_score?: number | null
          id: string
          in_app_notifications_enabled?: boolean | null
          last_device_info?: Json | null
          last_login?: string | null
          legal_accepted?: boolean
          legal_accepted_at?: string | null
          legal_version?: string | null
          location?: string | null
          notification_preferences?: Json | null
          notification_prompt_dismissed_at?: string | null
          notification_stats?: Json | null
          onesignal_last_sync_at?: string | null
          onesignal_player_id?: string | null
          onesignal_subscription_status?: string | null
          phone_number?: string | null
          profile_type?: string | null
          push_subscription_active?: boolean | null
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
          xeon_stream_activated_at?: string | null
          xeon_stream_subscription?: boolean | null
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
          device_fingerprint?: string | null
          display_name?: string | null
          email_notifications?: boolean
          engagement_score?: number | null
          id?: string
          in_app_notifications_enabled?: boolean | null
          last_device_info?: Json | null
          last_login?: string | null
          legal_accepted?: boolean
          legal_accepted_at?: string | null
          legal_version?: string | null
          location?: string | null
          notification_preferences?: Json | null
          notification_prompt_dismissed_at?: string | null
          notification_stats?: Json | null
          onesignal_last_sync_at?: string | null
          onesignal_player_id?: string | null
          onesignal_subscription_status?: string | null
          phone_number?: string | null
          profile_type?: string | null
          push_subscription_active?: boolean | null
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
          xeon_stream_activated_at?: string | null
          xeon_stream_subscription?: boolean | null
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
      public_profiles: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level_enum"] | null
          avatar_url: string | null
          community_tier: number | null
          display_name: string | null
          id: string
          role: string | null
          trader_level: string | null
          user_type: Database["public"]["Enums"]["user_type_enum"] | null
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["access_level_enum"] | null
          avatar_url?: string | null
          community_tier?: number | null
          display_name?: string | null
          id: string
          role?: string | null
          trader_level?: string | null
          user_type?: Database["public"]["Enums"]["user_type_enum"] | null
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level_enum"] | null
          avatar_url?: string | null
          community_tier?: number | null
          display_name?: string | null
          id?: string
          role?: string | null
          trader_level?: string | null
          user_type?: Database["public"]["Enums"]["user_type_enum"] | null
        }
        Relationships: []
      }
      push_notification_deliveries: {
        Row: {
          created_at: string
          delivered_at: string | null
          device_type: string | null
          error_message: string | null
          id: string
          message: string
          metadata: Json | null
          notification_id: string
          onesignal_id: string | null
          platform: string | null
          sent_at: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          device_type?: string | null
          error_message?: string | null
          id?: string
          message: string
          metadata?: Json | null
          notification_id: string
          onesignal_id?: string | null
          platform?: string | null
          sent_at?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          device_type?: string | null
          error_message?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          notification_id?: string
          onesignal_id?: string | null
          platform?: string | null
          sent_at?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          last_verified_at: string | null
          platform: string | null
          player_id: string
          subscription_active: boolean
          subscription_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          last_verified_at?: string | null
          platform?: string | null
          player_id: string
          subscription_active?: boolean
          subscription_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          last_verified_at?: string | null
          platform?: string | null
          player_id?: string
          subscription_active?: boolean
          subscription_date?: string
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
      rate_limit_settings: {
        Row: {
          allowlist_cidrs: string[]
          created_at: string
          email_max_attempts: number
          email_window_seconds: number
          id: number
          ip_max_attempts: number
          ip_window_seconds: number
          updated_at: string
        }
        Insert: {
          allowlist_cidrs?: string[]
          created_at?: string
          email_max_attempts?: number
          email_window_seconds?: number
          id?: number
          ip_max_attempts?: number
          ip_window_seconds?: number
          updated_at?: string
        }
        Update: {
          allowlist_cidrs?: string[]
          created_at?: string
          email_max_attempts?: number
          email_window_seconds?: number
          id?: number
          ip_max_attempts?: number
          ip_window_seconds?: number
          updated_at?: string
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
      realtime_telemetry: {
        Row: {
          channel_breakdown: Json
          clamp_activations: number
          cost_estimate: number
          created_at: string
          date: string
          id: string
          message_rate: number
          optimization_rate: number
          total_connections: number
          total_messages: number
          updated_at: string
        }
        Insert: {
          channel_breakdown?: Json
          clamp_activations?: number
          cost_estimate?: number
          created_at?: string
          date?: string
          id?: string
          message_rate?: number
          optimization_rate?: number
          total_connections?: number
          total_messages?: number
          updated_at?: string
        }
        Update: {
          channel_breakdown?: Json
          clamp_activations?: number
          cost_estimate?: number
          created_at?: string
          date?: string
          id?: string
          message_rate?: number
          optimization_rate?: number
          total_connections?: number
          total_messages?: number
          updated_at?: string
        }
        Relationships: []
      }
      replies: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          likes: number
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          likes?: number
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          likes?: number
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "replies_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "replies"
            referencedColumns: ["id"]
          },
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
      role_change_audit: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          new_access_level: string | null
          new_role: string | null
          new_user_type: string | null
          old_access_level: string | null
          old_role: string | null
          old_user_type: string | null
          user_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_access_level?: string | null
          new_role?: string | null
          new_user_type?: string | null
          old_access_level?: string | null
          old_role?: string | null
          old_user_type?: string | null
          user_id: string
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_access_level?: string | null
          new_role?: string | null
          new_user_type?: string | null
          old_access_level?: string | null
          old_role?: string | null
          old_user_type?: string | null
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
          is_xeon_stream: boolean | null
          notes: string | null
          provider_name: string | null
          status: Database["public"]["Enums"]["trade_alert_status"]
          stop_loss: number
          tp_hit_mask: number | null
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
          is_xeon_stream?: boolean | null
          notes?: string | null
          provider_name?: string | null
          status?: Database["public"]["Enums"]["trade_alert_status"]
          stop_loss: number
          tp_hit_mask?: number | null
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
          is_xeon_stream?: boolean | null
          notes?: string | null
          provider_name?: string | null
          status?: Database["public"]["Enums"]["trade_alert_status"]
          stop_loss?: number
          tp_hit_mask?: number | null
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
          screenshot_urls: string[] | null
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
          screenshot_urls?: string[] | null
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
          screenshot_urls?: string[] | null
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
          {
            foreignKeyName: "user_engagement_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "xeon_subscribers_public"
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
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "xeon_subscribers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "xeon_subscribers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          community_activity: boolean
          created_at: string
          educational_content: boolean
          email_enabled: boolean
          frequency_limit: number | null
          id: string
          market_updates: boolean
          push_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_enabled: boolean
          system_announcements: boolean
          timezone: string | null
          trading_signals: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          community_activity?: boolean
          created_at?: string
          educational_content?: boolean
          email_enabled?: boolean
          frequency_limit?: number | null
          id?: string
          market_updates?: boolean
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean
          system_announcements?: boolean
          timezone?: string | null
          trading_signals?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          community_activity?: boolean
          created_at?: string
          educational_content?: boolean
          email_enabled?: boolean
          frequency_limit?: number | null
          id?: string
          market_updates?: boolean
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean
          system_announcements?: boolean
          timezone?: string | null
          trading_signals?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link_url: string | null
          message: string
          metadata: Json
          priority: string
          source: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          message: string
          metadata?: Json
          priority?: string
          source?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          message?: string
          metadata?: Json
          priority?: string
          source?: string | null
          title?: string
          type?: string
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
          {
            foreignKeyName: "user_saved_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "xeon_subscribers_public"
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
      xeon_notification_log: {
        Row: {
          created_at: string
          delivery_status: Json | null
          id: string
          notification_type: string
          onesignal_notification_id: string | null
          sent_at: string
          target_users: string[]
          trade_alert_id: string | null
        }
        Insert: {
          created_at?: string
          delivery_status?: Json | null
          id?: string
          notification_type: string
          onesignal_notification_id?: string | null
          sent_at?: string
          target_users: string[]
          trade_alert_id?: string | null
        }
        Update: {
          created_at?: string
          delivery_status?: Json | null
          id?: string
          notification_type?: string
          onesignal_notification_id?: string | null
          sent_at?: string
          target_users?: string[]
          trade_alert_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xeon_notification_log_trade_alert_id_fkey"
            columns: ["trade_alert_id"]
            isOneToOne: false
            referencedRelation: "trade_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      xeon_subscribers_public: {
        Row: {
          display_name: string | null
          id: string | null
          notification_preferences: Json | null
          onesignal_player_id: string | null
        }
        Insert: {
          display_name?: string | null
          id?: string | null
          notification_preferences?: Json | null
          onesignal_player_id?: string | null
        }
        Update: {
          display_name?: string | null
          id?: string | null
          notification_preferences?: Json | null
          onesignal_player_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_trading_metrics: {
        Args: {
          p_entry_price: number
          p_stop_loss: number
          p_tp1?: number
          p_trade_type?: string
        }
        Returns: Json
      }
      check_account_request_rate_limit: {
        Args: { p_email: string; p_ip_address?: string }
        Returns: Json
      }
      check_alert_cooldown: {
        Args: {
          p_alert_type: string
          p_asset_symbol: string
          p_cooldown_seconds?: number
        }
        Returns: boolean
      }
      check_user_xeon_subscription: {
        Args: { user_id_param?: string }
        Returns: boolean
      }
      cleanup_inactive_symbol_cache: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_cron_logs: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_cron_logs_optimized: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_economic_events: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_notification_logs: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_rate_limits_optimized: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_stale_market_prices: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      create_smart_notification_batch: {
        Args: {
          p_asset_symbol?: string
          p_market_session?: string
          p_notification_type: string
          p_priority_level?: number
          p_signal_id: string
        }
        Returns: string
      }
      delete_comment_cascade: {
        Args: { p_comment_id: string }
        Returns: number
      }
      delete_comment_single: {
        Args: { p_comment_id: string }
        Returns: number
      }
      delete_post_cascade: {
        Args: { p_post_id: string }
        Returns: number
      }
      disable_economic_events_processing: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      expire_limit_orders: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_active_alert_symbols: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      get_active_notification_triggers: {
        Args: Record<PropertyKey, never>
        Returns: {
          function_name: string
          table_name: string
          trigger_name: string
        }[]
      }
      get_active_users_for_broadcasting: {
        Args: Record<PropertyKey, never>
        Returns: {
          last_activity: string
          onesignal_player_id: string
          user_id: string
        }[]
      }
      get_anonymized_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: {
          attempt_count: number
          blocked_until: string
          created_at: string
          id: string
          identifier_hash: string
          last_attempt: string
          limit_type: string
          updated_at: string
          window_start: string
        }[]
      }
      get_community_tier_info: {
        Args: { tier_level: number }
        Returns: Json
      }
      get_market_data_freshness: {
        Args: Record<PropertyKey, never>
        Returns: {
          hours_old: number
          is_stale: boolean
          last_update: string
          symbol: string
        }[]
      }
      get_market_session: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_realtime_system_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_trader_stats: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_unread_notification_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_user_access_level: {
        Args: { user_id_param?: string }
        Returns: string
      }
      get_user_active_devices: {
        Args: { p_user_id: string }
        Returns: {
          device_fingerprint: string
          device_info: Json
          last_seen_at: string
          onesignal_player_id: string
        }[]
      }
      get_user_notifications: {
        Args: {
          p_cursor_created_at?: string
          p_cursor_event_id?: string
          p_limit?: number
        }
        Returns: {
          actor_id: string
          created_at: string
          event_id: string
          event_type: string
          post_id: string
          post_title: string
          unread: boolean
        }[]
      }
      get_user_role: {
        Args: { user_id_param?: string }
        Returns: string
      }
      get_user_type: {
        Args: { user_id_param?: string }
        Returns: string
      }
      get_xeon_stream_subscribers: {
        Args: Record<PropertyKey, never>
        Returns: {
          display_name: string
          notification_preferences: Json
          onesignal_player_id: string
          user_id: string
        }[]
      }
      handle_triggered_alert: {
        Args: {
          p_alert_id: string
          p_alert_type: string
          p_signal_id: string
          p_triggered_price: number
        }
        Returns: Json
      }
      handle_triggered_alert_enhanced: {
        Args: {
          p_alert_id: string
          p_alert_type: string
          p_signal_id: string
          p_triggered_price: number
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: { user_id_param?: string }
        Returns: boolean
      }
      is_educator_or_admin: {
        Args: { user_id_param?: string }
        Returns: boolean
      }
      is_moderator_or_admin: {
        Args: { user_id_param?: string }
        Returns: boolean
      }
      is_system_operation: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_deprecated_function_usage: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      mark_notifications_cleared: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      mark_notifications_read: {
        Args: { p_event_ids: string[]; p_event_type: string }
        Returns: number
      }
      observe_deprecated_function_usage: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      populate_alert_monitoring_for_existing_signals: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      process_price_alerts: {
        Args: { p_current_price: number; p_symbol: string }
        Returns: {
          alert_id: string
          alert_type: string
          signal_id: string
          target_price: number
          triggered: boolean
        }[]
      }
      process_price_alerts_enhanced: {
        Args: { p_current_ask: number; p_current_bid: number; p_symbol: string }
        Returns: {
          alert_id: string
          alert_type: string
          priority_order: number
          signal_id: string
          target_price: number
          trade_direction: string
          trigger_price: number
          triggered: boolean
        }[]
      }
      process_tp_hits: {
        Args: { p_current_price: number; p_is_buy: boolean; p_trade_id: string }
        Returns: Json
      }
      reconcile_signal_consistency: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      should_show_onesignal_prompt: {
        Args: { p_device_fingerprint: string; p_user_id: string }
        Returns: boolean
      }
      should_user_receive_notification: {
        Args: {
          p_creator_id: string
          p_notification_type: string
          p_priority_level?: number
          p_user_id: string
        }
        Returns: boolean
      }
      system_update_trade_alert: {
        Args: {
          p_close_reason?: string
          p_signal_id: string
          p_status?: string
          p_tp_hits?: number[]
        }
        Returns: boolean
      }
      update_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      update_trading_profile_from_analysis: {
        Args: { p_analysis_data: Json; p_user_id: string }
        Returns: undefined
      }
      upsert_daily_telemetry: {
        Args: {
          p_channel_breakdown?: Json
          p_clamp_activations?: number
          p_connections: number
          p_cost_estimate: number
          p_message_rate: number
          p_messages: number
          p_optimization_rate?: number
        }
        Returns: undefined
      }
      upsert_market_price: {
        Args: {
          p_ask: number
          p_bid: number
          p_mid: number
          p_symbol: string
          p_timestamp?: string
        }
        Returns: undefined
      }
      upsert_market_price_enhanced: {
        Args: {
          p_ask: number
          p_bid: number
          p_mid: number
          p_symbol: string
          p_timestamp?: string
        }
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
        | "all_tps_hit"
        | "expired"
      course_difficulty: "Beginner" | "Intermediate" | "Advanced"
      difficulty_level: "beginner" | "intermediate" | "advanced"
      impact_level: "High" | "Medium" | "Low"
      mood_type: "Confident" | "Anxious" | "Greedy" | "Fearful" | "Neutral"
      notification_priority: "low" | "medium" | "high"
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
      trade_alert_status: "pending" | "active" | "closed" | "partially_profited"
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
        "all_tps_hit",
        "expired",
      ],
      course_difficulty: ["Beginner", "Intermediate", "Advanced"],
      difficulty_level: ["beginner", "intermediate", "advanced"],
      impact_level: ["High", "Medium", "Low"],
      mood_type: ["Confident", "Anxious", "Greedy", "Fearful", "Neutral"],
      notification_priority: ["low", "medium", "high"],
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
      trade_alert_status: ["pending", "active", "closed", "partially_profited"],
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
