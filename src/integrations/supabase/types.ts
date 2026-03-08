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
      nutritionist_patients: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          nutritionist_id: string
          patient_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          nutritionist_id: string
          patient_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      program_patients: {
        Row: {
          enrolled_at: string
          id: string
          patient_id: string
          program_id: string
          status: string
        }
        Insert: {
          enrolled_at?: string
          id?: string
          patient_id: string
          program_id: string
          status?: string
        }
        Update: {
          enrolled_at?: string
          id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      app_role: "nutritionist" | "patient"
      challenge_status: "active" | "completed" | "expired"
      meal_type:
        | "breakfast"
        | "morning_snack"
        | "lunch"
        | "afternoon_snack"
        | "dinner"
        | "evening_snack"
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
      app_role: ["nutritionist", "patient"],
      challenge_status: ["active", "completed", "expired"],
      meal_type: [
        "breakfast",
        "morning_snack",
        "lunch",
        "afternoon_snack",
        "dinner",
        "evening_snack",
      ],
    },
  },
} as const
