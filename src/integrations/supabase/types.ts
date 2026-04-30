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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          requirement_value: number
          type: Database["public"]["Enums"]["achievement_type"]
          xp_reward: number
        }
        Insert: {
          created_at?: string
          description: string
          icon?: string
          id?: string
          name: string
          requirement_value: number
          type: Database["public"]["Enums"]["achievement_type"]
          xp_reward?: number
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_value?: number
          type?: Database["public"]["Enums"]["achievement_type"]
          xp_reward?: number
        }
        Relationships: []
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          commission_amount: number
          commission_percent: number
          commission_type: Database["public"]["Enums"]["commission_type"]
          created_at: string
          gross_amount: number
          id: string
          paid_at: string | null
          referral_id: string
          status: Database["public"]["Enums"]["commission_status"]
          stripe_invoice_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          affiliate_id: string
          commission_amount?: number
          commission_percent: number
          commission_type: Database["public"]["Enums"]["commission_type"]
          created_at?: string
          gross_amount?: number
          id?: string
          paid_at?: string | null
          referral_id: string
          status?: Database["public"]["Enums"]["commission_status"]
          stripe_invoice_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          affiliate_id?: string
          commission_amount?: number
          commission_percent?: number
          commission_type?: Database["public"]["Enums"]["commission_type"]
          created_at?: string
          gross_amount?: number
          id?: string
          paid_at?: string | null
          referral_id?: string
          status?: Database["public"]["Enums"]["commission_status"]
          stripe_invoice_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "affiliate_referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "affiliate_referrals_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_metrics_cache: {
        Row: {
          active_referrals: number | null
          affiliate_id: string
          conversion_rate: number | null
          monthly_earnings: number | null
          pending_earnings: number | null
          ranking_position: number | null
          tier_level: number | null
          tier_name: string | null
          total_earnings: number | null
          total_referrals: number | null
          updated_at: string | null
        }
        Insert: {
          active_referrals?: number | null
          affiliate_id: string
          conversion_rate?: number | null
          monthly_earnings?: number | null
          pending_earnings?: number | null
          ranking_position?: number | null
          tier_level?: number | null
          tier_name?: string | null
          total_earnings?: number | null
          total_referrals?: number | null
          updated_at?: string | null
        }
        Update: {
          active_referrals?: number | null
          affiliate_id?: string
          conversion_rate?: number | null
          monthly_earnings?: number | null
          pending_earnings?: number | null
          ranking_position?: number | null
          tier_level?: number | null
          tier_name?: string | null
          total_earnings?: number | null
          total_referrals?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_metrics_cache_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: true
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payouts: {
        Row: {
          affiliate_id: string
          created_at: string
          id: string
          payout_method: string
          payout_reference: string | null
          payout_status: Database["public"]["Enums"]["payout_status"]
          processed_at: string | null
          total_amount: number
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          id?: string
          payout_method?: string
          payout_reference?: string | null
          payout_status?: Database["public"]["Enums"]["payout_status"]
          processed_at?: string | null
          total_amount?: number
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          id?: string
          payout_method?: string
          payout_reference?: string | null
          payout_status?: Database["public"]["Enums"]["payout_status"]
          processed_at?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_referrals: {
        Row: {
          affiliate_id: string
          converted_at: string | null
          created_at: string
          id: string
          referral_code_used: string
          referred_email: string
          referred_plan: string | null
          referred_type: string
          referred_user_id: string | null
          status: Database["public"]["Enums"]["referral_status"]
        }
        Insert: {
          affiliate_id: string
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code_used: string
          referred_email: string
          referred_plan?: string | null
          referred_type?: string
          referred_user_id?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Update: {
          affiliate_id?: string
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code_used?: string
          referred_email?: string
          referred_plan?: string | null
          referred_type?: string
          referred_user_id?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_risk_flags: {
        Row: {
          affiliate_id: string | null
          created_at: string | null
          description: string | null
          flag_type: string
          id: string
          metadata: Json | null
          referral_id: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
        }
        Insert: {
          affiliate_id?: string | null
          created_at?: string | null
          description?: string | null
          flag_type: string
          id?: string
          metadata?: Json | null
          referral_id?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
        }
        Update: {
          affiliate_id?: string | null
          created_at?: string | null
          description?: string | null
          flag_type?: string
          id?: string
          metadata?: Json | null
          referral_id?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_risk_flags_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_risk_flags_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "affiliate_referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_risk_flags_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "affiliate_referrals_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          affiliate_type: Database["public"]["Enums"]["affiliate_type"]
          created_at: string
          email: string
          first_payment_commission_percent: number
          full_name: string
          id: string
          is_active: boolean
          recurring_commission_percent: number
          referral_code: string
          tenant_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          affiliate_type?: Database["public"]["Enums"]["affiliate_type"]
          created_at?: string
          email: string
          first_payment_commission_percent?: number
          full_name: string
          id?: string
          is_active?: boolean
          recurring_commission_percent?: number
          referral_code: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          affiliate_type?: Database["public"]["Enums"]["affiliate_type"]
          created_at?: string
          email?: string
          first_payment_commission_percent?: number
          full_name?: string
          id?: string
          is_active?: boolean
          recurring_commission_percent?: number
          referral_code?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_limits: {
        Row: {
          created_at: string
          feature_key: string
          id: string
          max_uses: number
          period_days: number
          period_type: string
          plan_tier: string
        }
        Insert: {
          created_at?: string
          feature_key: string
          id?: string
          max_uses?: number
          period_days?: number
          period_type?: string
          plan_tier?: string
        }
        Update: {
          created_at?: string
          feature_key?: string
          id?: string
          max_uses?: number
          period_days?: number
          period_type?: string
          plan_tier?: string
        }
        Relationships: []
      }
      ai_usage_tracking: {
        Row: {
          feature_key: string
          id: string
          metadata: Json | null
          used_at: string
          user_id: string
        }
        Insert: {
          feature_key: string
          id?: string
          metadata?: Json | null
          used_at?: string
          user_id: string
        }
        Update: {
          feature_key?: string
          id?: string
          metadata?: Json | null
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      anamnese_trigger_map: {
        Row: {
          answer_condition: Json
          created_at: string
          generated_flag: string
          id: string
          is_active: boolean
          priority: number
          question_key: string
        }
        Insert: {
          answer_condition?: Json
          created_at?: string
          generated_flag: string
          id?: string
          is_active?: boolean
          priority?: number
          question_key: string
        }
        Update: {
          answer_condition?: Json
          created_at?: string
          generated_flag?: string
          id?: string
          is_active?: boolean
          priority?: number
          question_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamnese_trigger_map_generated_flag_fkey"
            columns: ["generated_flag"]
            isOneToOne: false
            referencedRelation: "clinical_flags_catalog"
            referencedColumns: ["flag_key"]
          },
        ]
      }
      anamnesis_ai_insights: {
        Row: {
          ai_summary: string | null
          anamnesis_id: string
          behavior_focus: Json | null
          created_at: string
          id: string
          main_pains: Json | null
          metabolic_profile: string | null
          movement_focus: Json | null
          nutrition_focus: Json | null
          personalized_tips: Json | null
          primary_goal: string | null
          raw_response: Json | null
          risk_level: string
          suggested_protocol: string | null
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          anamnesis_id: string
          behavior_focus?: Json | null
          created_at?: string
          id?: string
          main_pains?: Json | null
          metabolic_profile?: string | null
          movement_focus?: Json | null
          nutrition_focus?: Json | null
          personalized_tips?: Json | null
          primary_goal?: string | null
          raw_response?: Json | null
          risk_level?: string
          suggested_protocol?: string | null
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          anamnesis_id?: string
          behavior_focus?: Json | null
          created_at?: string
          id?: string
          main_pains?: Json | null
          metabolic_profile?: string | null
          movement_focus?: Json | null
          nutrition_focus?: Json | null
          personalized_tips?: Json | null
          primary_goal?: string | null
          raw_response?: Json | null
          risk_level?: string
          suggested_protocol?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_ai_insights_anamnesis_id_fkey"
            columns: ["anamnesis_id"]
            isOneToOne: false
            referencedRelation: "patient_anamnesis"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_reminders: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          reminder_type: string
          sent_at: string | null
          status: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          reminder_type?: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          reminder_type?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_cache: {
        Row: {
          cache_key: string
          created_at: string | null
          data: Json
          expires_at: string
          id: string
          plan_id: string | null
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          data: Json
          expires_at: string
          id?: string
          plan_id?: string | null
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          data?: Json
          expires_at?: string
          id?: string
          plan_id?: string | null
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          profile_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          profile_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          profile_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_exports_log: {
        Row: {
          created_at: string | null
          export_format: string
          filter_params: Json | null
          id: string
          record_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          export_format: string
          filter_params?: Json | null
          id?: string
          record_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          export_format?: string
          filter_params?: Json | null
          id?: string
          record_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          correlation_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          parent_correlation_id: string | null
          resource_id: string | null
          resource_type: string
          status: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          action: string
          correlation_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          parent_correlation_id?: string | null
          resource_id?: string | null
          resource_type: string
          status?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          action?: string
          correlation_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          parent_correlation_id?: string | null
          resource_id?: string | null
          resource_type?: string
          status?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_plan_fetch_logs: {
        Row: {
          created_at: string | null
          id: string
          nutritionist_id: string | null
          patient_id: string | null
          plans_found: number | null
          status_filter: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nutritionist_id?: string | null
          patient_id?: string | null
          plans_found?: number | null
          status_filter?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nutritionist_id?: string | null
          patient_id?: string | null
          plans_found?: number | null
          status_filter?: string | null
        }
        Relationships: []
      }
      autofix_backups: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          meal_plan_id: string
          original_items: Json
          original_plan_metadata: Json | null
          restored_at: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          meal_plan_id: string
          original_items: Json
          original_plan_metadata?: Json | null
          restored_at?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          meal_plan_id?: string
          original_items?: Json
          original_plan_metadata?: Json | null
          restored_at?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "autofix_backups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json
          conditions: Json
          cooldown_hours: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          nutritionist_id: string
          tenant_id: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          conditions?: Json
          cooldown_hours?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          nutritionist_id: string
          tenant_id: string
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          conditions?: Json
          cooldown_hours?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          nutritionist_id?: string
          tenant_id?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          actions_executed: Json | null
          error_message: string | null
          executed_at: string
          id: string
          nutritionist_id: string
          patient_id: string | null
          rule_id: string | null
          status: string
          tenant_id: string
          trigger_data: Json | null
        }
        Insert: {
          actions_executed?: Json | null
          error_message?: string | null
          executed_at?: string
          id?: string
          nutritionist_id: string
          patient_id?: string | null
          rule_id?: string | null
          status?: string
          tenant_id: string
          trigger_data?: Json | null
        }
        Update: {
          actions_executed?: Json | null
          error_message?: string | null
          executed_at?: string
          id?: string
          nutritionist_id?: string
          patient_id?: string | null
          rule_id?: string | null
          status?: string
          tenant_id?: string
          trigger_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      behavioral_profile: {
        Row: {
          craving_hours: string[] | null
          created_at: string
          forgets_water: boolean | null
          id: string
          message_tone: string | null
          motivation_style: string | null
          patient_id: string
          preferred_reminder_windows: number[] | null
          tenant_id: string | null
          trains_alone: boolean | null
          updated_at: string
          wake_up_time: string | null
          water_cups_per_day: number | null
          weekend_diet_breaks: boolean | null
          workout_blocker: string | null
          workout_time: string | null
        }
        Insert: {
          craving_hours?: string[] | null
          created_at?: string
          forgets_water?: boolean | null
          id?: string
          message_tone?: string | null
          motivation_style?: string | null
          patient_id: string
          preferred_reminder_windows?: number[] | null
          tenant_id?: string | null
          trains_alone?: boolean | null
          updated_at?: string
          wake_up_time?: string | null
          water_cups_per_day?: number | null
          weekend_diet_breaks?: boolean | null
          workout_blocker?: string | null
          workout_time?: string | null
        }
        Update: {
          craving_hours?: string[] | null
          created_at?: string
          forgets_water?: boolean | null
          id?: string
          message_tone?: string | null
          motivation_style?: string | null
          patient_id?: string
          preferred_reminder_windows?: number[] | null
          tenant_id?: string | null
          trains_alone?: boolean | null
          updated_at?: string
          wake_up_time?: string | null
          water_cups_per_day?: number | null
          weekend_diet_breaks?: boolean | null
          workout_blocker?: string | null
          workout_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "behavioral_profile_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      behavioral_recovery_actions: {
        Row: {
          adherence_at_moment: number | null
          applied_at: string | null
          applied_by: string | null
          clinical_reason: string
          cluster_origin: string | null
          created_at: string
          days_inactive: number | null
          dropout_risk_level: string
          dropout_risk_score: number
          engine_version: string
          id: string
          metadata: Json | null
          patient_id: string
          plan_efficacy_score: number | null
          priority: number
          status: string
          suggested_strategy: string
          tenant_id: string
        }
        Insert: {
          adherence_at_moment?: number | null
          applied_at?: string | null
          applied_by?: string | null
          clinical_reason: string
          cluster_origin?: string | null
          created_at?: string
          days_inactive?: number | null
          dropout_risk_level?: string
          dropout_risk_score?: number
          engine_version?: string
          id?: string
          metadata?: Json | null
          patient_id: string
          plan_efficacy_score?: number | null
          priority?: number
          status?: string
          suggested_strategy: string
          tenant_id: string
        }
        Update: {
          adherence_at_moment?: number | null
          applied_at?: string | null
          applied_by?: string | null
          clinical_reason?: string
          cluster_origin?: string | null
          created_at?: string
          days_inactive?: number | null
          dropout_risk_level?: string
          dropout_risk_score?: number
          engine_version?: string
          id?: string
          metadata?: Json | null
          patient_id?: string
          plan_efficacy_score?: number | null
          priority?: number
          status?: string
          suggested_strategy?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavioral_recovery_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      body_analyses: {
        Row: {
          ai_analysis: Json | null
          analysis_date: string
          assessor_id: string
          back_image_url: string | null
          body_fat_estimate: number | null
          body_type: string | null
          created_at: string
          fat_distribution: Json | null
          front_image_url: string | null
          id: string
          muscle_definition: number | null
          notes: string | null
          patient_id: string
          progress_comparison: Json | null
          side_image_url: string | null
          tenant_id: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          analysis_date?: string
          assessor_id: string
          back_image_url?: string | null
          body_fat_estimate?: number | null
          body_type?: string | null
          created_at?: string
          fat_distribution?: Json | null
          front_image_url?: string | null
          id?: string
          muscle_definition?: number | null
          notes?: string | null
          patient_id: string
          progress_comparison?: Json | null
          side_image_url?: string | null
          tenant_id?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          analysis_date?: string
          assessor_id?: string
          back_image_url?: string | null
          body_fat_estimate?: number | null
          body_type?: string | null
          created_at?: string
          fat_distribution?: Json | null
          front_image_url?: string | null
          id?: string
          muscle_definition?: number | null
          notes?: string | null
          patient_id?: string
          progress_comparison?: Json | null
          side_image_url?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "body_analyses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      body_assessment_extraction_logs: {
        Row: {
          created_at: string | null
          extraction_status: string | null
          fields_detected_json: Json | null
          file_name: string | null
          id: string
          parser_version: string | null
          patient_id: string
          warnings_json: Json | null
        }
        Insert: {
          created_at?: string | null
          extraction_status?: string | null
          fields_detected_json?: Json | null
          file_name?: string | null
          id?: string
          parser_version?: string | null
          patient_id: string
          warnings_json?: Json | null
        }
        Update: {
          created_at?: string | null
          extraction_status?: string | null
          fields_detected_json?: Json | null
          file_name?: string | null
          id?: string
          parser_version?: string | null
          patient_id?: string
          warnings_json?: Json | null
        }
        Relationships: []
      }
      body_assessment_photos: {
        Row: {
          assessment_date: string
          back_image_url: string | null
          created_at: string
          front_image_url: string | null
          id: string
          notes: string | null
          patient_id: string
          side_image_url: string | null
          source: string
          tenant_id: string | null
        }
        Insert: {
          assessment_date?: string
          back_image_url?: string | null
          created_at?: string
          front_image_url?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          side_image_url?: string | null
          source?: string
          tenant_id?: string | null
        }
        Update: {
          assessment_date?: string
          back_image_url?: string | null
          created_at?: string
          front_image_url?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          side_image_url?: string | null
          source?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "body_assessment_photos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      body_projection_snapshots: {
        Row: {
          assessment_id: string | null
          confidence_score: number | null
          created_at: string
          created_by: string | null
          current_body_json: Json
          current_metrics_json: Json | null
          current_visual_url: string | null
          generation_source: string
          id: string
          locked_until: string | null
          narrative: string | null
          patient_id: string
          projected_body_json: Json
          projected_metrics_json: Json | null
          projected_visual_url: string | null
          timeframe: string
          valid_until: string | null
        }
        Insert: {
          assessment_id?: string | null
          confidence_score?: number | null
          created_at?: string
          created_by?: string | null
          current_body_json?: Json
          current_metrics_json?: Json | null
          current_visual_url?: string | null
          generation_source?: string
          id?: string
          locked_until?: string | null
          narrative?: string | null
          patient_id: string
          projected_body_json?: Json
          projected_metrics_json?: Json | null
          projected_visual_url?: string | null
          timeframe: string
          valid_until?: string | null
        }
        Update: {
          assessment_id?: string | null
          confidence_score?: number | null
          created_at?: string
          created_by?: string | null
          current_body_json?: Json
          current_metrics_json?: Json | null
          current_visual_url?: string | null
          generation_source?: string
          id?: string
          locked_until?: string | null
          narrative?: string | null
          patient_id?: string
          projected_body_json?: Json
          projected_metrics_json?: Json | null
          projected_visual_url?: string | null
          timeframe?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "body_projection_snapshots_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "body_assessment_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_payments: {
        Row: {
          amount: number
          created_at: string
          customer_email: string
          customer_name: string
          id: string
          lead_request_id: string | null
          nutritionist_id: string
          paid_at: string | null
          status: string
          stripe_session_id: string | null
          tenant_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          customer_email: string
          customer_name: string
          id?: string
          lead_request_id?: string | null
          nutritionist_id: string
          paid_at?: string | null
          status?: string
          stripe_session_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_email?: string
          customer_name?: string
          id?: string
          lead_request_id?: string | null
          nutritionist_id?: string
          paid_at?: string | null
          status?: string
          stripe_session_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_payments_lead_request_id_fkey"
            columns: ["lead_request_id"]
            isOneToOne: false
            referencedRelation: "lead_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      branding_settings: {
        Row: {
          accent_color: string | null
          brand_name: string | null
          created_at: string
          custom_css: string | null
          id: string
          logo_url: string | null
          nutritionist_id: string
          primary_color: string | null
          secondary_color: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          brand_name?: string | null
          created_at?: string
          custom_css?: string | null
          id?: string
          logo_url?: string | null
          nutritionist_id: string
          primary_color?: string | null
          secondary_color?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          brand_name?: string | null
          created_at?: string
          custom_css?: string | null
          id?: string
          logo_url?: string | null
          nutritionist_id?: string
          primary_color?: string | null
          secondary_color?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branding_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_milestones: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          entity_id: string | null
          id: string
          milestone_date: string
          milestone_label: string
          milestone_type: string
          patient_id: string
          source: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          entity_id?: string | null
          id?: string
          milestone_date: string
          milestone_label: string
          milestone_type: string
          patient_id: string
          source?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          entity_id?: string | null
          id?: string
          milestone_date?: string
          milestone_label?: string
          milestone_type?: string
          patient_id?: string
          source?: string | null
        }
        Relationships: []
      }
      campaign_deliveries: {
        Row: {
          campaign_id: string
          channel: string
          created_at: string | null
          delivery_status: string | null
          error_message: string | null
          id: string
          recipient_id: string
          recipient_type: string
          sent_at: string | null
        }
        Insert: {
          campaign_id: string
          channel: string
          created_at?: string | null
          delivery_status?: string | null
          error_message?: string | null
          id?: string
          recipient_id: string
          recipient_type: string
          sent_at?: string | null
        }
        Update: {
          campaign_id?: string
          channel?: string
          created_at?: string | null
          delivery_status?: string | null
          error_message?: string | null
          id?: string
          recipient_id?: string
          recipient_type?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_deliveries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          audience_type: string | null
          call_to_action_label: string | null
          call_to_action_url: string | null
          campaign_name: string
          campaign_type: string | null
          created_at: string | null
          created_by: string | null
          delivery_channels_json: Json | null
          filters_json: Json | null
          id: string
          message_body: string
          scheduled_at: string | null
          scheduling_type: string | null
          status: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          audience_type?: string | null
          call_to_action_label?: string | null
          call_to_action_url?: string | null
          campaign_name: string
          campaign_type?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_channels_json?: Json | null
          filters_json?: Json | null
          id?: string
          message_body: string
          scheduled_at?: string | null
          scheduling_type?: string | null
          status?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          audience_type?: string | null
          call_to_action_label?: string | null
          call_to_action_url?: string | null
          campaign_name?: string
          campaign_type?: string | null
          created_at?: string | null
          created_by?: string | null
          delivery_channels_json?: Json | null
          filters_json?: Json | null
          id?: string
          message_body?: string
          scheduled_at?: string | null
          scheduling_type?: string | null
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cardio_prescriptions: {
        Row: {
          cardio_type: string
          created_at: string
          distance_km: number | null
          duration_minutes: number
          frequency_per_week: number
          id: string
          intensity: string
          interval_protocol: Json | null
          is_active: boolean
          notes: string | null
          personal_id: string
          plan_id: string | null
          student_id: string
          target_hr_max: number | null
          target_hr_min: number | null
          target_hr_zone: string | null
          tenant_id: string | null
        }
        Insert: {
          cardio_type: string
          created_at?: string
          distance_km?: number | null
          duration_minutes?: number
          frequency_per_week?: number
          id?: string
          intensity?: string
          interval_protocol?: Json | null
          is_active?: boolean
          notes?: string | null
          personal_id: string
          plan_id?: string | null
          student_id: string
          target_hr_max?: number | null
          target_hr_min?: number | null
          target_hr_zone?: string | null
          tenant_id?: string | null
        }
        Update: {
          cardio_type?: string
          created_at?: string
          distance_km?: number | null
          duration_minutes?: number
          frequency_per_week?: number
          id?: string
          intensity?: string
          interval_protocol?: Json | null
          is_active?: boolean
          notes?: string | null
          personal_id?: string
          plan_id?: string | null
          student_id?: string
          target_hr_max?: number | null
          target_hr_min?: number | null
          target_hr_zone?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cardio_prescriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cardio_prescriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          duration_days: number
          icon: string
          id: string
          is_global: boolean
          target_type: string
          target_value: number
          title: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          duration_days?: number
          icon?: string
          id?: string
          is_global?: boolean
          target_type: string
          target_value: number
          title: string
          xp_reward?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          duration_days?: number
          icon?: string
          id?: string
          is_global?: boolean
          target_type?: string
          target_value?: number
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_read: boolean
          message: string
          receiver_id: string
          sender_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          message: string
          receiver_id: string
          sender_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          message?: string
          receiver_id?: string
          sender_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_daily_summary: {
        Row: {
          completed_tasks: number | null
          completion_rate: number | null
          created_at: string | null
          id: string
          patient_id: string
          summary_date: string
          tenant_id: string | null
          total_tasks: number | null
        }
        Insert: {
          completed_tasks?: number | null
          completion_rate?: number | null
          created_at?: string | null
          id?: string
          patient_id: string
          summary_date?: string
          tenant_id?: string | null
          total_tasks?: number | null
        }
        Update: {
          completed_tasks?: number | null
          completion_rate?: number | null
          created_at?: string | null
          id?: string
          patient_id?: string
          summary_date?: string
          tenant_id?: string | null
          total_tasks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_daily_summary_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_tasks: {
        Row: {
          category: string
          completed: boolean
          completed_at: string | null
          created_at: string
          date: string
          description: string | null
          icon: string
          id: string
          patient_id: string
          patient_protocol_id: string | null
          protocol_task_id: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          category?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          date?: string
          description?: string | null
          icon?: string
          id?: string
          patient_id: string
          patient_protocol_id?: string | null
          protocol_task_id?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          category?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          date?: string
          description?: string | null
          icon?: string
          id?: string
          patient_id?: string
          patient_protocol_id?: string | null
          protocol_task_id?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_tasks_patient_protocol_id_fkey"
            columns: ["patient_protocol_id"]
            isOneToOne: false
            referencedRelation: "patient_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_protocol_task_id_fkey"
            columns: ["protocol_task_id"]
            isOneToOne: false
            referencedRelation: "protocol_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_clinical_evolution_metrics: {
        Row: {
          avg_metabolic_stability: number | null
          avg_protocol_efficacy: number | null
          avg_transformation_velocity: number | null
          base_at_risk_percent: number | null
          computed_at: string | null
          engine_version: string | null
          id: string
          nutritionist_id: string
          tenant_id: string | null
          top_protocol_id: string | null
          top_protocol_name: string | null
          total_patients_analyzed: number | null
          total_protocols_analyzed: number | null
          worst_protocol_id: string | null
          worst_protocol_name: string | null
        }
        Insert: {
          avg_metabolic_stability?: number | null
          avg_protocol_efficacy?: number | null
          avg_transformation_velocity?: number | null
          base_at_risk_percent?: number | null
          computed_at?: string | null
          engine_version?: string | null
          id?: string
          nutritionist_id: string
          tenant_id?: string | null
          top_protocol_id?: string | null
          top_protocol_name?: string | null
          total_patients_analyzed?: number | null
          total_protocols_analyzed?: number | null
          worst_protocol_id?: string | null
          worst_protocol_name?: string | null
        }
        Update: {
          avg_metabolic_stability?: number | null
          avg_protocol_efficacy?: number | null
          avg_transformation_velocity?: number | null
          base_at_risk_percent?: number | null
          computed_at?: string | null
          engine_version?: string | null
          id?: string
          nutritionist_id?: string
          tenant_id?: string | null
          top_protocol_id?: string | null
          top_protocol_name?: string | null
          total_patients_analyzed?: number | null
          total_protocols_analyzed?: number | null
          worst_protocol_id?: string | null
          worst_protocol_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_clinical_evolution_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_clinical_evolution_metrics_top_protocol_id_fkey"
            columns: ["top_protocol_id"]
            isOneToOne: false
            referencedRelation: "nutrition_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_clinical_evolution_metrics_worst_protocol_id_fkey"
            columns: ["worst_protocol_id"]
            isOneToOne: false
            referencedRelation: "nutrition_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_portfolio_state: {
        Row: {
          avg_adherence: number | null
          avg_metabolic_evolution: number | null
          avg_plan_efficacy: number | null
          critical_count: number | null
          dropout_rate: number | null
          engine_version: string | null
          high_priority_count: number | null
          id: string
          last_calculated_at: string | null
          nutritionist_id: string
          patients_at_risk_percent: number | null
          portfolio_classification: string | null
          portfolio_health_score: number | null
          tenant_id: string | null
          total_patients: number | null
        }
        Insert: {
          avg_adherence?: number | null
          avg_metabolic_evolution?: number | null
          avg_plan_efficacy?: number | null
          critical_count?: number | null
          dropout_rate?: number | null
          engine_version?: string | null
          high_priority_count?: number | null
          id?: string
          last_calculated_at?: string | null
          nutritionist_id: string
          patients_at_risk_percent?: number | null
          portfolio_classification?: string | null
          portfolio_health_score?: number | null
          tenant_id?: string | null
          total_patients?: number | null
        }
        Update: {
          avg_adherence?: number | null
          avg_metabolic_evolution?: number | null
          avg_plan_efficacy?: number | null
          critical_count?: number | null
          dropout_rate?: number | null
          engine_version?: string | null
          high_priority_count?: number | null
          id?: string
          last_calculated_at?: string | null
          nutritionist_id?: string
          patients_at_risk_percent?: number | null
          portfolio_classification?: string | null
          portfolio_health_score?: number | null
          tenant_id?: string | null
          total_patients?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_portfolio_state_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_action_recommendations: {
        Row: {
          acted_at: string | null
          acted_by: string | null
          created_at: string | null
          engine_version: string | null
          expected_clinical_impact: string | null
          id: string
          nutritionist_id: string
          patient_id: string
          reason: string
          recommended_action: string
          status: string | null
          supporting_data: Json | null
          tenant_id: string | null
          urgency_level: string | null
        }
        Insert: {
          acted_at?: string | null
          acted_by?: string | null
          created_at?: string | null
          engine_version?: string | null
          expected_clinical_impact?: string | null
          id?: string
          nutritionist_id: string
          patient_id: string
          reason: string
          recommended_action: string
          status?: string | null
          supporting_data?: Json | null
          tenant_id?: string | null
          urgency_level?: string | null
        }
        Update: {
          acted_at?: string | null
          acted_by?: string | null
          created_at?: string | null
          engine_version?: string | null
          expected_clinical_impact?: string | null
          id?: string
          nutritionist_id?: string
          patient_id?: string
          reason?: string
          recommended_action?: string
          status?: string | null
          supporting_data?: Json | null
          tenant_id?: string | null
          urgency_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_action_recommendations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          description: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          nutritionist_id: string
          patient_id: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          tenant_id: string
          title: string
          trigger_source: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          nutritionist_id: string
          patient_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          tenant_id: string
          title: string
          trigger_source?: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          nutritionist_id?: string
          patient_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          tenant_id?: string
          title?: string
          trigger_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_audit_logs: {
        Row: {
          action_metadata: Json | null
          action_type: string
          created_at: string | null
          created_by: string | null
          id: string
          organization_id: string | null
          patient_id: string | null
        }
        Insert: {
          action_metadata?: Json | null
          action_type: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          organization_id?: string | null
          patient_id?: string | null
        }
        Update: {
          action_metadata?: Json | null
          action_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          organization_id?: string | null
          patient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_auto_adjustment_logs: {
        Row: {
          adjustment_parameters: Json | null
          adjustment_type: string
          approved_by_guardrail: boolean | null
          automation_confidence: number | null
          created_at: string | null
          expected_clinical_effect: string | null
          id: string
          patient_id: string
          reversal_reason: string | null
          reversed_at: string | null
          triggering_driver: string
          was_reversed: boolean | null
        }
        Insert: {
          adjustment_parameters?: Json | null
          adjustment_type: string
          approved_by_guardrail?: boolean | null
          automation_confidence?: number | null
          created_at?: string | null
          expected_clinical_effect?: string | null
          id?: string
          patient_id: string
          reversal_reason?: string | null
          reversed_at?: string | null
          triggering_driver: string
          was_reversed?: boolean | null
        }
        Update: {
          adjustment_parameters?: Json | null
          adjustment_type?: string
          approved_by_guardrail?: boolean | null
          automation_confidence?: number | null
          created_at?: string | null
          expected_clinical_effect?: string | null
          id?: string
          patient_id?: string
          reversal_reason?: string | null
          reversed_at?: string | null
          triggering_driver?: string
          was_reversed?: boolean | null
        }
        Relationships: []
      }
      clinical_behavior_rules: {
        Row: {
          checklist_template_code: string | null
          created_at: string
          frequency: string
          id: string
          is_active: boolean
          message_template_code: string | null
          objective_context: string | null
          priority: number
          severity_level: string
          strategy_context: string | null
          trigger_flag: string
          updated_at: string
        }
        Insert: {
          checklist_template_code?: string | null
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          message_template_code?: string | null
          objective_context?: string | null
          priority?: number
          severity_level?: string
          strategy_context?: string | null
          trigger_flag: string
          updated_at?: string
        }
        Update: {
          checklist_template_code?: string | null
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean
          message_template_code?: string | null
          objective_context?: string | null
          priority?: number
          severity_level?: string
          strategy_context?: string | null
          trigger_flag?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_behavior_rules_checklist_template_code_fkey"
            columns: ["checklist_template_code"]
            isOneToOne: false
            referencedRelation: "clinical_checklist_templates"
            referencedColumns: ["template_code"]
          },
          {
            foreignKeyName: "clinical_behavior_rules_message_template_code_fkey"
            columns: ["message_template_code"]
            isOneToOne: false
            referencedRelation: "clinical_message_templates"
            referencedColumns: ["message_code"]
          },
          {
            foreignKeyName: "clinical_behavior_rules_trigger_flag_fkey"
            columns: ["trigger_flag"]
            isOneToOne: false
            referencedRelation: "clinical_flags_catalog"
            referencedColumns: ["flag_key"]
          },
        ]
      }
      clinical_checklist_templates: {
        Row: {
          action_type: string
          category: string
          created_at: string
          description: string | null
          frequency: string
          icon: string
          id: string
          is_active: boolean
          template_code: string
          title: string
          updated_at: string
        }
        Insert: {
          action_type?: string
          category?: string
          created_at?: string
          description?: string | null
          frequency?: string
          icon?: string
          id?: string
          is_active?: boolean
          template_code: string
          title: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          category?: string
          created_at?: string
          description?: string | null
          frequency?: string
          icon?: string
          id?: string
          is_active?: boolean
          template_code?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      clinical_communication_events: {
        Row: {
          created_at: string
          event_context: Json | null
          event_type: string
          id: string
          message_template_code: string
          patient_id: string
          priority_score: number
          professional_id: string
          scheduled_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          event_context?: Json | null
          event_type: string
          id?: string
          message_template_code: string
          patient_id: string
          priority_score?: number
          professional_id: string
          scheduled_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          event_context?: Json | null
          event_type?: string
          id?: string
          message_template_code?: string
          patient_id?: string
          priority_score?: number
          professional_id?: string
          scheduled_at?: string | null
          status?: string
        }
        Relationships: []
      }
      clinical_consents: {
        Row: {
          accepted_at: string
          accepted_terms_version: string
          created_at: string
          device_info: string | null
          id: string
          ip_address: string | null
          patient_id: string
          revoked_at: string | null
        }
        Insert: {
          accepted_at?: string
          accepted_terms_version?: string
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          patient_id: string
          revoked_at?: string | null
        }
        Update: {
          accepted_at?: string
          accepted_terms_version?: string
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          patient_id?: string
          revoked_at?: string | null
        }
        Relationships: []
      }
      clinical_daily_snapshots: {
        Row: {
          active_alerts_count: number | null
          adherence_score: number | null
          checklist_completion_rate: number | null
          clinical_risk_score: number | null
          created_at: string
          current_weight: number | null
          days_since_last_checkin: number | null
          days_since_last_meal: number | null
          dropout_risk_score: number | null
          id: string
          metabolic_cluster: string | null
          momentum_direction: string | null
          patient_id: string
          pipeline_run_id: string | null
          risk_level: string | null
          snapshot_data: Json | null
          snapshot_date: string
          tenant_id: string | null
          weight_change_7d: number | null
          weight_trend: string | null
        }
        Insert: {
          active_alerts_count?: number | null
          adherence_score?: number | null
          checklist_completion_rate?: number | null
          clinical_risk_score?: number | null
          created_at?: string
          current_weight?: number | null
          days_since_last_checkin?: number | null
          days_since_last_meal?: number | null
          dropout_risk_score?: number | null
          id?: string
          metabolic_cluster?: string | null
          momentum_direction?: string | null
          patient_id: string
          pipeline_run_id?: string | null
          risk_level?: string | null
          snapshot_data?: Json | null
          snapshot_date?: string
          tenant_id?: string | null
          weight_change_7d?: number | null
          weight_trend?: string | null
        }
        Update: {
          active_alerts_count?: number | null
          adherence_score?: number | null
          checklist_completion_rate?: number | null
          clinical_risk_score?: number | null
          created_at?: string
          current_weight?: number | null
          days_since_last_checkin?: number | null
          days_since_last_meal?: number | null
          dropout_risk_score?: number | null
          id?: string
          metabolic_cluster?: string | null
          momentum_direction?: string | null
          patient_id?: string
          pipeline_run_id?: string | null
          risk_level?: string | null
          snapshot_data?: Json | null
          snapshot_date?: string
          tenant_id?: string | null
          weight_change_7d?: number | null
          weight_trend?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_daily_snapshots_pipeline_run_id_fkey"
            columns: ["pipeline_run_id"]
            isOneToOne: false
            referencedRelation: "pipeline_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_daily_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_decisions: {
        Row: {
          acted_at: string | null
          confidence: number | null
          created_at: string | null
          decision_type: string
          expected_impact: string | null
          id: string
          nutritionist_id: string
          patient_id: string
          reason: string
          status: string | null
          tenant_id: string | null
          title: string
          urgency: string | null
        }
        Insert: {
          acted_at?: string | null
          confidence?: number | null
          created_at?: string | null
          decision_type: string
          expected_impact?: string | null
          id?: string
          nutritionist_id: string
          patient_id: string
          reason: string
          status?: string | null
          tenant_id?: string | null
          title: string
          urgency?: string | null
        }
        Update: {
          acted_at?: string | null
          confidence?: number | null
          created_at?: string | null
          decision_type?: string
          expected_impact?: string | null
          id?: string
          nutritionist_id?: string
          patient_id?: string
          reason?: string
          status?: string | null
          tenant_id?: string | null
          title?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_decisions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_engine_audit_logs: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          image_url: string | null
          marmita_name: string | null
          meal_plan_id: string | null
          metadata: Json | null
          patient_id: string
          protein_type: string | null
          resolution_source: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          image_url?: string | null
          marmita_name?: string | null
          meal_plan_id?: string | null
          metadata?: Json | null
          patient_id: string
          protein_type?: string | null
          resolution_source?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          image_url?: string | null
          marmita_name?: string | null
          meal_plan_id?: string | null
          metadata?: Json | null
          patient_id?: string
          protein_type?: string | null
          resolution_source?: string | null
        }
        Relationships: []
      }
      clinical_experiment_assignments: {
        Row: {
          assigned_at: string
          baseline_snapshot: Json
          experiment_id: string
          group_id: string
          id: string
          patient_id: string
        }
        Insert: {
          assigned_at?: string
          baseline_snapshot?: Json
          experiment_id: string
          group_id: string
          id?: string
          patient_id: string
        }
        Update: {
          assigned_at?: string
          baseline_snapshot?: Json
          experiment_id?: string
          group_id?: string
          id?: string
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_experiment_assignments_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "clinical_experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_experiment_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "clinical_experiment_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_experiment_groups: {
        Row: {
          created_at: string
          expected_mechanism: string | null
          experiment_id: string
          group_name: string
          id: string
          intervention_definition: Json
        }
        Insert: {
          created_at?: string
          expected_mechanism?: string | null
          experiment_id: string
          group_name: string
          id?: string
          intervention_definition?: Json
        }
        Update: {
          created_at?: string
          expected_mechanism?: string | null
          experiment_id?: string
          group_name?: string
          id?: string
          intervention_definition?: Json
        }
        Relationships: [
          {
            foreignKeyName: "clinical_experiment_groups_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "clinical_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_experiment_insights: {
        Row: {
          confidence_level: string | null
          created_at: string
          experiment_id: string
          id: string
          insight_description: string
        }
        Insert: {
          confidence_level?: string | null
          created_at?: string
          experiment_id: string
          id?: string
          insight_description: string
        }
        Update: {
          confidence_level?: string | null
          created_at?: string
          experiment_id?: string
          id?: string
          insight_description?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_experiment_insights_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "clinical_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_experiment_outcomes: {
        Row: {
          adherence_delta: number | null
          dropout_event: boolean | null
          evaluation_window_days: number | null
          experiment_id: string
          id: string
          patient_id: string
          performance_delta: number | null
          recorded_at: string
          regression_event: boolean | null
          risk_delta: number | null
          stagnation_event: boolean | null
          weight_delta: number | null
        }
        Insert: {
          adherence_delta?: number | null
          dropout_event?: boolean | null
          evaluation_window_days?: number | null
          experiment_id: string
          id?: string
          patient_id: string
          performance_delta?: number | null
          recorded_at?: string
          regression_event?: boolean | null
          risk_delta?: number | null
          stagnation_event?: boolean | null
          weight_delta?: number | null
        }
        Update: {
          adherence_delta?: number | null
          dropout_event?: boolean | null
          evaluation_window_days?: number | null
          experiment_id?: string
          id?: string
          patient_id?: string
          performance_delta?: number | null
          recorded_at?: string
          regression_event?: boolean | null
          risk_delta?: number | null
          stagnation_event?: boolean | null
          weight_delta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_experiment_outcomes_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "clinical_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_experiment_results: {
        Row: {
          avg_adherence_change: number | null
          avg_performance_change: number | null
          avg_weight_change: number | null
          created_at: string
          dropout_rate: number | null
          experiment_id: string
          group_id: string
          id: string
          patients_count: number | null
          regression_rate: number | null
          result_interpretation: string | null
          stagnation_rate: number | null
          statistical_signal_strength: number | null
        }
        Insert: {
          avg_adherence_change?: number | null
          avg_performance_change?: number | null
          avg_weight_change?: number | null
          created_at?: string
          dropout_rate?: number | null
          experiment_id: string
          group_id: string
          id?: string
          patients_count?: number | null
          regression_rate?: number | null
          result_interpretation?: string | null
          stagnation_rate?: number | null
          statistical_signal_strength?: number | null
        }
        Update: {
          avg_adherence_change?: number | null
          avg_performance_change?: number | null
          avg_weight_change?: number | null
          created_at?: string
          dropout_rate?: number | null
          experiment_id?: string
          group_id?: string
          id?: string
          patients_count?: number | null
          regression_rate?: number | null
          result_interpretation?: string | null
          stagnation_rate?: number | null
          statistical_signal_strength?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_experiment_results_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "clinical_experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_experiment_results_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "clinical_experiment_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_experiments: {
        Row: {
          created_at: string
          created_by: string | null
          expected_duration_days: number
          experiment_name: string
          experiment_type: string
          hypothesis_description: string
          id: string
          organization_id: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_duration_days?: number
          experiment_name: string
          experiment_type?: string
          hypothesis_description?: string
          id?: string
          organization_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_duration_days?: number
          experiment_name?: string
          experiment_type?: string
          hypothesis_description?: string
          id?: string
          organization_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      clinical_file_access_log: {
        Row: {
          access_type: string
          accessed_at: string
          bucket: string
          file_path: string
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          access_type?: string
          accessed_at?: string
          bucket: string
          file_path: string
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          access_type?: string
          accessed_at?: string
          bucket?: string
          file_path?: string
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      clinical_flags_catalog: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_name: string
          flag_key: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          display_name: string
          flag_key: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_name?: string
          flag_key?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      clinical_intervention_simulations: {
        Row: {
          baseline_state: Json
          confidence_classification: string
          created_at: string
          created_by: string | null
          current_plan_id: string | null
          current_protocol_id: string | null
          engine_version: string
          id: string
          patient_id: string
          projected_outcomes: Json
          projected_risks: Json
          recommended_decision: string
          simulated_intervention: Json
          simulation_confidence_score: number
          simulation_type: string
        }
        Insert: {
          baseline_state?: Json
          confidence_classification?: string
          created_at?: string
          created_by?: string | null
          current_plan_id?: string | null
          current_protocol_id?: string | null
          engine_version?: string
          id?: string
          patient_id: string
          projected_outcomes?: Json
          projected_risks?: Json
          recommended_decision?: string
          simulated_intervention?: Json
          simulation_confidence_score?: number
          simulation_type?: string
        }
        Update: {
          baseline_state?: Json
          confidence_classification?: string
          created_at?: string
          created_by?: string | null
          current_plan_id?: string | null
          current_protocol_id?: string | null
          engine_version?: string
          id?: string
          patient_id?: string
          projected_outcomes?: Json
          projected_risks?: Json
          recommended_decision?: string
          simulated_intervention?: Json
          simulation_confidence_score?: number
          simulation_type?: string
        }
        Relationships: []
      }
      clinical_message_templates: {
        Row: {
          body: string
          category: string
          channel: string
          created_at: string
          id: string
          is_active: boolean
          message_code: string
          title: string
          tone: string
          updated_at: string
        }
        Insert: {
          body: string
          category?: string
          channel?: string
          created_at?: string
          id?: string
          is_active?: boolean
          message_code: string
          title: string
          tone?: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          channel?: string
          created_at?: string
          id?: string
          is_active?: boolean
          message_code?: string
          title?: string
          tone?: string
          updated_at?: string
        }
        Relationships: []
      }
      clinical_methodologies: {
        Row: {
          alert_thresholds: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          protocol_rules: Json | null
          scoring_weights: Json | null
          updated_at: string | null
        }
        Insert: {
          alert_thresholds?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          protocol_rules?: Json | null
          scoring_weights?: Json | null
          updated_at?: string | null
        }
        Update: {
          alert_thresholds?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          protocol_rules?: Json | null
          scoring_weights?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_methodologies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_milestone_definitions: {
        Row: {
          actions: Json
          created_at: string
          day_offset: number
          description: string | null
          id: string
          is_active: boolean
          label: string
          milestone_key: string
        }
        Insert: {
          actions?: Json
          created_at?: string
          day_offset: number
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          milestone_key: string
        }
        Update: {
          actions?: Json
          created_at?: string
          day_offset?: number
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          milestone_key?: string
        }
        Relationships: []
      }
      clinical_pipeline_runs: {
        Row: {
          created_at: string
          error_details: Json | null
          errors_detected: number | null
          execution_time_ms: number | null
          flags_generated: number | null
          id: string
          messages_generated: number | null
          nutritionist_id: string | null
          patients_processed: number | null
          run_mode: string | null
          tasks_generated: number | null
        }
        Insert: {
          created_at?: string
          error_details?: Json | null
          errors_detected?: number | null
          execution_time_ms?: number | null
          flags_generated?: number | null
          id?: string
          messages_generated?: number | null
          nutritionist_id?: string | null
          patients_processed?: number | null
          run_mode?: string | null
          tasks_generated?: number | null
        }
        Update: {
          created_at?: string
          error_details?: Json | null
          errors_detected?: number | null
          execution_time_ms?: number | null
          flags_generated?: number | null
          id?: string
          messages_generated?: number | null
          nutritionist_id?: string | null
          patients_processed?: number | null
          run_mode?: string | null
          tasks_generated?: number | null
        }
        Relationships: []
      }
      clinical_plan_audit_logs: {
        Row: {
          created_at: string | null
          id: string
          issues: Json | null
          patient_id: string | null
          plan_id: string | null
          validation_status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          issues?: Json | null
          patient_id?: string | null
          plan_id?: string | null
          validation_status: string
        }
        Update: {
          created_at?: string | null
          id?: string
          issues?: Json | null
          patient_id?: string | null
          plan_id?: string | null
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_plan_audit_logs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_resolved_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_plan_audit_logs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_plan_audit_logs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "v_plan_visibility_diagnostics"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      clinical_population_patterns: {
        Row: {
          avg_response_score: number | null
          computed_at: string
          confidence_level: string | null
          id: string
          metadata: Json | null
          pattern_description: string | null
          pattern_key: string
          pattern_type: string
          sample_size: number
          success_rate: number | null
        }
        Insert: {
          avg_response_score?: number | null
          computed_at?: string
          confidence_level?: string | null
          id?: string
          metadata?: Json | null
          pattern_description?: string | null
          pattern_key: string
          pattern_type: string
          sample_size?: number
          success_rate?: number | null
        }
        Update: {
          avg_response_score?: number | null
          computed_at?: string
          confidence_level?: string | null
          id?: string
          metadata?: Json | null
          pattern_description?: string | null
          pattern_key?: string
          pattern_type?: string
          sample_size?: number
          success_rate?: number | null
        }
        Relationships: []
      }
      clinical_rule_conditions: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          operator: string
          rule_id: string
          signal_key: string
          threshold: number | null
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          operator?: string
          rule_id: string
          signal_key: string
          threshold?: number | null
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          operator?: string
          rule_id?: string
          signal_key?: string
          threshold?: number | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinical_rule_conditions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "clinical_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_rule_conditions_signal_key_fkey"
            columns: ["signal_key"]
            isOneToOne: false
            referencedRelation: "clinical_signals_catalog"
            referencedColumns: ["signal_key"]
          },
        ]
      }
      clinical_rule_recommendations: {
        Row: {
          created_at: string
          display_order: number
          id: string
          recommendation_id: string
          rule_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          recommendation_id: string
          rule_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          recommendation_id?: string
          rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_rule_recommendations_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendation_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_rule_recommendations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "clinical_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_rules: {
        Row: {
          category: string
          cooldown_hours: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logic_operator: string
          min_score: number
          name: string
          priority: number
          rule_key: string
          target_audience: string
          updated_at: string
        }
        Insert: {
          category?: string
          cooldown_hours?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logic_operator?: string
          min_score?: number
          name: string
          priority?: number
          rule_key: string
          target_audience?: string
          updated_at?: string
        }
        Update: {
          category?: string
          cooldown_hours?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logic_operator?: string
          min_score?: number
          name?: string
          priority?: number
          rule_key?: string
          target_audience?: string
          updated_at?: string
        }
        Relationships: []
      }
      clinical_signals_catalog: {
        Row: {
          category: string
          created_at: string
          data_source: string
          default_severity: string
          description: string | null
          detection_query: string | null
          id: string
          is_active: boolean
          name: string
          signal_key: string
        }
        Insert: {
          category?: string
          created_at?: string
          data_source: string
          default_severity?: string
          description?: string | null
          detection_query?: string | null
          id?: string
          is_active?: boolean
          name: string
          signal_key: string
        }
        Update: {
          category?: string
          created_at?: string
          data_source?: string
          default_severity?: string
          description?: string | null
          detection_query?: string | null
          id?: string
          is_active?: boolean
          name?: string
          signal_key?: string
        }
        Relationships: []
      }
      clinical_system_parameters: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          parameter_key: string
          parameter_value: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          parameter_key: string
          parameter_value: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          parameter_key?: string
          parameter_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      cluster_protocol_matrix: {
        Row: {
          avg_adherence: number | null
          avg_weight_response: number | null
          cluster_type: string
          dropout_rate: number | null
          effectiveness_tier: string | null
          id: string
          last_updated: string | null
          protocol_id: string
          sample_size: number | null
          stagnation_rate: number | null
          success_score: number | null
        }
        Insert: {
          avg_adherence?: number | null
          avg_weight_response?: number | null
          cluster_type: string
          dropout_rate?: number | null
          effectiveness_tier?: string | null
          id?: string
          last_updated?: string | null
          protocol_id: string
          sample_size?: number | null
          stagnation_rate?: number | null
          success_score?: number | null
        }
        Update: {
          avg_adherence?: number | null
          avg_weight_response?: number | null
          cluster_type?: string
          dropout_rate?: number | null
          effectiveness_tier?: string | null
          id?: string
          last_updated?: string | null
          protocol_id?: string
          sample_size?: number | null
          stagnation_rate?: number | null
          success_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cluster_protocol_matrix_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "nutrition_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_alerts: {
        Row: {
          alert_type: string
          athlete_id: string
          coach_id: string
          coach_note: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          read_at: string | null
          resolved_at: string | null
          severity: string
          tenant_id: string | null
          title: string
        }
        Insert: {
          alert_type: string
          athlete_id: string
          coach_id: string
          coach_note?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          read_at?: string | null
          resolved_at?: string | null
          severity?: string
          tenant_id?: string | null
          title: string
        }
        Update: {
          alert_type?: string
          athlete_id?: string
          coach_id?: string
          coach_note?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          read_at?: string | null
          resolved_at?: string | null
          severity?: string
          tenant_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_alerts_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "coach_athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_athlete_analysis: {
        Row: {
          analysis_date: string
          analysis_summary: string | null
          athlete_id: string
          catabolism_risk: string | null
          coach_id: string
          created_at: string | null
          evolution_consistency: string | null
          id: string
          overall_score: number | null
          plateau_detected: boolean | null
          raw_data: Json | null
          tenant_id: string | null
          water_retention: string | null
        }
        Insert: {
          analysis_date?: string
          analysis_summary?: string | null
          athlete_id: string
          catabolism_risk?: string | null
          coach_id: string
          created_at?: string | null
          evolution_consistency?: string | null
          id?: string
          overall_score?: number | null
          plateau_detected?: boolean | null
          raw_data?: Json | null
          tenant_id?: string | null
          water_retention?: string | null
        }
        Update: {
          analysis_date?: string
          analysis_summary?: string | null
          athlete_id?: string
          catabolism_risk?: string | null
          coach_id?: string
          created_at?: string | null
          evolution_consistency?: string | null
          id?: string
          overall_score?: number | null
          plateau_detected?: boolean | null
          raw_data?: Json | null
          tenant_id?: string | null
          water_retention?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_athlete_analysis_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "coach_athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_athlete_analysis_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_athlete_checkins: {
        Row: {
          adherence_pct: number | null
          athlete_id: string
          back_photo_url: string | null
          cardio_minutes: number | null
          checkin_date: string
          coach_id: string
          created_at: string | null
          digestion: number | null
          energy: number | null
          front_photo_url: string | null
          hunger: number | null
          id: string
          libido: number | null
          notes: string | null
          performance: number | null
          pump: number | null
          retention: number | null
          side_photo_url: string | null
          sleep_quality: number | null
          steps: number | null
          tenant_id: string | null
          training_load: number | null
          training_volume: number | null
          visual_observation: string | null
          visual_verdict: string | null
          weight: number | null
          weight_avg_7d: number | null
          weight_variation: number | null
        }
        Insert: {
          adherence_pct?: number | null
          athlete_id: string
          back_photo_url?: string | null
          cardio_minutes?: number | null
          checkin_date?: string
          coach_id: string
          created_at?: string | null
          digestion?: number | null
          energy?: number | null
          front_photo_url?: string | null
          hunger?: number | null
          id?: string
          libido?: number | null
          notes?: string | null
          performance?: number | null
          pump?: number | null
          retention?: number | null
          side_photo_url?: string | null
          sleep_quality?: number | null
          steps?: number | null
          tenant_id?: string | null
          training_load?: number | null
          training_volume?: number | null
          visual_observation?: string | null
          visual_verdict?: string | null
          weight?: number | null
          weight_avg_7d?: number | null
          weight_variation?: number | null
        }
        Update: {
          adherence_pct?: number | null
          athlete_id?: string
          back_photo_url?: string | null
          cardio_minutes?: number | null
          checkin_date?: string
          coach_id?: string
          created_at?: string | null
          digestion?: number | null
          energy?: number | null
          front_photo_url?: string | null
          hunger?: number | null
          id?: string
          libido?: number | null
          notes?: string | null
          performance?: number | null
          pump?: number | null
          retention?: number | null
          side_photo_url?: string | null
          sleep_quality?: number | null
          steps?: number | null
          tenant_id?: string | null
          training_load?: number | null
          training_volume?: number | null
          visual_observation?: string | null
          visual_verdict?: string | null
          weight?: number | null
          weight_avg_7d?: number | null
          weight_variation?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_athlete_checkins_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "coach_athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_athlete_checkins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_athletes: {
        Row: {
          coach_id: string
          competition_date: string | null
          created_at: string | null
          current_phase: string
          id: string
          is_active: boolean | null
          notes: string | null
          patient_id: string
          prep_score: number | null
          score_adherence: number | null
          score_performance: number | null
          score_physical: number | null
          score_recovery: number | null
          score_risk: number | null
          status: string
          target_weight: number | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          coach_id: string
          competition_date?: string | null
          created_at?: string | null
          current_phase?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          patient_id: string
          prep_score?: number | null
          score_adherence?: number | null
          score_performance?: number | null
          score_physical?: number | null
          score_recovery?: number | null
          score_risk?: number | null
          status?: string
          target_weight?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          coach_id?: string
          competition_date?: string | null
          created_at?: string | null
          current_phase?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          patient_id?: string
          prep_score?: number | null
          score_adherence?: number | null
          score_performance?: number | null
          score_physical?: number | null
          score_recovery?: number | null
          score_risk?: number | null
          status?: string
          target_weight?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_athletes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_decisions: {
        Row: {
          analysis_id: string | null
          applied_at: string | null
          athlete_id: string
          coach_id: string
          coach_reason: string | null
          confidence_level: string | null
          created_at: string | null
          data_basis: string | null
          decision_type: string
          expected_impact: string | null
          id: string
          is_manual: boolean | null
          reason: string
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          analysis_id?: string | null
          applied_at?: string | null
          athlete_id: string
          coach_id: string
          coach_reason?: string | null
          confidence_level?: string | null
          created_at?: string | null
          data_basis?: string | null
          decision_type: string
          expected_impact?: string | null
          id?: string
          is_manual?: boolean | null
          reason: string
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          analysis_id?: string | null
          applied_at?: string | null
          athlete_id?: string
          coach_id?: string
          coach_reason?: string | null
          confidence_level?: string | null
          created_at?: string | null
          data_basis?: string | null
          decision_type?: string
          expected_impact?: string | null
          id?: string
          is_manual?: boolean | null
          reason?: string
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_decisions_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "coach_athlete_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_decisions_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "coach_athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_decisions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_timeline: {
        Row: {
          athlete_id: string
          coach_id: string
          created_at: string | null
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          tenant_id: string | null
          title: string
        }
        Insert: {
          athlete_id: string
          coach_id: string
          created_at?: string | null
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          tenant_id?: string | null
          title: string
        }
        Update: {
          athlete_id?: string
          coach_id?: string
          created_at?: string | null
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          tenant_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_timeline_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "coach_athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_violations_log: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          metadata: Json
          source: string
          violations: Json
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          metadata?: Json
          source: string
          violations?: Json
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          source?: string
          violations?: Json
        }
        Relationships: []
      }
      cross_professional_alerts: {
        Row: {
          alert_type: string
          created_at: string
          description: string | null
          id: string
          is_read: boolean
          metadata: Json | null
          patient_id: string
          severity: string
          source_professional_id: string
          source_role: string
          target_role: string
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          description?: string | null
          id?: string
          is_read?: boolean
          metadata?: Json | null
          patient_id: string
          severity?: string
          source_professional_id: string
          source_role: string
          target_role: string
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_read?: boolean
          metadata?: Json | null
          patient_id?: string
          severity?: string
          source_professional_id?: string
          source_role?: string
          target_role?: string
          title?: string
        }
        Relationships: []
      }
      diet_templates: {
        Row: {
          base_calories: number
          caloric_versions: Json
          category: string
          clinical_tags: string[]
          complexity_level: string
          conditions: string[]
          created_at: string
          description: string | null
          diet_style: string
          food_access_level: string
          goal_category: string
          icon: string
          id: string
          is_active: boolean
          macro_ratio: Json
          meal_distribution: Json
          meals: Json
          name: string
          slug: string
          tags: string[]
          template_generation: string
          updated_at: string
          version: number
          weekly_variation_strategy: Json
        }
        Insert: {
          base_calories?: number
          caloric_versions?: Json
          category?: string
          clinical_tags?: string[]
          complexity_level?: string
          conditions?: string[]
          created_at?: string
          description?: string | null
          diet_style?: string
          food_access_level?: string
          goal_category?: string
          icon?: string
          id?: string
          is_active?: boolean
          macro_ratio?: Json
          meal_distribution?: Json
          meals?: Json
          name: string
          slug: string
          tags?: string[]
          template_generation?: string
          updated_at?: string
          version?: number
          weekly_variation_strategy?: Json
        }
        Update: {
          base_calories?: number
          caloric_versions?: Json
          category?: string
          clinical_tags?: string[]
          complexity_level?: string
          conditions?: string[]
          created_at?: string
          description?: string | null
          diet_style?: string
          food_access_level?: string
          goal_category?: string
          icon?: string
          id?: string
          is_active?: boolean
          macro_ratio?: Json
          meal_distribution?: Json
          meals?: Json
          name?: string
          slug?: string
          tags?: string[]
          template_generation?: string
          updated_at?: string
          version?: number
          weekly_variation_strategy?: Json
        }
        Relationships: []
      }
      edge_function_rate_limits: {
        Row: {
          client_key: string
          function_name: string
          id: string
          request_count: number
          window_start: string
        }
        Insert: {
          client_key: string
          function_name: string
          id?: string
          request_count?: number
          window_start?: string
        }
        Update: {
          client_key?: string
          function_name?: string
          id?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      engagement_signals: {
        Row: {
          created_at: string | null
          detected_at: string | null
          id: string
          is_resolved: boolean | null
          nutritionist_id: string
          patient_id: string
          resolved_at: string | null
          severity: string
          signal_data: Json | null
          signal_type: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          detected_at?: string | null
          id?: string
          is_resolved?: boolean | null
          nutritionist_id: string
          patient_id: string
          resolved_at?: string | null
          severity?: string
          signal_data?: Json | null
          signal_type: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          detected_at?: string | null
          id?: string
          is_resolved?: boolean | null
          nutritionist_id?: string
          patient_id?: string
          resolved_at?: string | null
          severity?: string
          signal_data?: Json | null
          signal_type?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_signals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_photos: {
        Row: {
          created_at: string | null
          enrollment_id: string
          id: string
          patient_id: string
          phase: number
          photo_back_url: string | null
          photo_front_url: string | null
          photo_side_url: string | null
        }
        Insert: {
          created_at?: string | null
          enrollment_id: string
          id?: string
          patient_id: string
          phase?: number
          photo_back_url?: string | null
          photo_front_url?: string | null
          photo_side_url?: string | null
        }
        Update: {
          created_at?: string | null
          enrollment_id?: string
          id?: string
          patient_id?: string
          phase?: number
          photo_back_url?: string | null
          photo_front_url?: string | null
          photo_side_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_photos_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "program_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      error_incidents: {
        Row: {
          action_taken: string | null
          assigned_to: string | null
          category: string
          created_at: string | null
          event_count: number | null
          fingerprint: string
          first_occurrence: string | null
          id: string
          impact_score: number | null
          last_occurrence: string | null
          message: string
          priority: string
          route: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          action_taken?: string | null
          assigned_to?: string | null
          category: string
          created_at?: string | null
          event_count?: number | null
          fingerprint: string
          first_occurrence?: string | null
          id?: string
          impact_score?: number | null
          last_occurrence?: string | null
          message: string
          priority?: string
          route?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          action_taken?: string | null
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          event_count?: number | null
          fingerprint?: string
          first_occurrence?: string | null
          id?: string
          impact_score?: number | null
          last_occurrence?: string | null
          message?: string
          priority?: string
          route?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      exercise_video_library: {
        Row: {
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          is_public: boolean | null
          muscle_group: string
          tags: string[] | null
          tenant_id: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          video_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_public?: boolean | null
          muscle_group?: string
          tags?: string[] | null
          tenant_id?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          video_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_public?: boolean | null
          muscle_group?: string
          tags?: string[] | null
          tenant_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          video_url?: string
        }
        Relationships: []
      }
      exercises_library: {
        Row: {
          common_mistakes: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          equipment: string | null
          execution_tips: string | null
          exercise_type: string | null
          id: string
          is_system: boolean | null
          level: string | null
          muscle_group: string
          name: string
          sub_group: string | null
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          common_mistakes?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          equipment?: string | null
          execution_tips?: string | null
          exercise_type?: string | null
          id?: string
          is_system?: boolean | null
          level?: string | null
          muscle_group?: string
          name: string
          sub_group?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          common_mistakes?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          equipment?: string | null
          execution_tips?: string | null
          exercise_type?: string | null
          id?: string
          is_system?: boolean | null
          level?: string | null
          muscle_group?: string
          name?: string
          sub_group?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      experience_mode_audit_log: {
        Row: {
          attempted_mode: string
          correlation_id: string
          created_at: string
          error_code: string | null
          id: string
          metadata: Json | null
          outcome: string
          previous_mode: string | null
          reason: string | null
          unlock_date: string | null
          user_id: string
        }
        Insert: {
          attempted_mode: string
          correlation_id: string
          created_at?: string
          error_code?: string | null
          id?: string
          metadata?: Json | null
          outcome: string
          previous_mode?: string | null
          reason?: string | null
          unlock_date?: string | null
          user_id: string
        }
        Update: {
          attempted_mode?: string
          correlation_id?: string
          created_at?: string
          error_code?: string | null
          id?: string
          metadata?: Json | null
          outcome?: string
          previous_mode?: string | null
          reason?: string | null
          unlock_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      export_tasks: {
        Row: {
          created_at: string | null
          error_message: string | null
          file_url: string | null
          filter_params: Json | null
          format: string
          id: string
          progress: number | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          file_url?: string | null
          filter_params?: Json | null
          format: string
          id?: string
          progress?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          file_url?: string | null
          filter_params?: Json | null
          format?: string
          id?: string
          progress?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          graceful_degradation: boolean
          id: string
          key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          graceful_degradation?: boolean
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          graceful_degradation?: boolean
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      feature_marketing_assets: {
        Row: {
          caption: string | null
          created_at: string
          edited_at: string | null
          feature_id: string
          id: string
          post_image_prompt: string | null
          post_instagram_data: Json
          slide_data: Json
          status: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          edited_at?: string | null
          feature_id: string
          id?: string
          post_image_prompt?: string | null
          post_instagram_data?: Json
          slide_data?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          edited_at?: string | null
          feature_id?: string
          id?: string
          post_image_prompt?: string | null
          post_instagram_data?: Json
          slide_data?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_marketing_assets_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: true
            referencedRelation: "feature_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_registry: {
        Row: {
          bullets: Json
          category: string
          clinical_impact: string | null
          created_at: string
          cta_text: string | null
          display_order: number | null
          emoji: string
          emotional_impact: string
          experience_type: string
          feature_key: string
          gradient: string
          icon_name: string
          id: string
          is_highlight: boolean
          is_premium: boolean
          journey_phase: string
          journey_priority: number
          name: string
          short_description: string
          status: string
          target_audience: string
          updated_at: string
          version: number
          version_history: Json
        }
        Insert: {
          bullets?: Json
          category?: string
          clinical_impact?: string | null
          created_at?: string
          cta_text?: string | null
          display_order?: number | null
          emoji?: string
          emotional_impact?: string
          experience_type?: string
          feature_key: string
          gradient?: string
          icon_name?: string
          id?: string
          is_highlight?: boolean
          is_premium?: boolean
          journey_phase?: string
          journey_priority?: number
          name: string
          short_description: string
          status?: string
          target_audience?: string
          updated_at?: string
          version?: number
          version_history?: Json
        }
        Update: {
          bullets?: Json
          category?: string
          clinical_impact?: string | null
          created_at?: string
          cta_text?: string | null
          display_order?: number | null
          emoji?: string
          emotional_impact?: string
          experience_type?: string
          feature_key?: string
          gradient?: string
          icon_name?: string
          id?: string
          is_highlight?: boolean
          is_premium?: boolean
          journey_phase?: string
          journey_priority?: number
          name?: string
          short_description?: string
          status?: string
          target_audience?: string
          updated_at?: string
          version?: number
          version_history?: Json
        }
        Relationships: []
      }
      feedbacks: {
        Row: {
          category: string
          created_at: string
          id: string
          is_anonymous: boolean | null
          message: string
          nutritionist_id: string
          patient_id: string
          responded_at: string | null
          response: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          message: string
          nutritionist_id: string
          patient_id: string
          responded_at?: string | null
          response?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          message?: string
          nutritionist_id?: string
          patient_id?: string
          responded_at?: string | null
          response?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          date: string
          description: string
          id: string
          nutritionist_id: string
          status: string
          tenant_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          date: string
          description: string
          id?: string
          nutritionist_id: string
          status?: string
          tenant_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          date?: string
          description?: string
          id?: string
          nutritionist_id?: string
          status?: string
          tenant_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fit_intelligence_frequency: {
        Row: {
          cooldown_minutes: number | null
          engaged_count: number | null
          id: string
          ignored_count: number | null
          last_prompt_at: string | null
          optimal_hours: number[] | null
          patient_id: string
          updated_at: string
        }
        Insert: {
          cooldown_minutes?: number | null
          engaged_count?: number | null
          id?: string
          ignored_count?: number | null
          last_prompt_at?: string | null
          optimal_hours?: number[] | null
          patient_id: string
          updated_at?: string
        }
        Update: {
          cooldown_minutes?: number | null
          engaged_count?: number | null
          id?: string
          ignored_count?: number | null
          last_prompt_at?: string | null
          optimal_hours?: number[] | null
          patient_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      fit_intelligence_hydration: {
        Row: {
          consumed_cups: number
          date: string
          id: string
          last_updated_at: string
          patient_id: string
          target_cups: number
        }
        Insert: {
          consumed_cups?: number
          date?: string
          id?: string
          last_updated_at?: string
          patient_id: string
          target_cups?: number
        }
        Update: {
          consumed_cups?: number
          date?: string
          id?: string
          last_updated_at?: string
          patient_id?: string
          target_cups?: number
        }
        Relationships: []
      }
      fit_intelligence_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_type: string
          patient_id: string
          prompt_text: string | null
          prompt_title: string | null
          response_metadata: Json | null
          response_value: string | null
          was_dismissed: boolean | null
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_type: string
          patient_id: string
          prompt_text?: string | null
          prompt_title?: string | null
          response_metadata?: Json | null
          response_value?: string | null
          was_dismissed?: boolean | null
        }
        Update: {
          created_at?: string
          id?: string
          interaction_type?: string
          patient_id?: string
          prompt_text?: string | null
          prompt_title?: string | null
          response_metadata?: Json | null
          response_value?: string | null
          was_dismissed?: boolean | null
        }
        Relationships: []
      }
      fit_intelligence_tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          delivered_at: string | null
          id: string
          patient_id: string
          payload: Json | null
          scheduled_for: string | null
          status: string | null
          task_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          patient_id: string
          payload?: Json | null
          scheduled_for?: string | null
          status?: string | null
          task_type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          patient_id?: string
          payload?: Json | null
          scheduled_for?: string | null
          status?: string | null
          task_type?: string
        }
        Relationships: []
      }
      food_database: {
        Row: {
          calcium: number | null
          calories: number
          carbs: number
          category: string
          created_at: string
          fat: number
          fiber: number | null
          id: string
          iron: number | null
          is_custom: boolean
          name: string
          nutritionist_id: string | null
          protein: number
          serving_size: string | null
          sodium: number | null
          source: string | null
          tenant_id: string | null
        }
        Insert: {
          calcium?: number | null
          calories?: number
          carbs?: number
          category?: string
          created_at?: string
          fat?: number
          fiber?: number | null
          id?: string
          iron?: number | null
          is_custom?: boolean
          name: string
          nutritionist_id?: string | null
          protein?: number
          serving_size?: string | null
          sodium?: number | null
          source?: string | null
          tenant_id?: string | null
        }
        Update: {
          calcium?: number | null
          calories?: number
          carbs?: number
          category?: string
          created_at?: string
          fat?: number
          fiber?: number | null
          id?: string
          iron?: number | null
          is_custom?: boolean
          name?: string
          nutritionist_id?: string | null
          protein?: number
          serving_size?: string | null
          sodium?: number | null
          source?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_database_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      food_substitution_groups: {
        Row: {
          avg_calories_per_100g: number | null
          avg_carbs_per_100g: number | null
          avg_fat_per_100g: number | null
          avg_protein_per_100g: number | null
          created_at: string
          group_key: string
          group_name: string
          id: string
          macro_category: string
        }
        Insert: {
          avg_calories_per_100g?: number | null
          avg_carbs_per_100g?: number | null
          avg_fat_per_100g?: number | null
          avg_protein_per_100g?: number | null
          created_at?: string
          group_key: string
          group_name: string
          id?: string
          macro_category: string
        }
        Update: {
          avg_calories_per_100g?: number | null
          avg_carbs_per_100g?: number | null
          avg_fat_per_100g?: number | null
          avg_protein_per_100g?: number | null
          created_at?: string
          group_key?: string
          group_name?: string
          id?: string
          macro_category?: string
        }
        Relationships: []
      }
      food_substitution_members: {
        Row: {
          calories_per_portion: number | null
          carbs_per_portion: number | null
          clinical_notes: string | null
          created_at: string
          fat_per_portion: number | null
          food_id: string | null
          food_name: string
          group_id: string
          id: string
          is_primary: boolean
          portion_grams: number
          protein_per_portion: number | null
        }
        Insert: {
          calories_per_portion?: number | null
          carbs_per_portion?: number | null
          clinical_notes?: string | null
          created_at?: string
          fat_per_portion?: number | null
          food_id?: string | null
          food_name: string
          group_id: string
          id?: string
          is_primary?: boolean
          portion_grams?: number
          protein_per_portion?: number | null
        }
        Update: {
          calories_per_portion?: number | null
          carbs_per_portion?: number | null
          clinical_notes?: string | null
          created_at?: string
          fat_per_portion?: number | null
          food_id?: string | null
          food_name?: string
          group_id?: string
          id?: string
          is_primary?: boolean
          portion_grams?: number
          protein_per_portion?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "food_substitution_members_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "food_database"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_substitution_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "food_substitution_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      global_action_catalog: {
        Row: {
          action_code: string
          action_description: string | null
          action_name: string
          category: string | null
          created_at: string | null
          entity_type: string
          id: string
          is_active: boolean | null
          risk_level: string | null
          supports_preview: boolean | null
          supports_rollback: boolean | null
        }
        Insert: {
          action_code: string
          action_description?: string | null
          action_name: string
          category?: string | null
          created_at?: string | null
          entity_type: string
          id?: string
          is_active?: boolean | null
          risk_level?: string | null
          supports_preview?: boolean | null
          supports_rollback?: boolean | null
        }
        Update: {
          action_code?: string
          action_description?: string | null
          action_name?: string
          category?: string | null
          created_at?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean | null
          risk_level?: string | null
          supports_preview?: boolean | null
          supports_rollback?: boolean | null
        }
        Relationships: []
      }
      global_action_logs: {
        Row: {
          action_code: string
          affected_count: number | null
          error_count: number | null
          executed_by: string
          execution_status: string | null
          execution_summary: string | null
          filters_json: Json | null
          finished_at: string | null
          id: string
          payload_json: Json | null
          started_at: string | null
          success_count: number | null
        }
        Insert: {
          action_code: string
          affected_count?: number | null
          error_count?: number | null
          executed_by: string
          execution_status?: string | null
          execution_summary?: string | null
          filters_json?: Json | null
          finished_at?: string | null
          id?: string
          payload_json?: Json | null
          started_at?: string | null
          success_count?: number | null
        }
        Update: {
          action_code?: string
          affected_count?: number | null
          error_count?: number | null
          executed_by?: string
          execution_status?: string | null
          execution_summary?: string | null
          filters_json?: Json | null
          finished_at?: string | null
          id?: string
          payload_json?: Json | null
          started_at?: string | null
          success_count?: number | null
        }
        Relationships: []
      }
      global_clinical_learning_state: {
        Row: {
          adjustment_reason: string | null
          created_at: string
          current_weight: number
          engine_component: string
          engine_version: string
          evidence_strength: number | null
          id: string
          last_updated_at: string
          parameter_name: string
          previous_weight: number | null
          sample_size: number | null
        }
        Insert: {
          adjustment_reason?: string | null
          created_at?: string
          current_weight?: number
          engine_component: string
          engine_version?: string
          evidence_strength?: number | null
          id?: string
          last_updated_at?: string
          parameter_name: string
          previous_weight?: number | null
          sample_size?: number | null
        }
        Update: {
          adjustment_reason?: string | null
          created_at?: string
          current_weight?: number
          engine_component?: string
          engine_version?: string
          evidence_strength?: number | null
          id?: string
          last_updated_at?: string
          parameter_name?: string
          previous_weight?: number | null
          sample_size?: number | null
        }
        Relationships: []
      }
      global_evidence_signals: {
        Row: {
          computed_at: string
          confidence: number | null
          engine_version: string
          id: string
          sample_size: number | null
          signal_name: string
          signal_trend: string | null
          signal_value: number
        }
        Insert: {
          computed_at?: string
          confidence?: number | null
          engine_version?: string
          id?: string
          sample_size?: number | null
          signal_name: string
          signal_trend?: string | null
          signal_value?: number
        }
        Update: {
          computed_at?: string
          confidence?: number | null
          engine_version?: string
          id?: string
          sample_size?: number | null
          signal_name?: string
          signal_trend?: string | null
          signal_value?: number
        }
        Relationships: []
      }
      global_rules_engine: {
        Row: {
          actions_json: Json | null
          conditions_json: Json | null
          created_at: string | null
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          rule_code: string
          rule_description: string | null
          rule_name: string
          starts_at: string | null
          target_scope: string | null
        }
        Insert: {
          actions_json?: Json | null
          conditions_json?: Json | null
          created_at?: string | null
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          rule_code: string
          rule_description?: string | null
          rule_name: string
          starts_at?: string | null
          target_scope?: string | null
        }
        Update: {
          actions_json?: Json | null
          conditions_json?: Json | null
          created_at?: string | null
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          rule_code?: string
          rule_description?: string | null
          rule_name?: string
          starts_at?: string | null
          target_scope?: string | null
        }
        Relationships: []
      }
      global_tips: {
        Row: {
          category: string
          content: string
          created_at: string
          icon: string
          id: string
          is_published: boolean | null
          nutritionist_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          icon?: string
          id?: string
          is_published?: boolean | null
          nutritionist_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          icon?: string
          id?: string
          is_published?: boolean | null
          nutritionist_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ifj_brand_rules: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          rule_group: string
          rule_key: string
          value_json: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          rule_group: string
          rule_key: string
          value_json?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          rule_group?: string
          rule_key?: string
          value_json?: Json | null
        }
        Relationships: []
      }
      ifj_executor_registry: {
        Row: {
          context_dependencies_json: Json | null
          created_at: string | null
          executor_key: string
          function_name: string | null
          id: string
          intent_key: string
          is_active: boolean | null
          permission_dependencies_json: Json | null
          query_dependencies_json: Json | null
          route_name: string | null
        }
        Insert: {
          context_dependencies_json?: Json | null
          created_at?: string | null
          executor_key: string
          function_name?: string | null
          id?: string
          intent_key: string
          is_active?: boolean | null
          permission_dependencies_json?: Json | null
          query_dependencies_json?: Json | null
          route_name?: string | null
        }
        Update: {
          context_dependencies_json?: Json | null
          created_at?: string | null
          executor_key?: string
          function_name?: string | null
          id?: string
          intent_key?: string
          is_active?: boolean | null
          permission_dependencies_json?: Json | null
          query_dependencies_json?: Json | null
          route_name?: string | null
        }
        Relationships: []
      }
      ifj_food_database: {
        Row: {
          calories: number | null
          calories_per_gram: number | null
          carbs: number | null
          carbs_per_gram: number | null
          category: string
          created_at: string | null
          fat_per_gram: number | null
          fats: number | null
          fiber: number | null
          food_name: string
          goal_tags_json: Json | null
          id: string
          is_active: boolean | null
          meal_tags_json: Json | null
          normalized_name: string
          portion_grams: number | null
          portion_reference: string | null
          protein: number | null
          protein_per_gram: number | null
          restriction_tags_json: Json | null
          subcategory: string | null
          synonyms: string[] | null
          unit: string | null
        }
        Insert: {
          calories?: number | null
          calories_per_gram?: number | null
          carbs?: number | null
          carbs_per_gram?: number | null
          category: string
          created_at?: string | null
          fat_per_gram?: number | null
          fats?: number | null
          fiber?: number | null
          food_name: string
          goal_tags_json?: Json | null
          id?: string
          is_active?: boolean | null
          meal_tags_json?: Json | null
          normalized_name: string
          portion_grams?: number | null
          portion_reference?: string | null
          protein?: number | null
          protein_per_gram?: number | null
          restriction_tags_json?: Json | null
          subcategory?: string | null
          synonyms?: string[] | null
          unit?: string | null
        }
        Update: {
          calories?: number | null
          calories_per_gram?: number | null
          carbs?: number | null
          carbs_per_gram?: number | null
          category?: string
          created_at?: string | null
          fat_per_gram?: number | null
          fats?: number | null
          fiber?: number | null
          food_name?: string
          goal_tags_json?: Json | null
          id?: string
          is_active?: boolean | null
          meal_tags_json?: Json | null
          normalized_name?: string
          portion_grams?: number | null
          portion_reference?: string | null
          protein?: number | null
          protein_per_gram?: number | null
          restriction_tags_json?: Json | null
          subcategory?: string | null
          synonyms?: string[] | null
          unit?: string | null
        }
        Relationships: []
      }
      ifj_food_equivalents: {
        Row: {
          created_at: string | null
          equivalence_type: string | null
          id: string
          is_active: boolean | null
          is_preferred: boolean | null
          meal_context: string | null
          notes: string | null
          similarity_score: number | null
          source_food_id: string
          target_food_id: string
        }
        Insert: {
          created_at?: string | null
          equivalence_type?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          meal_context?: string | null
          notes?: string | null
          similarity_score?: number | null
          source_food_id: string
          target_food_id: string
        }
        Update: {
          created_at?: string | null
          equivalence_type?: string | null
          id?: string
          is_active?: boolean | null
          is_preferred?: boolean | null
          meal_context?: string | null
          notes?: string | null
          similarity_score?: number | null
          source_food_id?: string
          target_food_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ifj_food_equivalents_source_food_id_fkey"
            columns: ["source_food_id"]
            isOneToOne: false
            referencedRelation: "ifj_food_database"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ifj_food_equivalents_target_food_id_fkey"
            columns: ["target_food_id"]
            isOneToOne: false
            referencedRelation: "ifj_food_database"
            referencedColumns: ["id"]
          },
        ]
      }
      ifj_goal_rules: {
        Row: {
          created_at: string | null
          default_guidance: string | null
          goal_key: string
          id: string
          is_active: boolean | null
          label: string
          macro_bias_json: Json | null
          restriction_logic_json: Json | null
          swap_priority_json: Json | null
        }
        Insert: {
          created_at?: string | null
          default_guidance?: string | null
          goal_key: string
          id?: string
          is_active?: boolean | null
          label: string
          macro_bias_json?: Json | null
          restriction_logic_json?: Json | null
          swap_priority_json?: Json | null
        }
        Update: {
          created_at?: string | null
          default_guidance?: string | null
          goal_key?: string
          id?: string
          is_active?: boolean | null
          label?: string
          macro_bias_json?: Json | null
          restriction_logic_json?: Json | null
          swap_priority_json?: Json | null
        }
        Relationships: []
      }
      ifj_guardrails: {
        Row: {
          condition_json: Json | null
          created_at: string | null
          guardrail_key: string
          id: string
          is_active: boolean | null
          message_template: string | null
          rule_type: string
          scope: string | null
          severity: string | null
        }
        Insert: {
          condition_json?: Json | null
          created_at?: string | null
          guardrail_key: string
          id?: string
          is_active?: boolean | null
          message_template?: string | null
          rule_type: string
          scope?: string | null
          severity?: string | null
        }
        Update: {
          condition_json?: Json | null
          created_at?: string | null
          guardrail_key?: string
          id?: string
          is_active?: boolean | null
          message_template?: string | null
          rule_type?: string
          scope?: string | null
          severity?: string | null
        }
        Relationships: []
      }
      ifj_intent_logs: {
        Row: {
          confidence: number | null
          created_at: string
          detected_intent: string | null
          engine_used: string | null
          error_message: string | null
          id: string
          input_text: string
          normalized_text: string | null
          resolved_entity_id: string | null
          resolved_entity_type: string | null
          response_time_ms: number | null
          response_type: string | null
          role: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          detected_intent?: string | null
          engine_used?: string | null
          error_message?: string | null
          id?: string
          input_text: string
          normalized_text?: string | null
          resolved_entity_id?: string | null
          resolved_entity_type?: string | null
          response_time_ms?: number | null
          response_type?: string | null
          role: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          detected_intent?: string | null
          engine_used?: string | null
          error_message?: string | null
          id?: string
          input_text?: string
          normalized_text?: string | null
          resolved_entity_id?: string | null
          resolved_entity_type?: string | null
          response_time_ms?: number | null
          response_type?: string | null
          role?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ifj_intent_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ifj_intent_phrases: {
        Row: {
          created_at: string | null
          id: string
          intent_id: string
          is_active: boolean | null
          language: string | null
          phrase: string
          phrase_type: string | null
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          intent_id: string
          is_active?: boolean | null
          language?: string | null
          phrase: string
          phrase_type?: string | null
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          intent_id?: string
          is_active?: boolean | null
          language?: string | null
          phrase?: string
          phrase_type?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ifj_intent_phrases_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: false
            referencedRelation: "ifj_intent_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      ifj_intent_registry: {
        Row: {
          action_type: string
          created_at: string | null
          description: string | null
          executor_key: string | null
          fallback_mode: string | null
          id: string
          intent_key: string
          is_active: boolean | null
          label: string
          module: string
          priority_order: number | null
          requires_active_plan: boolean | null
          requires_context: boolean | null
          requires_patient_selected: boolean | null
          requires_permission_key: string | null
          scope: string
        }
        Insert: {
          action_type?: string
          created_at?: string | null
          description?: string | null
          executor_key?: string | null
          fallback_mode?: string | null
          id?: string
          intent_key: string
          is_active?: boolean | null
          label: string
          module?: string
          priority_order?: number | null
          requires_active_plan?: boolean | null
          requires_context?: boolean | null
          requires_patient_selected?: boolean | null
          requires_permission_key?: string | null
          scope?: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          description?: string | null
          executor_key?: string | null
          fallback_mode?: string | null
          id?: string
          intent_key?: string
          is_active?: boolean | null
          label?: string
          module?: string
          priority_order?: number | null
          requires_active_plan?: boolean | null
          requires_context?: boolean | null
          requires_patient_selected?: boolean | null
          requires_permission_key?: string | null
          scope?: string
        }
        Relationships: []
      }
      ifj_knowledge_articles: {
        Row: {
          category: string | null
          content_markdown: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          scope: string | null
          slug: string
          source_type: string | null
          summary: string | null
          tags_json: Json | null
          title: string
        }
        Insert: {
          category?: string | null
          content_markdown?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          scope?: string | null
          slug: string
          source_type?: string | null
          summary?: string | null
          tags_json?: Json | null
          title: string
        }
        Update: {
          category?: string | null
          content_markdown?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          scope?: string | null
          slug?: string
          source_type?: string | null
          summary?: string | null
          tags_json?: Json | null
          title?: string
        }
        Relationships: []
      }
      ifj_meal_context_rules: {
        Row: {
          allowed_categories_json: Json | null
          created_at: string | null
          forbidden_combinations_json: Json | null
          goal_adjustments_json: Json | null
          id: string
          is_active: boolean | null
          meal_type: string
          preferred_categories_json: Json | null
        }
        Insert: {
          allowed_categories_json?: Json | null
          created_at?: string | null
          forbidden_combinations_json?: Json | null
          goal_adjustments_json?: Json | null
          id?: string
          is_active?: boolean | null
          meal_type: string
          preferred_categories_json?: Json | null
        }
        Update: {
          allowed_categories_json?: Json | null
          created_at?: string | null
          forbidden_combinations_json?: Json | null
          goal_adjustments_json?: Json | null
          id?: string
          is_active?: boolean | null
          meal_type?: string
          preferred_categories_json?: Json | null
        }
        Relationships: []
      }
      ifj_patient_permissions: {
        Row: {
          allow_ai_last_resort: boolean | null
          appointments: boolean
          checklist: boolean
          created_at: string
          hydration: boolean
          id: string
          ifj_enabled: boolean | null
          ifj_mode: string
          meal_plan: boolean
          messages: boolean
          patient_id: string
          progress: boolean
          recipes: boolean
          recommendations: boolean
          smart_meal_context: boolean | null
          smart_recipe_help: boolean | null
          smart_swap_suggestions: boolean | null
          substitutions: boolean
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          allow_ai_last_resort?: boolean | null
          appointments?: boolean
          checklist?: boolean
          created_at?: string
          hydration?: boolean
          id?: string
          ifj_enabled?: boolean | null
          ifj_mode?: string
          meal_plan?: boolean
          messages?: boolean
          patient_id: string
          progress?: boolean
          recipes?: boolean
          recommendations?: boolean
          smart_meal_context?: boolean | null
          smart_recipe_help?: boolean | null
          smart_swap_suggestions?: boolean | null
          substitutions?: boolean
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          allow_ai_last_resort?: boolean | null
          appointments?: boolean
          checklist?: boolean
          created_at?: string
          hydration?: boolean
          id?: string
          ifj_enabled?: boolean | null
          ifj_mode?: string
          meal_plan?: boolean
          messages?: boolean
          patient_id?: string
          progress?: boolean
          recipes?: boolean
          recommendations?: boolean
          smart_meal_context?: boolean | null
          smart_recipe_help?: boolean | null
          smart_swap_suggestions?: boolean | null
          substitutions?: boolean
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ifj_patient_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ifj_priority_queue: {
        Row: {
          created_at: string
          entity_id: string
          entity_name: string | null
          entity_type: string
          id: string
          is_resolved: boolean
          owner_user_id: string
          priority_level: string
          priority_score: number
          reasons_json: Json | null
          resolved_at: string | null
          resolved_by: string | null
          source_engine: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_name?: string | null
          entity_type: string
          id?: string
          is_resolved?: boolean
          owner_user_id: string
          priority_level?: string
          priority_score?: number
          reasons_json?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_engine?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_name?: string | null
          entity_type?: string
          id?: string
          is_resolved?: boolean
          owner_user_id?: string
          priority_level?: string
          priority_score?: number
          reasons_json?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_engine?: string
          updated_at?: string
        }
        Relationships: []
      }
      ifj_response_templates: {
        Row: {
          body_template: string | null
          created_at: string | null
          footer_template: string | null
          id: string
          ifj_mode: string | null
          intent_key: string
          is_active: boolean | null
          response_style: string | null
          scope: string | null
          template_type: string | null
          title_template: string | null
        }
        Insert: {
          body_template?: string | null
          created_at?: string | null
          footer_template?: string | null
          id?: string
          ifj_mode?: string | null
          intent_key: string
          is_active?: boolean | null
          response_style?: string | null
          scope?: string | null
          template_type?: string | null
          title_template?: string | null
        }
        Update: {
          body_template?: string | null
          created_at?: string | null
          footer_template?: string | null
          id?: string
          ifj_mode?: string | null
          intent_key?: string
          is_active?: boolean | null
          response_style?: string | null
          scope?: string | null
          template_type?: string | null
          title_template?: string | null
        }
        Relationships: []
      }
      ifj_session_context: {
        Row: {
          context_json: Json | null
          id: string
          last_entity_id: string | null
          last_entity_type: string | null
          last_intent: string | null
          last_module: string | null
          last_patient_id: string | null
          last_patient_name: string | null
          last_route: string | null
          last_student_id: string | null
          last_student_name: string | null
          role: string
          session_key: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_json?: Json | null
          id?: string
          last_entity_id?: string | null
          last_entity_type?: string | null
          last_intent?: string | null
          last_module?: string | null
          last_patient_id?: string | null
          last_patient_name?: string | null
          last_route?: string | null
          last_student_id?: string | null
          last_student_name?: string | null
          role?: string
          session_key: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_json?: Json | null
          id?: string
          last_entity_id?: string | null
          last_entity_type?: string | null
          last_intent?: string | null
          last_module?: string | null
          last_patient_id?: string | null
          last_patient_name?: string | null
          last_route?: string | null
          last_student_id?: string | null
          last_student_name?: string | null
          role?: string
          session_key?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ifj_session_context_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      in_office_sessions: {
        Row: {
          anamnesis_completed: boolean
          assessment_completed: boolean
          completed_at: string | null
          created_at: string
          current_step: number
          id: string
          meal_plan_completed: boolean
          meal_plan_id: string | null
          notes: string | null
          nutritionist_id: string
          patient_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          anamnesis_completed?: boolean
          assessment_completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          meal_plan_completed?: boolean
          meal_plan_id?: string | null
          notes?: string | null
          nutritionist_id: string
          patient_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          anamnesis_completed?: boolean
          assessment_completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          meal_plan_completed?: boolean
          meal_plan_id?: string | null
          notes?: string | null
          nutritionist_id?: string
          patient_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_in_office_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_custom_prompts: {
        Row: {
          body: string
          created_at: string
          emoji: string
          escalation_level: number
          id: string
          is_active: boolean
          nutritionist_id: string
          prompt_type: string
          quick_actions: Json | null
          schedule_days: string[] | null
          schedule_hours: number[] | null
          sort_order: number
          title: string
          tone: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          emoji?: string
          escalation_level?: number
          id?: string
          is_active?: boolean
          nutritionist_id: string
          prompt_type?: string
          quick_actions?: Json | null
          schedule_days?: string[] | null
          schedule_hours?: number[] | null
          sort_order?: number
          title: string
          tone?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          emoji?: string
          escalation_level?: number
          id?: string
          is_active?: boolean
          nutritionist_id?: string
          prompt_type?: string
          quick_actions?: Json | null
          schedule_days?: string[] | null
          schedule_hours?: number[] | null
          sort_order?: number
          title?: string
          tone?: string
          updated_at?: string
        }
        Relationships: []
      }
      intelligence_custom_questions: {
        Row: {
          created_at: string
          delivery_mode: string
          id: string
          is_active: boolean
          nutritionist_id: string
          options: Json | null
          question_text: string
          question_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_mode?: string
          id?: string
          is_active?: boolean
          nutritionist_id: string
          options?: Json | null
          question_text: string
          question_type?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_mode?: string
          id?: string
          is_active?: boolean
          nutritionist_id?: string
          options?: Json | null
          question_text?: string
          question_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      intelligence_settings: {
        Row: {
          clinical_warnings_enabled: boolean
          cooldown_minutes: number
          created_at: string
          custom_prompts_enabled: boolean
          default_motivation_style: string
          default_tone: string
          hydration_enabled: boolean
          id: string
          max_prompts_per_day: number
          motivation_enabled: boolean
          non_adherence_enabled: boolean
          nutritionist_id: string
          tenant_id: string | null
          updated_at: string
          weekend_risk_enabled: boolean
          workout_enabled: boolean
        }
        Insert: {
          clinical_warnings_enabled?: boolean
          cooldown_minutes?: number
          created_at?: string
          custom_prompts_enabled?: boolean
          default_motivation_style?: string
          default_tone?: string
          hydration_enabled?: boolean
          id?: string
          max_prompts_per_day?: number
          motivation_enabled?: boolean
          non_adherence_enabled?: boolean
          nutritionist_id: string
          tenant_id?: string | null
          updated_at?: string
          weekend_risk_enabled?: boolean
          workout_enabled?: boolean
        }
        Update: {
          clinical_warnings_enabled?: boolean
          cooldown_minutes?: number
          created_at?: string
          custom_prompts_enabled?: boolean
          default_motivation_style?: string
          default_tone?: string
          hydration_enabled?: boolean
          id?: string
          max_prompts_per_day?: number
          motivation_enabled?: boolean
          non_adherence_enabled?: boolean
          nutritionist_id?: string
          tenant_id?: string | null
          updated_at?: string
          weekend_risk_enabled?: boolean
          workout_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_audits: {
        Row: {
          code: string
          correlation_id: string | null
          created_at: string | null
          error_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          professional_id: string | null
          stage: string
          status_code: number | null
          user_agent: string | null
        }
        Insert: {
          code: string
          correlation_id?: string | null
          created_at?: string | null
          error_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          professional_id?: string | null
          stage: string
          status_code?: number | null
          user_agent?: string | null
        }
        Update: {
          code?: string
          correlation_id?: string | null
          created_at?: string | null
          error_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          professional_id?: string | null
          stage?: string
          status_code?: number | null
          user_agent?: string | null
        }
        Relationships: []
      }
      invitation_diagnostics: {
        Row: {
          code: string | null
          created_at: string | null
          error_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          error_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          error_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      invitation_logs: {
        Row: {
          correlation_id: string | null
          created_at: string
          details: Json | null
          domain_used: string | null
          event_type: string
          id: string
          invitation_id: string | null
          ip_address: string | null
          patient_email: string | null
          professional_id: string | null
          user_agent: string | null
        }
        Insert: {
          correlation_id?: string | null
          created_at?: string
          details?: Json | null
          domain_used?: string | null
          event_type: string
          id?: string
          invitation_id?: string | null
          ip_address?: string | null
          patient_email?: string | null
          professional_id?: string | null
          user_agent?: string | null
        }
        Update: {
          correlation_id?: string | null
          created_at?: string
          details?: Json | null
          domain_used?: string | null
          event_type?: string
          id?: string
          invitation_id?: string | null
          ip_address?: string | null
          patient_email?: string | null
          professional_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_logs_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          metadata: Json | null
          patient_email: string | null
          patient_name: string | null
          professional_id: string
          status: string | null
          tenant_id: string | null
          updated_at: string
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          patient_email?: string | null
          patient_name?: string | null
          professional_id: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          patient_email?: string | null
          patient_name?: string | null
          professional_id?: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_marker_rules: {
        Row: {
          category: string
          clinical_note: string | null
          created_at: string | null
          gender_filter: string | null
          generated_flag: string
          id: string
          is_active: boolean | null
          marker_key: string
          marker_name: string
          operator: string
          severity: string
          suggested_strategy: string | null
          threshold_max: number | null
          threshold_value: number | null
        }
        Insert: {
          category?: string
          clinical_note?: string | null
          created_at?: string | null
          gender_filter?: string | null
          generated_flag: string
          id?: string
          is_active?: boolean | null
          marker_key: string
          marker_name: string
          operator?: string
          severity?: string
          suggested_strategy?: string | null
          threshold_max?: number | null
          threshold_value?: number | null
        }
        Update: {
          category?: string
          clinical_note?: string | null
          created_at?: string | null
          gender_filter?: string | null
          generated_flag?: string
          id?: string
          is_active?: boolean | null
          marker_key?: string
          marker_name?: string
          operator?: string
          severity?: string
          suggested_strategy?: string | null
          threshold_max?: number | null
          threshold_value?: number | null
        }
        Relationships: []
      }
      lead_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          nutritionist_id: string
          phone: string | null
          program_id: string | null
          referral_code: string | null
          source: string
          status: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          nutritionist_id: string
          phone?: string | null
          program_id?: string | null
          referral_code?: string | null
          source?: string
          status?: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          nutritionist_id?: string
          phone?: string | null
          program_id?: string | null
          referral_code?: string | null
          source?: string
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_requests_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lifecycle_repair_logs: {
        Row: {
          entity_id: string
          entity_table: string
          id: string
          new_state: Json
          previous_state: Json
          repair_reason: string | null
          repair_type: string
          repaired_at: string
        }
        Insert: {
          entity_id: string
          entity_table: string
          id?: string
          new_state?: Json
          previous_state?: Json
          repair_reason?: string | null
          repair_type: string
          repaired_at?: string
        }
        Update: {
          entity_id?: string
          entity_table?: string
          id?: string
          new_state?: Json
          previous_state?: Json
          repair_reason?: string | null
          repair_type?: string
          repaired_at?: string
        }
        Relationships: []
      }
      macro_audit_log: {
        Row: {
          created_at: string
          field_name: string
          id: string
          item_id: string
          operation: string
          status: string
          value_persisted: number | null
          value_requested: number | null
        }
        Insert: {
          created_at?: string
          field_name: string
          id?: string
          item_id: string
          operation: string
          status: string
          value_persisted?: number | null
          value_requested?: number | null
        }
        Update: {
          created_at?: string
          field_name?: string
          id?: string
          item_id?: string
          operation?: string
          status?: string
          value_persisted?: number | null
          value_requested?: number | null
        }
        Relationships: []
      }
      marmita_generation_settings: {
        Row: {
          created_at: string
          default_fast_instructions: string | null
          default_practical_instructions: string | null
          fixed_min_dinner: number
          fixed_min_lunch: number
          id: string
          nutritionist_id: string
          updated_at: string
          weekly_min_dinner: number
          weekly_min_lunch: number
        }
        Insert: {
          created_at?: string
          default_fast_instructions?: string | null
          default_practical_instructions?: string | null
          fixed_min_dinner?: number
          fixed_min_lunch?: number
          id?: string
          nutritionist_id: string
          updated_at?: string
          weekly_min_dinner?: number
          weekly_min_lunch?: number
        }
        Update: {
          created_at?: string
          default_fast_instructions?: string | null
          default_practical_instructions?: string | null
          fixed_min_dinner?: number
          fixed_min_lunch?: number
          id?: string
          nutritionist_id?: string
          updated_at?: string
          weekly_min_dinner?: number
          weekly_min_lunch?: number
        }
        Relationships: []
      }
      meal_analysis_cache: {
        Row: {
          analysis_result: Json
          created_at: string | null
          description_hash: string
          description_original: string
          expires_at: string | null
          has_image: boolean | null
          hit_count: number | null
          id: string
          source: string | null
        }
        Insert: {
          analysis_result: Json
          created_at?: string | null
          description_hash: string
          description_original: string
          expires_at?: string | null
          has_image?: boolean | null
          hit_count?: number | null
          id?: string
          source?: string | null
        }
        Update: {
          analysis_result?: Json
          created_at?: string | null
          description_hash?: string
          description_original?: string
          expires_at?: string | null
          has_image?: boolean | null
          hit_count?: number | null
          id?: string
          source?: string | null
        }
        Relationships: []
      }
      meal_clinical_decision_log: {
        Row: {
          condition_applied: string | null
          created_at: string
          id: string
          patient_id: string | null
          plan_id: string | null
          reasons: string[] | null
          rules_applied: Json | null
          substitutions: Json | null
          user_id: string | null
        }
        Insert: {
          condition_applied?: string | null
          created_at?: string
          id?: string
          patient_id?: string | null
          plan_id?: string | null
          reasons?: string[] | null
          rules_applied?: Json | null
          substitutions?: Json | null
          user_id?: string | null
        }
        Update: {
          condition_applied?: string | null
          created_at?: string
          id?: string
          patient_id?: string | null
          plan_id?: string | null
          reasons?: string[] | null
          rules_applied?: Json | null
          substitutions?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      meal_clinical_rules: {
        Row: {
          condition_name: string
          created_at: string
          description: string | null
          id: string
          recommendations: string[] | null
          restrictions: string[] | null
          updated_at: string
          version: number | null
        }
        Insert: {
          condition_name: string
          created_at?: string
          description?: string | null
          id?: string
          recommendations?: string[] | null
          restrictions?: string[] | null
          updated_at?: string
          version?: number | null
        }
        Update: {
          condition_name?: string
          created_at?: string
          description?: string | null
          id?: string
          recommendations?: string[] | null
          restrictions?: string[] | null
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      meal_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          meal_plan_id: string | null
          meal_plan_item_id: string | null
          meal_type: string
          patient_id: string
          rating: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          meal_plan_id?: string | null
          meal_plan_item_id?: string | null
          meal_type: string
          patient_id: string
          rating: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          meal_plan_id?: string | null
          meal_plan_item_id?: string | null
          meal_type?: string
          patient_id?: string
          rating?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_feedback_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_resolved_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_feedback_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_feedback_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "v_plan_visibility_diagnostics"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      meal_item_completions: {
        Row: {
          adherence_status: string
          completed: boolean
          completed_at: string | null
          created_at: string
          date: string
          id: string
          meal_plan_id: string
          meal_plan_item_id: string
          patient_id: string
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          adherence_status?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          date?: string
          id?: string
          meal_plan_id: string
          meal_plan_item_id: string
          patient_id: string
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          adherence_status?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          date?: string
          id?: string
          meal_plan_id?: string
          meal_plan_item_id?: string
          patient_id?: string
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_item_completions_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_resolved_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_item_completions_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_item_completions_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "v_plan_visibility_diagnostics"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "meal_item_completions_meal_plan_item_id_fkey"
            columns: ["meal_plan_item_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_item_completions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_library: {
        Row: {
          base_calories: number
          carbs: number
          clinical_tags: string[] | null
          created_at: string
          fat: number
          foods: Json
          goal_tag: string
          id: string
          is_active: boolean
          meal_type: string
          plan_type: string | null
          protein: number
          substitutions: Json | null
          title: string
        }
        Insert: {
          base_calories?: number
          carbs?: number
          clinical_tags?: string[] | null
          created_at?: string
          fat?: number
          foods?: Json
          goal_tag: string
          id?: string
          is_active?: boolean
          meal_type: string
          plan_type?: string | null
          protein?: number
          substitutions?: Json | null
          title: string
        }
        Update: {
          base_calories?: number
          carbs?: number
          clinical_tags?: string[] | null
          created_at?: string
          fat?: number
          foods?: Json
          goal_tag?: string
          id?: string
          is_active?: boolean
          meal_type?: string
          plan_type?: string | null
          protein?: number
          substitutions?: Json | null
          title?: string
        }
        Relationships: []
      }
      meal_plan_adjustment_suggestions: {
        Row: {
          clinical_reason: string
          confidence: string
          created_at: string | null
          current_value: number | null
          delta_percent: number | null
          engine_version: string | null
          id: string
          meal_plan_id: string | null
          metadata: Json | null
          patient_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          suggested_value: number | null
          suggestion_type: string
        }
        Insert: {
          clinical_reason: string
          confidence?: string
          created_at?: string | null
          current_value?: number | null
          delta_percent?: number | null
          engine_version?: string | null
          id?: string
          meal_plan_id?: string | null
          metadata?: Json | null
          patient_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          suggested_value?: number | null
          suggestion_type: string
        }
        Update: {
          clinical_reason?: string
          confidence?: string
          created_at?: string | null
          current_value?: number | null
          delta_percent?: number | null
          engine_version?: string | null
          id?: string
          meal_plan_id?: string | null
          metadata?: Json | null
          patient_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          suggested_value?: number | null
          suggestion_type?: string
        }
        Relationships: []
      }
      meal_plan_favorites: {
        Row: {
          created_at: string
          data: Json
          id: string
          name: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          name: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_plan_item_versions: {
        Row: {
          action_type: string
          clinical_note: string | null
          created_at: string
          created_by: string | null
          id: string
          meal_plan_item_id: string
          patient_id: string | null
          restored_from_version_id: string | null
          snapshot_data: Json
        }
        Insert: {
          action_type: string
          clinical_note?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          meal_plan_item_id: string
          patient_id?: string | null
          restored_from_version_id?: string | null
          snapshot_data: Json
        }
        Update: {
          action_type?: string
          clinical_note?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          meal_plan_item_id?: string
          patient_id?: string | null
          restored_from_version_id?: string | null
          snapshot_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_item_versions_meal_plan_item_id_fkey"
            columns: ["meal_plan_item_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_item_versions_restored_from_version_id_fkey"
            columns: ["restored_from_version_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_item_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_items: {
        Row: {
          calories_target: number | null
          carbs_target: number | null
          created_at: string
          day_of_week: number | null
          description: string | null
          edit_metadata: Json | null
          fat_target: number | null
          id: string
          image_url: string | null
          is_locked: boolean
          is_manually_edited: boolean
          is_primary: boolean | null
          item_origin: string
          meal_plan_id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          protein_target: number | null
          substitution_group_id: string | null
          target_percentage: number | null
          tenant_id: string | null
          title: string
          visual_library_item_id: string | null
          was_auto_corrected: boolean
        }
        Insert: {
          calories_target?: number | null
          carbs_target?: number | null
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          edit_metadata?: Json | null
          fat_target?: number | null
          id?: string
          image_url?: string | null
          is_locked?: boolean
          is_manually_edited?: boolean
          is_primary?: boolean | null
          item_origin?: string
          meal_plan_id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          protein_target?: number | null
          substitution_group_id?: string | null
          target_percentage?: number | null
          tenant_id?: string | null
          title: string
          visual_library_item_id?: string | null
          was_auto_corrected?: boolean
        }
        Update: {
          calories_target?: number | null
          carbs_target?: number | null
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          edit_metadata?: Json | null
          fat_target?: number | null
          id?: string
          image_url?: string | null
          is_locked?: boolean
          is_manually_edited?: boolean
          is_primary?: boolean | null
          item_origin?: string
          meal_plan_id?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          protein_target?: number | null
          substitution_group_id?: string | null
          target_percentage?: number | null
          tenant_id?: string | null
          title?: string
          visual_library_item_id?: string | null
          was_auto_corrected?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_items_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_resolved_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_items_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_items_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "v_plan_visibility_diagnostics"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "meal_plan_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_items_visual_library_item_id_fkey"
            columns: ["visual_library_item_id"]
            isOneToOne: false
            referencedRelation: "meal_visual_library"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_meal_targets: {
        Row: {
          calories_target: number | null
          carbs_target: number | null
          created_at: string | null
          fat_target: number | null
          id: string
          meal_plan_id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          protein_target: number | null
          updated_at: string | null
        }
        Insert: {
          calories_target?: number | null
          carbs_target?: number | null
          created_at?: string | null
          fat_target?: number | null
          id?: string
          meal_plan_id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          protein_target?: number | null
          updated_at?: string | null
        }
        Update: {
          calories_target?: number | null
          carbs_target?: number | null
          created_at?: string | null
          fat_target?: number | null
          id?: string
          meal_plan_id?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          protein_target?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_meal_targets_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_resolved_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_meal_targets_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_meal_targets_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "v_plan_visibility_diagnostics"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      meal_plan_simplification_audit: {
        Row: {
          created_at: string
          id: string
          issue_type: string
          meal_plan_id: string
          meal_plan_item_id: string | null
          message: string
          severity: string
          simplicity_score_after: number | null
          simplicity_score_before: number | null
          suggested_fix: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          issue_type: string
          meal_plan_id: string
          meal_plan_item_id?: string | null
          message: string
          severity?: string
          simplicity_score_after?: number | null
          simplicity_score_before?: number | null
          suggested_fix?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          issue_type?: string
          meal_plan_id?: string
          meal_plan_item_id?: string | null
          message?: string
          severity?: string
          simplicity_score_after?: number | null
          simplicity_score_before?: number | null
          suggested_fix?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_simplification_audit_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_resolved_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_simplification_audit_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_simplification_audit_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "v_plan_visibility_diagnostics"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "meal_plan_simplification_audit_meal_plan_item_id_fkey"
            columns: ["meal_plan_item_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_simplification_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_templates: {
        Row: {
          category: string
          clinical_condition: string | null
          created_at: string
          description: string | null
          id: string
          is_lunchbox: boolean | null
          is_premium: boolean | null
          meals: Json
          name: string
          target_goal: string | null
          template_marmita: boolean | null
        }
        Insert: {
          category: string
          clinical_condition?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_lunchbox?: boolean | null
          is_premium?: boolean | null
          meals?: Json
          name: string
          target_goal?: string | null
          template_marmita?: boolean | null
        }
        Update: {
          category?: string
          clinical_condition?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_lunchbox?: boolean | null
          is_premium?: boolean | null
          meals?: Json
          name?: string
          target_goal?: string | null
          template_marmita?: boolean | null
        }
        Relationships: []
      }
      meal_plan_versions: {
        Row: {
          change_reason: string | null
          changed_at: string
          changed_by: string
          changed_fields: string[] | null
          id: string
          items_snapshot: Json
          meal_plan_id: string
          snapshot_json: Json
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string
          changed_by: string
          changed_fields?: string[] | null
          id?: string
          items_snapshot?: Json
          meal_plan_id: string
          snapshot_json?: Json
        }
        Update: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string
          changed_fields?: string[] | null
          id?: string
          items_snapshot?: Json
          meal_plan_id?: string
          snapshot_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_versions_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_resolved_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_versions_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_versions_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "v_plan_visibility_diagnostics"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          adherence_score: number | null
          clinical_score: number | null
          clinical_status: string | null
          correlation_id: string | null
          created_at: string
          description: string | null
          editor_version: string | null
          end_date: string | null
          generated_by: string | null
          generation_metadata: Json | null
          generation_source: string | null
          global_calories_target: number | null
          global_carbs_target: number | null
          global_fat_target: number | null
          global_protein_target: number | null
          id: string
          is_active: boolean
          is_global_model: boolean | null
          last_validated_at: string | null
          nutritionist_id: string
          overall_score: number | null
          overall_validation_status: string | null
          patient_id: string
          personalization_applied: boolean
          pipeline_completed_at: string | null
          pipeline_version: string | null
          plan_mode: Database["public"]["Enums"]["plan_mode_type"]
          plan_status: string
          plan_type: string | null
          previous_plan_id: string | null
          quality_alerts: Json | null
          requires_regeneration: boolean | null
          simplicity_score: number | null
          start_date: string
          template_id: string | null
          template_slug: string | null
          template_version: number | null
          tenant_id: string
          therapeutic_effectiveness_status: string | null
          therapeutic_efficacy_score: number | null
          title: string
          total_calories: number | null
          total_carbs: number | null
          total_fat: number | null
          total_protein: number | null
          total_target_calories: number | null
          total_target_carbs: number | null
          total_target_fat: number | null
          total_target_protein: number | null
          totals_status: string
          transition_origin_id: string | null
          updated_at: string
          validation_engine_version: string | null
        }
        Insert: {
          adherence_score?: number | null
          clinical_score?: number | null
          clinical_status?: string | null
          correlation_id?: string | null
          created_at?: string
          description?: string | null
          editor_version?: string | null
          end_date?: string | null
          generated_by?: string | null
          generation_metadata?: Json | null
          generation_source?: string | null
          global_calories_target?: number | null
          global_carbs_target?: number | null
          global_fat_target?: number | null
          global_protein_target?: number | null
          id?: string
          is_active?: boolean
          is_global_model?: boolean | null
          last_validated_at?: string | null
          nutritionist_id: string
          overall_score?: number | null
          overall_validation_status?: string | null
          patient_id: string
          personalization_applied?: boolean
          pipeline_completed_at?: string | null
          pipeline_version?: string | null
          plan_mode?: Database["public"]["Enums"]["plan_mode_type"]
          plan_status?: string
          plan_type?: string | null
          previous_plan_id?: string | null
          quality_alerts?: Json | null
          requires_regeneration?: boolean | null
          simplicity_score?: number | null
          start_date: string
          template_id?: string | null
          template_slug?: string | null
          template_version?: number | null
          tenant_id: string
          therapeutic_effectiveness_status?: string | null
          therapeutic_efficacy_score?: number | null
          title: string
          total_calories?: number | null
          total_carbs?: number | null
          total_fat?: number | null
          total_protein?: number | null
          total_target_calories?: number | null
          total_target_carbs?: number | null
          total_target_fat?: number | null
          total_target_protein?: number | null
          totals_status?: string
          transition_origin_id?: string | null
          updated_at?: string
          validation_engine_version?: string | null
        }
        Update: {
          adherence_score?: number | null
          clinical_score?: number | null
          clinical_status?: string | null
          correlation_id?: string | null
          created_at?: string
          description?: string | null
          editor_version?: string | null
          end_date?: string | null
          generated_by?: string | null
          generation_metadata?: Json | null
          generation_source?: string | null
          global_calories_target?: number | null
          global_carbs_target?: number | null
          global_fat_target?: number | null
          global_protein_target?: number | null
          id?: string
          is_active?: boolean
          is_global_model?: boolean | null
          last_validated_at?: string | null
          nutritionist_id?: string
          overall_score?: number | null
          overall_validation_status?: string | null
          patient_id?: string
          personalization_applied?: boolean
          pipeline_completed_at?: string | null
          pipeline_version?: string | null
          plan_mode?: Database["public"]["Enums"]["plan_mode_type"]
          plan_status?: string
          plan_type?: string | null
          previous_plan_id?: string | null
          quality_alerts?: Json | null
          requires_regeneration?: boolean | null
          simplicity_score?: number | null
          start_date?: string
          template_id?: string | null
          template_slug?: string | null
          template_version?: number | null
          tenant_id?: string
          therapeutic_effectiveness_status?: string | null
          therapeutic_efficacy_score?: number | null
          title?: string
          total_calories?: number | null
          total_carbs?: number | null
          total_fat?: number | null
          total_protein?: number | null
          total_target_calories?: number | null
          total_target_carbs?: number | null
          total_target_fat?: number | null
          total_target_protein?: number | null
          totals_status?: string
          transition_origin_id?: string | null
          updated_at?: string
          validation_engine_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_previous_plan_id_fkey"
            columns: ["previous_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_resolved_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plans_previous_plan_id_fkey"
            columns: ["previous_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plans_previous_plan_id_fkey"
            columns: ["previous_plan_id"]
            isOneToOne: false
            referencedRelation: "v_plan_visibility_diagnostics"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "meal_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plans_transition_origin_id_fkey"
            columns: ["transition_origin_id"]
            isOneToOne: false
            referencedRelation: "protocol_transition_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_recipes: {
        Row: {
          base_recipe: Json | null
          created_at: string
          fixed_calories: number | null
          fixed_carbs: number | null
          fixed_fat: number | null
          fixed_protein: number | null
          foods_json: Json
          id: string
          instructions: string | null
          is_active: boolean
          is_fixed: boolean
          is_scalable: boolean
          meal_type: string
          name: string
          nutritionist_id: string
          protein_type: string
          tenant_id: string | null
          updated_at: string
          visual_library_item_id: string
        }
        Insert: {
          base_recipe?: Json | null
          created_at?: string
          fixed_calories?: number | null
          fixed_carbs?: number | null
          fixed_fat?: number | null
          fixed_protein?: number | null
          foods_json?: Json
          id?: string
          instructions?: string | null
          is_active?: boolean
          is_fixed?: boolean
          is_scalable?: boolean
          meal_type?: string
          name: string
          nutritionist_id: string
          protein_type?: string
          tenant_id?: string | null
          updated_at?: string
          visual_library_item_id?: string
        }
        Update: {
          base_recipe?: Json | null
          created_at?: string
          fixed_calories?: number | null
          fixed_carbs?: number | null
          fixed_fat?: number | null
          fixed_protein?: number | null
          foods_json?: Json
          id?: string
          instructions?: string | null
          is_active?: boolean
          is_fixed?: boolean
          is_scalable?: boolean
          meal_type?: string
          name?: string
          nutritionist_id?: string
          protein_type?: string
          tenant_id?: string | null
          updated_at?: string
          visual_library_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_meal_recipes_visual_library"
            columns: ["visual_library_item_id"]
            isOneToOne: false
            referencedRelation: "meal_visual_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_recipes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_recipes_visual_library_item_id_fkey"
            columns: ["visual_library_item_id"]
            isOneToOne: false
            referencedRelation: "meal_visual_library"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_template_performance: {
        Row: {
          avg_adherence: number | null
          avg_weight_response: number | null
          id: string
          last_used: string | null
          success_rate: number | null
          template_id: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          avg_adherence?: number | null
          avg_weight_response?: number | null
          id?: string
          last_used?: string | null
          success_rate?: number | null
          template_id: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          avg_adherence?: number | null
          avg_weight_response?: number | null
          id?: string
          last_used?: string | null
          success_rate?: number | null
          template_id?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_template_performance_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "nutritionist_meal_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_visual_aliases: {
        Row: {
          alias: string
          created_at: string | null
          id: string
          library_item_id: string
          normalized_alias: string
        }
        Insert: {
          alias: string
          created_at?: string | null
          id?: string
          library_item_id: string
          normalized_alias: string
        }
        Update: {
          alias?: string
          created_at?: string | null
          id?: string
          library_item_id?: string
          normalized_alias?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_visual_aliases_library_item_id_fkey"
            columns: ["library_item_id"]
            isOneToOne: false
            referencedRelation: "meal_visual_library"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_visual_library: {
        Row: {
          base_recipe: string | null
          category: string
          clinical_tags: string[] | null
          created_at: string | null
          created_by: string | null
          default_calories: number | null
          default_carbs: number | null
          default_fat: number | null
          default_portion: string | null
          default_protein: number | null
          display_name: string
          gallery_images: string[] | null
          id: string
          image_path: string | null
          image_url: string | null
          is_active: boolean | null
          name: string
          search_terms: string[] | null
          short_description: string | null
          slug: string
          sort_order: number | null
          subcategory: string | null
          tags: string[] | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          base_recipe?: string | null
          category: string
          clinical_tags?: string[] | null
          created_at?: string | null
          created_by?: string | null
          default_calories?: number | null
          default_carbs?: number | null
          default_fat?: number | null
          default_portion?: string | null
          default_protein?: number | null
          display_name: string
          gallery_images?: string[] | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_active?: boolean | null
          name: string
          search_terms?: string[] | null
          short_description?: string | null
          slug: string
          sort_order?: number | null
          subcategory?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          base_recipe?: string | null
          category?: string
          clinical_tags?: string[] | null
          created_at?: string | null
          created_by?: string | null
          default_calories?: number | null
          default_carbs?: number | null
          default_fat?: number | null
          default_portion?: string | null
          default_protein?: number | null
          display_name?: string
          gallery_images?: string[] | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          search_terms?: string[] | null
          short_description?: string | null
          slug?: string
          sort_order?: number | null
          subcategory?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_visual_library_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          ai_analyzed: boolean
          ai_feedback: string | null
          ai_score: number | null
          calories: number | null
          carbs: number | null
          created_at: string
          description: string | null
          fat: number | null
          fiber: number | null
          id: string
          image_url: string | null
          logged_at: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          protein: number | null
          tenant_id: string | null
          title: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          ai_analyzed?: boolean
          ai_feedback?: string | null
          ai_score?: number | null
          calories?: number | null
          carbs?: number | null
          created_at?: string
          description?: string | null
          fat?: number | null
          fiber?: number | null
          id?: string
          image_url?: string | null
          logged_at?: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          protein?: number | null
          tenant_id?: string | null
          title: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          ai_analyzed?: boolean
          ai_feedback?: string | null
          ai_score?: number | null
          calories?: number | null
          carbs?: number | null
          created_at?: string
          description?: string | null
          fat?: number | null
          fiber?: number | null
          id?: string
          image_url?: string | null
          logged_at?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          protein?: number | null
          tenant_id?: string | null
          title?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "meals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category: string
          color: string | null
          created_at: string
          icon: string
          icon_color: string | null
          id: string
          is_active: boolean
          label: string
          label_key: string
          order_default: number
          premium_only: boolean
          premium_priority_boost: boolean
          role_visibility: string[]
          route: string
        }
        Insert: {
          category?: string
          color?: string | null
          created_at?: string
          icon?: string
          icon_color?: string | null
          id?: string
          is_active?: boolean
          label: string
          label_key: string
          order_default?: number
          premium_only?: boolean
          premium_priority_boost?: boolean
          role_visibility?: string[]
          route: string
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string
          icon?: string
          icon_color?: string | null
          id?: string
          is_active?: boolean
          label?: string
          label_key?: string
          order_default?: number
          premium_only?: boolean
          premium_priority_boost?: boolean
          role_visibility?: string[]
          route?: string
        }
        Relationships: []
      }
      metabolic_classification_history: {
        Row: {
          classification_data: Json | null
          clinical_interpretation: string | null
          confidence_score: number
          created_at: string
          created_by: string | null
          dominant_pattern: string | null
          engine_version: string
          id: string
          metabolic_response_type: string
          patient_id: string
          previous_type: string | null
          trigger_source: string
        }
        Insert: {
          classification_data?: Json | null
          clinical_interpretation?: string | null
          confidence_score?: number
          created_at?: string
          created_by?: string | null
          dominant_pattern?: string | null
          engine_version?: string
          id?: string
          metabolic_response_type: string
          patient_id: string
          previous_type?: string | null
          trigger_source?: string
        }
        Update: {
          classification_data?: Json | null
          clinical_interpretation?: string | null
          confidence_score?: number
          created_at?: string
          created_by?: string | null
          dominant_pattern?: string | null
          engine_version?: string
          id?: string
          metabolic_response_type?: string
          patient_id?: string
          previous_type?: string | null
          trigger_source?: string
        }
        Relationships: []
      }
      metabolic_phase_history: {
        Row: {
          calories_after: number | null
          calories_before: number | null
          clinical_reason: string | null
          confidence_score: number | null
          created_at: string
          created_by: string | null
          engine_version: string | null
          id: string
          macro_adjustments: Json | null
          patient_id: string
          phase_type: string
          previous_phase: string | null
          strategy_type: string
          trigger_source: string | null
        }
        Insert: {
          calories_after?: number | null
          calories_before?: number | null
          clinical_reason?: string | null
          confidence_score?: number | null
          created_at?: string
          created_by?: string | null
          engine_version?: string | null
          id?: string
          macro_adjustments?: Json | null
          patient_id: string
          phase_type: string
          previous_phase?: string | null
          strategy_type?: string
          trigger_source?: string | null
        }
        Update: {
          calories_after?: number | null
          calories_before?: number | null
          clinical_reason?: string | null
          confidence_score?: number | null
          created_at?: string
          created_by?: string | null
          engine_version?: string | null
          id?: string
          macro_adjustments?: Json | null
          patient_id?: string
          phase_type?: string
          previous_phase?: string | null
          strategy_type?: string
          trigger_source?: string | null
        }
        Relationships: []
      }
      metabolic_phase_strategy_rules: {
        Row: {
          caloric_adjustment_range: Json | null
          clinical_guidelines: string | null
          created_at: string
          default_adjustment_type: string
          guardrails: Json | null
          id: string
          is_active: boolean | null
          macro_redistribution: Json | null
          phase_type: string
          protein_priority: string | null
          updated_at: string
        }
        Insert: {
          caloric_adjustment_range?: Json | null
          clinical_guidelines?: string | null
          created_at?: string
          default_adjustment_type?: string
          guardrails?: Json | null
          id?: string
          is_active?: boolean | null
          macro_redistribution?: Json | null
          phase_type: string
          protein_priority?: string | null
          updated_at?: string
        }
        Update: {
          caloric_adjustment_range?: Json | null
          clinical_guidelines?: string | null
          created_at?: string
          default_adjustment_type?: string
          guardrails?: Json | null
          id?: string
          is_active?: boolean | null
          macro_redistribution?: Json | null
          phase_type?: string
          protein_priority?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          priority: string | null
          target_route: string | null
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          priority?: string | null
          target_route?: string | null
          tenant_id: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          priority?: string | null
          target_route?: string | null
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_protocol_changed: {
        Row: {
          adherence_at_change: number | null
          behavioral_reason: string | null
          change_reason: string | null
          changed_by: string | null
          cluster_at_change: string | null
          created_at: string | null
          expected_impact: string | null
          id: string
          metabolic_reason: string | null
          new_protocol_id: string | null
          patient_id: string
          previous_protocol_id: string | null
        }
        Insert: {
          adherence_at_change?: number | null
          behavioral_reason?: string | null
          change_reason?: string | null
          changed_by?: string | null
          cluster_at_change?: string | null
          created_at?: string | null
          expected_impact?: string | null
          id?: string
          metabolic_reason?: string | null
          new_protocol_id?: string | null
          patient_id: string
          previous_protocol_id?: string | null
        }
        Update: {
          adherence_at_change?: number | null
          behavioral_reason?: string | null
          change_reason?: string | null
          changed_by?: string | null
          cluster_at_change?: string | null
          created_at?: string | null
          expected_impact?: string | null
          id?: string
          metabolic_reason?: string | null
          new_protocol_id?: string | null
          patient_id?: string
          previous_protocol_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_protocol_changed_new_protocol_id_fkey"
            columns: ["new_protocol_id"]
            isOneToOne: false
            referencedRelation: "nutrition_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_protocol_changed_previous_protocol_id_fkey"
            columns: ["previous_protocol_id"]
            isOneToOne: false
            referencedRelation: "nutrition_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_protocols: {
        Row: {
          behavioral_complexity_level: string
          clinical_goal: string
          contraindicated_conditions: string[] | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          metabolic_strategy_type: string
          protocol_category: string
          protocol_name: string
          protocol_slug: string
          recommended_clusters: string[] | null
          scientific_rationale: string | null
          tenant_id: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          behavioral_complexity_level?: string
          clinical_goal: string
          contraindicated_conditions?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          metabolic_strategy_type?: string
          protocol_category?: string
          protocol_name: string
          protocol_slug: string
          recommended_clusters?: string[] | null
          scientific_rationale?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          behavioral_complexity_level?: string
          clinical_goal?: string
          contraindicated_conditions?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          metabolic_strategy_type?: string
          protocol_category?: string
          protocol_name?: string
          protocol_slug?: string
          recommended_clusters?: string[] | null
          scientific_rationale?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_protocols_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_search_index: {
        Row: {
          clinical_tags: string | null
          created_at: string | null
          entity_id: string
          entity_type: string
          extra_data: Json | null
          goal_tags: string | null
          id: string
          keywords: string | null
          strategy_tags: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          clinical_tags?: string | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          extra_data?: Json | null
          goal_tags?: string | null
          id?: string
          keywords?: string | null
          strategy_tags?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          clinical_tags?: string | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          extra_data?: Json | null
          goal_tags?: string | null
          id?: string
          keywords?: string | null
          strategy_tags?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      nutritional_intervention_suggestions: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          caloric_adjustment_percent: number | null
          clinical_reason: string
          cluster_origin: string | null
          created_at: string
          efficacy_score: number | null
          engine_version: string
          id: string
          intervention_type: string
          metadata: Json | null
          patient_id: string
          plan_id: string | null
          risk_at_moment: string | null
          status: string
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          caloric_adjustment_percent?: number | null
          clinical_reason: string
          cluster_origin?: string | null
          created_at?: string
          efficacy_score?: number | null
          engine_version?: string
          id?: string
          intervention_type: string
          metadata?: Json | null
          patient_id: string
          plan_id?: string | null
          risk_at_moment?: string | null
          status?: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          caloric_adjustment_percent?: number | null
          clinical_reason?: string
          cluster_origin?: string | null
          created_at?: string
          efficacy_score?: number | null
          engine_version?: string
          id?: string
          intervention_type?: string
          metadata?: Json | null
          patient_id?: string
          plan_id?: string | null
          risk_at_moment?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutritional_intervention_suggestions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_resolved_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutritional_intervention_suggestions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutritional_intervention_suggestions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "v_plan_visibility_diagnostics"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      nutritionist_meal_templates: {
        Row: {
          carbs_base: number | null
          complexity_level: string | null
          created_at: string | null
          fat_base: number | null
          foods_structure: Json | null
          goal_tags: Json | null
          id: string
          is_global: boolean | null
          kcal_base: number | null
          meal_type: string
          name: string
          nutritionist_id: string
          protein_base: number | null
          satiety_score: number | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          carbs_base?: number | null
          complexity_level?: string | null
          created_at?: string | null
          fat_base?: number | null
          foods_structure?: Json | null
          goal_tags?: Json | null
          id?: string
          is_global?: boolean | null
          kcal_base?: number | null
          meal_type?: string
          name: string
          nutritionist_id: string
          protein_base?: number | null
          satiety_score?: number | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          carbs_base?: number | null
          complexity_level?: string | null
          created_at?: string | null
          fat_base?: number | null
          foods_structure?: Json | null
          goal_tags?: Json | null
          id?: string
          is_global?: boolean | null
          kcal_base?: number | null
          meal_type?: string
          name?: string
          nutritionist_id?: string
          protein_base?: number | null
          satiety_score?: number | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      nutritionist_patients: {
        Row: {
          attendance_mode: string
          checkin_frequency: string | null
          created_at: string
          default_meal_plan_id: string | null
          expires_at: string | null
          id: string
          journey_status: string
          last_checkin_reminder: string | null
          notes: string | null
          nutritionist_id: string
          patient_id: string
          status: string
          tenant_id: string
        }
        Insert: {
          attendance_mode?: string
          checkin_frequency?: string | null
          created_at?: string
          default_meal_plan_id?: string | null
          expires_at?: string | null
          id?: string
          journey_status?: string
          last_checkin_reminder?: string | null
          notes?: string | null
          nutritionist_id: string
          patient_id: string
          status?: string
          tenant_id: string
        }
        Update: {
          attendance_mode?: string
          checkin_frequency?: string | null
          created_at?: string
          default_meal_plan_id?: string | null
          expires_at?: string | null
          id?: string
          journey_status?: string
          last_checkin_reminder?: string | null
          notes?: string | null
          nutritionist_id?: string
          patient_id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutritionist_patients_default_meal_plan_id_fkey"
            columns: ["default_meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_resolved_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutritionist_patients_default_meal_plan_id_fkey"
            columns: ["default_meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutritionist_patients_default_meal_plan_id_fkey"
            columns: ["default_meal_plan_id"]
            isOneToOne: false
            referencedRelation: "v_plan_visibility_diagnostics"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "nutritionist_patients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_pipelines: {
        Row: {
          anamnesis_completed: boolean | null
          approved_at: string | null
          approved_by: string | null
          body_data_completed: boolean | null
          clinical_flags: Json | null
          cooking_preference: string | null
          created_at: string | null
          food_preferences: Json | null
          generated_plan_data: Json | null
          generated_plan_id: string | null
          height: number | null
          id: string
          meal_count: number | null
          nutritionist_id: string
          onboarding_step_completed: Json | null
          patient_id: string
          photo_back_url: string | null
          photo_front_url: string | null
          photo_side_url: string | null
          plan_approved: boolean | null
          plan_generated: boolean | null
          preferences_completed: boolean | null
          rejection_reason: string | null
          release_config: Json | null
          release_status: string
          released_at: string | null
          released_by: string | null
          scheduling_criteria: Json | null
          sleep_time: string | null
          status: string
          sync_attempts: number
          sync_error: string | null
          sync_last_attempt_at: string | null
          sync_pending: boolean
          updated_at: string | null
          use_scheduling_criteria: boolean | null
          wake_time: string | null
          weight: number | null
        }
        Insert: {
          anamnesis_completed?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          body_data_completed?: boolean | null
          clinical_flags?: Json | null
          cooking_preference?: string | null
          created_at?: string | null
          food_preferences?: Json | null
          generated_plan_data?: Json | null
          generated_plan_id?: string | null
          height?: number | null
          id?: string
          meal_count?: number | null
          nutritionist_id: string
          onboarding_step_completed?: Json | null
          patient_id: string
          photo_back_url?: string | null
          photo_front_url?: string | null
          photo_side_url?: string | null
          plan_approved?: boolean | null
          plan_generated?: boolean | null
          preferences_completed?: boolean | null
          rejection_reason?: string | null
          release_config?: Json | null
          release_status?: string
          released_at?: string | null
          released_by?: string | null
          scheduling_criteria?: Json | null
          sleep_time?: string | null
          status?: string
          sync_attempts?: number
          sync_error?: string | null
          sync_last_attempt_at?: string | null
          sync_pending?: boolean
          updated_at?: string | null
          use_scheduling_criteria?: boolean | null
          wake_time?: string | null
          weight?: number | null
        }
        Update: {
          anamnesis_completed?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          body_data_completed?: boolean | null
          clinical_flags?: Json | null
          cooking_preference?: string | null
          created_at?: string | null
          food_preferences?: Json | null
          generated_plan_data?: Json | null
          generated_plan_id?: string | null
          height?: number | null
          id?: string
          meal_count?: number | null
          nutritionist_id?: string
          onboarding_step_completed?: Json | null
          patient_id?: string
          photo_back_url?: string | null
          photo_front_url?: string | null
          photo_side_url?: string | null
          plan_approved?: boolean | null
          plan_generated?: boolean | null
          preferences_completed?: boolean | null
          rejection_reason?: string | null
          release_config?: Json | null
          release_status?: string
          released_at?: string | null
          released_by?: string | null
          scheduling_criteria?: Json | null
          sleep_time?: string | null
          status?: string
          sync_attempts?: number
          sync_error?: string | null
          sync_last_attempt_at?: string | null
          sync_pending?: boolean
          updated_at?: string | null
          use_scheduling_criteria?: boolean | null
          wake_time?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_pipelines_generated_plan_id_fkey"
            columns: ["generated_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_resolved_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_pipelines_generated_plan_id_fkey"
            columns: ["generated_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_pipelines_generated_plan_id_fkey"
            columns: ["generated_plan_id"]
            isOneToOne: false
            referencedRelation: "v_plan_visibility_diagnostics"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      onboarding_runtime_errors: {
        Row: {
          attempt: number
          context: string
          created_at: string
          error_message: string | null
          error_payload: Json | null
          id: string
          patient_id: string
        }
        Insert: {
          attempt?: number
          context: string
          created_at?: string
          error_message?: string | null
          error_payload?: Json | null
          id?: string
          patient_id: string
        }
        Update: {
          attempt?: number
          context?: string
          created_at?: string
          error_message?: string | null
          error_payload?: Json | null
          id?: string
          patient_id?: string
        }
        Relationships: []
      }
      onboarding_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          nutritionist_id: string
          patient_id: string
          pipeline_id: string | null
          status: string
          tenant_id: string | null
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          nutritionist_id: string
          patient_id: string
          pipeline_id?: string | null
          status?: string
          tenant_id?: string | null
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          nutritionist_id?: string
          patient_id?: string
          pipeline_id?: string | null
          status?: string
          tenant_id?: string | null
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_cost_configuration: {
        Row: {
          avg_stripe_fee_percent: number
          avg_ticket_per_patient: number | null
          cost_base_per_professional: number
          cost_per_1000_notifications_usd: number
          cost_per_100mb_storage_usd: number
          cost_per_ai_call_usd: number
          id: string
          infrastructure_base_cost_usd: number
          monthly_price_per_professional: number
          stripe_fee_percent: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          avg_stripe_fee_percent?: number
          avg_ticket_per_patient?: number | null
          cost_base_per_professional?: number
          cost_per_1000_notifications_usd?: number
          cost_per_100mb_storage_usd?: number
          cost_per_ai_call_usd?: number
          id?: string
          infrastructure_base_cost_usd?: number
          monthly_price_per_professional?: number
          stripe_fee_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          avg_stripe_fee_percent?: number
          avg_ticket_per_patient?: number | null
          cost_base_per_professional?: number
          cost_per_1000_notifications_usd?: number
          cost_per_100mb_storage_usd?: number
          cost_per_ai_call_usd?: number
          id?: string
          infrastructure_base_cost_usd?: number
          monthly_price_per_professional?: number
          stripe_fee_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      operational_cost_metrics: {
        Row: {
          ai_calls_body_projection: number
          ai_calls_meal_analysis: number
          ai_calls_recipe_generation: number
          ai_calls_reports: number
          created_at: string
          edge_function_runs: number
          id: string
          metric_date: string
          push_notifications_sent: number
          storage_images_mb: number
          total_active_patients: number
        }
        Insert: {
          ai_calls_body_projection?: number
          ai_calls_meal_analysis?: number
          ai_calls_recipe_generation?: number
          ai_calls_reports?: number
          created_at?: string
          edge_function_runs?: number
          id?: string
          metric_date?: string
          push_notifications_sent?: number
          storage_images_mb?: number
          total_active_patients?: number
        }
        Update: {
          ai_calls_body_projection?: number
          ai_calls_meal_analysis?: number
          ai_calls_recipe_generation?: number
          ai_calls_reports?: number
          created_at?: string
          edge_function_runs?: number
          id?: string
          metric_date?: string
          push_notifications_sent?: number
          storage_images_mb?: number
          total_active_patients?: number
        }
        Relationships: []
      }
      operational_scale_scenarios: {
        Row: {
          ai_usage_intensity: Database["public"]["Enums"]["usage_intensity"]
          avg_patients_per_professional: number
          created_at: string
          id: string
          scenario_name: string
          storage_intensity: Database["public"]["Enums"]["usage_intensity"]
          total_professionals: number
        }
        Insert: {
          ai_usage_intensity?: Database["public"]["Enums"]["usage_intensity"]
          avg_patients_per_professional?: number
          created_at?: string
          id?: string
          scenario_name: string
          storage_intensity?: Database["public"]["Enums"]["usage_intensity"]
          total_professionals?: number
        }
        Update: {
          ai_usage_intensity?: Database["public"]["Enums"]["usage_intensity"]
          avg_patients_per_professional?: number
          created_at?: string
          id?: string
          scenario_name?: string
          storage_intensity?: Database["public"]["Enums"]["usage_intensity"]
          total_professionals?: number
        }
        Relationships: []
      }
      organization_action_groups_snapshot: {
        Row: {
          avg_priority: number | null
          avg_risk: number | null
          created_at: string | null
          engine_version: string | null
          group_type: string
          id: string
          nutritionist_id: string
          organization_id: string | null
          patient_ids: Json | null
          patients_count: number | null
          snapshot_date: string | null
        }
        Insert: {
          avg_priority?: number | null
          avg_risk?: number | null
          created_at?: string | null
          engine_version?: string | null
          group_type: string
          id?: string
          nutritionist_id: string
          organization_id?: string | null
          patient_ids?: Json | null
          patients_count?: number | null
          snapshot_date?: string | null
        }
        Update: {
          avg_priority?: number | null
          avg_risk?: number | null
          created_at?: string | null
          engine_version?: string | null
          group_type?: string
          id?: string
          nutritionist_id?: string
          organization_id?: string | null
          patient_ids?: Json | null
          patients_count?: number | null
          snapshot_date?: string | null
        }
        Relationships: []
      }
      organization_brand_settings: {
        Row: {
          accent_color: string | null
          app_name: string | null
          created_at: string | null
          custom_css: string | null
          email_signature: string | null
          font_family: string | null
          id: string
          login_background: string | null
          logo_url: string | null
          onboarding_copy: Json | null
          organization_id: string
          primary_color: string | null
          secondary_color: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          app_name?: string | null
          created_at?: string | null
          custom_css?: string | null
          email_signature?: string | null
          font_family?: string | null
          id?: string
          login_background?: string | null
          logo_url?: string | null
          onboarding_copy?: Json | null
          organization_id: string
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          app_name?: string | null
          created_at?: string | null
          custom_css?: string | null
          email_signature?: string | null
          font_family?: string | null
          id?: string
          login_background?: string | null
          logo_url?: string | null
          onboarding_copy?: Json | null
          organization_id?: string
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_brand_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_engine_config: {
        Row: {
          abandonment_days: number | null
          adherence_threshold: number | null
          caloric_excess_threshold: number | null
          cluster_rules: Json | null
          created_at: string | null
          id: string
          organization_id: string
          performance_weights: Json | null
          stagnation_days: number | null
          updated_at: string | null
        }
        Insert: {
          abandonment_days?: number | null
          adherence_threshold?: number | null
          caloric_excess_threshold?: number | null
          cluster_rules?: Json | null
          created_at?: string | null
          id?: string
          organization_id: string
          performance_weights?: Json | null
          stagnation_days?: number | null
          updated_at?: string | null
        }
        Update: {
          abandonment_days?: number | null
          adherence_threshold?: number | null
          caloric_excess_threshold?: number | null
          cluster_rules?: Json | null
          created_at?: string | null
          id?: string
          organization_id?: string
          performance_weights?: Json | null
          stagnation_days?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_engine_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          id: string
          invited_at: string | null
          joined_at: string | null
          organization_id: string
          role: string
          status: string | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          organization_id: string
          role?: string
          status?: string | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          organization_id?: string
          role?: string
          status?: string | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_metrics_cache: {
        Row: {
          active_patients: number | null
          avg_adherence: number | null
          avg_performance_score: number | null
          avg_plan_efficacy: number | null
          computed_at: string | null
          dropout_rate: number | null
          engine_version: string | null
          id: string
          new_patients_30d: number | null
          organization_id: string
          patients_at_risk_percent: number | null
          portfolio_classification: string | null
          retention_rate: number | null
          top_protocol_name: string | null
          total_patients: number | null
          total_professionals: number | null
        }
        Insert: {
          active_patients?: number | null
          avg_adherence?: number | null
          avg_performance_score?: number | null
          avg_plan_efficacy?: number | null
          computed_at?: string | null
          dropout_rate?: number | null
          engine_version?: string | null
          id?: string
          new_patients_30d?: number | null
          organization_id: string
          patients_at_risk_percent?: number | null
          portfolio_classification?: string | null
          retention_rate?: number | null
          top_protocol_name?: string | null
          total_patients?: number | null
          total_professionals?: number | null
        }
        Update: {
          active_patients?: number | null
          avg_adherence?: number | null
          avg_performance_score?: number | null
          avg_plan_efficacy?: number | null
          computed_at?: string | null
          dropout_rate?: number | null
          engine_version?: string | null
          id?: string
          new_patients_30d?: number | null
          organization_id?: string
          patients_at_risk_percent?: number | null
          portfolio_classification?: string | null
          retention_rate?: number | null
          top_protocol_name?: string | null
          total_patients?: number | null
          total_professionals?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_metrics_cache_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_operational_alerts: {
        Row: {
          alert_type: string
          description: string | null
          detected_at: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          organization_id: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          title: string
        }
        Insert: {
          alert_type: string
          description?: string | null
          detected_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          organization_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          title: string
        }
        Update: {
          alert_type?: string
          description?: string | null
          detected_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          organization_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_operational_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_operational_snapshots: {
        Row: {
          active_patients: number | null
          average_adherence: number | null
          average_performance_score: number | null
          avg_patient_ltv_estimate: number | null
          avg_time_between_interventions: number | null
          clinical_efficiency_index: number | null
          clinical_intervention_rate: number | null
          created_at: string | null
          dropout_rate_30d: number | null
          engine_version: string | null
          high_risk_patients: number | null
          id: string
          intervention_load_level: string | null
          organization_id: string
          portfolio_stability_index: number | null
          predicted_portfolio_contraction_rate: number | null
          predicted_portfolio_growth_rate: number | null
          protocol_adjustment_rate: number | null
          snapshot_date: string
          stagnation_rate_30d: number | null
        }
        Insert: {
          active_patients?: number | null
          average_adherence?: number | null
          average_performance_score?: number | null
          avg_patient_ltv_estimate?: number | null
          avg_time_between_interventions?: number | null
          clinical_efficiency_index?: number | null
          clinical_intervention_rate?: number | null
          created_at?: string | null
          dropout_rate_30d?: number | null
          engine_version?: string | null
          high_risk_patients?: number | null
          id?: string
          intervention_load_level?: string | null
          organization_id: string
          portfolio_stability_index?: number | null
          predicted_portfolio_contraction_rate?: number | null
          predicted_portfolio_growth_rate?: number | null
          protocol_adjustment_rate?: number | null
          snapshot_date?: string
          stagnation_rate_30d?: number | null
        }
        Update: {
          active_patients?: number | null
          average_adherence?: number | null
          average_performance_score?: number | null
          avg_patient_ltv_estimate?: number | null
          avg_time_between_interventions?: number | null
          clinical_efficiency_index?: number | null
          clinical_intervention_rate?: number | null
          created_at?: string | null
          dropout_rate_30d?: number | null
          engine_version?: string | null
          high_risk_patients?: number | null
          id?: string
          intervention_load_level?: string | null
          organization_id?: string
          portfolio_stability_index?: number | null
          predicted_portfolio_contraction_rate?: number | null
          predicted_portfolio_growth_rate?: number | null
          protocol_adjustment_rate?: number | null
          snapshot_date?: string
          stagnation_rate_30d?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_operational_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_recommended_actions: {
        Row: {
          acted_at: string | null
          acted_by: string | null
          action_type: string
          created_at: string | null
          description: string | null
          engine_version: string | null
          expected_impact: string | null
          id: string
          organization_id: string
          priority: number | null
          rationale: string | null
          status: string | null
          title: string
        }
        Insert: {
          acted_at?: string | null
          acted_by?: string | null
          action_type: string
          created_at?: string | null
          description?: string | null
          engine_version?: string | null
          expected_impact?: string | null
          id?: string
          organization_id: string
          priority?: number | null
          rationale?: string | null
          status?: string | null
          title: string
        }
        Update: {
          acted_at?: string | null
          acted_by?: string | null
          action_type?: string
          created_at?: string | null
          description?: string | null
          engine_version?: string | null
          expected_impact?: string | null
          id?: string
          organization_id?: string
          priority?: number | null
          rationale?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_recommended_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_regional_settings: {
        Row: {
          created_at: string | null
          currency: string | null
          date_format: string | null
          id: string
          locale: string | null
          measurement_system: string | null
          nutritional_guidelines: string | null
          organization_id: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          date_format?: string | null
          id?: string
          locale?: string | null
          measurement_system?: string | null
          nutritional_guidelines?: string | null
          organization_id: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          date_format?: string | null
          id?: string
          locale?: string | null
          measurement_system?: string | null
          nutritional_guidelines?: string | null
          organization_id?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_regional_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_subscriptions: {
        Row: {
          ai_features_enabled: boolean | null
          billing_cycle: string | null
          created_at: string | null
          current_period_end: string | null
          id: string
          max_patients: number | null
          max_professionals: number | null
          organization_id: string
          plan: string | null
          status: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          ai_features_enabled?: boolean | null
          billing_cycle?: string | null
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          max_patients?: number | null
          max_professionals?: number | null
          organization_id: string
          plan?: string | null
          status?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_features_enabled?: boolean | null
          billing_cycle?: string | null
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          max_patients?: number | null
          max_professionals?: number | null
          organization_id?: string
          plan?: string | null
          status?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          brand_colors: Json | null
          brand_name: string | null
          country: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          slug: string
          subscription_plan: string | null
          tenant_id: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          brand_colors?: Json | null
          brand_name?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          slug: string
          subscription_plan?: string | null
          tenant_id?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_colors?: Json | null
          brand_name?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string
          subscription_plan?: string | null
          tenant_id?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_anamnesis: {
        Row: {
          answers: Json
          audit_metadata: Json | null
          computed_carbs: number | null
          computed_fat: number | null
          computed_kcal_target: number | null
          computed_protein: number | null
          computed_tdee: number | null
          computed_tmb: number | null
          created_at: string
          id: string
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          audit_metadata?: Json | null
          computed_carbs?: number | null
          computed_fat?: number | null
          computed_kcal_target?: number | null
          computed_protein?: number | null
          computed_tdee?: number | null
          computed_tmb?: number | null
          created_at?: string
          id?: string
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          audit_metadata?: Json | null
          computed_carbs?: number | null
          computed_fat?: number | null
          computed_kcal_target?: number | null
          computed_protein?: number | null
          computed_tdee?: number | null
          computed_tmb?: number | null
          created_at?: string
          id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_anamnesis_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_appointments: {
        Row: {
          appointment_date: string
          appointment_type: string
          color: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          nutritionist_id: string
          patient_id: string
          reminder_sent: boolean | null
          status: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_type?: string
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          nutritionist_id: string
          patient_id: string
          reminder_sent?: boolean | null
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_type?: string
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          nutritionist_id?: string
          patient_id?: string
          reminder_sent?: boolean | null
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_audit_results: {
        Row: {
          action_taken: string
          audit_run_id: string
          created_at: string
          description: string
          details: Json | null
          finding_type: string
          id: string
          nutritionist_id: string | null
          patient_id: string | null
          severity: string
          source: string
        }
        Insert: {
          action_taken: string
          audit_run_id: string
          created_at?: string
          description: string
          details?: Json | null
          finding_type: string
          id?: string
          nutritionist_id?: string | null
          patient_id?: string | null
          severity: string
          source?: string
        }
        Update: {
          action_taken?: string
          audit_run_id?: string
          created_at?: string
          description?: string
          details?: Json | null
          finding_type?: string
          id?: string
          nutritionist_id?: string | null
          patient_id?: string | null
          severity?: string
          source?: string
        }
        Relationships: []
      }
      patient_automation_state: {
        Row: {
          automation_enabled: boolean | null
          automation_level: string | null
          automation_zone: string
          cluster_type: string | null
          created_at: string | null
          dropout_risk: number | null
          engine_version: string | null
          id: string
          longitudinal_stability: number | null
          patient_id: string
          performance_level: number | null
          physiological_stability: number | null
          prediction_confidence: number | null
          regression_risk: number | null
          updated_at: string | null
        }
        Insert: {
          automation_enabled?: boolean | null
          automation_level?: string | null
          automation_zone?: string
          cluster_type?: string | null
          created_at?: string | null
          dropout_risk?: number | null
          engine_version?: string | null
          id?: string
          longitudinal_stability?: number | null
          patient_id: string
          performance_level?: number | null
          physiological_stability?: number | null
          prediction_confidence?: number | null
          regression_risk?: number | null
          updated_at?: string | null
        }
        Update: {
          automation_enabled?: boolean | null
          automation_level?: string | null
          automation_zone?: string
          cluster_type?: string | null
          created_at?: string | null
          dropout_risk?: number | null
          engine_version?: string | null
          id?: string
          longitudinal_stability?: number | null
          patient_id?: string
          performance_level?: number | null
          physiological_stability?: number | null
          prediction_confidence?: number | null
          regression_risk?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      patient_behavior_memory: {
        Row: {
          adherence_score: number | null
          behavior_key: string
          clinical_relevance_score: number | null
          created_at: string | null
          frequency_score: number | null
          id: string
          last_occurrence: string | null
          patient_id: string
          updated_at: string | null
        }
        Insert: {
          adherence_score?: number | null
          behavior_key: string
          clinical_relevance_score?: number | null
          created_at?: string | null
          frequency_score?: number | null
          id?: string
          last_occurrence?: string | null
          patient_id: string
          updated_at?: string | null
        }
        Update: {
          adherence_score?: number | null
          behavior_key?: string
          clinical_relevance_score?: number | null
          created_at?: string | null
          frequency_score?: number | null
          id?: string
          last_occurrence?: string | null
          patient_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      patient_behavioral_tasks: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          due_date: string | null
          frequency: string
          generated_by: string
          id: string
          objective_context: string | null
          patient_id: string
          phase_context: string | null
          priority: number
          priority_reason: string | null
          source_flag: string | null
          status: string
          strategy_context: string | null
          template_code: string | null
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          frequency?: string
          generated_by?: string
          id?: string
          objective_context?: string | null
          patient_id: string
          phase_context?: string | null
          priority?: number
          priority_reason?: string | null
          source_flag?: string | null
          status?: string
          strategy_context?: string | null
          template_code?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          frequency?: string
          generated_by?: string
          id?: string
          objective_context?: string | null
          patient_id?: string
          phase_context?: string | null
          priority?: number
          priority_reason?: string | null
          source_flag?: string | null
          status?: string
          strategy_context?: string | null
          template_code?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_behavioral_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_body_assessments: {
        Row: {
          abdomen_cm: number | null
          arm_cm: number | null
          assessment_date: string
          bmi: number | null
          body_fat_percent: number | null
          bone_mass_kg: number | null
          calf_cm: number | null
          chest_cm: number | null
          created_at: string | null
          extraction_status: string | null
          fat_mass_kg: number | null
          height_m: number | null
          hip_cm: number | null
          hydration_percent: number | null
          id: string
          lean_mass_kg: number | null
          metabolic_age: number | null
          notes: string | null
          parser_version: string | null
          patient_id: string
          raw_text: string | null
          source_file_name: string | null
          source_file_url: string | null
          tenant_id: string | null
          thigh_cm: number | null
          updated_at: string | null
          visceral_fat_level: number | null
          waist_cm: number | null
          waist_hip_ratio: number | null
          weight_kg: number | null
        }
        Insert: {
          abdomen_cm?: number | null
          arm_cm?: number | null
          assessment_date?: string
          bmi?: number | null
          body_fat_percent?: number | null
          bone_mass_kg?: number | null
          calf_cm?: number | null
          chest_cm?: number | null
          created_at?: string | null
          extraction_status?: string | null
          fat_mass_kg?: number | null
          height_m?: number | null
          hip_cm?: number | null
          hydration_percent?: number | null
          id?: string
          lean_mass_kg?: number | null
          metabolic_age?: number | null
          notes?: string | null
          parser_version?: string | null
          patient_id: string
          raw_text?: string | null
          source_file_name?: string | null
          source_file_url?: string | null
          tenant_id?: string | null
          thigh_cm?: number | null
          updated_at?: string | null
          visceral_fat_level?: number | null
          waist_cm?: number | null
          waist_hip_ratio?: number | null
          weight_kg?: number | null
        }
        Update: {
          abdomen_cm?: number | null
          arm_cm?: number | null
          assessment_date?: string
          bmi?: number | null
          body_fat_percent?: number | null
          bone_mass_kg?: number | null
          calf_cm?: number | null
          chest_cm?: number | null
          created_at?: string | null
          extraction_status?: string | null
          fat_mass_kg?: number | null
          height_m?: number | null
          hip_cm?: number | null
          hydration_percent?: number | null
          id?: string
          lean_mass_kg?: number | null
          metabolic_age?: number | null
          notes?: string | null
          parser_version?: string | null
          patient_id?: string
          raw_text?: string | null
          source_file_name?: string | null
          source_file_url?: string | null
          tenant_id?: string | null
          thigh_cm?: number | null
          updated_at?: string | null
          visceral_fat_level?: number | null
          waist_cm?: number | null
          waist_hip_ratio?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_body_assessments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_body_projection_states: {
        Row: {
          created_at: string
          engine_version: string | null
          estimated_body_fat: number | null
          estimated_lean_mass: number | null
          id: string
          patient_id: string
          projection_confidence: number | null
          projection_date: string
          silhouette_classification: string | null
        }
        Insert: {
          created_at?: string
          engine_version?: string | null
          estimated_body_fat?: number | null
          estimated_lean_mass?: number | null
          id?: string
          patient_id: string
          projection_confidence?: number | null
          projection_date: string
          silhouette_classification?: string | null
        }
        Update: {
          created_at?: string
          engine_version?: string | null
          estimated_body_fat?: number | null
          estimated_lean_mass?: number | null
          id?: string
          patient_id?: string
          projection_confidence?: number | null
          projection_date?: string
          silhouette_classification?: string | null
        }
        Relationships: []
      }
      patient_checkins: {
        Row: {
          created_at: string
          difficulty: string | null
          feedback: string | null
          id: string
          nutri_action: string | null
          nutri_notes: string | null
          nutritionist_id: string
          patient_id: string
          photo_back_url: string | null
          photo_front_url: string | null
          photo_side_url: string | null
          protocol_activated_id: string | null
          reviewed_at: string | null
          status: string
          tenant_id: string | null
          weight: number | null
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          feedback?: string | null
          id?: string
          nutri_action?: string | null
          nutri_notes?: string | null
          nutritionist_id: string
          patient_id: string
          photo_back_url?: string | null
          photo_front_url?: string | null
          photo_side_url?: string | null
          protocol_activated_id?: string | null
          reviewed_at?: string | null
          status?: string
          tenant_id?: string | null
          weight?: number | null
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          feedback?: string | null
          id?: string
          nutri_action?: string | null
          nutri_notes?: string | null
          nutritionist_id?: string
          patient_id?: string
          photo_back_url?: string | null
          photo_front_url?: string | null
          photo_side_url?: string | null
          protocol_activated_id?: string | null
          reviewed_at?: string | null
          status?: string
          tenant_id?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_checkins_protocol_activated_id_fkey"
            columns: ["protocol_activated_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_checkins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_clinical_flags: {
        Row: {
          confidence: number
          created_at: string
          flag_key: string
          id: string
          is_active: boolean
          patient_id: string
          severity: string | null
          source: string
          source_answer_key: string | null
          source_answer_value: Json | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          flag_key: string
          id?: string
          is_active?: boolean
          patient_id: string
          severity?: string | null
          source?: string
          source_answer_key?: string | null
          source_answer_value?: Json | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          confidence?: number
          created_at?: string
          flag_key?: string
          id?: string
          is_active?: boolean
          patient_id?: string
          severity?: string | null
          source?: string
          source_answer_key?: string | null
          source_answer_value?: Json | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_clinical_flags_flag_key_fkey"
            columns: ["flag_key"]
            isOneToOne: false
            referencedRelation: "clinical_flags_catalog"
            referencedColumns: ["flag_key"]
          },
          {
            foreignKeyName: "patient_clinical_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_clinical_learning_memory: {
        Row: {
          active: boolean
          confidence_score: number
          created_at: string
          first_detected_at: string
          id: string
          last_reinforced_at: string
          learned_pattern_code: string
          learned_pattern_description: string | null
          learning_type: string
          outcome_impact_score: number | null
          patient_id: string
          reinforcement_count: number
        }
        Insert: {
          active?: boolean
          confidence_score?: number
          created_at?: string
          first_detected_at?: string
          id?: string
          last_reinforced_at?: string
          learned_pattern_code: string
          learned_pattern_description?: string | null
          learning_type: string
          outcome_impact_score?: number | null
          patient_id: string
          reinforcement_count?: number
        }
        Update: {
          active?: boolean
          confidence_score?: number
          created_at?: string
          first_detected_at?: string
          id?: string
          last_reinforced_at?: string
          learned_pattern_code?: string
          learned_pattern_description?: string | null
          learning_type?: string
          outcome_impact_score?: number | null
          patient_id?: string
          reinforcement_count?: number
        }
        Relationships: []
      }
      patient_clinical_learning_profile: {
        Row: {
          best_adherence_days: Json | null
          created_at: string | null
          effective_strategies: Json | null
          emotional_patterns: Json | null
          failed_strategies: Json | null
          id: string
          last_updated_at: string | null
          learning_version: number | null
          metabolic_response_type: string | null
          optimal_meal_times: Json | null
          patient_id: string
          worst_adherence_days: Json | null
        }
        Insert: {
          best_adherence_days?: Json | null
          created_at?: string | null
          effective_strategies?: Json | null
          emotional_patterns?: Json | null
          failed_strategies?: Json | null
          id?: string
          last_updated_at?: string | null
          learning_version?: number | null
          metabolic_response_type?: string | null
          optimal_meal_times?: Json | null
          patient_id: string
          worst_adherence_days?: Json | null
        }
        Update: {
          best_adherence_days?: Json | null
          created_at?: string | null
          effective_strategies?: Json | null
          emotional_patterns?: Json | null
          failed_strategies?: Json | null
          id?: string
          last_updated_at?: string | null
          learning_version?: number | null
          metabolic_response_type?: string | null
          optimal_meal_times?: Json | null
          patient_id?: string
          worst_adherence_days?: Json | null
        }
        Relationships: []
      }
      patient_clinical_messages: {
        Row: {
          body: string
          channel: string
          created_at: string
          generated_by: string
          id: string
          message_code: string | null
          objective_context: string | null
          patient_id: string
          phase_context: string | null
          priority: number
          priority_reason: string | null
          source_flag: string | null
          status: string
          strategy_context: string | null
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          generated_by?: string
          id?: string
          message_code?: string | null
          objective_context?: string | null
          patient_id: string
          phase_context?: string | null
          priority?: number
          priority_reason?: string | null
          source_flag?: string | null
          status?: string
          strategy_context?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          generated_by?: string
          id?: string
          message_code?: string | null
          objective_context?: string | null
          patient_id?: string
          phase_context?: string | null
          priority?: number
          priority_reason?: string | null
          source_flag?: string | null
          status?: string
          strategy_context?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_clinical_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_clinical_milestones: {
        Row: {
          actions_executed: Json | null
          adherence_score: number | null
          alerts_generated: number | null
          checklist_completion_rate: number | null
          classification: string | null
          created_at: string
          days_since_last_checkin: number | null
          dropout_risk_score: number | null
          engagement_index: number | null
          engine_version: string | null
          evaluated_at: string | null
          id: string
          lifecycle_state_after: string | null
          lifecycle_state_before: string | null
          login_frequency: number | null
          milestone_due_at: string
          milestone_key: string
          patient_id: string
          plan_delivered_at: string
          plan_id: string | null
          risk_level: string | null
          status: string
          weight_delta: number | null
        }
        Insert: {
          actions_executed?: Json | null
          adherence_score?: number | null
          alerts_generated?: number | null
          checklist_completion_rate?: number | null
          classification?: string | null
          created_at?: string
          days_since_last_checkin?: number | null
          dropout_risk_score?: number | null
          engagement_index?: number | null
          engine_version?: string | null
          evaluated_at?: string | null
          id?: string
          lifecycle_state_after?: string | null
          lifecycle_state_before?: string | null
          login_frequency?: number | null
          milestone_due_at: string
          milestone_key: string
          patient_id: string
          plan_delivered_at: string
          plan_id?: string | null
          risk_level?: string | null
          status?: string
          weight_delta?: number | null
        }
        Update: {
          actions_executed?: Json | null
          adherence_score?: number | null
          alerts_generated?: number | null
          checklist_completion_rate?: number | null
          classification?: string | null
          created_at?: string
          days_since_last_checkin?: number | null
          dropout_risk_score?: number | null
          engagement_index?: number | null
          engine_version?: string | null
          evaluated_at?: string | null
          id?: string
          lifecycle_state_after?: string | null
          lifecycle_state_before?: string | null
          login_frequency?: number | null
          milestone_due_at?: string
          milestone_key?: string
          patient_id?: string
          plan_delivered_at?: string
          plan_id?: string | null
          risk_level?: string | null
          status?: string
          weight_delta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_clinical_milestones_milestone_key_fkey"
            columns: ["milestone_key"]
            isOneToOne: false
            referencedRelation: "clinical_milestone_definitions"
            referencedColumns: ["milestone_key"]
          },
        ]
      }
      patient_clinical_priority_state: {
        Row: {
          cluster_risk_component: number | null
          dropout_risk_component: number | null
          engine_version: string | null
          id: string
          last_calculated_at: string | null
          last_professional_contact_at: string | null
          main_priority_reason: string | null
          nutritionist_id: string
          patient_id: string
          plan_efficacy_component: number | null
          priority_level: string | null
          priority_score: number | null
          risk_score_component: number | null
          therapeutic_failure_component: number | null
          time_without_intervention_component: number | null
        }
        Insert: {
          cluster_risk_component?: number | null
          dropout_risk_component?: number | null
          engine_version?: string | null
          id?: string
          last_calculated_at?: string | null
          last_professional_contact_at?: string | null
          main_priority_reason?: string | null
          nutritionist_id: string
          patient_id: string
          plan_efficacy_component?: number | null
          priority_level?: string | null
          priority_score?: number | null
          risk_score_component?: number | null
          therapeutic_failure_component?: number | null
          time_without_intervention_component?: number | null
        }
        Update: {
          cluster_risk_component?: number | null
          dropout_risk_component?: number | null
          engine_version?: string | null
          id?: string
          last_calculated_at?: string | null
          last_professional_contact_at?: string | null
          main_priority_reason?: string | null
          nutritionist_id?: string
          patient_id?: string
          plan_efficacy_component?: number | null
          priority_level?: string | null
          priority_score?: number | null
          risk_score_component?: number | null
          therapeutic_failure_component?: number | null
          time_without_intervention_component?: number | null
        }
        Relationships: []
      }
      patient_clinical_snapshots: {
        Row: {
          active_alerts_count: number | null
          adherence_momentum: string | null
          adherence_score: number | null
          caloric_response_status: string | null
          calorie_avg: number | null
          clinical_risk_level: string | null
          cluster_confidence: string | null
          created_at: string | null
          engagement_index: number | null
          engine_version: string | null
          id: string
          metabolic_cluster: string | null
          metadata: Json | null
          patient_id: string
          risk_score: number | null
          snapshot_date: string
          stagnation_risk_level: string | null
          therapeutic_effectiveness: string | null
          weight: number | null
          weight_trend_status: string | null
          weight_velocity: number | null
        }
        Insert: {
          active_alerts_count?: number | null
          adherence_momentum?: string | null
          adherence_score?: number | null
          caloric_response_status?: string | null
          calorie_avg?: number | null
          clinical_risk_level?: string | null
          cluster_confidence?: string | null
          created_at?: string | null
          engagement_index?: number | null
          engine_version?: string | null
          id?: string
          metabolic_cluster?: string | null
          metadata?: Json | null
          patient_id: string
          risk_score?: number | null
          snapshot_date?: string
          stagnation_risk_level?: string | null
          therapeutic_effectiveness?: string | null
          weight?: number | null
          weight_trend_status?: string | null
          weight_velocity?: number | null
        }
        Update: {
          active_alerts_count?: number | null
          adherence_momentum?: string | null
          adherence_score?: number | null
          caloric_response_status?: string | null
          calorie_avg?: number | null
          clinical_risk_level?: string | null
          cluster_confidence?: string | null
          created_at?: string | null
          engagement_index?: number | null
          engine_version?: string | null
          id?: string
          metabolic_cluster?: string | null
          metadata?: Json | null
          patient_id?: string
          risk_score?: number | null
          snapshot_date?: string
          stagnation_risk_level?: string | null
          therapeutic_effectiveness?: string | null
          weight?: number | null
          weight_trend_status?: string | null
          weight_velocity?: number | null
        }
        Relationships: []
      }
      patient_clinical_state: {
        Row: {
          adherence_avg_28d: number | null
          adherence_score: number | null
          analysis_window_days: number | null
          behavioral_score: number | null
          calculation_version: string | null
          caloric_response_status: string
          calorie_avg_real: number | null
          calorie_target: number | null
          cluster_changed_at: string | null
          cluster_data_points: number | null
          cluster_engine_version: string | null
          cluster_min_days_met: boolean | null
          cluster_strategy: Json | null
          composite_score: number | null
          data_points_used: number | null
          engagement_avg_28d: number | null
          engagement_score: number | null
          id: string
          metabolic_cluster: string | null
          metabolic_cluster_confidence: string | null
          metabolic_feature_vector: Json | null
          metabolic_score: number | null
          patient_id: string
          plan_active_days: number | null
          risk_score: number | null
          stagnation_risk_level: string
          tenant_id: string | null
          updated_at: string | null
          weight_velocity_pct: number | null
          zone: string | null
        }
        Insert: {
          adherence_avg_28d?: number | null
          adherence_score?: number | null
          analysis_window_days?: number | null
          behavioral_score?: number | null
          calculation_version?: string | null
          caloric_response_status?: string
          calorie_avg_real?: number | null
          calorie_target?: number | null
          cluster_changed_at?: string | null
          cluster_data_points?: number | null
          cluster_engine_version?: string | null
          cluster_min_days_met?: boolean | null
          cluster_strategy?: Json | null
          composite_score?: number | null
          data_points_used?: number | null
          engagement_avg_28d?: number | null
          engagement_score?: number | null
          id?: string
          metabolic_cluster?: string | null
          metabolic_cluster_confidence?: string | null
          metabolic_feature_vector?: Json | null
          metabolic_score?: number | null
          patient_id: string
          plan_active_days?: number | null
          risk_score?: number | null
          stagnation_risk_level?: string
          tenant_id?: string | null
          updated_at?: string | null
          weight_velocity_pct?: number | null
          zone?: string | null
        }
        Update: {
          adherence_avg_28d?: number | null
          adherence_score?: number | null
          analysis_window_days?: number | null
          behavioral_score?: number | null
          calculation_version?: string | null
          caloric_response_status?: string
          calorie_avg_real?: number | null
          calorie_target?: number | null
          cluster_changed_at?: string | null
          cluster_data_points?: number | null
          cluster_engine_version?: string | null
          cluster_min_days_met?: boolean | null
          cluster_strategy?: Json | null
          composite_score?: number | null
          data_points_used?: number | null
          engagement_avg_28d?: number | null
          engagement_score?: number | null
          id?: string
          metabolic_cluster?: string | null
          metabolic_cluster_confidence?: string | null
          metabolic_feature_vector?: Json | null
          metabolic_score?: number | null
          patient_id?: string
          plan_active_days?: number | null
          risk_score?: number | null
          stagnation_risk_level?: string
          tenant_id?: string | null
          updated_at?: string | null
          weight_velocity_pct?: number | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_clinical_state_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_creation_log: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          metadata: Json | null
          nutritionist_id: string | null
          patient_id: string
          source: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          nutritionist_id?: string | null
          patient_id: string
          source: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          nutritionist_id?: string | null
          patient_id?: string
          source?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      patient_daily_adherence: {
        Row: {
          checkin_score: number | null
          checklist_score: number | null
          created_at: string | null
          date: string
          id: string
          meals_score: number | null
          patient_id: string
          plan_score: number | null
          streak_days: number | null
          streak_score: number | null
          tenant_id: string | null
          total_score: number | null
        }
        Insert: {
          checkin_score?: number | null
          checklist_score?: number | null
          created_at?: string | null
          date?: string
          id?: string
          meals_score?: number | null
          patient_id: string
          plan_score?: number | null
          streak_days?: number | null
          streak_score?: number | null
          tenant_id?: string | null
          total_score?: number | null
        }
        Update: {
          checkin_score?: number | null
          checklist_score?: number | null
          created_at?: string | null
          date?: string
          id?: string
          meals_score?: number | null
          patient_id?: string
          plan_score?: number | null
          streak_days?: number | null
          streak_score?: number | null
          tenant_id?: string | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_daily_adherence_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_daily_focus: {
        Row: {
          completed_at: string | null
          focus_action_label: string | null
          focus_action_route: string | null
          focus_color: string | null
          focus_description: string | null
          focus_priority: number | null
          focus_reference_id: string | null
          focus_title: string
          focus_type: string
          generated_at: string | null
          id: string
          is_completed: boolean | null
          patient_id: string
          tenant_id: string | null
          valid_until: string | null
        }
        Insert: {
          completed_at?: string | null
          focus_action_label?: string | null
          focus_action_route?: string | null
          focus_color?: string | null
          focus_description?: string | null
          focus_priority?: number | null
          focus_reference_id?: string | null
          focus_title: string
          focus_type: string
          generated_at?: string | null
          id?: string
          is_completed?: boolean | null
          patient_id: string
          tenant_id?: string | null
          valid_until?: string | null
        }
        Update: {
          completed_at?: string | null
          focus_action_label?: string | null
          focus_action_route?: string | null
          focus_color?: string | null
          focus_description?: string | null
          focus_priority?: number | null
          focus_reference_id?: string | null
          focus_title?: string
          focus_type?: string
          generated_at?: string | null
          id?: string
          is_completed?: boolean | null
          patient_id?: string
          tenant_id?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_daily_focus_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_data_audit_log: {
        Row: {
          action_taken: string
          details: Json | null
          id: string
          issue_type: string
          patient_id: string | null
          run_at: string
          status: string
        }
        Insert: {
          action_taken: string
          details?: Json | null
          id?: string
          issue_type: string
          patient_id?: string | null
          run_at?: string
          status?: string
        }
        Update: {
          action_taken?: string
          details?: Json | null
          id?: string
          issue_type?: string
          patient_id?: string | null
          run_at?: string
          status?: string
        }
        Relationships: []
      }
      patient_documents: {
        Row: {
          assessment_id: string | null
          created_at: string
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          meal_plan_id: string | null
          mime_type: string | null
          nutritionist_id: string
          patient_id: string
          tenant_id: string | null
          title: string
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          document_type?: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          meal_plan_id?: string | null
          mime_type?: string | null
          nutritionist_id: string
          patient_id: string
          tenant_id?: string | null
          title: string
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          meal_plan_id?: string | null
          mime_type?: string | null
          nutritionist_id?: string
          patient_id?: string
          tenant_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_documents_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "physical_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_resolved_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "v_plan_visibility_diagnostics"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "patient_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_favorite_recipes: {
        Row: {
          created_at: string
          id: string
          patient_id: string
          recipe_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          patient_id: string
          recipe_id: string
        }
        Update: {
          created_at?: string
          id?: string
          patient_id?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_favorite_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_human_performance_state: {
        Row: {
          consistency_score: number | null
          engine_version: string | null
          id: string
          metabolic_score: number | null
          metadata: Json | null
          nutrition_score: number | null
          overall_performance_score: number | null
          patient_id: string
          performance_level: string | null
          performance_profile: string | null
          recommended_focus: string | null
          recovery_score: number | null
          stress_load_score: number | null
          training_score: number | null
          updated_at: string | null
        }
        Insert: {
          consistency_score?: number | null
          engine_version?: string | null
          id?: string
          metabolic_score?: number | null
          metadata?: Json | null
          nutrition_score?: number | null
          overall_performance_score?: number | null
          patient_id: string
          performance_level?: string | null
          performance_profile?: string | null
          recommended_focus?: string | null
          recovery_score?: number | null
          stress_load_score?: number | null
          training_score?: number | null
          updated_at?: string | null
        }
        Update: {
          consistency_score?: number | null
          engine_version?: string | null
          id?: string
          metabolic_score?: number | null
          metadata?: Json | null
          nutrition_score?: number | null
          overall_performance_score?: number | null
          patient_id?: string
          performance_level?: string | null
          performance_profile?: string | null
          recommended_focus?: string | null
          recovery_score?: number | null
          stress_load_score?: number | null
          training_score?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      patient_journey_events: {
        Row: {
          created_at: string | null
          description: string | null
          event_type: string
          icon: string | null
          id: string
          is_highlight: boolean | null
          metadata: Json | null
          patient_id: string
          tenant_id: string | null
          title: string
          xp_earned: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_type: string
          icon?: string | null
          id?: string
          is_highlight?: boolean | null
          metadata?: Json | null
          patient_id: string
          tenant_id?: string | null
          title: string
          xp_earned?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_type?: string
          icon?: string | null
          id?: string
          is_highlight?: boolean | null
          metadata?: Json | null
          patient_id?: string
          tenant_id?: string | null
          title?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_journey_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_journey_stories: {
        Row: {
          created_at: string
          current_phase: string | null
          generated_by: string | null
          id: string
          metrics_snapshot: Json | null
          narrative_closing: string | null
          narrative_diagnosis: string | null
          narrative_opening: string | null
          patient_id: string
          projections: Json | null
          risk_level: string | null
          status: string | null
          story_data: Json
          updated_at: string
          weight_trend: string | null
        }
        Insert: {
          created_at?: string
          current_phase?: string | null
          generated_by?: string | null
          id?: string
          metrics_snapshot?: Json | null
          narrative_closing?: string | null
          narrative_diagnosis?: string | null
          narrative_opening?: string | null
          patient_id: string
          projections?: Json | null
          risk_level?: string | null
          status?: string | null
          story_data?: Json
          updated_at?: string
          weight_trend?: string | null
        }
        Update: {
          created_at?: string
          current_phase?: string | null
          generated_by?: string | null
          id?: string
          metrics_snapshot?: Json | null
          narrative_closing?: string | null
          narrative_diagnosis?: string | null
          narrative_opening?: string | null
          patient_id?: string
          projections?: Json | null
          risk_level?: string | null
          status?: string | null
          story_data?: Json
          updated_at?: string
          weight_trend?: string | null
        }
        Relationships: []
      }
      patient_lab_results: {
        Row: {
          created_at: string | null
          exam_date: string
          id: string
          interpreted_flags_json: Json | null
          patient_id: string
          raw_text: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_file_name: string | null
          source_file_url: string | null
          status: string | null
          structured_json: Json | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          exam_date?: string
          id?: string
          interpreted_flags_json?: Json | null
          patient_id: string
          raw_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_file_name?: string | null
          source_file_url?: string | null
          status?: string | null
          structured_json?: Json | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          exam_date?: string
          id?: string
          interpreted_flags_json?: Json | null
          patient_id?: string
          raw_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_file_name?: string | null
          source_file_url?: string | null
          status?: string | null
          structured_json?: Json | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_lab_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_lifecycle_audit: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          metadata: Json | null
          new_state: string
          patient_id: string
          previous_state: string | null
          trigger_event: string
          trigger_source: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          new_state: string
          patient_id: string
          previous_state?: string | null
          trigger_event: string
          trigger_source?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json | null
          new_state?: string
          patient_id?: string
          previous_state?: string | null
          trigger_event?: string
          trigger_source?: string | null
        }
        Relationships: []
      }
      patient_lifecycle_states: {
        Row: {
          adherence_score: number | null
          computed_at: string
          has_active_plan: boolean
          has_clinical_alert: boolean
          has_pending_onboarding: boolean
          has_retention_risk: boolean
          is_onboarding_blocked: boolean | null
          last_checkin_at: string | null
          last_plan_delivery_at: string | null
          lifecycle_state: Database["public"]["Enums"]["patient_lifecycle_status"]
          next_recommended_action: string | null
          onboarding_block_reason: string | null
          patient_id: string
          risk_score: number | null
          updated_at: string
        }
        Insert: {
          adherence_score?: number | null
          computed_at?: string
          has_active_plan?: boolean
          has_clinical_alert?: boolean
          has_pending_onboarding?: boolean
          has_retention_risk?: boolean
          is_onboarding_blocked?: boolean | null
          last_checkin_at?: string | null
          last_plan_delivery_at?: string | null
          lifecycle_state?: Database["public"]["Enums"]["patient_lifecycle_status"]
          next_recommended_action?: string | null
          onboarding_block_reason?: string | null
          patient_id: string
          risk_score?: number | null
          updated_at?: string
        }
        Update: {
          adherence_score?: number | null
          computed_at?: string
          has_active_plan?: boolean
          has_clinical_alert?: boolean
          has_pending_onboarding?: boolean
          has_retention_risk?: boolean
          is_onboarding_blocked?: boolean | null
          last_checkin_at?: string | null
          last_plan_delivery_at?: string | null
          lifecycle_state?: Database["public"]["Enums"]["patient_lifecycle_status"]
          next_recommended_action?: string | null
          onboarding_block_reason?: string | null
          patient_id?: string
          risk_score?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      patient_meal_feedback: {
        Row: {
          comment: string | null
          created_at: string
          feedback_type: string
          id: string
          meal_plan_id: string | null
          meal_plan_item_id: string | null
          patient_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          meal_plan_id?: string | null
          meal_plan_item_id?: string | null
          patient_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          meal_plan_id?: string | null
          meal_plan_item_id?: string | null
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_meal_feedback_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_resolved_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_meal_feedback_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_meal_feedback_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "v_plan_visibility_diagnostics"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      patient_meal_substitutions: {
        Row: {
          created_at: string
          date: string
          id: string
          meal_plan_id: string
          meal_plan_item_id: string
          original_calories: number | null
          original_food: string
          original_protein: number | null
          patient_id: string
          substituted_calories: number | null
          substituted_food: string
          substituted_protein: number | null
          substitution_category: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          meal_plan_id: string
          meal_plan_item_id: string
          original_calories?: number | null
          original_food: string
          original_protein?: number | null
          patient_id: string
          substituted_calories?: number | null
          substituted_food: string
          substituted_protein?: number | null
          substitution_category: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          meal_plan_id?: string
          meal_plan_item_id?: string
          original_calories?: number | null
          original_food?: string
          original_protein?: number | null
          patient_id?: string
          substituted_calories?: number | null
          substituted_food?: string
          substituted_protein?: number | null
          substitution_category?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_meal_substitutions_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_resolved_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_meal_substitutions_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_meal_substitutions_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "v_plan_visibility_diagnostics"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "patient_meal_substitutions_meal_plan_item_id_fkey"
            columns: ["meal_plan_item_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_metabolic_twin: {
        Row: {
          adaptive_resistance_score: number | null
          created_at: string | null
          fat_loss_response_index: number | null
          id: string
          lean_mass_preservation_index: number | null
          metabolic_efficiency_score: number | null
          metabolic_flexibility_index: number | null
          model_confidence: number | null
          model_inputs: Json | null
          patient_id: string
          predicted_plateau_weeks: number | null
          regain_risk_score: number | null
          response_classification: string | null
          twin_model_version: string | null
          updated_at: string | null
        }
        Insert: {
          adaptive_resistance_score?: number | null
          created_at?: string | null
          fat_loss_response_index?: number | null
          id?: string
          lean_mass_preservation_index?: number | null
          metabolic_efficiency_score?: number | null
          metabolic_flexibility_index?: number | null
          model_confidence?: number | null
          model_inputs?: Json | null
          patient_id: string
          predicted_plateau_weeks?: number | null
          regain_risk_score?: number | null
          response_classification?: string | null
          twin_model_version?: string | null
          updated_at?: string | null
        }
        Update: {
          adaptive_resistance_score?: number | null
          created_at?: string | null
          fat_loss_response_index?: number | null
          id?: string
          lean_mass_preservation_index?: number | null
          metabolic_efficiency_score?: number | null
          metabolic_flexibility_index?: number | null
          model_confidence?: number | null
          model_inputs?: Json | null
          patient_id?: string
          predicted_plateau_weeks?: number | null
          regain_risk_score?: number | null
          response_classification?: string | null
          twin_model_version?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      patient_missions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_value: number | null
          description: string | null
          duration_hours: number | null
          expires_at: string | null
          icon: string | null
          id: string
          is_global: boolean | null
          mission_type: string
          nutritionist_id: string | null
          patient_id: string
          started_at: string | null
          status: string | null
          target_value: number
          tenant_id: string | null
          title: string
          xp_reward: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          duration_hours?: number | null
          expires_at?: string | null
          icon?: string | null
          id?: string
          is_global?: boolean | null
          mission_type: string
          nutritionist_id?: string | null
          patient_id: string
          started_at?: string | null
          status?: string | null
          target_value?: number
          tenant_id?: string | null
          title: string
          xp_reward?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          duration_hours?: number | null
          expires_at?: string | null
          icon?: string | null
          id?: string
          is_global?: boolean | null
          mission_type?: string
          nutritionist_id?: string | null
          patient_id?: string
          started_at?: string | null
          status?: string | null
          target_value?: number
          tenant_id?: string | null
          title?: string
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_missions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_nutrition_benchmarks: {
        Row: {
          adherence_percentile: number | null
          benchmark_classification: string
          cohort_id: string | null
          engine_version: string
          id: string
          patient_id: string
          performance_percentile: number | null
          risk_percentile: number | null
          updated_at: string
          weight_response_percentile: number | null
        }
        Insert: {
          adherence_percentile?: number | null
          benchmark_classification?: string
          cohort_id?: string | null
          engine_version?: string
          id?: string
          patient_id: string
          performance_percentile?: number | null
          risk_percentile?: number | null
          updated_at?: string
          weight_response_percentile?: number | null
        }
        Update: {
          adherence_percentile?: number | null
          benchmark_classification?: string
          cohort_id?: string | null
          engine_version?: string
          id?: string
          patient_id?: string
          performance_percentile?: number | null
          risk_percentile?: number | null
          updated_at?: string
          weight_response_percentile?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_nutrition_benchmarks_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "population_nutrition_cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_password_resets: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          patient_id: string
          professional_id: string
          reason: string | null
          reset_method: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          patient_id: string
          professional_id: string
          reason?: string | null
          reset_method?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          patient_id?: string
          professional_id?: string
          reason?: string | null
          reset_method?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      patient_performance_snapshots: {
        Row: {
          consistency_score: number | null
          created_at: string | null
          engine_version: string | null
          id: string
          metabolic_score: number | null
          nutrition_score: number | null
          overall_performance_score: number | null
          patient_id: string
          performance_level: string | null
          performance_profile: string | null
          recovery_score: number | null
          snapshot_date: string
          stress_load_score: number | null
          training_score: number | null
        }
        Insert: {
          consistency_score?: number | null
          created_at?: string | null
          engine_version?: string | null
          id?: string
          metabolic_score?: number | null
          nutrition_score?: number | null
          overall_performance_score?: number | null
          patient_id: string
          performance_level?: string | null
          performance_profile?: string | null
          recovery_score?: number | null
          snapshot_date?: string
          stress_load_score?: number | null
          training_score?: number | null
        }
        Update: {
          consistency_score?: number | null
          created_at?: string | null
          engine_version?: string | null
          id?: string
          metabolic_score?: number | null
          nutrition_score?: number | null
          overall_performance_score?: number | null
          patient_id?: string
          performance_level?: string | null
          performance_profile?: string | null
          recovery_score?: number | null
          snapshot_date?: string
          stress_load_score?: number | null
          training_score?: number | null
        }
        Relationships: []
      }
      patient_physiological_signals: {
        Row: {
          active_calories: number | null
          body_temperature_delta: number | null
          created_at: string | null
          heart_rate_variability: number | null
          id: string
          patient_id: string
          readiness_score: number | null
          resting_heart_rate: number | null
          signal_date: string
          sleep_duration_minutes: number | null
          sleep_quality_score: number | null
          source_device: string | null
          steps: number | null
          stress_index: number | null
          training_load_score: number | null
        }
        Insert: {
          active_calories?: number | null
          body_temperature_delta?: number | null
          created_at?: string | null
          heart_rate_variability?: number | null
          id?: string
          patient_id: string
          readiness_score?: number | null
          resting_heart_rate?: number | null
          signal_date?: string
          sleep_duration_minutes?: number | null
          sleep_quality_score?: number | null
          source_device?: string | null
          steps?: number | null
          stress_index?: number | null
          training_load_score?: number | null
        }
        Update: {
          active_calories?: number | null
          body_temperature_delta?: number | null
          created_at?: string | null
          heart_rate_variability?: number | null
          id?: string
          patient_id?: string
          readiness_score?: number | null
          resting_heart_rate?: number | null
          signal_date?: string
          sleep_duration_minutes?: number | null
          sleep_quality_score?: number | null
          source_device?: string | null
          steps?: number | null
          stress_index?: number | null
          training_load_score?: number | null
        }
        Relationships: []
      }
      patient_physiology_snapshots: {
        Row: {
          created_at: string | null
          engine_version: string | null
          has_physiological_data: boolean | null
          hrv_trend: string | null
          id: string
          metadata: Json | null
          patient_id: string
          physiological_risk_level: string | null
          psi: number | null
          resting_hr_trend: string | null
          rpi: number | null
          sleep_trend: string | null
          snapshot_date: string
          training_load_balance: string | null
        }
        Insert: {
          created_at?: string | null
          engine_version?: string | null
          has_physiological_data?: boolean | null
          hrv_trend?: string | null
          id?: string
          metadata?: Json | null
          patient_id: string
          physiological_risk_level?: string | null
          psi?: number | null
          resting_hr_trend?: string | null
          rpi?: number | null
          sleep_trend?: string | null
          snapshot_date?: string
          training_load_balance?: string | null
        }
        Update: {
          created_at?: string | null
          engine_version?: string | null
          has_physiological_data?: boolean | null
          hrv_trend?: string | null
          id?: string
          metadata?: Json | null
          patient_id?: string
          physiological_risk_level?: string | null
          psi?: number | null
          resting_hr_trend?: string | null
          rpi?: number | null
          sleep_trend?: string | null
          snapshot_date?: string
          training_load_balance?: string | null
        }
        Relationships: []
      }
      patient_phytotherapy_protocols: {
        Row: {
          clinical_notes: string | null
          contraindications: string | null
          created_at: string
          dosage: string
          duration: string
          ended_at: string | null
          id: string
          is_active: boolean
          name: string
          nutritionist_id: string
          objective: string
          patient_id: string
          patient_instructions: string | null
          phytotherapics: Json
          schedule: string
          started_at: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          clinical_notes?: string | null
          contraindications?: string | null
          created_at?: string
          dosage?: string
          duration?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          nutritionist_id: string
          objective?: string
          patient_id: string
          patient_instructions?: string | null
          phytotherapics?: Json
          schedule?: string
          started_at?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          clinical_notes?: string | null
          contraindications?: string | null
          created_at?: string
          dosage?: string
          duration?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          nutritionist_id?: string
          objective?: string
          patient_id?: string
          patient_instructions?: string | null
          phytotherapics?: Json
          schedule?: string
          started_at?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_phytotherapy_protocols_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "phytotherapy_protocol_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_plan_features: {
        Row: {
          created_at: string
          enabled: boolean
          feature_key: string
          id: string
          plan_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          feature_key: string
          id?: string
          plan_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_key?: string
          id?: string
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "prestige_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_plateau_predictions: {
        Row: {
          actual_plateau_week: number | null
          created_at: string | null
          id: string
          patient_id: string
          predicted_plateau_intensity: string | null
          predicted_plateau_start_week: number | null
          prediction_confidence: number | null
          prediction_model_version: string | null
          preventive_recommendation: string | null
          was_accurate: boolean | null
        }
        Insert: {
          actual_plateau_week?: number | null
          created_at?: string | null
          id?: string
          patient_id: string
          predicted_plateau_intensity?: string | null
          predicted_plateau_start_week?: number | null
          prediction_confidence?: number | null
          prediction_model_version?: string | null
          preventive_recommendation?: string | null
          was_accurate?: boolean | null
        }
        Update: {
          actual_plateau_week?: number | null
          created_at?: string | null
          id?: string
          patient_id?: string
          predicted_plateau_intensity?: string | null
          predicted_plateau_start_week?: number | null
          prediction_confidence?: number | null
          prediction_model_version?: string | null
          preventive_recommendation?: string | null
          was_accurate?: boolean | null
        }
        Relationships: []
      }
      patient_points: {
        Row: {
          action_key: string
          earned_at: string
          id: string
          metadata: Json | null
          patient_id: string
          period_day: string | null
          period_month: string | null
          period_week: string | null
          period_year: number | null
          points: number
          professional_id: string | null
          source_id: string | null
          source_type: string | null
          tenant_id: string | null
        }
        Insert: {
          action_key: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          patient_id: string
          period_day?: string | null
          period_month?: string | null
          period_week?: string | null
          period_year?: number | null
          points: number
          professional_id?: string | null
          source_id?: string | null
          source_type?: string | null
          tenant_id?: string | null
        }
        Update: {
          action_key?: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          patient_id?: string
          period_day?: string | null
          period_month?: string | null
          period_week?: string | null
          period_year?: number | null
          points?: number
          professional_id?: string | null
          source_id?: string | null
          source_type?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_points_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_points_archive: {
        Row: {
          action_key: string
          archived_at: string
          archived_by: string | null
          earned_at: string
          id: string
          metadata: Json | null
          original_id: string | null
          patient_id: string
          points: number
          professional_id: string | null
          source_id: string | null
          source_type: string | null
        }
        Insert: {
          action_key: string
          archived_at?: string
          archived_by?: string | null
          earned_at: string
          id?: string
          metadata?: Json | null
          original_id?: string | null
          patient_id: string
          points: number
          professional_id?: string | null
          source_id?: string | null
          source_type?: string | null
        }
        Update: {
          action_key?: string
          archived_at?: string
          archived_by?: string | null
          earned_at?: string
          id?: string
          metadata?: Json | null
          original_id?: string | null
          patient_id?: string
          points?: number
          professional_id?: string | null
          source_id?: string | null
          source_type?: string | null
        }
        Relationships: []
      }
      patient_population_benchmark: {
        Row: {
          benchmark_classification: string | null
          cohort_id: string | null
          engine_version: string | null
          id: string
          patient_id: string
          relative_adherence: number | null
          relative_performance_score: number | null
          relative_weight_response: number | null
          updated_at: string | null
        }
        Insert: {
          benchmark_classification?: string | null
          cohort_id?: string | null
          engine_version?: string | null
          id?: string
          patient_id: string
          relative_adherence?: number | null
          relative_performance_score?: number | null
          relative_weight_response?: number | null
          updated_at?: string | null
        }
        Update: {
          benchmark_classification?: string | null
          cohort_id?: string | null
          engine_version?: string | null
          id?: string
          patient_id?: string
          relative_adherence?: number | null
          relative_performance_score?: number | null
          relative_weight_response?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_population_benchmark_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "population_cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_predicted_outcomes: {
        Row: {
          calculation_metadata: Json | null
          confidence_classification: string
          created_at: string
          dropout_classification: string
          engine_version: string
          goal_classification: string
          id: string
          main_prediction_driver: string
          patient_id: string
          predicted_dropout_probability: number
          predicted_goal_achievement_probability: number
          predicted_regression_probability: number
          predicted_stagnation_probability: number
          predicted_time_to_next_intervention_days: number
          prediction_confidence_score: number
          prediction_window_days: number
          regression_classification: string
          stagnation_classification: string
          updated_at: string
        }
        Insert: {
          calculation_metadata?: Json | null
          confidence_classification?: string
          created_at?: string
          dropout_classification?: string
          engine_version?: string
          goal_classification?: string
          id?: string
          main_prediction_driver?: string
          patient_id: string
          predicted_dropout_probability?: number
          predicted_goal_achievement_probability?: number
          predicted_regression_probability?: number
          predicted_stagnation_probability?: number
          predicted_time_to_next_intervention_days?: number
          prediction_confidence_score?: number
          prediction_window_days?: number
          regression_classification?: string
          stagnation_classification?: string
          updated_at?: string
        }
        Update: {
          calculation_metadata?: Json | null
          confidence_classification?: string
          created_at?: string
          dropout_classification?: string
          engine_version?: string
          goal_classification?: string
          id?: string
          main_prediction_driver?: string
          patient_id?: string
          predicted_dropout_probability?: number
          predicted_goal_achievement_probability?: number
          predicted_regression_probability?: number
          predicted_stagnation_probability?: number
          predicted_time_to_next_intervention_days?: number
          prediction_confidence_score?: number
          prediction_window_days?: number
          regression_classification?: string
          stagnation_classification?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_prestige: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          is_active: boolean
          patient_id: string
          plan_id: string
          tenant_id: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          patient_id: string
          plan_id: string
          tenant_id?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          patient_id?: string
          plan_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_prestige_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "prestige_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_prestige_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_professional_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          link_status: string
          patient_id: string
          permissions: Json | null
          professional_id: string
          professional_role: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          link_status?: string
          patient_id: string
          permissions?: Json | null
          professional_id: string
          professional_role?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          link_status?: string
          patient_id?: string
          permissions?: Json | null
          professional_id?: string
          professional_role?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_professional_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_project_history: {
        Row: {
          approved_by: string | null
          created_at: string
          ended_at: string | null
          id: string
          notes: string | null
          patient_id: string
          program_id: string | null
          project_code: string
          started_at: string | null
          status: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          program_id?: string | null
          project_code: string
          started_at?: string | null
          status?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          program_id?: string | null
          project_code?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_project_history_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_protocol_history: {
        Row: {
          changed_by: string | null
          created_at: string
          end_reason: string | null
          ended_at: string | null
          id: string
          metadata: Json | null
          nutritionist_id: string | null
          patient_id: string
          phases_completed: Json | null
          protocol_id: string
          protocol_key: string | null
          started_at: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          nutritionist_id?: string | null
          patient_id: string
          phases_completed?: Json | null
          protocol_id: string
          protocol_key?: string | null
          started_at: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          nutritionist_id?: string | null
          patient_id?: string
          phases_completed?: Json | null
          protocol_id?: string
          protocol_key?: string | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_protocol_history_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_protocols: {
        Row: {
          created_at: string
          current_phase: string | null
          end_date: string | null
          id: string
          last_manual_intervention_at: string | null
          last_manual_intervention_by: string | null
          last_protocol_evaluation_at: string | null
          manual_adjustments_count: number
          manual_intervention_status: string
          nutritionist_id: string
          patient_id: string
          phase_started_at: string | null
          protocol_id: string
          protocol_key: string | null
          protocol_next_action_at: string | null
          schedule_criteria: Json | null
          start_date: string
          status: Database["public"]["Enums"]["protocol_status"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_phase?: string | null
          end_date?: string | null
          id?: string
          last_manual_intervention_at?: string | null
          last_manual_intervention_by?: string | null
          last_protocol_evaluation_at?: string | null
          manual_adjustments_count?: number
          manual_intervention_status?: string
          nutritionist_id: string
          patient_id: string
          phase_started_at?: string | null
          protocol_id: string
          protocol_key?: string | null
          protocol_next_action_at?: string | null
          schedule_criteria?: Json | null
          start_date: string
          status?: Database["public"]["Enums"]["protocol_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_phase?: string | null
          end_date?: string | null
          id?: string
          last_manual_intervention_at?: string | null
          last_manual_intervention_by?: string | null
          last_protocol_evaluation_at?: string | null
          manual_adjustments_count?: number
          manual_intervention_status?: string
          nutritionist_id?: string
          patient_id?: string
          phase_started_at?: string | null
          protocol_id?: string
          protocol_key?: string | null
          protocol_next_action_at?: string | null
          schedule_criteria?: Json | null
          start_date?: string
          status?: Database["public"]["Enums"]["protocol_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_protocols_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_protocols_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_ranking_cache: {
        Row: {
          avatar_url: string | null
          badge_icon: string | null
          crown_enabled: boolean | null
          display_name: string
          patient_id: string
          plan_color: string | null
          plan_slug: string | null
          rank_position: number | null
          total_points: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          badge_icon?: string | null
          crown_enabled?: boolean | null
          display_name?: string
          patient_id: string
          plan_color?: string | null
          plan_slug?: string | null
          rank_position?: number | null
          total_points?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          badge_icon?: string | null
          crown_enabled?: boolean | null
          display_name?: string
          patient_id?: string
          plan_color?: string | null
          plan_slug?: string | null
          rank_position?: number | null
          total_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      patient_realtime_fix_cache: {
        Row: {
          fixes_applied: number
          last_checked_at: string
          last_result: Json
          patient_id: string
          updated_at: string
        }
        Insert: {
          fixes_applied?: number
          last_checked_at?: string
          last_result?: Json
          patient_id: string
          updated_at?: string
        }
        Update: {
          fixes_applied?: number
          last_checked_at?: string
          last_result?: Json
          patient_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_recommendations: {
        Row: {
          category: string
          created_at: string
          description: string | null
          icon: string
          id: string
          insight_id: string | null
          is_completed: boolean
          priority: string
          tenant_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          insight_id?: string | null
          is_completed?: boolean
          priority?: string
          tenant_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          insight_id?: string | null
          is_completed?: boolean
          priority?: string
          tenant_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_recommendations_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_ai_insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_recommendations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_referrals: {
        Row: {
          clicks: number
          created_at: string
          id: string
          is_active: boolean
          leads_generated: number
          nutritionist_id: string
          patient_id: string
          program_id: string | null
          referral_code: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          id?: string
          is_active?: boolean
          leads_generated?: number
          nutritionist_id: string
          patient_id: string
          program_id?: string | null
          referral_code?: string
        }
        Update: {
          clicks?: number
          created_at?: string
          id?: string
          is_active?: boolean
          leads_generated?: number
          nutritionist_id?: string
          patient_id?: string
          program_id?: string | null
          referral_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_referrals_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_relationship_scores: {
        Row: {
          churn_risk_score: number | null
          created_at: string | null
          engagement_level: string | null
          factors: Json | null
          id: string
          last_computed_at: string | null
          patient_id: string
          relationship_score: number | null
          upgrade_moment_score: number | null
        }
        Insert: {
          churn_risk_score?: number | null
          created_at?: string | null
          engagement_level?: string | null
          factors?: Json | null
          id?: string
          last_computed_at?: string | null
          patient_id: string
          relationship_score?: number | null
          upgrade_moment_score?: number | null
        }
        Update: {
          churn_risk_score?: number | null
          created_at?: string | null
          engagement_level?: string | null
          factors?: Json | null
          id?: string
          last_computed_at?: string | null
          patient_id?: string
          relationship_score?: number | null
          upgrade_moment_score?: number | null
        }
        Relationships: []
      }
      patient_signals: {
        Row: {
          context: Json | null
          detected_at: string
          detected_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          patient_id: string
          severity: string
          signal_key: string
          value: number | null
        }
        Insert: {
          context?: Json | null
          detected_at?: string
          detected_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          patient_id: string
          severity?: string
          signal_key: string
          value?: number | null
        }
        Update: {
          context?: Json | null
          detected_at?: string
          detected_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          patient_id?: string
          severity?: string
          signal_key?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_signals_signal_key_fkey"
            columns: ["signal_key"]
            isOneToOne: false
            referencedRelation: "clinical_signals_catalog"
            referencedColumns: ["signal_key"]
          },
        ]
      }
      patient_skinfold_assessments: {
        Row: {
          abdominal_mm: number | null
          axillary_mm: number | null
          biceps_mm: number | null
          body_assessment_id: string | null
          calculated_body_fat_percent: number | null
          chest_mm: number | null
          created_at: string | null
          id: string
          patient_id: string
          protocol_used: string | null
          subscapular_mm: number | null
          suprailiac_mm: number | null
          thigh_mm: number | null
          triceps_mm: number | null
        }
        Insert: {
          abdominal_mm?: number | null
          axillary_mm?: number | null
          biceps_mm?: number | null
          body_assessment_id?: string | null
          calculated_body_fat_percent?: number | null
          chest_mm?: number | null
          created_at?: string | null
          id?: string
          patient_id: string
          protocol_used?: string | null
          subscapular_mm?: number | null
          suprailiac_mm?: number | null
          thigh_mm?: number | null
          triceps_mm?: number | null
        }
        Update: {
          abdominal_mm?: number | null
          axillary_mm?: number | null
          biceps_mm?: number | null
          body_assessment_id?: string | null
          calculated_body_fat_percent?: number | null
          chest_mm?: number | null
          created_at?: string | null
          id?: string
          patient_id?: string
          protocol_used?: string | null
          subscapular_mm?: number | null
          suprailiac_mm?: number | null
          thigh_mm?: number | null
          triceps_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_skinfold_assessments_body_assessment_id_fkey"
            columns: ["body_assessment_id"]
            isOneToOne: false
            referencedRelation: "patient_body_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_smart_checklist_tasks: {
        Row: {
          adherence_score: number | null
          clinical_domain: string | null
          completion_timestamp: string | null
          created_at: string
          emotional_feedback: string | null
          generated_from: string
          id: string
          is_active: boolean
          is_completed: boolean
          patient_id: string
          priority_score: number
          recurrence_type: string
          task_category: string
          task_code: string
          task_description: string | null
          task_title: string
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          adherence_score?: number | null
          clinical_domain?: string | null
          completion_timestamp?: string | null
          created_at?: string
          emotional_feedback?: string | null
          generated_from?: string
          id?: string
          is_active?: boolean
          is_completed?: boolean
          patient_id: string
          priority_score?: number
          recurrence_type?: string
          task_category?: string
          task_code: string
          task_description?: string | null
          task_title: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          adherence_score?: number | null
          clinical_domain?: string | null
          completion_timestamp?: string | null
          created_at?: string
          emotional_feedback?: string | null
          generated_from?: string
          id?: string
          is_active?: boolean
          is_completed?: boolean
          patient_id?: string
          priority_score?: number
          recurrence_type?: string
          task_category?: string
          task_code?: string
          task_description?: string | null
          task_title?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      patient_supplements: {
        Row: {
          brand: string | null
          created_at: string
          dosage: string
          end_date: string | null
          frequency: string
          icon: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          nutritionist_id: string
          patient_id: string
          reason: string | null
          start_date: string
          tenant_id: string | null
          timing: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          dosage?: string
          end_date?: string | null
          frequency?: string
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          nutritionist_id: string
          patient_id: string
          reason?: string | null
          start_date?: string
          tenant_id?: string | null
          timing?: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          dosage?: string
          end_date?: string | null
          frequency?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          nutritionist_id?: string
          patient_id?: string
          reason?: string | null
          start_date?: string
          tenant_id?: string | null
          timing?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_supplements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_therapeutic_priority_state: {
        Row: {
          action_clinical_driver: string | null
          action_expected_impact: string | null
          action_group: string | null
          action_urgency: string | null
          clinical_risk_component: number | null
          cluster_behavior_component: number | null
          created_at: string | null
          dropout_risk_component: number | null
          engine_version: string | null
          id: string
          last_calculated_at: string | null
          main_driver: string | null
          nutritionist_id: string
          patient_id: string
          performance_component: number | null
          physiological_component: number | null
          priority_classification: string | null
          recommended_clinical_action: string | null
          regression_risk_component: number | null
          therapeutic_priority_score: number | null
          time_since_intervention_component: number | null
        }
        Insert: {
          action_clinical_driver?: string | null
          action_expected_impact?: string | null
          action_group?: string | null
          action_urgency?: string | null
          clinical_risk_component?: number | null
          cluster_behavior_component?: number | null
          created_at?: string | null
          dropout_risk_component?: number | null
          engine_version?: string | null
          id?: string
          last_calculated_at?: string | null
          main_driver?: string | null
          nutritionist_id: string
          patient_id: string
          performance_component?: number | null
          physiological_component?: number | null
          priority_classification?: string | null
          recommended_clinical_action?: string | null
          regression_risk_component?: number | null
          therapeutic_priority_score?: number | null
          time_since_intervention_component?: number | null
        }
        Update: {
          action_clinical_driver?: string | null
          action_expected_impact?: string | null
          action_group?: string | null
          action_urgency?: string | null
          clinical_risk_component?: number | null
          cluster_behavior_component?: number | null
          created_at?: string | null
          dropout_risk_component?: number | null
          engine_version?: string | null
          id?: string
          last_calculated_at?: string | null
          main_driver?: string | null
          nutritionist_id?: string
          patient_id?: string
          performance_component?: number | null
          physiological_component?: number | null
          priority_classification?: string | null
          recommended_clinical_action?: string | null
          regression_risk_component?: number | null
          therapeutic_priority_score?: number | null
          time_since_intervention_component?: number | null
        }
        Relationships: []
      }
      patient_timeline: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          patient_id: string
          tenant_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          patient_id: string
          tenant_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          patient_id?: string
          tenant_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_timeline_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_tips: {
        Row: {
          category: string
          created_at: string
          icon: string
          id: string
          is_read: boolean
          tip: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          icon?: string
          id?: string
          is_read?: boolean
          tip: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          icon?: string
          id?: string
          is_read?: boolean
          tip?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_weight_dynamics: {
        Row: {
          avg_weekly_weight_change: number | null
          best_weekly_loss: number | null
          computed_at: string | null
          detected_plateaus: number | null
          engine_version: string | null
          first_measurement_date: string | null
          historical_response_pattern: string | null
          id: string
          last_measurement_date: string | null
          metabolic_response_classification: string | null
          patient_id: string
          total_data_points: number | null
          total_weight_change: number | null
          volatility_score: number | null
          worst_weekly_gain: number | null
        }
        Insert: {
          avg_weekly_weight_change?: number | null
          best_weekly_loss?: number | null
          computed_at?: string | null
          detected_plateaus?: number | null
          engine_version?: string | null
          first_measurement_date?: string | null
          historical_response_pattern?: string | null
          id?: string
          last_measurement_date?: string | null
          metabolic_response_classification?: string | null
          patient_id: string
          total_data_points?: number | null
          total_weight_change?: number | null
          volatility_score?: number | null
          worst_weekly_gain?: number | null
        }
        Update: {
          avg_weekly_weight_change?: number | null
          best_weekly_loss?: number | null
          computed_at?: string | null
          detected_plateaus?: number | null
          engine_version?: string | null
          first_measurement_date?: string | null
          historical_response_pattern?: string | null
          id?: string
          last_measurement_date?: string | null
          metabolic_response_classification?: string | null
          patient_id?: string
          total_data_points?: number | null
          total_weight_change?: number | null
          volatility_score?: number | null
          worst_weekly_gain?: number | null
        }
        Relationships: []
      }
      patient_weight_history: {
        Row: {
          body_fat_percentage: number | null
          created_at: string
          id: string
          measurement_date: string
          measurement_source: string
          notes: string | null
          patient_id: string
          tenant_id: string | null
          waist_circumference: number | null
          weight: number
        }
        Insert: {
          body_fat_percentage?: number | null
          created_at?: string
          id?: string
          measurement_date: string
          measurement_source?: string
          notes?: string | null
          patient_id: string
          tenant_id?: string | null
          waist_circumference?: number | null
          weight: number
        }
        Update: {
          body_fat_percentage?: number | null
          created_at?: string
          id?: string
          measurement_date?: string
          measurement_source?: string
          notes?: string | null
          patient_id?: string
          tenant_id?: string | null
          waist_circumference?: number | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "patient_weight_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_weight_projection: {
        Row: {
          created_at: string
          horizon_weeks: number | null
          id: string
          patient_id: string
          projected_body_fat: number | null
          projected_risk_level: string | null
          projected_weight: number | null
          projection_confidence: number | null
          projection_date: string
          projection_model_version: string | null
        }
        Insert: {
          created_at?: string
          horizon_weeks?: number | null
          id?: string
          patient_id: string
          projected_body_fat?: number | null
          projected_risk_level?: string | null
          projected_weight?: number | null
          projection_confidence?: number | null
          projection_date: string
          projection_model_version?: string | null
        }
        Update: {
          created_at?: string
          horizon_weeks?: number | null
          id?: string
          patient_id?: string
          projected_body_fat?: number | null
          projected_risk_level?: string | null
          projected_weight?: number | null
          projection_confidence?: number | null
          projection_date?: string
          projection_model_version?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          gateway: Database["public"]["Enums"]["payment_gateway"]
          gateway_payment_id: string | null
          id: string
          metadata: Json | null
          paid_at: string | null
          payment_method: string | null
          status: string
          subscription_id: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          gateway: Database["public"]["Enums"]["payment_gateway"]
          gateway_payment_id?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          subscription_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          gateway?: Database["public"]["Enums"]["payment_gateway"]
          gateway_payment_id?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          subscription_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_trainer_students: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          notes: string | null
          personal_id: string
          status: string
          student_id: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          personal_id: string
          status?: string
          student_id: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          personal_id?: string
          status?: string
          student_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_trainer_students_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      physical_assessments: {
        Row: {
          abdomen: number | null
          abdominal_fold: number | null
          activity_factor: number | null
          assessment_date: string
          assessor_id: string
          bmi: number | null
          bmr: number | null
          body_fat_percentage: number | null
          calories_target: number | null
          carbs_target: number | null
          chest: number | null
          chest_fold: number | null
          created_at: string
          fat_mass: number | null
          fat_target: number | null
          goal_body_fat: number | null
          goal_weight: number | null
          height: number | null
          hip: number | null
          id: string
          lean_mass: number | null
          left_arm: number | null
          left_calf: number | null
          left_forearm: number | null
          left_thigh: number | null
          method: string | null
          midaxillary_fold: number | null
          neat: number | null
          neck: number | null
          notes: string | null
          patient_id: string
          protein_target: number | null
          right_arm: number | null
          right_calf: number | null
          right_forearm: number | null
          right_thigh: number | null
          subscapular_fold: number | null
          suprailiac_fold: number | null
          tdee: number | null
          thermic_effect: number | null
          thigh_fold: number | null
          triceps_fold: number | null
          updated_at: string
          waist: number | null
          weight: number | null
        }
        Insert: {
          abdomen?: number | null
          abdominal_fold?: number | null
          activity_factor?: number | null
          assessment_date?: string
          assessor_id: string
          bmi?: number | null
          bmr?: number | null
          body_fat_percentage?: number | null
          calories_target?: number | null
          carbs_target?: number | null
          chest?: number | null
          chest_fold?: number | null
          created_at?: string
          fat_mass?: number | null
          fat_target?: number | null
          goal_body_fat?: number | null
          goal_weight?: number | null
          height?: number | null
          hip?: number | null
          id?: string
          lean_mass?: number | null
          left_arm?: number | null
          left_calf?: number | null
          left_forearm?: number | null
          left_thigh?: number | null
          method?: string | null
          midaxillary_fold?: number | null
          neat?: number | null
          neck?: number | null
          notes?: string | null
          patient_id: string
          protein_target?: number | null
          right_arm?: number | null
          right_calf?: number | null
          right_forearm?: number | null
          right_thigh?: number | null
          subscapular_fold?: number | null
          suprailiac_fold?: number | null
          tdee?: number | null
          thermic_effect?: number | null
          thigh_fold?: number | null
          triceps_fold?: number | null
          updated_at?: string
          waist?: number | null
          weight?: number | null
        }
        Update: {
          abdomen?: number | null
          abdominal_fold?: number | null
          activity_factor?: number | null
          assessment_date?: string
          assessor_id?: string
          bmi?: number | null
          bmr?: number | null
          body_fat_percentage?: number | null
          calories_target?: number | null
          carbs_target?: number | null
          chest?: number | null
          chest_fold?: number | null
          created_at?: string
          fat_mass?: number | null
          fat_target?: number | null
          goal_body_fat?: number | null
          goal_weight?: number | null
          height?: number | null
          hip?: number | null
          id?: string
          lean_mass?: number | null
          left_arm?: number | null
          left_calf?: number | null
          left_forearm?: number | null
          left_thigh?: number | null
          method?: string | null
          midaxillary_fold?: number | null
          neat?: number | null
          neck?: number | null
          notes?: string | null
          patient_id?: string
          protein_target?: number | null
          right_arm?: number | null
          right_calf?: number | null
          right_forearm?: number | null
          right_thigh?: number | null
          subscapular_fold?: number | null
          suprailiac_fold?: number | null
          tdee?: number | null
          thermic_effect?: number | null
          thigh_fold?: number | null
          triceps_fold?: number | null
          updated_at?: string
          waist?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      phytotherapy_protocol_templates: {
        Row: {
          clinical_notes: string | null
          contraindications: string | null
          created_at: string
          created_by: string | null
          dosage: string
          duration: string
          id: string
          is_global: boolean
          name: string
          objective: string
          patient_instructions: string | null
          phytotherapics: Json
          schedule: string
          updated_at: string
        }
        Insert: {
          clinical_notes?: string | null
          contraindications?: string | null
          created_at?: string
          created_by?: string | null
          dosage?: string
          duration?: string
          id?: string
          is_global?: boolean
          name: string
          objective?: string
          patient_instructions?: string | null
          phytotherapics?: Json
          schedule?: string
          updated_at?: string
        }
        Update: {
          clinical_notes?: string | null
          contraindications?: string | null
          created_at?: string
          created_by?: string | null
          dosage?: string
          duration?: string
          id?: string
          is_global?: boolean
          name?: string
          objective?: string
          patient_instructions?: string | null
          phytotherapics?: Json
          schedule?: string
          updated_at?: string
        }
        Relationships: []
      }
      pipeline_execution_logs: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          engine_version: string | null
          error_details: Json | null
          errors_count: number | null
          execution_status: string
          id: string
          metadata: Json | null
          patients_processed: number | null
          pipeline_name: string
          started_at: string
          triggered_by: string | null
          warnings_count: number | null
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          engine_version?: string | null
          error_details?: Json | null
          errors_count?: number | null
          execution_status?: string
          id?: string
          metadata?: Json | null
          patients_processed?: number | null
          pipeline_name: string
          started_at?: string
          triggered_by?: string | null
          warnings_count?: number | null
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          engine_version?: string | null
          error_details?: Json | null
          errors_count?: number | null
          execution_status?: string
          id?: string
          metadata?: Json | null
          patients_processed?: number | null
          pipeline_name?: string
          started_at?: string
          triggered_by?: string | null
          warnings_count?: number | null
        }
        Relationships: []
      }
      pipeline_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          engine_versions: Json | null
          error_summary: string | null
          execution_log: Json | null
          id: string
          run_type: string
          started_at: string
          status: string
          steps_completed: Json | null
          steps_failed: Json | null
          total_patients_processed: number | null
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          engine_versions?: Json | null
          error_summary?: string | null
          execution_log?: Json | null
          id?: string
          run_type?: string
          started_at?: string
          status?: string
          steps_completed?: Json | null
          steps_failed?: Json | null
          total_patients_processed?: number | null
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          engine_versions?: Json | null
          error_summary?: string | null
          execution_log?: Json | null
          id?: string
          run_type?: string
          started_at?: string
          status?: string
          steps_completed?: Json | null
          steps_failed?: Json | null
          total_patients_processed?: number | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      pipeline_step_results: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          function_name: string
          id: string
          output_summary: Json | null
          patients_processed: number | null
          run_id: string
          started_at: string | null
          status: string
          step_name: string
          step_order: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          function_name: string
          id?: string
          output_summary?: Json | null
          patients_processed?: number | null
          run_id: string
          started_at?: string | null
          status?: string
          step_name: string
          step_order: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          function_name?: string
          id?: string
          output_summary?: Json | null
          patients_processed?: number | null
          run_id?: string
          started_at?: string | null
          status?: string
          step_name?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_step_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "pipeline_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      pix_payment_configs: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_active: boolean
          nutritionist_id: string | null
          pix_code: string
          plan_label: string
          plan_type: string
          qr_code_url: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          is_active?: boolean
          nutritionist_id?: string | null
          pix_code: string
          plan_label: string
          plan_type?: string
          qr_code_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_active?: boolean
          nutritionist_id?: string | null
          pix_code?: string
          plan_label?: string
          plan_type?: string
          qr_code_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      plan_audit_results: {
        Row: {
          audit_run_id: string
          audit_type: string
          created_at: string
          details: Json | null
          id: string
          patient_id: string | null
          plan_id: string | null
          resolved: boolean | null
          resolved_at: string | null
          severity: string
        }
        Insert: {
          audit_run_id: string
          audit_type: string
          created_at?: string
          details?: Json | null
          id?: string
          patient_id?: string | null
          plan_id?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: string
        }
        Update: {
          audit_run_id?: string
          audit_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          patient_id?: string | null
          plan_id?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_audit_results_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_resolved_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_audit_results_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_audit_results_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "v_plan_visibility_diagnostics"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      plan_reconciliation_queue: {
        Row: {
          correlation_id: string | null
          created_at: string | null
          error_log: string | null
          fixed_at: string | null
          id: string
          issue_detected: string | null
          plan_id: string | null
        }
        Insert: {
          correlation_id?: string | null
          created_at?: string | null
          error_log?: string | null
          fixed_at?: string | null
          id?: string
          issue_detected?: string | null
          plan_id?: string | null
        }
        Update: {
          correlation_id?: string | null
          created_at?: string | null
          error_log?: string | null
          fixed_at?: string | null
          id?: string
          issue_detected?: string | null
          plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_reconciliation_queue_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_resolved_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_reconciliation_queue_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_reconciliation_queue_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "v_plan_visibility_diagnostics"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      plan_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          nutritionist_id: string | null
          patient_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          nutritionist_id?: string | null
          patient_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          nutritionist_id?: string | null
          patient_id?: string
          status?: string
        }
        Relationships: []
      }
      plan_schedules: {
        Row: {
          activate_at: string
          created_at: string
          criteria: Json | null
          deactivate_at: string | null
          id: string
          meal_plan_id: string
          status: string
        }
        Insert: {
          activate_at: string
          created_at?: string
          criteria?: Json | null
          deactivate_at?: string | null
          id?: string
          meal_plan_id: string
          status?: string
        }
        Update: {
          activate_at?: string
          created_at?: string
          criteria?: Json | null
          deactivate_at?: string | null
          id?: string
          meal_plan_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_schedules_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_resolved_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_schedules_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_schedules_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "v_plan_visibility_diagnostics"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      planner_events: {
        Row: {
          all_day: boolean
          color: string | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          event_date: string
          event_type: string
          id: string
          is_completed: boolean
          metadata: Json | null
          nutritionist_id: string | null
          patient_id: string | null
          target_user_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          event_date: string
          event_type?: string
          id?: string
          is_completed?: boolean
          metadata?: Json | null
          nutritionist_id?: string | null
          patient_id?: string | null
          target_user_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          event_date?: string
          event_type?: string
          id?: string
          is_completed?: boolean
          metadata?: Json | null
          nutritionist_id?: string | null
          patient_id?: string | null
          target_user_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_feature_tiers: {
        Row: {
          feature_name: string
          id: string
          tier: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          feature_name: string
          id?: string
          tier?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          feature_name?: string
          id?: string
          tier?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_maturity_history: {
        Row: {
          computed_at: string
          engine_version: string
          global_dropout_rate: number | null
          id: string
          maturity_level: string
          maturity_score: number
          population_stability: number | null
          prediction_accuracy: number | null
          result_consistency: number | null
          therapeutic_efficacy: number | null
          total_interventions_analyzed: number | null
          total_patients_analyzed: number | null
        }
        Insert: {
          computed_at?: string
          engine_version?: string
          global_dropout_rate?: number | null
          id?: string
          maturity_level?: string
          maturity_score?: number
          population_stability?: number | null
          prediction_accuracy?: number | null
          result_consistency?: number | null
          therapeutic_efficacy?: number | null
          total_interventions_analyzed?: number | null
          total_patients_analyzed?: number | null
        }
        Update: {
          computed_at?: string
          engine_version?: string
          global_dropout_rate?: number | null
          id?: string
          maturity_level?: string
          maturity_score?: number
          population_stability?: number | null
          prediction_accuracy?: number | null
          result_consistency?: number | null
          therapeutic_efficacy?: number | null
          total_interventions_analyzed?: number | null
          total_patients_analyzed?: number | null
        }
        Relationships: []
      }
      player_stats: {
        Row: {
          current_streak: number
          id: string
          last_meal_date: string | null
          level: number
          longest_streak: number
          meals_logged: number
          tenant_id: string | null
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          id?: string
          last_meal_date?: string | null
          level?: number
          longest_streak?: number
          meals_logged?: number
          tenant_id?: string | null
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          id?: string
          last_meal_date?: string | null
          level?: number
          longest_streak?: number
          meals_logged?: number
          tenant_id?: string | null
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      population_clinical_insights: {
        Row: {
          created_at: string | null
          engine_version: string | null
          id: string
          insight_description: string
          insight_scope: string | null
          insight_type: string
          nutritionist_id: string
          statistical_confidence: string | null
          supporting_data: Json | null
        }
        Insert: {
          created_at?: string | null
          engine_version?: string | null
          id?: string
          insight_description: string
          insight_scope?: string | null
          insight_type: string
          nutritionist_id: string
          statistical_confidence?: string | null
          supporting_data?: Json | null
        }
        Update: {
          created_at?: string | null
          engine_version?: string | null
          id?: string
          insight_description?: string
          insight_scope?: string | null
          insight_type?: string
          nutritionist_id?: string
          statistical_confidence?: string | null
          supporting_data?: Json | null
        }
        Relationships: []
      }
      population_cohort_metrics: {
        Row: {
          avg_adherence: number | null
          avg_performance_score: number | null
          avg_response_velocity: number | null
          avg_weight_loss_14d: number | null
          avg_weight_loss_30d: number | null
          cohort_id: string
          dropout_rate: number | null
          engine_version: string | null
          id: string
          metabolic_stability: number | null
          stagnation_rate: number | null
          updated_at: string | null
        }
        Insert: {
          avg_adherence?: number | null
          avg_performance_score?: number | null
          avg_response_velocity?: number | null
          avg_weight_loss_14d?: number | null
          avg_weight_loss_30d?: number | null
          cohort_id: string
          dropout_rate?: number | null
          engine_version?: string | null
          id?: string
          metabolic_stability?: number | null
          stagnation_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_adherence?: number | null
          avg_performance_score?: number | null
          avg_response_velocity?: number | null
          avg_weight_loss_14d?: number | null
          avg_weight_loss_30d?: number | null
          cohort_id?: string
          dropout_rate?: number | null
          engine_version?: string | null
          id?: string
          metabolic_stability?: number | null
          stagnation_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "population_cohort_metrics_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: true
            referencedRelation: "population_cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      population_cohorts: {
        Row: {
          cohort_key: string
          cohort_signature: Json
          created_at: string | null
          id: string
          nutritionist_id: string
          patients_count: number | null
          updated_at: string | null
        }
        Insert: {
          cohort_key: string
          cohort_signature?: Json
          created_at?: string | null
          id?: string
          nutritionist_id: string
          patients_count?: number | null
          updated_at?: string | null
        }
        Update: {
          cohort_key?: string
          cohort_signature?: Json
          created_at?: string | null
          id?: string
          nutritionist_id?: string
          patients_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      population_nutrition_cohorts: {
        Row: {
          activity_level: string | null
          adherence_band: string | null
          age_band: string | null
          bmi_band: string | null
          caloric_band: string | null
          cohort_signature: Json
          cohort_slug: string
          created_at: string
          goal_category: string | null
          id: string
          metabolic_cluster: string | null
          patients_count: number
          sex: string | null
          updated_at: string
        }
        Insert: {
          activity_level?: string | null
          adherence_band?: string | null
          age_band?: string | null
          bmi_band?: string | null
          caloric_band?: string | null
          cohort_signature?: Json
          cohort_slug: string
          created_at?: string
          goal_category?: string | null
          id?: string
          metabolic_cluster?: string | null
          patients_count?: number
          sex?: string | null
          updated_at?: string
        }
        Update: {
          activity_level?: string | null
          adherence_band?: string | null
          age_band?: string | null
          bmi_band?: string | null
          caloric_band?: string | null
          cohort_signature?: Json
          cohort_slug?: string
          created_at?: string
          goal_category?: string | null
          id?: string
          metabolic_cluster?: string | null
          patients_count?: number
          sex?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      population_nutrition_metrics: {
        Row: {
          avg_adherence: number | null
          avg_body_fat_change: number | null
          avg_dropout_rate: number | null
          avg_performance_score: number | null
          avg_protocol_success_score: number | null
          avg_regression_rate: number | null
          avg_stagnation_rate: number | null
          avg_weight_change_14d: number | null
          avg_weight_change_30d: number | null
          cohort_id: string
          engine_version: string
          id: string
          updated_at: string
        }
        Insert: {
          avg_adherence?: number | null
          avg_body_fat_change?: number | null
          avg_dropout_rate?: number | null
          avg_performance_score?: number | null
          avg_protocol_success_score?: number | null
          avg_regression_rate?: number | null
          avg_stagnation_rate?: number | null
          avg_weight_change_14d?: number | null
          avg_weight_change_30d?: number | null
          cohort_id: string
          engine_version?: string
          id?: string
          updated_at?: string
        }
        Update: {
          avg_adherence?: number | null
          avg_body_fat_change?: number | null
          avg_dropout_rate?: number | null
          avg_performance_score?: number | null
          avg_protocol_success_score?: number | null
          avg_regression_rate?: number | null
          avg_stagnation_rate?: number | null
          avg_weight_change_14d?: number | null
          avg_weight_change_30d?: number | null
          cohort_id?: string
          engine_version?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "population_nutrition_metrics_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: true
            referencedRelation: "population_nutrition_cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      population_response_patterns: {
        Row: {
          affected_cohort: string | null
          confidence_score: number | null
          created_at: string
          engine_version: string
          id: string
          nutritionist_id: string | null
          pattern_description: string
          pattern_type: string
          supporting_metrics: Json
        }
        Insert: {
          affected_cohort?: string | null
          confidence_score?: number | null
          created_at?: string
          engine_version?: string
          id?: string
          nutritionist_id?: string | null
          pattern_description: string
          pattern_type: string
          supporting_metrics?: Json
        }
        Update: {
          affected_cohort?: string | null
          confidence_score?: number | null
          created_at?: string
          engine_version?: string
          id?: string
          nutritionist_id?: string | null
          pattern_description?: string
          pattern_type?: string
          supporting_metrics?: Json
        }
        Relationships: []
      }
      prestige_plans: {
        Row: {
          ai_usage_multiplier: number
          badge_icon: string
          badge_label: string
          color: string
          created_at: string
          crown_enabled: boolean
          display_order: number
          effect_type: string
          features: Json
          id: string
          is_active: boolean
          name: string
          price_annual: number | null
          price_monthly: number
          price_quarterly: number | null
          price_semiannual: number | null
          ranking_highlight: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          ai_usage_multiplier?: number
          badge_icon?: string
          badge_label?: string
          color?: string
          created_at?: string
          crown_enabled?: boolean
          display_order?: number
          effect_type?: string
          features?: Json
          id?: string
          is_active?: boolean
          name: string
          price_annual?: number | null
          price_monthly?: number
          price_quarterly?: number | null
          price_semiannual?: number | null
          ranking_highlight?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          ai_usage_multiplier?: number
          badge_icon?: string
          badge_label?: string
          color?: string
          created_at?: string
          crown_enabled?: boolean
          display_order?: number
          effect_type?: string
          features?: Json
          id?: string
          is_active?: boolean
          name?: string
          price_annual?: number | null
          price_monthly?: number
          price_quarterly?: number | null
          price_semiannual?: number | null
          ranking_highlight?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          is_featured: boolean
          max_patients: number | null
          name: string
          price_monthly: number
          price_yearly: number | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_featured?: boolean
          max_patients?: number | null
          name: string
          price_monthly?: number
          price_yearly?: number | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_featured?: boolean
          max_patients?: number | null
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      professional_feature_usage: {
        Row: {
          created_at: string
          feature_name: string
          id: string
          nutritionist_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feature_name: string
          id?: string
          nutritionist_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feature_name?: string
          id?: string
          nutritionist_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      professional_operational_metrics: {
        Row: {
          active_patients: number | null
          adherence_mean: number | null
          avg_patient_performance: number | null
          avg_patient_risk: number | null
          clinical_efficiency_score: number | null
          computed_at: string | null
          dropout_rate: number | null
          engine_version: string | null
          id: string
          intervention_frequency: number | null
          organization_id: string | null
          patient_ltv_estimate: number | null
          portfolio_stability_score: number | null
          professional_id: string
          rank_position: number | null
        }
        Insert: {
          active_patients?: number | null
          adherence_mean?: number | null
          avg_patient_performance?: number | null
          avg_patient_risk?: number | null
          clinical_efficiency_score?: number | null
          computed_at?: string | null
          dropout_rate?: number | null
          engine_version?: string | null
          id?: string
          intervention_frequency?: number | null
          organization_id?: string | null
          patient_ltv_estimate?: number | null
          portfolio_stability_score?: number | null
          professional_id: string
          rank_position?: number | null
        }
        Update: {
          active_patients?: number | null
          adherence_mean?: number | null
          avg_patient_performance?: number | null
          avg_patient_risk?: number | null
          clinical_efficiency_score?: number | null
          computed_at?: string | null
          dropout_rate?: number | null
          engine_version?: string | null
          id?: string
          intervention_frequency?: number | null
          organization_id?: string | null
          patient_ltv_estimate?: number | null
          portfolio_stability_score?: number | null
          professional_id?: string
          rank_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_operational_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_profiles: {
        Row: {
          clinic_name: string | null
          coach_bodybuilder_enabled: boolean
          created_at: string
          id: string
          onboarding_completed: boolean
          personal_trainer_enabled: boolean
          plan_id: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clinic_name?: string | null
          coach_bodybuilder_enabled?: boolean
          created_at?: string
          id?: string
          onboarding_completed?: boolean
          personal_trainer_enabled?: boolean
          plan_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          clinic_name?: string | null
          coach_bodybuilder_enabled?: boolean
          created_at?: string
          id?: string
          onboarding_completed?: boolean
          personal_trainer_enabled?: boolean
          plan_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_profiles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "pricing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_setup_progress: {
        Row: {
          created_at: string
          id: string
          is_complete: boolean
          steps_completed: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_complete?: boolean
          steps_completed?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_complete?: boolean
          steps_completed?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      professional_unblock_overrides: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          patient_id: string
          professional_id: string
          reason: string | null
          revoked_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          patient_id: string
          professional_id: string
          reason?: string | null
          revoked_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          patient_id?: string
          professional_id?: string
          reason?: string | null
          revoked_at?: string | null
        }
        Relationships: []
      }
      professional_whatsapp_automation_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          max_messages_per_day: number
          professional_id: string
          send_checklist_reminders: boolean
          send_daily_focus: boolean
          send_low_adherence_alerts: boolean
          send_new_patient_alert: boolean
          send_onboarding_release: boolean
          send_plan_published: boolean
          send_weekly_summary: boolean
          sending_end_hour: number
          sending_start_hour: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_messages_per_day?: number
          professional_id: string
          send_checklist_reminders?: boolean
          send_daily_focus?: boolean
          send_low_adherence_alerts?: boolean
          send_new_patient_alert?: boolean
          send_onboarding_release?: boolean
          send_plan_published?: boolean
          send_weekly_summary?: boolean
          sending_end_hour?: number
          sending_start_hour?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_messages_per_day?: number
          professional_id?: string
          send_checklist_reminders?: boolean
          send_daily_focus?: boolean
          send_low_adherence_alerts?: boolean
          send_new_patient_alert?: boolean
          send_onboarding_release?: boolean
          send_plan_published?: boolean
          send_weekly_summary?: boolean
          sending_end_hour?: number
          sending_start_hour?: number
          updated_at?: string
        }
        Relationships: []
      }
      professional_whatsapp_connections: {
        Row: {
          api_base_url: string | null
          connection_status: string
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          last_sync_at: string | null
          phone_number: string | null
          professional_id: string
          provider_instance_name: string | null
          provider_name: string
          qr_code_payload: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          api_base_url?: string | null
          connection_status?: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          phone_number?: string | null
          professional_id: string
          provider_instance_name?: string | null
          provider_name?: string
          qr_code_payload?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          api_base_url?: string | null
          connection_status?: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          phone_number?: string | null
          professional_id?: string
          provider_instance_name?: string | null
          provider_name?: string
          qr_code_payload?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_whatsapp_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          adherence_momentum: string | null
          adherence_score_7d: number | null
          adherence_score_prev_7d: number | null
          avatar_url: string | null
          behavioral_consistency_score: number | null
          clinical_risk_level: string | null
          clinical_risk_score: number | null
          created_at: string
          current_editor_mode: string | null
          current_weight: number | null
          editor_state: Json | null
          engagement_index: number | null
          engagement_level: string | null
          experience_mode: string | null
          experience_mode_locked: boolean | null
          fast_marmita_mode: boolean | null
          fit_intelligence_access_mode: string | null
          fit_intelligence_enabled: boolean
          fit_intelligence_expires_at: string | null
          fit_intelligence_first_experience_seen: boolean | null
          fit_intelligence_last_seen_at: string | null
          fit_intelligence_mode: string | null
          fit_intelligence_onboarded: boolean
          fit_intelligence_snoozed_until: string | null
          full_name: string
          goal: string | null
          historical_loss_rate: number | null
          id: string
          is_orphan: boolean | null
          last_editor_step: number | null
          last_editor_version_used: string | null
          marmita_mode: boolean | null
          metabolic_confidence_score: number | null
          metabolic_last_evaluated_at: string | null
          metabolic_phase: string | null
          metabolic_phase_last_updated_at: string | null
          metabolic_response_type: string | null
          notes: string | null
          phone: string | null
          plateau_probability: number | null
          preferred_editor_version: string | null
          ranking_nickname: string | null
          regain_probability: number | null
          search_vector: unknown
          show_in_ranking: boolean
          tenant_id: string
          unlock_date: string | null
          updated_at: string
          user_id: string
          weight_history_analyzed_at: string | null
          weight_trend_status: string | null
          weight_velocity_kg_week: number | null
          whatsapp: string | null
        }
        Insert: {
          adherence_momentum?: string | null
          adherence_score_7d?: number | null
          adherence_score_prev_7d?: number | null
          avatar_url?: string | null
          behavioral_consistency_score?: number | null
          clinical_risk_level?: string | null
          clinical_risk_score?: number | null
          created_at?: string
          current_editor_mode?: string | null
          current_weight?: number | null
          editor_state?: Json | null
          engagement_index?: number | null
          engagement_level?: string | null
          experience_mode?: string | null
          experience_mode_locked?: boolean | null
          fast_marmita_mode?: boolean | null
          fit_intelligence_access_mode?: string | null
          fit_intelligence_enabled?: boolean
          fit_intelligence_expires_at?: string | null
          fit_intelligence_first_experience_seen?: boolean | null
          fit_intelligence_last_seen_at?: string | null
          fit_intelligence_mode?: string | null
          fit_intelligence_onboarded?: boolean
          fit_intelligence_snoozed_until?: string | null
          full_name?: string
          goal?: string | null
          historical_loss_rate?: number | null
          id?: string
          is_orphan?: boolean | null
          last_editor_step?: number | null
          last_editor_version_used?: string | null
          marmita_mode?: boolean | null
          metabolic_confidence_score?: number | null
          metabolic_last_evaluated_at?: string | null
          metabolic_phase?: string | null
          metabolic_phase_last_updated_at?: string | null
          metabolic_response_type?: string | null
          notes?: string | null
          phone?: string | null
          plateau_probability?: number | null
          preferred_editor_version?: string | null
          ranking_nickname?: string | null
          regain_probability?: number | null
          search_vector?: unknown
          show_in_ranking?: boolean
          tenant_id: string
          unlock_date?: string | null
          updated_at?: string
          user_id: string
          weight_history_analyzed_at?: string | null
          weight_trend_status?: string | null
          weight_velocity_kg_week?: number | null
          whatsapp?: string | null
        }
        Update: {
          adherence_momentum?: string | null
          adherence_score_7d?: number | null
          adherence_score_prev_7d?: number | null
          avatar_url?: string | null
          behavioral_consistency_score?: number | null
          clinical_risk_level?: string | null
          clinical_risk_score?: number | null
          created_at?: string
          current_editor_mode?: string | null
          current_weight?: number | null
          editor_state?: Json | null
          engagement_index?: number | null
          engagement_level?: string | null
          experience_mode?: string | null
          experience_mode_locked?: boolean | null
          fast_marmita_mode?: boolean | null
          fit_intelligence_access_mode?: string | null
          fit_intelligence_enabled?: boolean
          fit_intelligence_expires_at?: string | null
          fit_intelligence_first_experience_seen?: boolean | null
          fit_intelligence_last_seen_at?: string | null
          fit_intelligence_mode?: string | null
          fit_intelligence_onboarded?: boolean
          fit_intelligence_snoozed_until?: string | null
          full_name?: string
          goal?: string | null
          historical_loss_rate?: number | null
          id?: string
          is_orphan?: boolean | null
          last_editor_step?: number | null
          last_editor_version_used?: string | null
          marmita_mode?: boolean | null
          metabolic_confidence_score?: number | null
          metabolic_last_evaluated_at?: string | null
          metabolic_phase?: string | null
          metabolic_phase_last_updated_at?: string | null
          metabolic_response_type?: string | null
          notes?: string | null
          phone?: string | null
          plateau_probability?: number | null
          preferred_editor_version?: string | null
          ranking_nickname?: string | null
          regain_probability?: number | null
          search_vector?: unknown
          show_in_ranking?: boolean
          tenant_id?: string
          unlock_date?: string | null
          updated_at?: string
          user_id?: string
          weight_history_analyzed_at?: string | null
          weight_trend_status?: string | null
          weight_velocity_kg_week?: number | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      program_enrollments: {
        Row: {
          blocked_reason: string | null
          clinical_questions: Json | null
          completed_at: string | null
          created_at: string | null
          current_phase: number
          has_measurements: boolean | null
          id: string
          initial_bmi: number | null
          initial_carbs: number | null
          initial_fat: number | null
          initial_get: number | null
          initial_height: number | null
          initial_kcal_target: number | null
          initial_protein: number | null
          initial_tmb: number | null
          initial_weight: number | null
          last_photos_at: string | null
          last_weight_at: string | null
          measurements: Json | null
          next_full_review_due_at: string | null
          next_weight_due_at: string | null
          onboarding_completed_at: string | null
          patient_id: string
          professional_id: string
          program_id: string
          started_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          blocked_reason?: string | null
          clinical_questions?: Json | null
          completed_at?: string | null
          created_at?: string | null
          current_phase?: number
          has_measurements?: boolean | null
          id?: string
          initial_bmi?: number | null
          initial_carbs?: number | null
          initial_fat?: number | null
          initial_get?: number | null
          initial_height?: number | null
          initial_kcal_target?: number | null
          initial_protein?: number | null
          initial_tmb?: number | null
          initial_weight?: number | null
          last_photos_at?: string | null
          last_weight_at?: string | null
          measurements?: Json | null
          next_full_review_due_at?: string | null
          next_weight_due_at?: string | null
          onboarding_completed_at?: string | null
          patient_id: string
          professional_id: string
          program_id: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          blocked_reason?: string | null
          clinical_questions?: Json | null
          completed_at?: string | null
          created_at?: string | null
          current_phase?: number
          has_measurements?: boolean | null
          id?: string
          initial_bmi?: number | null
          initial_carbs?: number | null
          initial_fat?: number | null
          initial_get?: number | null
          initial_height?: number | null
          initial_kcal_target?: number | null
          initial_protein?: number | null
          initial_tmb?: number | null
          initial_weight?: number | null
          last_photos_at?: string | null
          last_weight_at?: string | null
          measurements?: Json | null
          next_full_review_due_at?: string | null
          next_weight_due_at?: string | null
          onboarding_completed_at?: string | null
          patient_id?: string
          professional_id?: string
          program_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_join_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          patient_id: string
          program_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          patient_id: string
          program_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          patient_id?: string
          program_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_join_requests_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_patient_progress: {
        Row: {
          adherence_score: number | null
          created_at: string
          habits_completed: number | null
          habits_total: number | null
          hip: number | null
          id: string
          notes: string | null
          patient_id: string
          phase_id: string | null
          program_id: string
          recorded_at: string
          waist: number | null
          week_number: number
          weight: number | null
        }
        Insert: {
          adherence_score?: number | null
          created_at?: string
          habits_completed?: number | null
          habits_total?: number | null
          hip?: number | null
          id?: string
          notes?: string | null
          patient_id: string
          phase_id?: string | null
          program_id: string
          recorded_at?: string
          waist?: number | null
          week_number?: number
          weight?: number | null
        }
        Update: {
          adherence_score?: number | null
          created_at?: string
          habits_completed?: number | null
          habits_total?: number | null
          hip?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
          phase_id?: string | null
          program_id?: string
          recorded_at?: string
          waist?: number | null
          week_number?: number
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "program_patient_progress_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "program_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_patient_progress_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_patients: {
        Row: {
          current_phase: number | null
          enrolled_at: string
          id: string
          joined_at: string | null
          patient_id: string
          program_id: string
          status: string
          tenant_id: string | null
        }
        Insert: {
          current_phase?: number | null
          enrolled_at?: string
          id?: string
          joined_at?: string | null
          patient_id: string
          program_id: string
          status?: string
          tenant_id?: string | null
        }
        Update: {
          current_phase?: number | null
          enrolled_at?: string
          id?: string
          joined_at?: string | null
          patient_id?: string
          program_id?: string
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_patients_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_patients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      program_phases: {
        Row: {
          created_at: string
          duration_weeks: number
          habits: Json | null
          id: string
          nutrition_tips: Json | null
          objective: string | null
          phase_number: number
          program_id: string
          progress_indicators: Json | null
          title: string
        }
        Insert: {
          created_at?: string
          duration_weeks?: number
          habits?: Json | null
          id?: string
          nutrition_tips?: Json | null
          objective?: string | null
          phase_number?: number
          program_id: string
          progress_indicators?: Json | null
          title: string
        }
        Update: {
          created_at?: string
          duration_weeks?: number
          habits?: Json | null
          id?: string
          nutrition_tips?: Json | null
          objective?: string | null
          phase_number?: number
          program_id?: string
          progress_indicators?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_phases_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_timeline: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          program_id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          program_id: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          program_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_timeline_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          image_url: string | null
          is_active: boolean
          max_patients: number | null
          prestige_plan_id: string | null
          protocol_id: string | null
          protocol_key: string | null
          start_date: string
          tag: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_patients?: number | null
          prestige_plan_id?: string | null
          protocol_id?: string | null
          protocol_key?: string | null
          start_date: string
          tag?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          max_patients?: number | null
          prestige_plan_id?: string | null
          protocol_id?: string | null
          protocol_key?: string | null
          start_date?: string
          tag?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_prestige_plan_id_fkey"
            columns: ["prestige_plan_id"]
            isOneToOne: false
            referencedRelation: "prestige_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_autonomy_settings: {
        Row: {
          autonomy_mode: string | null
          created_at: string | null
          id: string
          min_confidence_for_auto_draft: number | null
          nutritionist_id: string
          updated_at: string | null
        }
        Insert: {
          autonomy_mode?: string | null
          created_at?: string | null
          id?: string
          min_confidence_for_auto_draft?: number | null
          nutritionist_id: string
          updated_at?: string | null
        }
        Update: {
          autonomy_mode?: string | null
          created_at?: string | null
          id?: string
          min_confidence_for_auto_draft?: number | null
          nutritionist_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      protocol_caloric_ranges: {
        Row: {
          adaptation_cycle_days: number | null
          created_at: string | null
          deficit_strategy_type: string
          diet_break_supported: boolean | null
          id: string
          kcal_max: number
          kcal_min: number
          protocol_id: string
          refeed_supported: boolean | null
        }
        Insert: {
          adaptation_cycle_days?: number | null
          created_at?: string | null
          deficit_strategy_type?: string
          diet_break_supported?: boolean | null
          id?: string
          kcal_max?: number
          kcal_min?: number
          protocol_id: string
          refeed_supported?: boolean | null
        }
        Update: {
          adaptation_cycle_days?: number | null
          created_at?: string | null
          deficit_strategy_type?: string
          diet_break_supported?: boolean | null
          id?: string
          kcal_max?: number
          kcal_min?: number
          protocol_id?: string
          refeed_supported?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_caloric_ranges_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "nutrition_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_clinical_performance: {
        Row: {
          alert_rate: number | null
          avg_adherence: number | null
          avg_weight_response: number | null
          avg_weight_response_14d: number | null
          avg_weight_response_30d: number | null
          created_at: string | null
          dropout_rate: number | null
          effectiveness_tier: string | null
          engine_version: string | null
          id: string
          last_updated: string | null
          metabolic_stability: number | null
          metabolic_success_score: number | null
          protocol_id: string
          stagnation_rate: number | null
          total_applications: number | null
        }
        Insert: {
          alert_rate?: number | null
          avg_adherence?: number | null
          avg_weight_response?: number | null
          avg_weight_response_14d?: number | null
          avg_weight_response_30d?: number | null
          created_at?: string | null
          dropout_rate?: number | null
          effectiveness_tier?: string | null
          engine_version?: string | null
          id?: string
          last_updated?: string | null
          metabolic_stability?: number | null
          metabolic_success_score?: number | null
          protocol_id: string
          stagnation_rate?: number | null
          total_applications?: number | null
        }
        Update: {
          alert_rate?: number | null
          avg_adherence?: number | null
          avg_weight_response?: number | null
          avg_weight_response_14d?: number | null
          avg_weight_response_30d?: number | null
          created_at?: string | null
          dropout_rate?: number | null
          effectiveness_tier?: string | null
          engine_version?: string | null
          id?: string
          last_updated?: string | null
          metabolic_stability?: number | null
          metabolic_success_score?: number | null
          protocol_id?: string
          stagnation_rate?: number | null
          total_applications?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_clinical_performance_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: true
            referencedRelation: "nutrition_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_cycles: {
        Row: {
          approval_required: boolean | null
          approved_at: string | null
          approved_by: string | null
          auto_adjustments: Json | null
          created_at: string | null
          ended_at: string | null
          enrollment_id: string
          id: string
          notes: string | null
          phase: number
          protocol_name: string
          started_at: string | null
          status: string
        }
        Insert: {
          approval_required?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          auto_adjustments?: Json | null
          created_at?: string | null
          ended_at?: string | null
          enrollment_id: string
          id?: string
          notes?: string | null
          phase: number
          protocol_name: string
          started_at?: string | null
          status?: string
        }
        Update: {
          approval_required?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          auto_adjustments?: Json | null
          created_at?: string | null
          ended_at?: string | null
          enrollment_id?: string
          id?: string
          notes?: string | null
          phase?: number
          protocol_name?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_cycles_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "program_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_food_substitution_groups: {
        Row: {
          created_at: string | null
          id: string
          objective: string | null
          protocol_id: string
          substitution_group: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          objective?: string | null
          protocol_id: string
          substitution_group: string
        }
        Update: {
          created_at?: string | null
          id?: string
          objective?: string | null
          protocol_id?: string
          substitution_group?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_food_substitution_groups_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "nutrition_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_intervention_log: {
        Row: {
          changes_applied: Json | null
          created_at: string
          description: string | null
          id: string
          intervention_type: string
          patient_id: string
          patient_protocol_id: string
          performed_by: string
          protocol_kept_active: boolean
          protocol_status_after: string
          protocol_status_before: string
          source: string
        }
        Insert: {
          changes_applied?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          intervention_type: string
          patient_id: string
          patient_protocol_id: string
          performed_by: string
          protocol_kept_active?: boolean
          protocol_status_after: string
          protocol_status_before: string
          source?: string
        }
        Update: {
          changes_applied?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          intervention_type?: string
          patient_id?: string
          patient_protocol_id?: string
          performed_by?: string
          protocol_kept_active?: boolean
          protocol_status_after?: string
          protocol_status_before?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_intervention_log_patient_protocol_id_fkey"
            columns: ["patient_protocol_id"]
            isOneToOne: false
            referencedRelation: "patient_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_master_settings: {
        Row: {
          apply_to_existing_patients: boolean
          apply_to_new_patients: boolean
          apply_to_programs: boolean
          auto_generate_plan: boolean
          created_at: string
          id: string
          is_enabled: boolean
          nutritionist_id: string
          plan_validity_days: number
          require_approval: boolean
          updated_at: string
        }
        Insert: {
          apply_to_existing_patients?: boolean
          apply_to_new_patients?: boolean
          apply_to_programs?: boolean
          auto_generate_plan?: boolean
          created_at?: string
          id?: string
          is_enabled?: boolean
          nutritionist_id: string
          plan_validity_days?: number
          require_approval?: boolean
          updated_at?: string
        }
        Update: {
          apply_to_existing_patients?: boolean
          apply_to_new_patients?: boolean
          apply_to_programs?: boolean
          auto_generate_plan?: boolean
          created_at?: string
          id?: string
          is_enabled?: boolean
          nutritionist_id?: string
          plan_validity_days?: number
          require_approval?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      protocol_meal_structures: {
        Row: {
          created_at: string | null
          glycemic_strategy: string | null
          id: string
          macro_distribution_pattern: string
          meal_density_level: string | null
          meals_per_day: number
          preparation_complexity: string | null
          protocol_id: string
          satiety_strategy: string | null
        }
        Insert: {
          created_at?: string | null
          glycemic_strategy?: string | null
          id?: string
          macro_distribution_pattern?: string
          meal_density_level?: string | null
          meals_per_day?: number
          preparation_complexity?: string | null
          protocol_id: string
          satiety_strategy?: string | null
        }
        Update: {
          created_at?: string | null
          glycemic_strategy?: string | null
          id?: string
          macro_distribution_pattern?: string
          meal_density_level?: string | null
          meals_per_day?: number
          preparation_complexity?: string | null
          protocol_id?: string
          satiety_strategy?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_meal_structures_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "nutrition_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_metabolic_tags: {
        Row: {
          created_at: string | null
          id: string
          protocol_id: string
          tag: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          protocol_id: string
          tag: string
        }
        Update: {
          created_at?: string | null
          id?: string
          protocol_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_metabolic_tags_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "nutrition_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_population_success_matrix: {
        Row: {
          adherence_rate: number | null
          cluster_type: string | null
          cohort_id: string | null
          dropout_rate: number | null
          evidence_strength: string | null
          id: string
          metabolic_response_score: number | null
          protocol_id: string | null
          sample_size: number | null
          stagnation_rate: number | null
          success_rate: number | null
          updated_at: string
        }
        Insert: {
          adherence_rate?: number | null
          cluster_type?: string | null
          cohort_id?: string | null
          dropout_rate?: number | null
          evidence_strength?: string | null
          id?: string
          metabolic_response_score?: number | null
          protocol_id?: string | null
          sample_size?: number | null
          stagnation_rate?: number | null
          success_rate?: number | null
          updated_at?: string
        }
        Update: {
          adherence_rate?: number | null
          cluster_type?: string | null
          cohort_id?: string | null
          dropout_rate?: number | null
          evidence_strength?: string | null
          id?: string
          metabolic_response_score?: number | null
          protocol_id?: string | null
          sample_size?: number | null
          stagnation_rate?: number | null
          success_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_population_success_matrix_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "population_nutrition_cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_population_success_matrix_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "nutrition_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_tasks: {
        Row: {
          category: string
          created_at: string
          description: string | null
          frequency: string
          icon: string
          id: string
          protocol_id: string
          sort_order: number
          tenant_id: string | null
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          frequency?: string
          icon?: string
          id?: string
          protocol_id: string
          sort_order?: number
          tenant_id?: string | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          frequency?: string
          icon?: string
          id?: string
          protocol_id?: string
          sort_order?: number
          tenant_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_tasks_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_transition_suggestions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          calorie_adjustment_percent: number | null
          clinical_reason: string
          confidence_level: string | null
          confidence_score: number | null
          created_at: string | null
          current_plan_id: string | null
          current_protocol_id: string | null
          engine_version: string | null
          expected_strategy_outcome: string | null
          id: string
          nutritionist_id: string
          patient_id: string
          status: string | null
          suggested_protocol_id: string | null
          suggested_template_id: string | null
          supporting_metrics: Json | null
          transition_type: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          calorie_adjustment_percent?: number | null
          clinical_reason: string
          confidence_level?: string | null
          confidence_score?: number | null
          created_at?: string | null
          current_plan_id?: string | null
          current_protocol_id?: string | null
          engine_version?: string | null
          expected_strategy_outcome?: string | null
          id?: string
          nutritionist_id: string
          patient_id: string
          status?: string | null
          suggested_protocol_id?: string | null
          suggested_template_id?: string | null
          supporting_metrics?: Json | null
          transition_type?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          calorie_adjustment_percent?: number | null
          clinical_reason?: string
          confidence_level?: string | null
          confidence_score?: number | null
          created_at?: string | null
          current_plan_id?: string | null
          current_protocol_id?: string | null
          engine_version?: string | null
          expected_strategy_outcome?: string | null
          id?: string
          nutritionist_id?: string
          patient_id?: string
          status?: string | null
          suggested_protocol_id?: string | null
          suggested_template_id?: string | null
          supporting_metrics?: Json | null
          transition_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_transition_suggestions_current_plan_id_fkey"
            columns: ["current_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_resolved_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_transition_suggestions_current_plan_id_fkey"
            columns: ["current_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_transition_suggestions_current_plan_id_fkey"
            columns: ["current_plan_id"]
            isOneToOne: false
            referencedRelation: "v_plan_visibility_diagnostics"
            referencedColumns: ["plan_id"]
          },
          {
            foreignKeyName: "protocol_transition_suggestions_current_protocol_id_fkey"
            columns: ["current_protocol_id"]
            isOneToOne: false
            referencedRelation: "nutrition_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_transition_suggestions_suggested_protocol_id_fkey"
            columns: ["suggested_protocol_id"]
            isOneToOne: false
            referencedRelation: "nutrition_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_transition_suggestions_suggested_template_id_fkey"
            columns: ["suggested_template_id"]
            isOneToOne: false
            referencedRelation: "diet_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      protocols: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string | null
          duration_days: number
          id: string
          is_system: boolean
          is_template: boolean
          phase_config: Json | null
          protocol_key: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          description?: string | null
          duration_days?: number
          id?: string
          is_system?: boolean
          is_template?: boolean
          phase_config?: Json | null
          protocol_key?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_system?: boolean
          is_template?: boolean
          phase_config?: Json | null
          protocol_key?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      public_profile_settings: {
        Row: {
          bio: string | null
          booking_enabled: boolean | null
          booking_payment_required: boolean | null
          booking_price: number | null
          created_at: string
          id: string
          is_public: boolean
          nutritionist_id: string
          slug: string
          specialties: string[] | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          booking_enabled?: boolean | null
          booking_payment_required?: boolean | null
          booking_price?: number | null
          created_at?: string
          id?: string
          is_public?: boolean
          nutritionist_id: string
          slug: string
          specialties?: string[] | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          booking_enabled?: boolean | null
          booking_payment_required?: boolean | null
          booking_price?: number | null
          created_at?: string
          id?: string
          is_public?: boolean
          nutritionist_id?: string
          slug?: string
          specialties?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      public_route_audits: {
        Row: {
          checked_at: string
          id: string
          notes: string | null
          ok: boolean
          pathname: string
          status_code: number
        }
        Insert: {
          checked_at?: string
          id?: string
          notes?: string | null
          ok: boolean
          pathname: string
          status_code: number
        }
        Update: {
          checked_at?: string
          id?: string
          notes?: string | null
          ok?: boolean
          pathname?: string
          status_code?: number
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      qa_checklist_runs: {
        Row: {
          audit_snapshot: Json | null
          checklist_key: string
          created_at: string
          device_label: string | null
          executed_by: string | null
          id: string
          notes: string | null
          passed: boolean
          steps: Json
          telemetry_snapshot: Json | null
          user_agent: string | null
        }
        Insert: {
          audit_snapshot?: Json | null
          checklist_key: string
          created_at?: string
          device_label?: string | null
          executed_by?: string | null
          id?: string
          notes?: string | null
          passed?: boolean
          steps?: Json
          telemetry_snapshot?: Json | null
          user_agent?: string | null
        }
        Update: {
          audit_snapshot?: Json | null
          checklist_key?: string
          created_at?: string
          device_label?: string | null
          executed_by?: string | null
          id?: string
          notes?: string | null
          passed?: boolean
          steps?: Json
          telemetry_snapshot?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      quick_meal_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          items: Json
          meal_type: string | null
          nutritionist_id: string
          template_name: string
          template_type: string
          tenant_id: string
          total_calories: number
          total_carbs: number
          total_fat: number
          total_protein: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          items?: Json
          meal_type?: string | null
          nutritionist_id: string
          template_name?: string
          template_type?: string
          tenant_id: string
          total_calories?: number
          total_carbs?: number
          total_fat?: number
          total_protein?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          items?: Json
          meal_type?: string | null
          nutritionist_id?: string
          template_name?: string
          template_type?: string
          tenant_id?: string
          total_calories?: number
          total_carbs?: number
          total_fat?: number
          total_protein?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_quick_template_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_reply_templates: {
        Row: {
          category: string
          created_at: string
          icon: string
          id: string
          is_active: boolean
          message: string
          priority: number
          trigger_signal: string
        }
        Insert: {
          category?: string
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          message: string
          priority?: number
          trigger_signal: string
        }
        Update: {
          category?: string
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          message?: string
          priority?: number
          trigger_signal?: string
        }
        Relationships: []
      }
      ranking_point_rules: {
        Row: {
          action_key: string
          action_label: string
          created_at: string
          daily_limit: number | null
          icon: string
          id: string
          is_active: boolean
          points: number
        }
        Insert: {
          action_key: string
          action_label: string
          created_at?: string
          daily_limit?: number | null
          icon?: string
          id?: string
          is_active?: boolean
          points?: number
        }
        Update: {
          action_key?: string
          action_label?: string
          created_at?: string
          daily_limit?: number | null
          icon?: string
          id?: string
          is_active?: boolean
          points?: number
        }
        Relationships: []
      }
      ranking_snapshots: {
        Row: {
          created_at: string
          id: string
          patient_id: string
          period_type: string
          plan_slug: string | null
          points_checkin: number | null
          points_checklist: number | null
          points_meals: number | null
          points_other: number | null
          points_protocols: number | null
          points_training: number | null
          rank_position: number | null
          snapshot_date: string
          total_points: number
        }
        Insert: {
          created_at?: string
          id?: string
          patient_id: string
          period_type?: string
          plan_slug?: string | null
          points_checkin?: number | null
          points_checklist?: number | null
          points_meals?: number | null
          points_other?: number | null
          points_protocols?: number | null
          points_training?: number | null
          rank_position?: number | null
          snapshot_date?: string
          total_points?: number
        }
        Update: {
          created_at?: string
          id?: string
          patient_id?: string
          period_type?: string
          plan_slug?: string | null
          points_checkin?: number | null
          points_checklist?: number | null
          points_meals?: number | null
          points_other?: number | null
          points_protocols?: number | null
          points_training?: number | null
          rank_position?: number | null
          snapshot_date?: string
          total_points?: number
        }
        Relationships: []
      }
      recalibration_audit_log: {
        Row: {
          adjustment_percent: number
          approved_by: string | null
          created_at: string
          engine_component: string
          engine_version: string
          evidence_strength: number | null
          id: string
          new_weight: number
          old_weight: number
          parameter_name: string
          reason: string
          rollback_at: string | null
          sample_size: number | null
          status: string
        }
        Insert: {
          adjustment_percent: number
          approved_by?: string | null
          created_at?: string
          engine_component: string
          engine_version?: string
          evidence_strength?: number | null
          id?: string
          new_weight: number
          old_weight: number
          parameter_name: string
          reason: string
          rollback_at?: string | null
          sample_size?: number | null
          status?: string
        }
        Update: {
          adjustment_percent?: number
          approved_by?: string | null
          created_at?: string
          engine_component?: string
          engine_version?: string
          evidence_strength?: number | null
          id?: string
          new_weight?: number
          old_weight?: number
          parameter_name?: string
          reason?: string
          rollback_at?: string | null
          sample_size?: number | null
          status?: string
        }
        Relationships: []
      }
      recipe_curation_queue: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          nutritionist_id: string
          patient_id: string
          recipe_id: string
          reviewed_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          nutritionist_id: string
          patient_id: string
          recipe_id: string
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          nutritionist_id?: string
          patient_id?: string
          recipe_id?: string
          reviewed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_curation_queue_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "user_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_image_cache: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          is_valid: boolean | null
          last_validated: string | null
          status_code: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          is_valid?: boolean | null
          last_validated?: string | null
          status_code?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          is_valid?: boolean | null
          last_validated?: string | null
          status_code?: number | null
        }
        Relationships: []
      }
      recipe_image_fallbacks: {
        Row: {
          created_at: string | null
          error_message: string | null
          fallback_url: string
          http_status_code: number | null
          id: string
          meal_name: string | null
          original_url: string | null
          recipe_id: string | null
          recipe_name: string
          revalidated_at: string | null
          revalidated_status: string | null
          severity: string | null
          template_name: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          fallback_url: string
          http_status_code?: number | null
          id?: string
          meal_name?: string | null
          original_url?: string | null
          recipe_id?: string | null
          recipe_name: string
          revalidated_at?: string | null
          revalidated_status?: string | null
          severity?: string | null
          template_name?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          fallback_url?: string
          http_status_code?: number | null
          id?: string
          meal_name?: string | null
          original_url?: string | null
          recipe_id?: string | null
          recipe_name?: string
          revalidated_at?: string | null
          revalidated_status?: string | null
          severity?: string | null
          template_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_image_fallbacks_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "meal_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_items: {
        Row: {
          created_at: string
          display_order: number | null
          food_id: string | null
          food_name: string
          grams_reference: number
          id: string
          is_scalable: boolean
          recipe_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          food_id?: string | null
          food_name: string
          grams_reference?: number
          id?: string
          is_scalable?: boolean
          recipe_id: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          food_id?: string | null
          food_name?: string
          grams_reference?: number
          id?: string
          is_scalable?: boolean
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_items_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "ifj_food_database"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          calories_per_serving: number | null
          carbs_per_serving: number | null
          category: string | null
          cook_time_minutes: number | null
          created_at: string
          description: string | null
          difficulty: string | null
          fat_per_serving: number | null
          id: string
          image_url: string | null
          ingredients: Json
          instructions: Json
          is_ai_generated: boolean | null
          is_shared: boolean | null
          nutritionist_id: string
          prep_time_minutes: number | null
          protein_per_serving: number | null
          servings: number | null
          tags: string[] | null
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          calories_per_serving?: number | null
          carbs_per_serving?: number | null
          category?: string | null
          cook_time_minutes?: number | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          fat_per_serving?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          instructions?: Json
          is_ai_generated?: boolean | null
          is_shared?: boolean | null
          nutritionist_id: string
          prep_time_minutes?: number | null
          protein_per_serving?: number | null
          servings?: number | null
          tags?: string[] | null
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          calories_per_serving?: number | null
          carbs_per_serving?: number | null
          category?: string | null
          cook_time_minutes?: number | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          fat_per_serving?: number | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          instructions?: Json
          is_ai_generated?: boolean | null
          is_shared?: boolean | null
          nutritionist_id?: string
          prep_time_minutes?: number | null
          protein_per_serving?: number | null
          servings?: number | null
          tags?: string[] | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_library: {
        Row: {
          action_route: string | null
          action_type: string | null
          body_template: string
          category: string
          created_at: string
          icon: string
          id: string
          is_active: boolean
          priority: string
          rec_key: string
          tags: string[] | null
          target_audience: string
          title: string
        }
        Insert: {
          action_route?: string | null
          action_type?: string | null
          body_template: string
          category?: string
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          priority?: string
          rec_key: string
          tags?: string[] | null
          target_audience?: string
          title: string
        }
        Update: {
          action_route?: string | null
          action_type?: string | null
          body_template?: string
          category?: string
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          priority?: string
          rec_key?: string
          tags?: string[] | null
          target_audience?: string
          title?: string
        }
        Relationships: []
      }
      regression_guard_logs: {
        Row: {
          affected_flow: string
          auto_fallback_applied: boolean
          created_at: string
          detected_issue: string
          id: string
          metadata: Json | null
          severity: string
          source_layer: string
        }
        Insert: {
          affected_flow: string
          auto_fallback_applied?: boolean
          created_at?: string
          detected_issue: string
          id?: string
          metadata?: Json | null
          severity?: string
          source_layer?: string
        }
        Update: {
          affected_flow?: string
          auto_fallback_applied?: boolean
          created_at?: string
          detected_issue?: string
          id?: string
          metadata?: Json | null
          severity?: string
          source_layer?: string
        }
        Relationships: []
      }
      relationship_notes: {
        Row: {
          created_at: string | null
          id: string
          note: string
          note_type: string | null
          patient_id: string
          professional_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          note: string
          note_type?: string | null
          patient_id: string
          professional_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          note?: string
          note_type?: string | null
          patient_id?: string
          professional_id?: string
        }
        Relationships: []
      }
      route_404_telemetry: {
        Row: {
          build_hash: string | null
          created_at: string
          full_url: string | null
          has_service_worker: boolean
          id: string
          is_ios: boolean
          is_safari: boolean
          is_standalone: boolean
          metadata: Json
          pathname: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          build_hash?: string | null
          created_at?: string
          full_url?: string | null
          has_service_worker?: boolean
          id?: string
          is_ios?: boolean
          is_safari?: boolean
          is_standalone?: boolean
          metadata?: Json
          pathname: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          build_hash?: string | null
          created_at?: string
          full_url?: string | null
          has_service_worker?: boolean
          id?: string
          is_ios?: boolean
          is_safari?: boolean
          is_standalone?: boolean
          metadata?: Json
          pathname?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      route_audit_alerts: {
        Row: {
          audit_run_id: string | null
          created_at: string
          id: string
          notes: string | null
          pathname: string
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          status_code: number
        }
        Insert: {
          audit_run_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          pathname: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          status_code?: number
        }
        Update: {
          audit_run_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          pathname?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          status_code?: number
        }
        Relationships: []
      }
      runtime_patient_fixes: {
        Row: {
          actions: Json
          context: string | null
          created_at: string
          error_message: string | null
          id: string
          issues: Json
          patient_id: string
          status: string
        }
        Insert: {
          actions?: Json
          context?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          issues?: Json
          patient_id: string
          status: string
        }
        Update: {
          actions?: Json
          context?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          issues?: Json
          patient_id?: string
          status?: string
        }
        Relationships: []
      }
      saved_manual_plans: {
        Row: {
          created_at: string
          days: Json
          id: string
          tenant_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days?: Json
          id?: string
          tenant_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          days?: Json
          id?: string
          tenant_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_meal_templates: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          items: Json
          meal_type: string | null
          name: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          items?: Json
          meal_type?: string | null
          name: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          items?: Json
          meal_type?: string | null
          name?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_meals: {
        Row: {
          calories_target: number | null
          carbs_target: number | null
          created_at: string
          description: string | null
          fat_target: number | null
          id: string
          image_url: string | null
          meal_type: Database["public"]["Enums"]["meal_type"]
          nutritionist_id: string
          protein_target: number | null
          title: string
          visual_library_item_id: string | null
        }
        Insert: {
          calories_target?: number | null
          carbs_target?: number | null
          created_at?: string
          description?: string | null
          fat_target?: number | null
          id?: string
          image_url?: string | null
          meal_type?: Database["public"]["Enums"]["meal_type"]
          nutritionist_id: string
          protein_target?: number | null
          title: string
          visual_library_item_id?: string | null
        }
        Update: {
          calories_target?: number | null
          carbs_target?: number | null
          created_at?: string
          description?: string | null
          fat_target?: number | null
          id?: string
          image_url?: string | null
          meal_type?: Database["public"]["Enums"]["meal_type"]
          nutritionist_id?: string
          protein_target?: number | null
          title?: string
          visual_library_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_meals_visual_library_item_id_fkey"
            columns: ["visual_library_item_id"]
            isOneToOne: false
            referencedRelation: "meal_visual_library"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_plan_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          items: Json
          nutritionist_id: string
          source_plan_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          items?: Json
          nutritionist_id: string
          source_plan_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          items?: Json
          nutritionist_id?: string
          source_plan_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_plan_templates_source_plan_id_fkey"
            columns: ["source_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_resolved_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_plan_templates_source_plan_id_fkey"
            columns: ["source_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_plan_templates_source_plan_id_fkey"
            columns: ["source_plan_id"]
            isOneToOne: false
            referencedRelation: "v_plan_visibility_diagnostics"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          event_type: string
          function_name: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          function_name?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          function_name?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      shopping_list_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_checked: boolean | null
          item_name: string
          meal_plan_id: string | null
          patient_id: string
          quantity: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_checked?: boolean | null
          item_name: string
          meal_plan_id?: string | null
          patient_id: string
          quantity?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_checked?: boolean | null
          item_name?: string
          meal_plan_id?: string | null
          patient_id?: string
          quantity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_resolved_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_items_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "v_plan_visibility_diagnostics"
            referencedColumns: ["plan_id"]
          },
        ]
      }
      silent_failures_monitor: {
        Row: {
          created_at: string
          days_since_expected: number | null
          entity_id: string | null
          entity_type: string
          expected_action: string
          failure_reason: string | null
          id: string
          resolved: boolean | null
          severity: string | null
        }
        Insert: {
          created_at?: string
          days_since_expected?: number | null
          entity_id?: string | null
          entity_type: string
          expected_action: string
          failure_reason?: string | null
          id?: string
          resolved?: boolean | null
          severity?: string | null
        }
        Update: {
          created_at?: string
          days_since_expected?: number | null
          entity_id?: string | null
          entity_type?: string
          expected_action?: string
          failure_reason?: string | null
          id?: string
          resolved?: boolean | null
          severity?: string | null
        }
        Relationships: []
      }
      simulation_rate_limits: {
        Row: {
          id: string
          run_count: number
          run_date: string
          user_id: string
        }
        Insert: {
          id?: string
          run_count?: number
          run_date?: string
          user_id: string
        }
        Update: {
          id?: string
          run_count?: number
          run_date?: string
          user_id?: string
        }
        Relationships: []
      }
      simulation_runs: {
        Row: {
          created_at: string
          duration_ms: number | null
          errors: string[] | null
          executed_by: string | null
          finished_at: string | null
          id: string
          mode: string
          results_json: Json | null
          scenarios_failed: number
          scenarios_passed: number
          scenarios_skipped: number
          scenarios_total: number
          started_at: string
          status: string
          warnings: string[] | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          errors?: string[] | null
          executed_by?: string | null
          finished_at?: string | null
          id?: string
          mode?: string
          results_json?: Json | null
          scenarios_failed?: number
          scenarios_passed?: number
          scenarios_skipped?: number
          scenarios_total?: number
          started_at?: string
          status?: string
          warnings?: string[] | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          errors?: string[] | null
          executed_by?: string | null
          finished_at?: string | null
          id?: string
          mode?: string
          results_json?: Json | null
          scenarios_failed?: number
          scenarios_passed?: number
          scenarios_skipped?: number
          scenarios_total?: number
          started_at?: string
          status?: string
          warnings?: string[] | null
        }
        Relationships: []
      }
      simulation_scenario_results: {
        Row: {
          affected_function: string | null
          affected_route: string | null
          created_at: string
          duration_ms: number | null
          error_detail: string | null
          error_message: string | null
          id: string
          run_id: string
          scenario_group: string
          scenario_name: string
          status: string
        }
        Insert: {
          affected_function?: string | null
          affected_route?: string | null
          created_at?: string
          duration_ms?: number | null
          error_detail?: string | null
          error_message?: string | null
          id?: string
          run_id: string
          scenario_group: string
          scenario_name: string
          status?: string
        }
        Update: {
          affected_function?: string | null
          affected_route?: string | null
          created_at?: string
          duration_ms?: number | null
          error_detail?: string | null
          error_message?: string | null
          id?: string
          run_id?: string
          scenario_group?: string
          scenario_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_scenario_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "simulation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      simulator_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_state: boolean | null
          performed_by: string | null
          previous_state: boolean | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_state?: boolean | null
          performed_by?: string | null
          previous_state?: boolean | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_state?: boolean | null
          performed_by?: string | null
          previous_state?: boolean | null
        }
        Relationships: []
      }
      single_day_sync_logs: {
        Row: {
          affected_rows: number
          created_at: string
          error_detail: string | null
          error_message: string | null
          id: string
          items_converted_to_substitution: number | null
          items_moved: number | null
          items_removed: number | null
          master_item_id: string | null
          meal_plan_id: string | null
          operation: string
          payload: Json | null
          status: string
          triggered_by: string | null
        }
        Insert: {
          affected_rows?: number
          created_at?: string
          error_detail?: string | null
          error_message?: string | null
          id?: string
          items_converted_to_substitution?: number | null
          items_moved?: number | null
          items_removed?: number | null
          master_item_id?: string | null
          meal_plan_id?: string | null
          operation: string
          payload?: Json | null
          status: string
          triggered_by?: string | null
        }
        Update: {
          affected_rows?: number
          created_at?: string
          error_detail?: string | null
          error_message?: string | null
          id?: string
          items_converted_to_substitution?: number | null
          items_moved?: number | null
          items_removed?: number | null
          master_item_id?: string | null
          meal_plan_id?: string | null
          operation?: string
          payload?: Json | null
          status?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          category: string
          id: string
          label: string
          setting_key: string
          setting_type: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          id?: string
          label?: string
          setting_key: string
          setting_type?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          id?: string
          label?: string
          setting_key?: string
          setting_type?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      smart_generated_slides: {
        Row: {
          animation_suggestion: string | null
          bullets: Json
          created_at: string
          created_by: string | null
          cta_text: string | null
          emoji: string | null
          gradient: string | null
          icon_suggestion: string | null
          id: string
          slide_type: string
          soundtrack_suggestion: string | null
          source_data: Json | null
          status: string
          subtitle: string | null
          target_audience: string
          theme: string
          title: string
          tone: string
          updated_at: string
          visual_style: Json
        }
        Insert: {
          animation_suggestion?: string | null
          bullets?: Json
          created_at?: string
          created_by?: string | null
          cta_text?: string | null
          emoji?: string | null
          gradient?: string | null
          icon_suggestion?: string | null
          id?: string
          slide_type?: string
          soundtrack_suggestion?: string | null
          source_data?: Json | null
          status?: string
          subtitle?: string | null
          target_audience?: string
          theme?: string
          title: string
          tone?: string
          updated_at?: string
          visual_style?: Json
        }
        Update: {
          animation_suggestion?: string | null
          bullets?: Json
          created_at?: string
          created_by?: string | null
          cta_text?: string | null
          emoji?: string | null
          gradient?: string | null
          icon_suggestion?: string | null
          id?: string
          slide_type?: string
          soundtrack_suggestion?: string | null
          source_data?: Json | null
          status?: string
          subtitle?: string | null
          target_audience?: string
          theme?: string
          title?: string
          tone?: string
          updated_at?: string
          visual_style?: Json
        }
        Relationships: []
      }
      sos_tickets: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          nutritionist_id: string | null
          patient_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          nutritionist_id?: string | null
          patient_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          nutritionist_id?: string | null
          patient_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_products: {
        Row: {
          calories_per_100g: number | null
          carbs_per_100g: number | null
          category: string
          created_at: string
          fat_per_100g: number | null
          id: string
          is_active: boolean
          name: string
          owner_id: string
          price_per_unit: number
          protein_per_100g: number | null
          stock_quantity: number | null
          supplier: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          calories_per_100g?: number | null
          carbs_per_100g?: number | null
          category?: string
          created_at?: string
          fat_per_100g?: number | null
          id?: string
          is_active?: boolean
          name: string
          owner_id: string
          price_per_unit?: number
          protein_per_100g?: number | null
          stock_quantity?: number | null
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          calories_per_100g?: number | null
          carbs_per_100g?: number | null
          category?: string
          created_at?: string
          fat_per_100g?: number | null
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string
          price_per_unit?: number
          protein_per_100g?: number | null
          stock_quantity?: number | null
          supplier?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          features: Json | null
          id: string
          max_patients: number | null
          plan_name: string
          started_at: string
          status: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          features?: Json | null
          id?: string
          max_patients?: number | null
          plan_name?: string
          started_at?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          features?: Json | null
          id?: string
          max_patients?: number | null
          plan_name?: string
          started_at?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      supplement_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          patient_id: string
          supplement_id: string
          taken_at: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          patient_id: string
          supplement_id: string
          taken_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          patient_id?: string
          supplement_id?: string
          taken_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplement_logs_supplement_id_fkey"
            columns: ["supplement_id"]
            isOneToOne: false
            referencedRelation: "patient_supplements"
            referencedColumns: ["id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          alert_type: string
          correlation_id: string | null
          created_at: string | null
          function_name: string | null
          id: string
          is_resolved: boolean | null
          message: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
        }
        Insert: {
          alert_type: string
          correlation_id?: string | null
          created_at?: string | null
          function_name?: string | null
          id?: string
          is_resolved?: boolean | null
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
        }
        Update: {
          alert_type?: string
          correlation_id?: string | null
          created_at?: string | null
          function_name?: string | null
          id?: string
          is_resolved?: boolean | null
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
        }
        Relationships: []
      }
      system_config: {
        Row: {
          created_at: string | null
          default_meal_structure: Json | null
          id: string
          plan_mode: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_meal_structure?: Json | null
          id?: string
          plan_mode?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_meal_structure?: Json | null
          id?: string
          plan_mode?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_diagnostic_entries: {
        Row: {
          context_json: Json | null
          detail: string | null
          detected_at: string
          id: string
          message: string
          module: string
          run_id: string | null
          severity: string
        }
        Insert: {
          context_json?: Json | null
          detail?: string | null
          detected_at?: string
          id?: string
          message: string
          module: string
          run_id?: string | null
          severity?: string
        }
        Update: {
          context_json?: Json | null
          detail?: string | null
          detected_at?: string
          id?: string
          message?: string
          module?: string
          run_id?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_diagnostic_entries_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "system_diagnostic_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      system_diagnostic_logs: {
        Row: {
          created_at: string
          critical_count: number
          duration_ms: number | null
          executed_by: string | null
          health_score: number
          id: string
          ok_count: number
          report_json: Json
          test_type: string
          warning_count: number
        }
        Insert: {
          created_at?: string
          critical_count?: number
          duration_ms?: number | null
          executed_by?: string | null
          health_score?: number
          id?: string
          ok_count?: number
          report_json?: Json
          test_type?: string
          warning_count?: number
        }
        Update: {
          created_at?: string
          critical_count?: number
          duration_ms?: number | null
          executed_by?: string | null
          health_score?: number
          id?: string
          ok_count?: number
          report_json?: Json
          test_type?: string
          warning_count?: number
        }
        Relationships: []
      }
      system_error_logs: {
        Row: {
          action_attempted: string | null
          auto_recovered: boolean | null
          created_at: string
          error_message: string
          id: string
          module: string
          page_route: string | null
          role: string | null
          severity: string
          stack_trace: string | null
          user_id: string | null
        }
        Insert: {
          action_attempted?: string | null
          auto_recovered?: boolean | null
          created_at?: string
          error_message: string
          id?: string
          module: string
          page_route?: string | null
          role?: string | null
          severity?: string
          stack_trace?: string | null
          user_id?: string | null
        }
        Update: {
          action_attempted?: string | null
          auto_recovered?: boolean | null
          created_at?: string
          error_message?: string
          id?: string
          module?: string
          page_route?: string | null
          role?: string | null
          severity?: string
          stack_trace?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          flag_key: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          flag_key: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          enabled?: boolean
          flag_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          category: string
          correlation_id: string
          created_at: string | null
          id: string
          is_resolved: boolean | null
          level: string
          message: string
          metadata: Json | null
          route: string | null
          section: string
          severity: string
          stack: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          correlation_id: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          level: string
          message: string
          metadata?: Json | null
          route?: string | null
          section: string
          severity: string
          stack?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          correlation_id?: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          level?: string
          message?: string
          metadata?: Json | null
          route?: string | null
          section?: string
          severity?: string
          stack?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_performance_logs: {
        Row: {
          api_calls_count: number | null
          created_at: string
          execution_time_ms: number
          flow_name: string
          id: string
          queries_count: number | null
          success: boolean | null
          user_role: string | null
        }
        Insert: {
          api_calls_count?: number | null
          created_at?: string
          execution_time_ms: number
          flow_name: string
          id?: string
          queries_count?: number | null
          success?: boolean | null
          user_role?: string | null
        }
        Update: {
          api_calls_count?: number | null
          created_at?: string
          execution_time_ms?: number
          flow_name?: string
          id?: string
          queries_count?: number | null
          success?: boolean | null
          user_role?: string | null
        }
        Relationships: []
      }
      team_member_activity_logs: {
        Row: {
          action: string
          created_at: string
          head_professional_id: string
          id: string
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          team_member_id: string
        }
        Insert: {
          action: string
          created_at?: string
          head_professional_id: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          team_member_id: string
        }
        Update: {
          action?: string
          created_at?: string
          head_professional_id?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_activity_logs_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_member_patient_assignments: {
        Row: {
          created_at: string
          head_professional_id: string
          id: string
          patient_id: string
          team_member_id: string
        }
        Insert: {
          created_at?: string
          head_professional_id: string
          id?: string
          patient_id: string
          team_member_id: string
        }
        Update: {
          created_at?: string
          head_professional_id?: string
          id?: string
          patient_id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_patient_assignments_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_member_permissions: {
        Row: {
          can_access_financial: boolean
          can_access_ranking: boolean
          can_access_reports: boolean
          can_approve_plans: boolean
          can_edit_meal_plans: boolean
          can_manage_automation: boolean
          can_manage_team: boolean
          can_respond_feedback: boolean
          can_view_checkins: boolean
          can_view_clinical_risk: boolean
          can_view_meal_plans: boolean
          can_view_patient_details: boolean
          can_view_patients: boolean
          can_view_pending_plans: boolean
          can_view_projection: boolean
          can_view_timeline: boolean
          created_at: string
          head_professional_id: string
          id: string
          team_member_id: string
          updated_at: string
        }
        Insert: {
          can_access_financial?: boolean
          can_access_ranking?: boolean
          can_access_reports?: boolean
          can_approve_plans?: boolean
          can_edit_meal_plans?: boolean
          can_manage_automation?: boolean
          can_manage_team?: boolean
          can_respond_feedback?: boolean
          can_view_checkins?: boolean
          can_view_clinical_risk?: boolean
          can_view_meal_plans?: boolean
          can_view_patient_details?: boolean
          can_view_patients?: boolean
          can_view_pending_plans?: boolean
          can_view_projection?: boolean
          can_view_timeline?: boolean
          created_at?: string
          head_professional_id: string
          id?: string
          team_member_id: string
          updated_at?: string
        }
        Update: {
          can_access_financial?: boolean
          can_access_ranking?: boolean
          can_access_reports?: boolean
          can_approve_plans?: boolean
          can_edit_meal_plans?: boolean
          can_manage_automation?: boolean
          can_manage_team?: boolean
          can_respond_feedback?: boolean
          can_view_checkins?: boolean
          can_view_clinical_risk?: boolean
          can_view_meal_plans?: boolean
          can_view_patient_details?: boolean
          can_view_patients?: boolean
          can_view_pending_plans?: boolean
          can_view_projection?: boolean
          can_view_timeline?: boolean
          created_at?: string
          head_professional_id?: string
          id?: string
          team_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_permissions_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: true
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          display_name: string | null
          head_professional_id: string
          id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          head_professional_id: string
          id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          head_professional_id?: string
          id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      technical_sheet_items: {
        Row: {
          calories: number | null
          carbs: number | null
          cost: number | null
          created_at: string
          fat: number | null
          id: string
          product_id: string
          protein: number | null
          quantity_grams: number
          sheet_id: string
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          cost?: number | null
          created_at?: string
          fat?: number | null
          id?: string
          product_id: string
          protein?: number | null
          quantity_grams?: number
          sheet_id: string
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          cost?: number | null
          created_at?: string
          fat?: number | null
          id?: string
          product_id?: string
          protein?: number | null
          quantity_grams?: number
          sheet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_sheet_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_sheet_items_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "technical_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_sheets: {
        Row: {
          category: string | null
          cost_per_portion: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          margin_percent: number | null
          name: string
          owner_id: string
          portions: number
          sale_price: number | null
          total_calories: number | null
          total_carbs: number | null
          total_cost: number | null
          total_fat: number | null
          total_protein: number | null
          total_weight_g: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          cost_per_portion?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          margin_percent?: number | null
          name: string
          owner_id: string
          portions?: number
          sale_price?: number | null
          total_calories?: number | null
          total_carbs?: number | null
          total_cost?: number | null
          total_fat?: number | null
          total_protein?: number | null
          total_weight_g?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          cost_per_portion?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          margin_percent?: number | null
          name?: string
          owner_id?: string
          portions?: number
          sale_price?: number | null
          total_calories?: number | null
          total_carbs?: number | null
          total_cost?: number | null
          total_fat?: number | null
          total_protein?: number | null
          total_weight_g?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      template_audit_rules_config: {
        Row: {
          rule_key: string
          severity: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          rule_key: string
          severity: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          rule_key?: string
          severity?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      template_audit_rules_versions: {
        Row: {
          action: string
          change_summary: string | null
          changed_rule_key: string | null
          created_at: string
          created_by: string | null
          id: string
          new_severity: string | null
          previous_severity: string | null
          snapshot: Json
          version_number: number
        }
        Insert: {
          action: string
          change_summary?: string | null
          changed_rule_key?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          new_severity?: string | null
          previous_severity?: string | null
          snapshot: Json
          version_number?: number
        }
        Update: {
          action?: string
          change_summary?: string | null
          changed_rule_key?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          new_severity?: string | null
          previous_severity?: string | null
          snapshot?: Json
          version_number?: number
        }
        Relationships: []
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          owner_user_id: string
          plan_type: Database["public"]["Enums"]["tenant_plan"]
          settings: Json | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          owner_user_id: string
          plan_type?: Database["public"]["Enums"]["tenant_plan"]
          settings?: Json | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          owner_user_id?: string
          plan_type?: Database["public"]["Enums"]["tenant_plan"]
          settings?: Json | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          avatar_url: string | null
          content: string
          created_at: string
          display_name: string | null
          id: string
          is_anonymous: boolean
          nutritionist_id: string | null
          patient_id: string
          rating: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          content: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_anonymous?: boolean
          nutritionist_id?: string | null
          patient_id: string
          rating?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          content?: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_anonymous?: boolean
          nutritionist_id?: string | null
          patient_id?: string
          rating?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      therapeutic_adjustment_history: {
        Row: {
          adjustment_description: string | null
          adjustment_type: string
          after_snapshot: Json | null
          applied_at: string
          applied_by: string | null
          before_snapshot: Json | null
          clinical_response_7d: Json | null
          created_at: string
          flag_origin: string | null
          id: string
          patient_id: string
          response_score: number | null
        }
        Insert: {
          adjustment_description?: string | null
          adjustment_type: string
          after_snapshot?: Json | null
          applied_at?: string
          applied_by?: string | null
          before_snapshot?: Json | null
          clinical_response_7d?: Json | null
          created_at?: string
          flag_origin?: string | null
          id?: string
          patient_id: string
          response_score?: number | null
        }
        Update: {
          adjustment_description?: string | null
          adjustment_type?: string
          after_snapshot?: Json | null
          applied_at?: string
          applied_by?: string | null
          before_snapshot?: Json | null
          clinical_response_7d?: Json | null
          created_at?: string
          flag_origin?: string | null
          id?: string
          patient_id?: string
          response_score?: number | null
        }
        Relationships: []
      }
      timeline_comments: {
        Row: {
          author_id: string
          comment_text: string
          created_at: string
          event_id: string
          id: string
        }
        Insert: {
          author_id: string
          comment_text: string
          created_at?: string
          event_id: string
          id?: string
        }
        Update: {
          author_id?: string
          comment_text?: string
          created_at?: string
          event_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_comments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "timeline_events"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_events: {
        Row: {
          author_id: string
          created_at: string
          description: string | null
          event_type: string
          id: string
          is_pinned: boolean | null
          media_url: string | null
          metadata_json: Json | null
          poll_options: Json | null
          poll_question: string | null
          target_patient_id: string | null
          tenant_id: string | null
          title: string
          visibility_scope: string
          workspace_id: string
        }
        Insert: {
          author_id: string
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          is_pinned?: boolean | null
          media_url?: string | null
          metadata_json?: Json | null
          poll_options?: Json | null
          poll_question?: string | null
          target_patient_id?: string | null
          tenant_id?: string | null
          title: string
          visibility_scope?: string
          workspace_id: string
        }
        Update: {
          author_id?: string
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          is_pinned?: boolean | null
          media_url?: string | null
          metadata_json?: Json | null
          poll_options?: Json | null
          poll_question?: string | null
          target_patient_id?: string | null
          tenant_id?: string | null
          title?: string
          visibility_scope?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_poll_votes: {
        Row: {
          created_at: string
          event_id: string
          id: string
          option_selected: number
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          option_selected: number
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          option_selected?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_poll_votes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "timeline_events"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_reactions: {
        Row: {
          created_at: string
          emoji: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_reactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "timeline_events"
            referencedColumns: ["id"]
          },
        ]
      }
      tip_library: {
        Row: {
          age_group: string | null
          behavior_pattern: string | null
          category: string
          content: string
          created_at: string
          goal: string | null
          icon: string
          id: string
          is_active: boolean
          severity: string
          sex: string | null
          signal_key: string | null
          tip_key: string
        }
        Insert: {
          age_group?: string | null
          behavior_pattern?: string | null
          category?: string
          content: string
          created_at?: string
          goal?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          severity?: string
          sex?: string | null
          signal_key?: string | null
          tip_key: string
        }
        Update: {
          age_group?: string | null
          behavior_pattern?: string | null
          category?: string
          content?: string
          created_at?: string
          goal?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          severity?: string
          sex?: string | null
          signal_key?: string | null
          tip_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "tip_library_signal_key_fkey"
            columns: ["signal_key"]
            isOneToOne: false
            referencedRelation: "clinical_signals_catalog"
            referencedColumns: ["signal_key"]
          },
        ]
      }
      trainer_assessments: {
        Row: {
          available_equipment: string[] | null
          available_hours: string[] | null
          coaching_intensity: string | null
          created_at: string | null
          current_pain: boolean | null
          disliked_exercises: string | null
          does_physiotherapy: boolean | null
          energy_level: string | null
          goals: string | null
          has_medical_report: boolean | null
          has_trained_before: boolean | null
          id: string
          injuries: Json | null
          is_complete: boolean | null
          joint_pain: Json | null
          last_training_period: string | null
          liked_exercises: string | null
          medical_clearance: boolean | null
          medical_clearance_notes: string | null
          modalities_practiced: string[] | null
          movement_restrictions: string | null
          movements_that_worsen: string[] | null
          movements_to_avoid: string[] | null
          notes: string | null
          pain_intensity: number | null
          pain_locations: Json | null
          patient_id: string
          perceived_level: string | null
          plan_flexibility: string | null
          previous_frequency: number | null
          primary_goal: string | null
          readiness_screening: Json | null
          requires_medical_review: boolean | null
          secondary_goals: string[] | null
          session_duration: number | null
          sleep_quality: string | null
          specific_conditions: string[] | null
          surgeries: Json | null
          synced_patient_data: Json | null
          trainer_id: string
          training_difficulties: string | null
          training_experience: string | null
          training_location: string | null
          training_modality: string | null
          training_preference: string | null
          training_years: number | null
          updated_at: string | null
          wants_post_workout_feedback: boolean | null
          wants_reminders: boolean | null
          wants_video_tutorials: boolean | null
          weekly_availability: number | null
          wizard_step: number | null
          work_routine: string | null
        }
        Insert: {
          available_equipment?: string[] | null
          available_hours?: string[] | null
          coaching_intensity?: string | null
          created_at?: string | null
          current_pain?: boolean | null
          disliked_exercises?: string | null
          does_physiotherapy?: boolean | null
          energy_level?: string | null
          goals?: string | null
          has_medical_report?: boolean | null
          has_trained_before?: boolean | null
          id?: string
          injuries?: Json | null
          is_complete?: boolean | null
          joint_pain?: Json | null
          last_training_period?: string | null
          liked_exercises?: string | null
          medical_clearance?: boolean | null
          medical_clearance_notes?: string | null
          modalities_practiced?: string[] | null
          movement_restrictions?: string | null
          movements_that_worsen?: string[] | null
          movements_to_avoid?: string[] | null
          notes?: string | null
          pain_intensity?: number | null
          pain_locations?: Json | null
          patient_id: string
          perceived_level?: string | null
          plan_flexibility?: string | null
          previous_frequency?: number | null
          primary_goal?: string | null
          readiness_screening?: Json | null
          requires_medical_review?: boolean | null
          secondary_goals?: string[] | null
          session_duration?: number | null
          sleep_quality?: string | null
          specific_conditions?: string[] | null
          surgeries?: Json | null
          synced_patient_data?: Json | null
          trainer_id: string
          training_difficulties?: string | null
          training_experience?: string | null
          training_location?: string | null
          training_modality?: string | null
          training_preference?: string | null
          training_years?: number | null
          updated_at?: string | null
          wants_post_workout_feedback?: boolean | null
          wants_reminders?: boolean | null
          wants_video_tutorials?: boolean | null
          weekly_availability?: number | null
          wizard_step?: number | null
          work_routine?: string | null
        }
        Update: {
          available_equipment?: string[] | null
          available_hours?: string[] | null
          coaching_intensity?: string | null
          created_at?: string | null
          current_pain?: boolean | null
          disliked_exercises?: string | null
          does_physiotherapy?: boolean | null
          energy_level?: string | null
          goals?: string | null
          has_medical_report?: boolean | null
          has_trained_before?: boolean | null
          id?: string
          injuries?: Json | null
          is_complete?: boolean | null
          joint_pain?: Json | null
          last_training_period?: string | null
          liked_exercises?: string | null
          medical_clearance?: boolean | null
          medical_clearance_notes?: string | null
          modalities_practiced?: string[] | null
          movement_restrictions?: string | null
          movements_that_worsen?: string[] | null
          movements_to_avoid?: string[] | null
          notes?: string | null
          pain_intensity?: number | null
          pain_locations?: Json | null
          patient_id?: string
          perceived_level?: string | null
          plan_flexibility?: string | null
          previous_frequency?: number | null
          primary_goal?: string | null
          readiness_screening?: Json | null
          requires_medical_review?: boolean | null
          secondary_goals?: string[] | null
          session_duration?: number | null
          sleep_quality?: string | null
          specific_conditions?: string[] | null
          surgeries?: Json | null
          synced_patient_data?: Json | null
          trainer_id?: string
          training_difficulties?: string | null
          training_experience?: string | null
          training_location?: string | null
          training_modality?: string | null
          training_preference?: string | null
          training_years?: number | null
          updated_at?: string | null
          wants_post_workout_feedback?: boolean | null
          wants_reminders?: boolean | null
          wants_video_tutorials?: boolean | null
          weekly_availability?: number | null
          wizard_step?: number | null
          work_routine?: string | null
        }
        Relationships: []
      }
      training_feedback: {
        Row: {
          completion_id: string | null
          could_not_execute: boolean | null
          created_at: string | null
          difficulty_rating: number | null
          exercise_id: string | null
          exercise_name: string | null
          feedback_type: string
          id: string
          notes: string | null
          pain_level: number | null
          pain_location: string | null
          patient_id: string
          substituted_with: string | null
        }
        Insert: {
          completion_id?: string | null
          could_not_execute?: boolean | null
          created_at?: string | null
          difficulty_rating?: number | null
          exercise_id?: string | null
          exercise_name?: string | null
          feedback_type?: string
          id?: string
          notes?: string | null
          pain_level?: number | null
          pain_location?: string | null
          patient_id: string
          substituted_with?: string | null
        }
        Update: {
          completion_id?: string | null
          could_not_execute?: boolean | null
          created_at?: string | null
          difficulty_rating?: number | null
          exercise_id?: string | null
          exercise_name?: string | null
          feedback_type?: string
          id?: string
          notes?: string | null
          pain_level?: number | null
          pain_location?: string | null
          patient_id?: string
          substituted_with?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_feedback_completion_id_fkey"
            columns: ["completion_id"]
            isOneToOne: false
            referencedRelation: "workout_completions"
            referencedColumns: ["id"]
          },
        ]
      }
      trigger_audit_logs: {
        Row: {
          changed_data: Json | null
          executed_by: string | null
          id: string
          operation: string
          performed_at: string | null
          record_id: string
          table_name: string
          trigger_depth: number | null
          trigger_name: string
        }
        Insert: {
          changed_data?: Json | null
          executed_by?: string | null
          id?: string
          operation: string
          performed_at?: string | null
          record_id: string
          table_name: string
          trigger_depth?: number | null
          trigger_name: string
        }
        Update: {
          changed_data?: Json | null
          executed_by?: string | null
          id?: string
          operation?: string
          performed_at?: string | null
          record_id?: string
          table_name?: string
          trigger_depth?: number | null
          trigger_name?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_log: {
        Row: {
          action_type: string
          created_at: string
          id: string
          is_complete: boolean
          metadata: Json | null
          route: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          is_complete?: boolean
          metadata?: Json | null
          route: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          is_complete?: boolean
          metadata?: Json | null
          route?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_behavior_events: {
        Row: {
          context: Json | null
          created_at: string
          event_name: string
          id: string
          page: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          event_name: string
          id?: string
          page?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          event_name?: string
          id?: string
          page?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_challenges: {
        Row: {
          challenge_id: string
          completed_at: string | null
          id: string
          progress: number
          started_at: string
          status: Database["public"]["Enums"]["challenge_status"]
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          id?: string
          progress?: number
          started_at?: string
          status?: Database["public"]["Enums"]["challenge_status"]
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          id?: string
          progress?: number
          started_at?: string
          status?: Database["public"]["Enums"]["challenge_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_linkage_log: {
        Row: {
          created_at: string | null
          email: string | null
          error_message: string | null
          id: string
          invite_code: string | null
          metadata: Json | null
          nutritionist_id_resolved: string | null
          status: string
          tenant_id_resolved: string | null
          user_id: string
          user_role: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          error_message?: string | null
          id?: string
          invite_code?: string | null
          metadata?: Json | null
          nutritionist_id_resolved?: string | null
          status: string
          tenant_id_resolved?: string | null
          user_id: string
          user_role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          error_message?: string | null
          id?: string
          invite_code?: string | null
          metadata?: Json | null
          nutritionist_id_resolved?: string | null
          status?: string
          tenant_id_resolved?: string | null
          user_id?: string
          user_role?: string | null
        }
        Relationships: []
      }
      user_menu_usage: {
        Row: {
          clicks_count: number
          id: string
          last_access_at: string
          menu_item_id: string
          usage_score: number
          user_id: string
        }
        Insert: {
          clicks_count?: number
          id?: string
          last_access_at?: string
          menu_item_id: string
          usage_score?: number
          user_id: string
        }
        Update: {
          clicks_count?: number
          id?: string
          last_access_at?: string
          menu_item_id?: string
          usage_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_menu_usage_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          device_info: string | null
          is_online: boolean
          last_seen_at: string
          user_id: string
        }
        Insert: {
          device_info?: string | null
          is_online?: boolean
          last_seen_at?: string
          user_id: string
        }
        Update: {
          device_info?: string | null
          is_online?: boolean
          last_seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_recipes: {
        Row: {
          approved_by: string | null
          created_at: string
          description: string | null
          id: string
          image_path: string | null
          image_url: string | null
          ingredients_json: Json
          instructions: string | null
          is_approved: boolean
          servings: number
          target_meal_type: string | null
          title: string
          total_calories: number | null
          total_carbs: number | null
          total_fat: number | null
          total_protein: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          ingredients_json?: Json
          instructions?: string | null
          is_approved?: boolean
          servings?: number
          target_meal_type?: string | null
          title: string
          total_calories?: number | null
          total_carbs?: number | null
          total_fat?: number | null
          total_protein?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          ingredients_json?: Json
          instructions?: string | null
          is_approved?: boolean
          servings?: number
          target_meal_type?: string | null
          title?: string
          total_calories?: number | null
          total_carbs?: number | null
          total_fat?: number | null
          total_protein?: number | null
          updated_at?: string
          user_id?: string
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
      user_sessions: {
        Row: {
          last_resume_shown_at: string | null
          last_seen_at: string
          session_count: number
          user_id: string
        }
        Insert: {
          last_resume_shown_at?: string | null
          last_seen_at?: string
          session_count?: number
          user_id: string
        }
        Update: {
          last_resume_shown_at?: string | null
          last_seen_at?: string
          session_count?: number
          user_id?: string
        }
        Relationships: []
      }
      user_tenants: {
        Row: {
          id: string
          is_active: boolean
          joined_at: string
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_active?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v3_drafts: {
        Row: {
          created_at: string
          draft_status: string
          id: string
          meta_carbs: number | null
          meta_fat: number | null
          meta_kcal: number | null
          meta_protein: number | null
          nutritionist_id: string
          patient_id: string
          payload: Json
          promoted_at: string | null
          promoted_meal_plan_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          draft_status?: string
          id?: string
          meta_carbs?: number | null
          meta_fat?: number | null
          meta_kcal?: number | null
          meta_protein?: number | null
          nutritionist_id: string
          patient_id: string
          payload?: Json
          promoted_at?: string | null
          promoted_meal_plan_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          draft_status?: string
          id?: string
          meta_carbs?: number | null
          meta_fat?: number | null
          meta_kcal?: number | null
          meta_protein?: number | null
          nutritionist_id?: string
          patient_id?: string
          payload?: Json
          promoted_at?: string | null
          promoted_meal_plan_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      wearable_devices: {
        Row: {
          connected_at: string | null
          created_at: string | null
          device_identifier: string | null
          device_type: string
          id: string
          last_sync_at: string | null
          patient_id: string
          provider: string | null
          status: string | null
        }
        Insert: {
          connected_at?: string | null
          created_at?: string | null
          device_identifier?: string | null
          device_type?: string
          id?: string
          last_sync_at?: string | null
          patient_id: string
          provider?: string | null
          status?: string | null
        }
        Update: {
          connected_at?: string | null
          created_at?: string | null
          device_identifier?: string | null
          device_type?: string
          id?: string
          last_sync_at?: string | null
          patient_id?: string
          provider?: string | null
          status?: string | null
        }
        Relationships: []
      }
      weekly_clinical_orchestration_plan: {
        Row: {
          created_at: string | null
          engine_version: string | null
          id: string
          nutritionist_id: string
          prioritized_patients: Json | null
          suggested_focus_actions: Json | null
          total_critical: number | null
          total_high: number | null
          total_medium: number | null
          week_start: string
          workload_balance_score: number | null
        }
        Insert: {
          created_at?: string | null
          engine_version?: string | null
          id?: string
          nutritionist_id: string
          prioritized_patients?: Json | null
          suggested_focus_actions?: Json | null
          total_critical?: number | null
          total_high?: number | null
          total_medium?: number | null
          week_start: string
          workload_balance_score?: number | null
        }
        Update: {
          created_at?: string | null
          engine_version?: string | null
          id?: string
          nutritionist_id?: string
          prioritized_patients?: Json | null
          suggested_focus_actions?: Json | null
          total_critical?: number | null
          total_high?: number | null
          total_medium?: number | null
          week_start?: string
          workload_balance_score?: number | null
        }
        Relationships: []
      }
      weekly_goals: {
        Row: {
          category: string
          created_at: string
          current_value: number
          description: string | null
          icon: string
          id: string
          nutritionist_id: string
          patient_id: string
          target_value: number
          title: string
          unit: string
          updated_at: string
          week_start: string
        }
        Insert: {
          category?: string
          created_at?: string
          current_value?: number
          description?: string | null
          icon?: string
          id?: string
          nutritionist_id: string
          patient_id: string
          target_value?: number
          title: string
          unit?: string
          updated_at?: string
          week_start?: string
        }
        Update: {
          category?: string
          created_at?: string
          current_value?: number
          description?: string | null
          icon?: string
          id?: string
          nutritionist_id?: string
          patient_id?: string
          target_value?: number
          title?: string
          unit?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: []
      }
      whatsapp_inbound_messages: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          interpreted_intent: string | null
          message_text: string
          patient_id: string | null
          phone_number: string
          processed: boolean
          professional_id: string
          tenant_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          interpreted_intent?: string | null
          message_text: string
          patient_id?: string | null
          phone_number: string
          processed?: boolean
          professional_id: string
          tenant_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          interpreted_intent?: string | null
          message_text?: string
          patient_id?: string | null
          phone_number?: string
          processed?: boolean
          professional_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_inbound_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_integrations: {
        Row: {
          connection_validated_at: string | null
          created_at: string
          id: string
          instance_id: string
          is_active: boolean
          last_error: string | null
          phone_number: string | null
          professional_id: string
          provider: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          connection_validated_at?: string | null
          created_at?: string
          id?: string
          instance_id: string
          is_active?: boolean
          last_error?: string | null
          phone_number?: string | null
          professional_id: string
          provider?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          connection_validated_at?: string | null
          created_at?: string
          id?: string
          instance_id?: string
          is_active?: boolean
          last_error?: string | null
          phone_number?: string | null
          professional_id?: string
          provider?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_intent_learning_log: {
        Row: {
          action_generated: string | null
          clinical_result: string | null
          created_at: string
          detected_intent: string
          id: string
          inbound_message_id: string | null
          original_message: string
          was_correct: boolean | null
        }
        Insert: {
          action_generated?: string | null
          clinical_result?: string | null
          created_at?: string
          detected_intent: string
          id?: string
          inbound_message_id?: string | null
          original_message: string
          was_correct?: boolean | null
        }
        Update: {
          action_generated?: string | null
          clinical_result?: string | null
          created_at?: string
          detected_intent?: string
          id?: string
          inbound_message_id?: string | null
          original_message?: string
          was_correct?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_intent_learning_log_inbound_message_id_fkey"
            columns: ["inbound_message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_inbound_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_invitation_logs: {
        Row: {
          id: string
          invitation_type: string | null
          metadata: Json | null
          patient_name: string | null
          patient_phone: string | null
          professional_id: string
          sent_at: string
        }
        Insert: {
          id?: string
          invitation_type?: string | null
          metadata?: Json | null
          patient_name?: string | null
          patient_phone?: string | null
          professional_id: string
          sent_at?: string
        }
        Update: {
          id?: string
          invitation_type?: string | null
          metadata?: Json | null
          patient_name?: string | null
          patient_phone?: string | null
          professional_id?: string
          sent_at?: string
        }
        Relationships: []
      }
      whatsapp_logs: {
        Row: {
          created_at: string
          delivery_status: string
          error_message: string | null
          event_type: string
          id: string
          message_body: string
          patient_id: string | null
          professional_id: string
          sent_at: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          delivery_status?: string
          error_message?: string | null
          event_type: string
          id?: string
          message_body: string
          patient_id?: string | null
          professional_id: string
          sent_at?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          delivery_status?: string
          error_message?: string | null
          event_type?: string
          id?: string
          message_body?: string
          patient_id?: string | null
          professional_id?: string
          sent_at?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_logs: {
        Row: {
          created_at: string
          delivery_status: string
          error_message: string | null
          event_type: string
          external_message_id: string | null
          id: string
          message_body: string
          message_template_code: string | null
          patient_id: string | null
          professional_id: string
          sent_at: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          delivery_status?: string
          error_message?: string | null
          event_type: string
          external_message_id?: string | null
          id?: string
          message_body: string
          message_template_code?: string | null
          patient_id?: string | null
          professional_id: string
          sent_at?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          delivery_status?: string
          error_message?: string | null
          event_type?: string
          external_message_id?: string | null
          id?: string
          message_body?: string
          message_template_code?: string | null
          patient_id?: string | null
          professional_id?: string
          sent_at?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          professional_id: string
          template_key: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          professional_id: string
          template_key: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          professional_id?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      workout_completions: {
        Row: {
          completed_at: string
          created_at: string
          discomfort_flag: boolean | null
          duration_minutes: number | null
          id: string
          notes: string | null
          pain_report: string | null
          perceived_effort: number | null
          plan_id: string
          routine_id: string
          student_id: string
          tenant_id: string | null
        }
        Insert: {
          completed_at?: string
          created_at?: string
          discomfort_flag?: boolean | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          pain_report?: string | null
          perceived_effort?: number | null
          plan_id: string
          routine_id: string
          student_id: string
          tenant_id?: string | null
        }
        Update: {
          completed_at?: string
          created_at?: string
          discomfort_flag?: boolean | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          pain_report?: string | null
          perceived_effort?: number | null
          plan_id?: string
          routine_id?: string
          student_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_completions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_completions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "workout_routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_completions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercise_logs: {
        Row: {
          completion_id: string
          created_at: string
          exercise_id: string
          id: string
          load_kg: number | null
          notes: string | null
          reps_done: string | null
          sets_done: number | null
        }
        Insert: {
          completion_id: string
          created_at?: string
          exercise_id: string
          id?: string
          load_kg?: number | null
          notes?: string | null
          reps_done?: string | null
          sets_done?: number | null
        }
        Update: {
          completion_id?: string
          created_at?: string
          exercise_id?: string
          id?: string
          load_kg?: number | null
          notes?: string | null
          reps_done?: string | null
          sets_done?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercise_logs_completion_id_fkey"
            columns: ["completion_id"]
            isOneToOne: false
            referencedRelation: "workout_completions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercise_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercise_substitutions: {
        Row: {
          approved_exercise: string | null
          created_at: string | null
          feedback_id: string | null
          id: string
          original_exercise: string
          original_muscle_group: string | null
          pain_area: string | null
          personal_id: string
          personal_notes: string | null
          reason: string
          resolved_at: string | null
          severity: string | null
          status: string | null
          student_id: string
          suggested_exercises: Json
        }
        Insert: {
          approved_exercise?: string | null
          created_at?: string | null
          feedback_id?: string | null
          id?: string
          original_exercise: string
          original_muscle_group?: string | null
          pain_area?: string | null
          personal_id: string
          personal_notes?: string | null
          reason: string
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          student_id: string
          suggested_exercises?: Json
        }
        Update: {
          approved_exercise?: string | null
          created_at?: string | null
          feedback_id?: string | null
          id?: string
          original_exercise?: string
          original_muscle_group?: string | null
          pain_area?: string | null
          personal_id?: string
          personal_notes?: string | null
          reason?: string
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          student_id?: string
          suggested_exercises?: Json
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercise_substitutions_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "workout_session_feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          cadence: string | null
          created_at: string
          exercise_library_id: string | null
          group_id: string | null
          group_order: number | null
          group_type: string | null
          id: string
          image_url: string | null
          load_kg: number | null
          media_url: string | null
          method_label: string | null
          muscle_group: string | null
          name: string
          notes: string | null
          reps: string
          rest_seconds: number | null
          routine_id: string
          rpe: number | null
          sets: number
          sort_order: number
          video_url: string | null
        }
        Insert: {
          cadence?: string | null
          created_at?: string
          exercise_library_id?: string | null
          group_id?: string | null
          group_order?: number | null
          group_type?: string | null
          id?: string
          image_url?: string | null
          load_kg?: number | null
          media_url?: string | null
          method_label?: string | null
          muscle_group?: string | null
          name: string
          notes?: string | null
          reps?: string
          rest_seconds?: number | null
          routine_id: string
          rpe?: number | null
          sets?: number
          sort_order?: number
          video_url?: string | null
        }
        Update: {
          cadence?: string | null
          created_at?: string
          exercise_library_id?: string | null
          group_id?: string | null
          group_order?: number | null
          group_type?: string | null
          id?: string
          image_url?: string | null
          load_kg?: number | null
          media_url?: string | null
          method_label?: string | null
          muscle_group?: string | null
          name?: string
          notes?: string | null
          reps?: string
          rest_seconds?: number | null
          routine_id?: string
          rpe?: number | null
          sets?: number
          sort_order?: number
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_library_id_fkey"
            columns: ["exercise_library_id"]
            isOneToOne: false
            referencedRelation: "exercises_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "workout_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_periodization: {
        Row: {
          auto_progress_enabled: boolean
          created_at: string
          current_week: number
          deload_reduction_percent: number | null
          deload_week: number | null
          id: string
          mesocycle_name: string
          mesocycle_weeks: number
          notes: string | null
          personal_id: string
          plan_id: string
          progression_percent: number
          progression_type: string
          updated_at: string
        }
        Insert: {
          auto_progress_enabled?: boolean
          created_at?: string
          current_week?: number
          deload_reduction_percent?: number | null
          deload_week?: number | null
          id?: string
          mesocycle_name?: string
          mesocycle_weeks?: number
          notes?: string | null
          personal_id: string
          plan_id: string
          progression_percent?: number
          progression_type?: string
          updated_at?: string
        }
        Update: {
          auto_progress_enabled?: boolean
          created_at?: string
          current_week?: number
          deload_reduction_percent?: number | null
          deload_week?: number | null
          id?: string
          mesocycle_name?: string
          mesocycle_weeks?: number
          notes?: string | null
          personal_id?: string
          plan_id?: string
          progression_percent?: number
          progression_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_periodization_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_personal_records: {
        Row: {
          achieved_at: string
          completion_id: string | null
          created_at: string
          exercise_library_id: string | null
          exercise_name: string
          id: string
          previous_value: number | null
          record_type: string
          student_id: string
          value: number
        }
        Insert: {
          achieved_at?: string
          completion_id?: string | null
          created_at?: string
          exercise_library_id?: string | null
          exercise_name: string
          id?: string
          previous_value?: number | null
          record_type?: string
          student_id: string
          value: number
        }
        Update: {
          achieved_at?: string
          completion_id?: string | null
          created_at?: string
          exercise_library_id?: string | null
          exercise_name?: string
          id?: string
          previous_value?: number | null
          record_type?: string
          student_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_personal_records_completion_id_fkey"
            columns: ["completion_id"]
            isOneToOne: false
            referencedRelation: "workout_completions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_personal_records_exercise_library_id_fkey"
            columns: ["exercise_library_id"]
            isOneToOne: false
            referencedRelation: "exercises_library"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean
          objective: string | null
          personal_id: string
          start_date: string
          status: string
          student_id: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          objective?: string | null
          personal_id: string
          start_date?: string
          status?: string
          student_id: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          objective?: string | null
          personal_id?: string
          start_date?: string
          status?: string
          student_id?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_routines: {
        Row: {
          created_at: string
          day_of_week: number | null
          description: string | null
          estimated_duration: number | null
          id: string
          name: string
          plan_id: string
          sort_order: number
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          estimated_duration?: number | null
          id?: string
          name: string
          plan_id: string
          sort_order?: number
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          estimated_duration?: number | null
          id?: string
          name?: string
          plan_id?: string
          sort_order?: number
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_routines_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_routines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_session_feedback: {
        Row: {
          completion_id: string | null
          created_at: string | null
          discomfort_exercises: Json | null
          fatigue_level: number | null
          feedback_date: string
          id: string
          motivation_level: number | null
          notes: string | null
          overall_feeling: string | null
          pain_areas: Json | null
          plan_id: string | null
          processed: boolean | null
          routine_id: string | null
          sleep_quality: number | null
          student_id: string
        }
        Insert: {
          completion_id?: string | null
          created_at?: string | null
          discomfort_exercises?: Json | null
          fatigue_level?: number | null
          feedback_date?: string
          id?: string
          motivation_level?: number | null
          notes?: string | null
          overall_feeling?: string | null
          pain_areas?: Json | null
          plan_id?: string | null
          processed?: boolean | null
          routine_id?: string | null
          sleep_quality?: number | null
          student_id: string
        }
        Update: {
          completion_id?: string | null
          created_at?: string | null
          discomfort_exercises?: Json | null
          fatigue_level?: number | null
          feedback_date?: string
          id?: string
          motivation_level?: number | null
          notes?: string | null
          overall_feeling?: string | null
          pain_areas?: Json | null
          plan_id?: string | null
          processed?: boolean | null
          routine_id?: string | null
          sleep_quality?: number | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_session_feedback_completion_id_fkey"
            columns: ["completion_id"]
            isOneToOne: false
            referencedRelation: "workout_completions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_student_learning_profile: {
        Row: {
          avg_completion_rate: number | null
          avg_effort: number | null
          avoided_exercises: Json | null
          created_at: string | null
          fatigue_patterns: Json | null
          id: string
          ifj_notes: Json | null
          is_also_patient: boolean | null
          last_feedback_at: string | null
          motivation_trend: string | null
          pain_history: Json | null
          personal_id: string | null
          preferred_exercises: Json | null
          risk_level: string | null
          student_id: string
          total_sessions: number | null
          updated_at: string | null
        }
        Insert: {
          avg_completion_rate?: number | null
          avg_effort?: number | null
          avoided_exercises?: Json | null
          created_at?: string | null
          fatigue_patterns?: Json | null
          id?: string
          ifj_notes?: Json | null
          is_also_patient?: boolean | null
          last_feedback_at?: string | null
          motivation_trend?: string | null
          pain_history?: Json | null
          personal_id?: string | null
          preferred_exercises?: Json | null
          risk_level?: string | null
          student_id: string
          total_sessions?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_completion_rate?: number | null
          avg_effort?: number | null
          avoided_exercises?: Json | null
          created_at?: string | null
          fatigue_patterns?: Json | null
          id?: string
          ifj_notes?: Json | null
          is_also_patient?: boolean | null
          last_feedback_at?: string | null
          motivation_trend?: string | null
          pain_history?: Json | null
          personal_id?: string | null
          preferred_exercises?: Json | null
          risk_level?: string | null
          student_id?: string
          total_sessions?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      workout_templates: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean | null
          level: string | null
          name: string
          objective: string | null
          routines_json: Json | null
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          level?: string | null
          name: string
          objective?: string | null
          routines_json?: Json | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          level?: string | null
          name?: string
          objective?: string | null
          routines_json?: Json | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      workspace_items: {
        Row: {
          created_at: string
          custom_label: string | null
          id: string
          is_pinned: boolean
          is_visible: boolean
          menu_item_id: string
          section_id: string
          sort_order: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          custom_label?: string | null
          id?: string
          is_pinned?: boolean
          is_visible?: boolean
          menu_item_id: string
          section_id: string
          sort_order?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          custom_label?: string | null
          id?: string
          is_pinned?: boolean
          is_visible?: boolean
          menu_item_id?: string
          section_id?: string
          sort_order?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "workspace_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_profiles: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          updated_at: string
          user_id: string
          workspace_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          updated_at?: string
          user_id: string
          workspace_name?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          updated_at?: string
          user_id?: string
          workspace_name?: string
        }
        Relationships: []
      }
      workspace_sections: {
        Row: {
          created_at: string
          id: string
          is_collapsed: boolean
          is_visible: boolean
          section_color: string
          section_icon: string
          section_name: string
          sort_order: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_collapsed?: boolean
          is_visible?: boolean
          section_color?: string
          section_icon?: string
          section_name: string
          sort_order?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_collapsed?: boolean
          is_visible?: boolean
          section_color?: string
          section_icon?: string
          section_name?: string
          sort_order?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_sections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspace_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      affiliate_referrals_safe: {
        Row: {
          affiliate_id: string | null
          converted_at: string | null
          created_at: string | null
          id: string | null
          referral_code_used: string | null
          referred_email_masked: string | null
          referred_plan: string | null
          referred_type: string | null
          referred_user_id: string | null
          status: Database["public"]["Enums"]["referral_status"] | null
        }
        Insert: {
          affiliate_id?: string | null
          converted_at?: string | null
          created_at?: string | null
          id?: string | null
          referral_code_used?: string | null
          referred_email_masked?: never
          referred_plan?: string | null
          referred_type?: string | null
          referred_user_id?: string | null
          status?: Database["public"]["Enums"]["referral_status"] | null
        }
        Update: {
          affiliate_id?: string | null
          converted_at?: string | null
          created_at?: string | null
          id?: string | null
          referral_code_used?: string | null
          referred_email_masked?: never
          referred_plan?: string | null
          referred_type?: string | null
          referred_user_id?: string | null
          status?: Database["public"]["Enums"]["referral_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_resolved_state: {
        Row: {
          created_at: string | null
          has_state_inconsistency: boolean | null
          id: string | null
          is_active: boolean | null
          nutritionist_id: string | null
          patient_id: string | null
          plan_status: string | null
          resolved_state: string | null
          start_date: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          has_state_inconsistency?: never
          id?: string | null
          is_active?: boolean | null
          nutritionist_id?: string | null
          patient_id?: string | null
          plan_status?: string | null
          resolved_state?: never
          start_date?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          has_state_inconsistency?: never
          id?: string | null
          is_active?: boolean | null
          nutritionist_id?: string | null
          patient_id?: string | null
          plan_status?: string | null
          resolved_state?: never
          start_date?: string | null
          title?: string | null
        }
        Relationships: []
      }
      mv_nutritionist_dashboard: {
        Row: {
          checklist_completion_rate: number | null
          critical_alerts: number | null
          nutritionist_id: string | null
          patients_active_today: number | null
          tasks_completed_today: number | null
          tasks_total_today: number | null
          total_patients: number | null
          unread_messages: number | null
        }
        Relationships: []
      }
      public_profile_settings_safe: {
        Row: {
          bio: string | null
          booking_enabled: boolean | null
          booking_payment_required: boolean | null
          booking_price: number | null
          created_at: string | null
          id: string | null
          is_public: boolean | null
          slug: string | null
          specialties: string[] | null
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          booking_enabled?: boolean | null
          booking_payment_required?: boolean | null
          booking_price?: number | null
          created_at?: string | null
          id?: string | null
          is_public?: boolean | null
          slug?: string | null
          specialties?: string[] | null
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          booking_enabled?: boolean | null
          booking_payment_required?: boolean | null
          booking_price?: number | null
          created_at?: string | null
          id?: string | null
          is_public?: boolean | null
          slug?: string | null
          specialties?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_health_summary: {
        Row: {
          active_p0: number | null
          active_p1: number | null
          critical_errors: number | null
          errors_last_hour: number | null
          status: string | null
          total_errors: number | null
          total_incidents: number | null
        }
        Relationships: []
      }
      testimonials_public: {
        Row: {
          avatar_url: string | null
          content: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          is_anonymous: boolean | null
          nutritionist_id: string | null
          rating: number | null
        }
        Insert: {
          avatar_url?: never
          content?: string | null
          created_at?: string | null
          display_name?: never
          id?: string | null
          is_anonymous?: boolean | null
          nutritionist_id?: string | null
          rating?: number | null
        }
        Update: {
          avatar_url?: never
          content?: string | null
          created_at?: string | null
          display_name?: never
          id?: string | null
          is_anonymous?: boolean | null
          nutritionist_id?: string | null
          rating?: number | null
        }
        Relationships: []
      }
      v_plan_visibility_diagnostics: {
        Row: {
          divergence_reason: string | null
          email: string | null
          full_name: string | null
          has_divergence: boolean | null
          is_active: boolean | null
          nutritionist_id: string | null
          onboarding_status: string | null
          patient_id: string | null
          plan_created_at: string | null
          plan_id: string | null
          plan_status: string | null
          plan_title: string | null
        }
        Relationships: []
      }
      v_visual_quality_metrics: {
        Row: {
          items_placeholder: number | null
          items_with_image: number | null
          pct_coverage: number | null
          top_missing_titles: Json | null
          total_items: number | null
        }
        Relationships: []
      }
      whatsapp_integrations_safe: {
        Row: {
          created_at: string | null
          id: string | null
          instance_id: string | null
          is_active: boolean | null
          phone_number: string | null
          professional_id: string | null
          provider: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          instance_id?: string | null
          is_active?: boolean | null
          phone_number?: string | null
          professional_id?: string | null
          provider?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          instance_id?: string | null
          is_active?: boolean | null
          phone_number?: string | null
          professional_id?: string | null
          provider?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_patient_consent: { Args: { _patient_id: string }; Returns: Json }
      activate_meal_plan: { Args: { _plan_id: string }; Returns: undefined }
      activate_meal_plan_ai_guarded:
        | { Args: { p_meal_plan_id: string }; Returns: undefined }
        | {
            Args: { p_patient_id: string; p_plan_id: string }
            Returns: undefined
          }
      activate_protocol_atomic: {
        Args: {
          p_end_date?: string
          p_nutritionist_id: string
          p_patient_id: string
          p_protocol_id: string
          p_start_date?: string
          p_status?: string
        }
        Returns: string
      }
      approve_and_publish_plan: {
        Args: {
          _duration_days?: number
          _nutritionist_id: string
          _plan_id: string
          _start_date?: string
        }
        Returns: Json
      }
      archive_orphan_onboarding_pipelines: { Args: never; Returns: Json }
      auto_activate_onboarding_for_paid_patients: { Args: never; Returns: Json }
      auto_activate_patient_onboarding: {
        Args: { _patient_id: string }
        Returns: undefined
      }
      award_points:
        | {
            Args: { _action_key: string; _metadata?: Json; _patient_id: string }
            Returns: Json
          }
        | {
            Args: {
              _action_key: string
              _metadata?: Json
              _patient_id: string
              _professional_id?: string
              _source_id?: string
              _source_type?: string
            }
            Returns: Json
          }
      calculate_plan_totals: { Args: { p_plan_id: string }; Returns: Json }
      check_ai_usage: {
        Args: { _feature_key: string; _plan_tier?: string; _user_id: string }
        Returns: Json
      }
      check_and_update_session: { Args: never; Returns: Json }
      check_rate_limit: {
        Args: {
          _client_key: string
          _function_name: string
          _max_requests: number
          _window_seconds: number
        }
        Returns: boolean
      }
      check_simulation_rate_limit:
        | { Args: never; Returns: boolean }
        | { Args: { _mode?: string }; Returns: boolean }
      check_workout_plan_expiry: { Args: never; Returns: Json }
      cleanup_observability_logs: {
        Args: { retention_days?: number }
        Returns: Json
      }
      cleanup_stale_onboarding_pipelines: {
        Args: { _nutritionist_id: string; _stale_days?: number }
        Returns: Json
      }
      clear_onboarding_sync_pending: {
        Args: { _patient_id: string }
        Returns: undefined
      }
      complete_patient_onboarding: {
        Args: {
          _nutritionist_id: string
          _patient_id: string
          _pipeline_id: string
        }
        Returns: Json
      }
      complete_patient_onboarding_by_patient: {
        Args: { _patient_id: string; _pipeline_id: string }
        Returns: Json
      }
      confirm_patient_payment: {
        Args: { _nutritionist_id: string; _patient_id: string }
        Returns: Json
      }
      convert_lead_to_patient: {
        Args: { _lead_id: string; _password_set?: boolean; _patient_id: string }
        Returns: Json
      }
      create_nutritionist_account: {
        Args: { _email: string; _full_name: string; _password: string }
        Returns: string
      }
      create_patient_account: {
        Args: { _email: string; _full_name: string; _password: string }
        Returns: string
      }
      create_patient_canonical: {
        Args: {
          _email: string
          _full_name: string
          _metadata?: Json
          _nutritionist_id?: string
          _patient_id: string
          _phone?: string
          _source?: string
          _whatsapp?: string
        }
        Returns: Json
      }
      create_professional_account: {
        Args: {
          _email: string
          _full_name: string
          _password: string
          _role?: string
        }
        Returns: string
      }
      deactivate_meal_plan: {
        Args: { _nutritionist_id: string; _plan_id: string }
        Returns: Json
      }
      default_tenant_id: { Args: never; Returns: string }
      detect_orphan_pipelines: {
        Args: { _nutritionist_id: string }
        Returns: {
          patient_id: string
          patient_name: string
          pipeline_id: string
          status: string
          updated_at: string
        }[]
      }
      end_patient_project: {
        Args: { _patient_id: string; _program_id: string; _reason?: string }
        Returns: Json
      }
      ensure_patient_ready: { Args: { _patient_id: string }; Returns: Json }
      extract_topic_uuid: { Args: { _topic: string }; Returns: string }
      finalize_pipeline_execution: {
        Args: {
          _error_details?: Json
          _errors_count?: number
          _id: string
          _patients_processed?: number
          _status: string
        }
        Returns: undefined
      }
      find_existing_patient_emails: {
        Args: { _emails: string[]; _nutritionist_id: string }
        Returns: {
          already_linked: boolean
          email: string
        }[]
      }
      find_patient_by_email: { Args: { _email: string }; Returns: string }
      fix_all_null_tokens: { Args: never; Returns: undefined }
      fix_orphaned_patient_links: { Args: never; Returns: undefined }
      fix_patient_integrity: { Args: { _patient_id: string }; Returns: Json }
      fix_patient_integrity_v2: { Args: { _patient_id: string }; Returns: Json }
      fix_user_null_tokens: { Args: { _user_id: string }; Returns: undefined }
      flag_plan_review_needed: {
        Args: { _patient_id: string; _reason?: string }
        Returns: Json
      }
      fn_audit_missing_images: { Args: never; Returns: Json }
      fn_capture_meal_plan_item_version:
        | {
            Args: { p_action_type: string; p_item_id: string }
            Returns: string
          }
        | {
            Args: {
              p_action_type: string
              p_item_id: string
              p_restored_from?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_action_type: string
              p_item_id: string
              p_note?: string
              p_restored_from?: string
            }
            Returns: string
          }
      get_advanced_alerts: {
        Args: {
          p_alert_type?: string
          p_limit?: number
          p_offset?: number
          p_severity?: string
          p_tenant_id?: string
        }
        Returns: {
          alert_type: string
          correlation_id: string
          created_at: string
          id: string
          message: string
          metadata: Json
          severity: string
          total_count: number
        }[]
      }
      get_advanced_alerts_paginated: {
        Args: {
          p_alert_type?: string
          p_cursor_id?: string
          p_cursor_timestamp?: string
          p_limit?: number
          p_severity?: string
          p_tenant_id?: string
        }
        Returns: {
          alert_type: string
          correlation_id: string
          created_at: string
          has_more: boolean
          id: string
          message: string
          metadata: Json
          severity: string
        }[]
      }
      get_affiliate_commission_tier: {
        Args: { _affiliate_id: string }
        Returns: {
          first_payment_percent: number
          is_premium: boolean
          next_tier_at: number
          recurring_percent: number
          tier_level: number
          tier_name: string
          total_converted: number
        }[]
      }
      get_backup_constraints: {
        Args: never
        Returns: {
          constraint_name: string
          constraint_type: string
          create_statement: string
          table_name: string
        }[]
      }
      get_backup_cron_jobs: {
        Args: never
        Returns: {
          active: boolean
          command: string
          job_database: string
          job_id: number
          schedule: string
          username: string
        }[]
      }
      get_backup_enums: {
        Args: never
        Returns: {
          create_statement: string
          enum_name: string
        }[]
      }
      get_backup_extensions: {
        Args: never
        Returns: {
          create_statement: string
          ext_name: string
        }[]
      }
      get_backup_functions: {
        Args: never
        Returns: {
          create_statement: string
          func_name: string
        }[]
      }
      get_backup_indexes: {
        Args: never
        Returns: {
          create_statement: string
          index_name: string
          table_name: string
        }[]
      }
      get_backup_rls_enabled: {
        Args: never
        Returns: {
          rls_statement: string
          table_name: string
        }[]
      }
      get_backup_rls_policies: {
        Args: never
        Returns: {
          create_statement: string
          policy_name: string
          table_name: string
        }[]
      }
      get_backup_tables: {
        Args: never
        Returns: {
          create_statement: string
          table_name: string
        }[]
      }
      get_backup_triggers: {
        Args: never
        Returns: {
          create_statement: string
          table_name: string
          trigger_name: string
        }[]
      }
      get_backup_views: {
        Args: never
        Returns: {
          create_statement: string
          view_name: string
        }[]
      }
      get_detailed_plan_diagnostics: {
        Args: { p_patient_id: string }
        Returns: {
          correlation_id: string
          created_at: string
          is_active: boolean
          plan_id: string
          plan_mode: string
          status: string
          tenant_id: string
        }[]
      }
      get_filtered_event_timeline: {
        Args: {
          p_cursor?: string
          p_limit?: number
          p_master_item_id?: string
          p_patient_id?: string
          p_plan_mode?: string
        }
        Returns: {
          correlation_id: string
          events: Json
          last_event_at: string
        }[]
      }
      get_nutritionist_dashboard_stats: {
        Args: { _nutritionist_id: string }
        Returns: Json
      }
      get_nutritionist_patients_plan_audit: {
        Args: never
        Returns: {
          approved_count: number
          audit_status: string
          draft_count: number
          latest_plan_id: string
          latest_plan_status: string
          latest_updated_at: string
          latest_validation_status: string
          patient_id: string
          patient_name: string
          published_count: number
          total_plans: number
        }[]
      }
      get_patient_active_protocol: {
        Args: { _patient_id: string }
        Returns: {
          current_phase: string
          manual_intervention_status: string
          protocol_id: string
          protocol_key: string
          protocol_title: string
          start_date: string
          status: string
        }[]
      }
      get_patient_dashboard_stats: {
        Args: { _patient_id: string }
        Returns: Json
      }
      get_patient_emails: {
        Args: { _patient_ids: string[] }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      get_patient_event_timeline: {
        Args: { p_patient_id: string }
        Returns: {
          correlation_id: string
          events: Json
          first_event: string
          last_event: string
        }[]
      }
      get_plan_diagnostics: {
        Args: { p_patient_id: string }
        Returns: {
          is_active: boolean
          plan_count: number
          plan_mode: string
          status: string
          tenant_id: string
        }[]
      }
      get_plan_drop_metrics: {
        Args: { p_cutoff?: string; p_patient_id: string }
        Returns: Json
      }
      get_plan_status_distribution: {
        Args: { p_cutoff?: string; p_patient_id: string }
        Returns: Json
      }
      get_ranking_by_period: {
        Args: { _limit?: number; _nutritionist_id?: string; _period: string }
        Returns: {
          avatar_url: string
          badge_icon: string
          crown_enabled: boolean
          display_name: string
          patient_id: string
          plan_color: string
          plan_slug: string
          points_checkin: number
          points_checklist: number
          points_meals: number
          points_other: number
          points_training: number
          rank_position: number
          total_points: number
        }[]
      }
      get_schema_info: {
        Args: { target_tables: string[] }
        Returns: {
          column_name: string
          table_name: string
        }[]
      }
      get_system_health_score: { Args: never; Returns: Json }
      get_team_head_id: { Args: { _user_id: string }; Returns: string }
      get_team_permissions: { Args: { _user_id: string }; Returns: Json }
      get_user_active_tenant: { Args: { _user_id: string }; Returns: string }
      get_user_email_by_id: { Args: { _user_id: string }; Returns: string }
      get_user_id_by_email: { Args: { _email: string }; Returns: string }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      get_user_tenant:
        | { Args: never; Returns: string }
        | { Args: { _user_id: string }; Returns: string }
      get_user_tenant_ids: { Args: { _user_id: string }; Returns: string[] }
      get_whatsapp_token: {
        Args: { _professional_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_role: {
        Args: {
          _role: Database["public"]["Enums"]["tenant_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      initialize_default_workspace: {
        Args: { _user_id: string }
        Returns: string
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_feature_enabled: { Args: { _flag: string }; Returns: boolean }
      is_linked_professional: {
        Args: { _patient_id: string; _user_id: string }
        Returns: boolean
      }
      is_linked_professional_for: {
        Args: { _patient_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_owner: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_patient: { Args: { _user_id: string }; Returns: boolean }
      is_patient_enrolled_in_program: {
        Args: { _program_id: string; _user_id: string }
        Returns: boolean
      }
      is_personal: { Args: { _user_id: string }; Returns: boolean }
      is_program_owner: {
        Args: { _program_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_member_of: {
        Args: { _head_id: string; _user_id: string }
        Returns: boolean
      }
      is_tenant_member: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      log_audit:
        | {
            Args: {
              _action: string
              _correlation_id?: string
              _metadata?: Json
              _parent_correlation_id?: string
              _resource_id?: string
              _resource_type: string
              _status?: string
            }
            Returns: string
          }
        | {
            Args: {
              _action: string
              _correlation_id?: string
              _metadata?: Json
              _resource_id?: string
              _resource_type: string
              _status?: string
            }
            Returns: undefined
          }
      log_pipeline_execution: {
        Args: {
          _error_details?: Json
          _errors_count?: number
          _metadata?: Json
          _patients_processed?: number
          _pipeline_name: string
          _status?: string
        }
        Returns: string
      }
      log_team_activity: {
        Args: {
          _action: string
          _head_professional_id: string
          _metadata?: Json
          _resource_id?: string
          _resource_type?: string
          _team_member_id: string
        }
        Returns: undefined
      }
      log_user_activity: {
        Args: {
          _action_type: string
          _is_complete?: boolean
          _metadata?: Json
          _route: string
          _title: string
        }
        Returns: undefined
      }
      lookup_affiliate_by_code: {
        Args: { _code: string }
        Returns: {
          affiliate_id: string
          affiliate_name: string
          affiliate_type: Database["public"]["Enums"]["affiliate_type"]
        }[]
      }
      lookup_referral_by_code: {
        Args: { _code: string }
        Returns: {
          nutritionist_id: string
          program_id: string
          referral_code: string
        }[]
      }
      mark_onboarding_sync_pending: {
        Args: { _error_message: string; _patient_id: string }
        Returns: undefined
      }
      mark_patient_contacted: {
        Args: { _contact_method?: string; _patient_id: string }
        Returns: Json
      }
      migrate_all_plans_to_new_model: {
        Args: never
        Returns: {
          count_items_removed: number
          count_plans: number
        }[]
      }
      normalize_patient_data: { Args: { _patient_id: string }; Returns: Json }
      preview_orphan_onboarding_pipelines: {
        Args: never
        Returns: {
          archival_reason: string
          created_at: string
          nutritionist_id: string
          patient_id: string
          pipeline_id: string
          pipeline_status: string
        }[]
      }
      promote_patient_to_professional: {
        Args: { _patient_email: string; _target_role?: string }
        Returns: Json
      }
      promote_to_admin: { Args: { _user_email: string }; Returns: string }
      publish_meal_plan: {
        Args: { _nutritionist_id: string; _plan_id: string }
        Returns: Json
      }
      publish_meal_plan_v2: {
        Args: { p_correlation_id?: string; p_plan_id: string }
        Returns: Json
      }
      recalculate_meal_plan_totals: {
        Args: { plan_id: string }
        Returns: undefined
      }
      reconcile_meal_plan_macros: { Args: { p_plan_id: string }; Returns: Json }
      reconcile_patient_plans: {
        Args: {
          p_end_date?: string
          p_patient_id: string
          p_start_date?: string
        }
        Returns: Json
      }
      record_ai_usage: {
        Args: { _feature_key: string; _plan_tier?: string; _user_id: string }
        Returns: Json
      }
      refresh_affiliate_metrics: { Args: never; Returns: undefined }
      refresh_dashboard_mv: { Args: never; Returns: undefined }
      refresh_ranking_cache: { Args: never; Returns: undefined }
      refresh_ranking_snapshots: {
        Args: { _period_type?: string }
        Returns: undefined
      }
      register_unblock_override: {
        Args: {
          _duration_minutes?: number
          _patient_id: string
          _reason?: string
        }
        Returns: string
      }
      reject_meal_plan: {
        Args: { _nutritionist_id: string; _plan_id: string; _reason?: string }
        Returns: Json
      }
      release_patient_onboarding: {
        Args: {
          _nutritionist_id: string
          _patient_id: string
          _release_config?: Json
        }
        Returns: Json
      }
      reset_all_ranking_points: { Args: never; Returns: Json }
      reset_onboarding_pipeline: {
        Args: {
          _nutritionist_id: string
          _patient_id: string
          _tenant_id?: string
        }
        Returns: Json
      }
      reset_professional_password: {
        Args: { _new_password: string; _user_id: string }
        Returns: undefined
      }
      resolve_alert: {
        Args: { _alert_id: string; _resolution_note?: string }
        Returns: Json
      }
      resolve_lifecycle_states_batch: {
        Args: { _patient_ids: string[] }
        Returns: {
          patient_id: string
          state_data: Json
        }[]
      }
      resolve_patient_lifecycle_state: {
        Args: { _patient_id: string }
        Returns: Json
      }
      resolve_patient_meal_plan: {
        Args: { p_date?: string; p_patient_id: string }
        Returns: Json
      }
      resolve_patient_plan_status: {
        Args: { _patient_id: string }
        Returns: Json
      }
      resolve_tenant_for_user: { Args: { _user_id: string }; Returns: string }
      revert_template_audit_rules_to_version: {
        Args: { _version_id: string }
        Returns: Json
      }
      run_daily_patient_audit: { Args: never; Returns: Json }
      run_patient_data_audit: { Args: { _dry_run?: boolean }; Returns: Json }
      run_patient_realtime_fix: { Args: { _patient_id: string }; Returns: Json }
      run_security_audit: { Args: never; Returns: Json }
      save_plan_as_approved: {
        Args: { _nutritionist_id: string; _plan_id: string }
        Returns: Json
      }
      search_patients: {
        Args: { _limit?: number; _nutritionist_id: string; _query: string }
        Returns: {
          avatar_url: string
          full_name: string
          phone: string
          relevance: number
          user_id: string
        }[]
      }
      search_professionals: {
        Args: { _limit?: number; _query: string }
        Returns: {
          avatar_url: string
          clinic_name: string
          full_name: string
          phone: string
          user_id: string
        }[]
      }
      self_register_nutritionist: {
        Args: { _full_name: string; _user_id: string }
        Returns: Json
      }
      self_register_patient: {
        Args: { _referral_code?: string; _user_id: string }
        Returns: Json
      }
      set_patient_lifecycle_state: {
        Args: { _new_state: string; _patient_id: string; _reason?: string }
        Returns: Json
      }
      snapshot_template_audit_rules: { Args: never; Returns: Json }
      store_whatsapp_token: {
        Args: { _professional_id: string; _token: string }
        Returns: undefined
      }
      sync_program_prestige: {
        Args: { _assigned_by: string; _program_id: string }
        Returns: Json
      }
      sync_protocol_checklist: {
        Args: { _date?: string; _patient_protocol_id: string }
        Returns: number
      }
      track_menu_click: { Args: { _menu_item_id: string }; Returns: undefined }
      transition_journey_status: {
        Args: {
          _new_status: string
          _nutritionist_id: string
          _patient_id: string
        }
        Returns: Json
      }
      transition_plan_to_review: {
        Args: { _nutritionist_id: string; _plan_id: string }
        Returns: Json
      }
      validate_clinical_quality: { Args: { p_plan_id: string }; Returns: Json }
      validate_onboarding_token: { Args: { _token: string }; Returns: Json }
      validate_plan_integrity: { Args: { p_plan_id: string }; Returns: Json }
      validate_practical_template: { Args: { _meals: Json }; Returns: Json }
    }
    Enums: {
      achievement_type:
        | "streak"
        | "meals_logged"
        | "challenge_completed"
        | "xp_milestone"
        | "consistency"
        | "variety"
      affiliate_type:
        | "regular"
        | "nutritionist"
        | "premium_ambassador"
        | "custom"
      app_role: "nutritionist" | "patient" | "admin" | "personal" | "lojista"
      caloric_adjustment_type:
        | "keep_current"
        | "reduce_calories_light"
        | "reduce_calories_moderate"
        | "increase_calories_gradual"
        | "start_diet_break"
        | "start_reverse_phase"
        | "maintain_and_monitor"
        | "switch_template_same_calories"
        | "require_manual_review"
      challenge_status: "active" | "completed" | "expired"
      commission_status:
        | "pending"
        | "approved"
        | "paid"
        | "reversed"
        | "cancelled"
      commission_type: "first_payment" | "recurring"
      meal_goal_tag:
        | "weight_loss"
        | "hypertrophy"
        | "metabolic"
        | "low_carb"
        | "functional"
        | "maintenance"
      meal_plan_status:
        | "draft"
        | "draft_auto_generated"
        | "under_professional_review"
        | "approved"
        | "published_to_patient"
        | "revision_requested"
        | "archived"
        | "expired"
        | "replaced"
      meal_type:
        | "breakfast"
        | "morning_snack"
        | "lunch"
        | "afternoon_snack"
        | "dinner"
        | "evening_snack"
      metabolic_phase_type:
        | "initial_response"
        | "active_loss"
        | "slowing_response"
        | "plateau_risk"
        | "plateau_active"
        | "consolidation"
        | "recovery"
        | "maintenance"
        | "recomposition"
      patient_lifecycle_status:
        | "onboarding_started"
        | "onboarding_ready_for_plan"
        | "plan_pending_production"
        | "plan_delivered"
        | "active_followup"
        | "clinical_attention"
        | "retention_risk"
        | "maintenance_mode"
        | "paused"
        | "closed"
      payment_gateway:
        | "stripe"
        | "mercado_pago"
        | "pagseguro"
        | "pix"
        | "manual"
      payout_status: "pending" | "processing" | "paid" | "failed"
      plan_generation_source:
        | "manual"
        | "protocol_fitjourney"
        | "anamnesis"
        | "physical_assessment"
        | "mixed"
      plan_mode_type: "weekly" | "single_day"
      protocol_status:
        | "pending"
        | "active"
        | "paused"
        | "completed"
        | "cancelled"
      referral_status: "lead" | "registered" | "paying" | "cancelled"
      tenant_plan: "free" | "starter" | "professional" | "clinic" | "enterprise"
      tenant_role:
        | "owner"
        | "admin"
        | "nutritionist"
        | "personal"
        | "staff"
        | "patient"
      usage_intensity: "low" | "medium" | "high"
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
      achievement_type: [
        "streak",
        "meals_logged",
        "challenge_completed",
        "xp_milestone",
        "consistency",
        "variety",
      ],
      affiliate_type: [
        "regular",
        "nutritionist",
        "premium_ambassador",
        "custom",
      ],
      app_role: ["nutritionist", "patient", "admin", "personal", "lojista"],
      caloric_adjustment_type: [
        "keep_current",
        "reduce_calories_light",
        "reduce_calories_moderate",
        "increase_calories_gradual",
        "start_diet_break",
        "start_reverse_phase",
        "maintain_and_monitor",
        "switch_template_same_calories",
        "require_manual_review",
      ],
      challenge_status: ["active", "completed", "expired"],
      commission_status: [
        "pending",
        "approved",
        "paid",
        "reversed",
        "cancelled",
      ],
      commission_type: ["first_payment", "recurring"],
      meal_goal_tag: [
        "weight_loss",
        "hypertrophy",
        "metabolic",
        "low_carb",
        "functional",
        "maintenance",
      ],
      meal_plan_status: [
        "draft",
        "draft_auto_generated",
        "under_professional_review",
        "approved",
        "published_to_patient",
        "revision_requested",
        "archived",
        "expired",
        "replaced",
      ],
      meal_type: [
        "breakfast",
        "morning_snack",
        "lunch",
        "afternoon_snack",
        "dinner",
        "evening_snack",
      ],
      metabolic_phase_type: [
        "initial_response",
        "active_loss",
        "slowing_response",
        "plateau_risk",
        "plateau_active",
        "consolidation",
        "recovery",
        "maintenance",
        "recomposition",
      ],
      patient_lifecycle_status: [
        "onboarding_started",
        "onboarding_ready_for_plan",
        "plan_pending_production",
        "plan_delivered",
        "active_followup",
        "clinical_attention",
        "retention_risk",
        "maintenance_mode",
        "paused",
        "closed",
      ],
      payment_gateway: ["stripe", "mercado_pago", "pagseguro", "pix", "manual"],
      payout_status: ["pending", "processing", "paid", "failed"],
      plan_generation_source: [
        "manual",
        "protocol_fitjourney",
        "anamnesis",
        "physical_assessment",
        "mixed",
      ],
      plan_mode_type: ["weekly", "single_day"],
      protocol_status: [
        "pending",
        "active",
        "paused",
        "completed",
        "cancelled",
      ],
      referral_status: ["lead", "registered", "paying", "cancelled"],
      tenant_plan: ["free", "starter", "professional", "clinic", "enterprise"],
      tenant_role: [
        "owner",
        "admin",
        "nutritionist",
        "personal",
        "staff",
        "patient",
      ],
      usage_intensity: ["low", "medium", "high"],
    },
  },
} as const
