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
          role: "participant" | "supervisor" | "admin";
          area: string | null;
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
          role?: "participant" | "supervisor" | "admin";
          area?: string | null;
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
          role?: "participant" | "supervisor" | "admin";
          area?: string | null;
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
          randomize_questions: boolean;
          start_time: string | null;
          end_time: string | null;
          passing_score: number;
          checkbox_options_count: number;
          max_attempts: number;
          show_results: boolean;
          show_answers_analysis: boolean;
          working_hours_only: boolean;
          reminder_before_start: boolean;
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
          randomize_questions?: boolean;
          start_time?: string | null;
          end_time?: string | null;
          passing_score?: number;
          checkbox_options_count?: number;
          max_attempts?: number;
          show_results?: boolean;
          show_answers_analysis?: boolean;
          working_hours_only?: boolean;
          reminder_before_start?: boolean;
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
          randomize_questions?: boolean;
          start_time?: string | null;
          end_time?: string | null;
          passing_score?: number;
          checkbox_options_count?: number;
          max_attempts?: number;
          show_results?: boolean;
          show_answers_analysis?: boolean;
          working_hours_only?: boolean;
          reminder_before_start?: boolean;
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
          question_type: "multiple_choice" | "true_false" | "binary" | "checkbox" | "essay";
          points: number;
          order_index: number;
          category: string | null;
          difficulty: "easy" | "medium" | "hard";
          created_at: string;
        };
        Insert: {
          id?: string;
          batch_id: string;
          question_text: string;
          question_type?: "multiple_choice" | "true_false" | "binary" | "checkbox" | "essay";
          points?: number;
          order_index?: number;
          category?: string | null;
          difficulty?: "easy" | "medium" | "hard";
          created_at?: string;
        };
        Update: {
          id?: string;
          batch_id?: string;
          question_text?: string;
          question_type?: "multiple_choice" | "true_false" | "binary" | "checkbox" | "essay";
          points?: number;
          order_index?: number;
          category?: string | null;
          difficulty?: "easy" | "medium" | "hard";
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
          option_label: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          option_text: string;
          is_correct?: boolean;
          option_label?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          question_id?: string;
          option_text?: string;
          is_correct?: boolean;
          option_label?: string;
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
          time_taken_seconds: number;
          essay_text: string | null;
          selected_option_ids: string[] | null;
          essay_graded: boolean;
          graded_score: number | null;
          graded_by: string | null;
          graded_at: string | null;
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
          time_taken_seconds?: number;
          essay_text?: string | null;
          selected_option_ids?: string[] | null;
          essay_graded?: boolean;
          graded_score?: number | null;
          graded_by?: string | null;
          graded_at?: string | null;
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
          time_taken_seconds?: number;
          essay_text?: string | null;
          selected_option_ids?: string[] | null;
          essay_graded?: boolean;
          graded_score?: number | null;
          graded_by?: string | null;
          graded_at?: string | null;
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
          question_order: string[] | null;
          attempt_number: number;
          is_leaderboard_eligible: boolean;
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
          question_order?: string[] | null;
          attempt_number?: number;
          is_leaderboard_eligible?: boolean;
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
          question_order?: string[] | null;
          attempt_number?: number;
          is_leaderboard_eligible?: boolean;
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
      question_archives: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
        };
        Relationships: [];
      };
      archive_questions: {
        Row: {
          id: string;
          archive_id: string;
          question_text: string;
          question_type: "multiple_choice" | "true_false" | "binary" | "checkbox" | "essay";
          category: string | null;
          difficulty: "easy" | "medium" | "hard" | "very_hard";
          default_points: number;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          archive_id: string;
          question_text: string;
          question_type?: "multiple_choice" | "true_false" | "binary" | "checkbox" | "essay";
          category?: string | null;
          difficulty?: "easy" | "medium" | "hard" | "very_hard";
          default_points?: number;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          archive_id?: string;
          question_text?: string;
          question_type?: "multiple_choice" | "true_false" | "binary" | "checkbox" | "essay";
          category?: string | null;
          difficulty?: "easy" | "medium" | "hard" | "very_hard";
          default_points?: number;
          order_index?: number;
        };
        Relationships: [];
      };
      archive_options: {
        Row: {
          id: string;
          question_id: string;
          option_text: string;
          option_label: string;
          is_correct: boolean;
        };
        Insert: {
          id?: string;
          question_id: string;
          option_text: string;
          option_label: string;
          is_correct?: boolean;
        };
        Update: {
          id?: string;
          question_id?: string;
          option_text?: string;
          option_label?: string;
          is_correct?: boolean;
        };
        Relationships: [];
      };
      batch_archives: {
        Row: {
          id: string;
          batch_id: string;
          archive_id: string;
        };
        Insert: {
          id?: string;
          batch_id: string;
          archive_id: string;
        };
        Update: {
          id?: string;
          batch_id?: string;
          archive_id?: string;
        };
        Relationships: [];
      };
      batch_question_settings: {
        Row: {
          id: string;
          batch_id: string;
          question_type: "multiple_choice" | "true_false" | "binary" | "checkbox" | "essay";
          count: number;
          points_per_question: number;
          include_difficulties: string[];
        };
        Insert: {
          id?: string;
          batch_id: string;
          question_type: "multiple_choice" | "true_false" | "binary" | "checkbox" | "essay";
          count?: number;
          points_per_question?: number;
          include_difficulties?: string[];
        };
        Update: {
          id?: string;
          batch_id?: string;
          question_type?: "multiple_choice" | "true_false" | "binary" | "checkbox" | "essay";
          count?: number;
          points_per_question?: number;
          include_difficulties?: string[];
        };
        Relationships: [];
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
  heroClass?: "fighter" | "apprentice" | "scout";
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
export type QuestionArchive = Database["public"]["Tables"]["question_archives"]["Row"];
export type ArchiveQuestion = Database["public"]["Tables"]["archive_questions"]["Row"];
export type ArchiveOption = Database["public"]["Tables"]["archive_options"]["Row"];
export type BatchArchive = Database["public"]["Tables"]["batch_archives"]["Row"];
export type BatchQuestionSetting = Database["public"]["Tables"]["batch_question_settings"]["Row"];

export type QuestionWithOptions = Question & { options: Option[] };
export type ArchiveQuestionWithOptions = ArchiveQuestion & { archive_options: ArchiveOption[] };
