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
          is_read: boolean
          message: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
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
      diet_templates: {
        Row: {
          base_calories: number
          category: string
          conditions: string[]
          created_at: string
          description: string | null
          icon: string
          id: string
          is_active: boolean
          macro_ratio: Json
          meals: Json
          name: string
          slug: string
          tags: string[]
        }
        Insert: {
          base_calories?: number
          category?: string
          conditions?: string[]
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          macro_ratio?: Json
          meals?: Json
          name: string
          slug: string
          tags?: string[]
        }
        Update: {
          base_calories?: number
          category?: string
          conditions?: string[]
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          macro_ratio?: Json
          meals?: Json
          name?: string
          slug?: string
          tags?: string[]
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
          id: string
          is_active: boolean
          nutritionist_id: string
          patient_id: string
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          nutritionist_id: string
          patient_id: string
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          nutritionist_id?: string
          patient_id?: string
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      patient_points: {
        Row: {
          action_key: string
          earned_at: string
          id: string
          metadata: Json | null
          patient_id: string
          points: number
        }
        Insert: {
          action_key: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          patient_id: string
          points: number
        }
        Update: {
          action_key?: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          patient_id?: string
          points?: number
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
          status: string
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
          status?: string
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
          status?: string
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
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          ranking_nickname: string | null
          show_in_ranking: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          ranking_nickname?: string | null
          show_in_ranking?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          ranking_nickname?: string | null
          show_in_ranking?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          content: string
          created_at: string
          id: string
          is_anonymous: boolean
          nutritionist_id: string | null
          patient_id: string
          rating: number | null
          status: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          nutritionist_id?: string | null
          patient_id: string
          rating?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          nutritionist_id?: string | null
          patient_id?: string
          rating?: number | null
          status?: string
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_points: {
        Args: { _action_key: string; _metadata?: Json; _patient_id: string }
        Returns: Json
      }
      check_ai_usage: {
        Args: { _feature_key: string; _plan_tier?: string; _user_id: string }
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
      find_patient_by_email: { Args: { _email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
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
      lookup_referral_by_code: {
        Args: { _code: string }
        Returns: {
          nutritionist_id: string
          program_id: string
          referral_code: string
        }[]
      }
      promote_to_admin: { Args: { _user_email: string }; Returns: string }
      record_ai_usage: {
        Args: { _feature_key: string; _plan_tier?: string; _user_id: string }
        Returns: Json
      }
      refresh_ranking_cache: { Args: never; Returns: undefined }
      reset_professional_password: {
        Args: { _new_password: string; _user_id: string }
        Returns: undefined
      }
      sync_protocol_checklist: {
        Args: { _date?: string; _patient_protocol_id: string }
        Returns: number
      }
    }
    Enums: {
      achievement_type:
        | "streak"
        | "meals_logged"
        | "challenge_completed"
        | "xp_milestone"
        | "consistency"
        | "variety"
      app_role: "nutritionist" | "patient" | "admin"
      challenge_status: "active" | "completed" | "expired"
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
      app_role: ["nutritionist", "patient", "admin"],
      challenge_status: ["active", "completed", "expired"],
      meal_type: [
        "breakfast",
        "morning_snack",
        "lunch",
        "afternoon_snack",
        "dinner",
        "evening_snack",
      ],
      payment_gateway: ["stripe", "mercado_pago", "pagseguro", "pix", "manual"],
    },
  },
} as const
