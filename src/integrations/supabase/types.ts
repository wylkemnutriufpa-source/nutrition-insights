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
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_id?: string
        }
        Relationships: []
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
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
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
        }
        Relationships: []
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
        }
        Relationships: []
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
        }
        Relationships: [
          {
            foreignKeyName: "booking_payments_lead_request_id_fkey"
            columns: ["lead_request_id"]
            isOneToOne: false
            referencedRelation: "lead_requests"
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
          updated_at?: string
        }
        Relationships: []
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
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          message: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          message?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
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
          top_protocol_id?: string | null
          top_protocol_name?: string | null
          total_patients_analyzed?: number | null
          total_protocols_analyzed?: number | null
          worst_protocol_id?: string | null
          worst_protocol_name?: string | null
        }
        Relationships: [
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
          total_patients?: number | null
        }
        Relationships: []
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
          urgency_level?: string | null
        }
        Relationships: []
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
          title?: string
          trigger_source?: string
        }
        Relationships: []
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
        }
        Relationships: []
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
        }
        Relationships: []
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
          type?: string
          updated_at?: string
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
          name: string
          protein: number
          serving_size: string | null
          sodium: number | null
          source: string | null
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
          name: string
          protein?: number
          serving_size?: string | null
          sodium?: number | null
          source?: string | null
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
          name?: string
          protein?: number
          serving_size?: string | null
          sodium?: number | null
          source?: string | null
        }
        Relationships: []
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
        }
        Relationships: [
          {
            foreignKeyName: "lead_requests_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
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
        }
        Relationships: [
          {
            foreignKeyName: "meal_item_completions_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_item_completions_meal_plan_item_id_fkey"
            columns: ["meal_plan_item_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_items"
            referencedColumns: ["id"]
          },
        ]
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
      meal_plan_items: {
        Row: {
          calories_target: number | null
          carbs_target: number | null
          created_at: string
          day_of_week: number | null
          description: string | null
          fat_target: number | null
          id: string
          meal_plan_id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          protein_target: number | null
          title: string
        }
        Insert: {
          calories_target?: number | null
          carbs_target?: number | null
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          fat_target?: number | null
          id?: string
          meal_plan_id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          protein_target?: number | null
          title: string
        }
        Update: {
          calories_target?: number | null
          carbs_target?: number | null
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          fat_target?: number | null
          id?: string
          meal_plan_id?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          protein_target?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_items_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          generated_by: string | null
          generation_metadata: Json | null
          generation_source: string | null
          id: string
          is_active: boolean
          nutritionist_id: string
          patient_id: string
          plan_status: string
          previous_plan_id: string | null
          start_date: string
          template_id: string | null
          template_slug: string | null
          template_version: number | null
          therapeutic_effectiveness_status: string | null
          therapeutic_efficacy_score: number | null
          title: string
          transition_origin_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          generated_by?: string | null
          generation_metadata?: Json | null
          generation_source?: string | null
          id?: string
          is_active?: boolean
          nutritionist_id: string
          patient_id: string
          plan_status?: string
          previous_plan_id?: string | null
          start_date: string
          template_id?: string | null
          template_slug?: string | null
          template_version?: number | null
          therapeutic_effectiveness_status?: string | null
          therapeutic_efficacy_score?: number | null
          title: string
          transition_origin_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          generated_by?: string | null
          generation_metadata?: Json | null
          generation_source?: string | null
          id?: string
          is_active?: boolean
          nutritionist_id?: string
          patient_id?: string
          plan_status?: string
          previous_plan_id?: string | null
          start_date?: string
          template_id?: string | null
          template_slug?: string | null
          template_version?: number | null
          therapeutic_effectiveness_status?: string | null
          therapeutic_efficacy_score?: number | null
          title?: string
          transition_origin_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_previous_plan_id_fkey"
            columns: ["previous_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
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
          title?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: []
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
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
          updated_at?: string | null
          version?: number | null
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
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      nutritionist_patients: {
        Row: {
          checkin_frequency: string | null
          created_at: string
          expires_at: string | null
          id: string
          last_checkin_reminder: string | null
          notes: string | null
          nutritionist_id: string
          patient_id: string
          status: string
        }
        Insert: {
          checkin_frequency?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          last_checkin_reminder?: string | null
          notes?: string | null
          nutritionist_id: string
          patient_id: string
          status?: string
        }
        Update: {
          checkin_frequency?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          last_checkin_reminder?: string | null
          notes?: string | null
          nutritionist_id?: string
          patient_id?: string
          status?: string
        }
        Relationships: []
      }
      onboarding_pipelines: {
        Row: {
          anamnesis_completed: boolean | null
          approved_at: string | null
          approved_by: string | null
          body_data_completed: boolean | null
          cooking_preference: string | null
          created_at: string | null
          food_preferences: Json | null
          generated_plan_data: Json | null
          generated_plan_id: string | null
          height: number | null
          id: string
          meal_count: number | null
          nutritionist_id: string
          patient_id: string
          photo_back_url: string | null
          photo_front_url: string | null
          photo_side_url: string | null
          plan_approved: boolean | null
          plan_generated: boolean | null
          preferences_completed: boolean | null
          rejection_reason: string | null
          scheduling_criteria: Json | null
          sleep_time: string | null
          status: string
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
          cooking_preference?: string | null
          created_at?: string | null
          food_preferences?: Json | null
          generated_plan_data?: Json | null
          generated_plan_id?: string | null
          height?: number | null
          id?: string
          meal_count?: number | null
          nutritionist_id: string
          patient_id: string
          photo_back_url?: string | null
          photo_front_url?: string | null
          photo_side_url?: string | null
          plan_approved?: boolean | null
          plan_generated?: boolean | null
          preferences_completed?: boolean | null
          rejection_reason?: string | null
          scheduling_criteria?: Json | null
          sleep_time?: string | null
          status?: string
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
          cooking_preference?: string | null
          created_at?: string | null
          food_preferences?: Json | null
          generated_plan_data?: Json | null
          generated_plan_id?: string | null
          height?: number | null
          id?: string
          meal_count?: number | null
          nutritionist_id?: string
          patient_id?: string
          photo_back_url?: string | null
          photo_front_url?: string | null
          photo_side_url?: string | null
          plan_approved?: boolean | null
          plan_generated?: boolean | null
          preferences_completed?: boolean | null
          rejection_reason?: string | null
          scheduling_criteria?: Json | null
          sleep_time?: string | null
          status?: string
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
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
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
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      patient_anamnesis: {
        Row: {
          answers: Json
          computed_carbs: number | null
          computed_fat: number | null
          computed_kcal_target: number | null
          computed_protein: number | null
          computed_tmb: number | null
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          computed_carbs?: number | null
          computed_fat?: number | null
          computed_kcal_target?: number | null
          computed_protein?: number | null
          computed_tmb?: number | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          computed_carbs?: number | null
          computed_fat?: number | null
          computed_kcal_target?: number | null
          computed_protein?: number | null
          computed_tmb?: number | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          title?: string
          updated_at?: string
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
          analysis_window_days: number | null
          calculation_version: string | null
          caloric_response_status: string
          calorie_avg_real: number | null
          calorie_target: number | null
          cluster_changed_at: string | null
          cluster_data_points: number | null
          cluster_engine_version: string | null
          cluster_min_days_met: boolean | null
          cluster_strategy: Json | null
          data_points_used: number | null
          engagement_avg_28d: number | null
          id: string
          metabolic_cluster: string | null
          metabolic_cluster_confidence: string | null
          metabolic_feature_vector: Json | null
          patient_id: string
          plan_active_days: number | null
          stagnation_risk_level: string
          updated_at: string | null
          weight_velocity_pct: number | null
        }
        Insert: {
          adherence_avg_28d?: number | null
          analysis_window_days?: number | null
          calculation_version?: string | null
          caloric_response_status?: string
          calorie_avg_real?: number | null
          calorie_target?: number | null
          cluster_changed_at?: string | null
          cluster_data_points?: number | null
          cluster_engine_version?: string | null
          cluster_min_days_met?: boolean | null
          cluster_strategy?: Json | null
          data_points_used?: number | null
          engagement_avg_28d?: number | null
          id?: string
          metabolic_cluster?: string | null
          metabolic_cluster_confidence?: string | null
          metabolic_feature_vector?: Json | null
          patient_id: string
          plan_active_days?: number | null
          stagnation_risk_level?: string
          updated_at?: string | null
          weight_velocity_pct?: number | null
        }
        Update: {
          adherence_avg_28d?: number | null
          analysis_window_days?: number | null
          calculation_version?: string | null
          caloric_response_status?: string
          calorie_avg_real?: number | null
          calorie_target?: number | null
          cluster_changed_at?: string | null
          cluster_data_points?: number | null
          cluster_engine_version?: string | null
          cluster_min_days_met?: boolean | null
          cluster_strategy?: Json | null
          data_points_used?: number | null
          engagement_avg_28d?: number | null
          id?: string
          metabolic_cluster?: string | null
          metabolic_cluster_confidence?: string | null
          metabolic_feature_vector?: Json | null
          patient_id?: string
          plan_active_days?: number | null
          stagnation_risk_level?: string
          updated_at?: string | null
          weight_velocity_pct?: number | null
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
          total_score?: number | null
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
            referencedRelation: "meal_plans"
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
          title?: string
          xp_earned?: number | null
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
          title?: string
          xp_reward?: number | null
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
        }
        Relationships: []
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
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          patient_id: string
          plan_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          patient_id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_prestige_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "prestige_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_protocols: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          nutritionist_id: string
          patient_id: string
          protocol_id: string
          schedule_criteria: Json | null
          start_date: string
          status: Database["public"]["Enums"]["protocol_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          nutritionist_id: string
          patient_id: string
          protocol_id: string
          schedule_criteria?: Json | null
          start_date: string
          status?: Database["public"]["Enums"]["protocol_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          nutritionist_id?: string
          patient_id?: string
          protocol_id?: string
          schedule_criteria?: Json | null
          start_date?: string
          status?: Database["public"]["Enums"]["protocol_status"]
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
          timing?: string
          updated_at?: string
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
          title?: string
        }
        Relationships: []
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
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          personal_id: string
          status?: string
          student_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          personal_id?: string
          status?: string
          student_id?: string
        }
        Relationships: []
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
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
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
      player_stats: {
        Row: {
          current_streak: number
          id: string
          last_meal_date: string | null
          level: number
          longest_streak: number
          meals_logged: number
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
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      professional_profiles: {
        Row: {
          clinic_name: string | null
          created_at: string
          id: string
          onboarding_completed: boolean
          plan_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clinic_name?: string | null
          created_at?: string
          id?: string
          onboarding_completed?: boolean
          plan_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clinic_name?: string | null
          created_at?: string
          id?: string
          onboarding_completed?: boolean
          plan_id?: string | null
          status?: string
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
        ]
      }
      profiles: {
        Row: {
          adherence_momentum: string | null
          adherence_score_7d: number | null
          adherence_score_prev_7d: number | null
          avatar_url: string | null
          clinical_risk_level: string | null
          clinical_risk_score: number | null
          created_at: string
          engagement_index: number | null
          engagement_level: string | null
          full_name: string
          id: string
          phone: string | null
          ranking_nickname: string | null
          show_in_ranking: boolean
          updated_at: string
          user_id: string
          weight_trend_status: string | null
          weight_velocity_kg_week: number | null
        }
        Insert: {
          adherence_momentum?: string | null
          adherence_score_7d?: number | null
          adherence_score_prev_7d?: number | null
          avatar_url?: string | null
          clinical_risk_level?: string | null
          clinical_risk_score?: number | null
          created_at?: string
          engagement_index?: number | null
          engagement_level?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          ranking_nickname?: string | null
          show_in_ranking?: boolean
          updated_at?: string
          user_id: string
          weight_trend_status?: string | null
          weight_velocity_kg_week?: number | null
        }
        Update: {
          adherence_momentum?: string | null
          adherence_score_7d?: number | null
          adherence_score_prev_7d?: number | null
          avatar_url?: string | null
          clinical_risk_level?: string | null
          clinical_risk_score?: number | null
          created_at?: string
          engagement_index?: number | null
          engagement_level?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          ranking_nickname?: string | null
          show_in_ranking?: boolean
          updated_at?: string
          user_id?: string
          weight_trend_status?: string | null
          weight_velocity_kg_week?: number | null
        }
        Relationships: []
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
        }
        Insert: {
          current_phase?: number | null
          enrolled_at?: string
          id?: string
          joined_at?: string | null
          patient_id: string
          program_id: string
          status?: string
        }
        Update: {
          current_phase?: number | null
          enrolled_at?: string
          id?: string
          joined_at?: string | null
          patient_id?: string
          program_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_patients_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
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
          protocol_id: string | null
          start_date: string
          tag: string
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
          protocol_id?: string | null
          start_date: string
          tag?: string
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
          protocol_id?: string | null
          start_date?: string
          tag?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
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
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
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
          is_template: boolean
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
          is_template?: boolean
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
          is_template?: boolean
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
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      saved_meals: {
        Row: {
          calories_target: number | null
          carbs_target: number | null
          created_at: string
          description: string | null
          fat_target: number | null
          id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          nutritionist_id: string
          protein_target: number | null
          title: string
        }
        Insert: {
          calories_target?: number | null
          carbs_target?: number | null
          created_at?: string
          description?: string | null
          fat_target?: number | null
          id?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          nutritionist_id: string
          protein_target?: number | null
          title: string
        }
        Update: {
          calories_target?: number | null
          carbs_target?: number | null
          created_at?: string
          description?: string | null
          fat_target?: number | null
          id?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          nutritionist_id?: string
          protein_target?: number | null
          title?: string
        }
        Relationships: []
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
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
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
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      workout_exercises: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          load_kg: number | null
          media_url: string | null
          muscle_group: string | null
          name: string
          notes: string | null
          reps: string
          rest_seconds: number | null
          routine_id: string
          sets: number
          sort_order: number
          video_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          load_kg?: number | null
          media_url?: string | null
          muscle_group?: string | null
          name: string
          notes?: string | null
          reps?: string
          rest_seconds?: number | null
          routine_id: string
          sets?: number
          sort_order?: number
          video_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          load_kg?: number | null
          media_url?: string | null
          muscle_group?: string | null
          name?: string
          notes?: string | null
          reps?: string
          rest_seconds?: number | null
          routine_id?: string
          sets?: number
          sort_order?: number
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "workout_routines"
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
          title?: string
          updated_at?: string
        }
        Relationships: []
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
        }
        Relationships: [
          {
            foreignKeyName: "workout_routines_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      create_nutritionist_account: {
        Args: { _email: string; _full_name: string; _password: string }
        Returns: string
      }
      create_patient_account: {
        Args: { _email: string; _full_name: string; _password: string }
        Returns: string
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
      find_existing_patient_emails: {
        Args: { _emails: string[]; _nutritionist_id: string }
        Returns: {
          already_linked: boolean
          email: string
        }[]
      }
      find_patient_by_email: { Args: { _email: string }; Returns: string }
      fix_all_null_tokens: { Args: never; Returns: undefined }
      fix_user_null_tokens: { Args: { _user_id: string }; Returns: undefined }
      flag_plan_review_needed: {
        Args: { _patient_id: string; _reason?: string }
        Returns: Json
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
      get_patient_emails: {
        Args: { _patient_ids: string[] }
        Returns: {
          email: string
          user_id: string
        }[]
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
      get_user_email_by_id: { Args: { _user_id: string }; Returns: string }
      get_user_id_by_email: { Args: { _email: string }; Returns: string }
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
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
      is_patient_enrolled_in_program: {
        Args: { _program_id: string; _user_id: string }
        Returns: boolean
      }
      is_program_owner: {
        Args: { _program_id: string; _user_id: string }
        Returns: boolean
      }
      log_audit: {
        Args: {
          _action: string
          _metadata?: Json
          _resource_id?: string
          _resource_type: string
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
      mark_patient_contacted: {
        Args: { _contact_method?: string; _patient_id: string }
        Returns: Json
      }
      promote_patient_to_professional: {
        Args: { _patient_email: string; _target_role?: string }
        Returns: Json
      }
      promote_to_admin: { Args: { _user_email: string }; Returns: string }
      record_ai_usage: {
        Args: { _feature_key: string; _plan_tier?: string; _user_id: string }
        Returns: Json
      }
      refresh_affiliate_metrics: { Args: never; Returns: undefined }
      refresh_ranking_cache: { Args: never; Returns: undefined }
      refresh_ranking_snapshots: {
        Args: { _period_type?: string }
        Returns: undefined
      }
      reset_all_ranking_points: { Args: never; Returns: Json }
      reset_professional_password: {
        Args: { _new_password: string; _user_id: string }
        Returns: undefined
      }
      resolve_alert: {
        Args: { _alert_id: string; _resolution_note?: string }
        Returns: Json
      }
      sync_protocol_checklist: {
        Args: { _date?: string; _patient_protocol_id: string }
        Returns: number
      }
      track_menu_click: { Args: { _menu_item_id: string }; Returns: undefined }
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
      app_role: "nutritionist" | "patient" | "admin" | "personal"
      challenge_status: "active" | "completed" | "expired"
      commission_status:
        | "pending"
        | "approved"
        | "paid"
        | "reversed"
        | "cancelled"
      commission_type: "first_payment" | "recurring"
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
      protocol_status:
        | "pending"
        | "active"
        | "paused"
        | "completed"
        | "cancelled"
      referral_status: "lead" | "registered" | "paying" | "cancelled"
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
      app_role: ["nutritionist", "patient", "admin", "personal"],
      challenge_status: ["active", "completed", "expired"],
      commission_status: [
        "pending",
        "approved",
        "paid",
        "reversed",
        "cancelled",
      ],
      commission_type: ["first_payment", "recurring"],
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
      payment_gateway: ["stripe", "mercado_pago", "pagseguro", "pix", "manual"],
      payout_status: ["pending", "processing", "paid", "failed"],
      plan_generation_source: [
        "manual",
        "protocol_fitjourney",
        "anamnesis",
        "physical_assessment",
        "mixed",
      ],
      protocol_status: [
        "pending",
        "active",
        "paused",
        "completed",
        "cancelled",
      ],
      referral_status: ["lead", "registered", "paying", "cancelled"],
    },
  },
} as const
