export type Database = {
  public: {
    Tables: {
      participants: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          email: string;
          nik: string | null;
          role: "participant" | "admin";
          level: number;
          xp: number;
          total_score: number;
          quizzes_taken: number;
          avatar_url: string | null;
          avatar_config: AvatarConfig | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          email: string;
          nik?: string | null;
          role?: "participant" | "admin";
          level?: number;
          xp?: number;
          total_score?: number;
          quizzes_taken?: number;
          avatar_url?: string | null;
          avatar_config?: AvatarConfig | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          email?: string;
          nik?: string | null;
          role?: "participant" | "admin";
          level?: number;
          xp?: number;
          total_score?: number;
          quizzes_taken?: number;
          avatar_url?: string | null;
          avatar_config?: AvatarConfig | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      batches: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          time_limit_seconds: number;
          is_active: boolean;
          start_time: string | null;
          end_time: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          time_limit_seconds?: number;
          is_active?: boolean;
          start_time?: string | null;
          end_time?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          time_limit_seconds?: number;
          is_active?: boolean;
          start_time?: string | null;
          end_time?: string | null;
          created_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          id: string;
          batch_id: string;
          question_text: string;
          question_type: "multiple_choice";
          points: number;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          batch_id: string;
          question_text: string;
          question_type?: "multiple_choice";
          points?: number;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          batch_id?: string;
          question_text?: string;
          question_type?: "multiple_choice";
          points?: number;
          order_index?: number;
        };
        Relationships: [
          {
            foreignKeyName: "questions_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "batches";
            referencedColumns: ["id"];
          },
        ];
      };
      options: {
        Row: {
          id: string;
          question_id: string;
          option_text: string;
          is_correct: boolean;
          option_label: "A" | "B" | "C" | "D";
          created_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          option_text: string;
          is_correct?: boolean;
          option_label?: "A" | "B" | "C" | "D";
          created_at?: string;
        };
        Update: {
          id?: string;
          question_id?: string;
          option_text?: string;
          is_correct?: boolean;
          option_label?: "A" | "B" | "C" | "D";
        };
        Relationships: [
          {
            foreignKeyName: "options_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
      answers: {
        Row: {
          id: string;
          participant_id: string;
          question_id: string;
          batch_id: string;
          selected_option_id: string | null;
          is_correct: boolean;
          points_earned: number;
          xp_earned: number;
          streak_count: number;
          answered_at: string;
        };
        Insert: {
          id?: string;
          participant_id: string;
          question_id: string;
          batch_id: string;
          selected_option_id?: string | null;
          is_correct?: boolean;
          points_earned?: number;
          xp_earned?: number;
          streak_count?: number;
          answered_at?: string;
        };
        Update: {
          id?: string;
          participant_id?: string;
          question_id?: string;
          batch_id?: string;
          selected_option_id?: string | null;
          is_correct?: boolean;
          points_earned?: number;
          xp_earned?: number;
          streak_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "answers_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "participants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "answers_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "answers_selected_option_id_fkey";
            columns: ["selected_option_id"];
            isOneToOne: false;
            referencedRelation: "options";
            referencedColumns: ["id"];
          },
        ];
      };
      exam_sessions: {
        Row: {
          id: string;
          participant_id: string;
          batch_id: string;
          status: "in_progress" | "completed" | "timed_out";
          score: number;
          total_xp: number;
          max_streak: number;
          started_at: string;
          finished_at: string | null;
        };
        Insert: {
          id?: string;
          participant_id: string;
          batch_id: string;
          status?: "in_progress" | "completed" | "timed_out";
          score?: number;
          total_xp?: number;
          max_streak?: number;
          started_at?: string;
          finished_at?: string | null;
        };
        Update: {
          id?: string;
          participant_id?: string;
          batch_id?: string;
          status?: "in_progress" | "completed" | "timed_out";
          score?: number;
          total_xp?: number;
          max_streak?: number;
          finished_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "exam_sessions_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "participants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exam_sessions_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "batches";
            referencedColumns: ["id"];
          },
        ];
      };
      batch_participants: {
        Row: {
          id: string;
          batch_id: string;
          participant_id: string;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          batch_id: string;
          participant_id: string;
          assigned_at?: string;
        };
        Update: {
          id?: string;
          batch_id?: string;
          participant_id?: string;
          assigned_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "batch_participants_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "batch_participants_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "participants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export interface AvatarConfig {
  gender: "f" | "m";
  hair: number;
  outfit: number;
  acc: number;
  weapon: number;
}

export type Participant = Database["public"]["Tables"]["participants"]["Row"];
export type Batch = Database["public"]["Tables"]["batches"]["Row"];
export type Question = Database["public"]["Tables"]["questions"]["Row"];
export type Option = Database["public"]["Tables"]["options"]["Row"];
export type Answer = Database["public"]["Tables"]["answers"]["Row"];
export type ExamSession = Database["public"]["Tables"]["exam_sessions"]["Row"];
export type BatchParticipant = Database["public"]["Tables"]["batch_participants"]["Row"];

export type QuestionWithOptions = Question & { options: Option[] };
