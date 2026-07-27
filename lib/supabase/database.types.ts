export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      seo_match_reports: {
        Row: {
          id: string;
          fixture_id: number;
          locale: string;
          slug: string;
          source_fingerprint: string;
          fixture_status: string;
          home_score: number | null;
          away_score: number | null;
          headline: string;
          summary: string;
          match_report: string;
          post_match_analysis: string;
          facts: Json;
          statistics: Json;
          events: Json;
          data_quality: string;
          model: string | null;
          status: string;
          generated_at: string | null;
          updated_at: string;
          published_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          fixture_id: number;
          locale?: string;
          slug: string;
          source_fingerprint: string;
          fixture_status: string;
          home_score?: number | null;
          away_score?: number | null;
          headline?: string;
          summary?: string;
          match_report?: string;
          post_match_analysis?: string;
          facts?: Json;
          statistics?: Json;
          events?: Json;
          data_quality?: string;
          model?: string | null;
          status?: string;
          generated_at?: string | null;
          updated_at?: string;
          published_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          fixture_id?: number;
          locale?: string;
          slug?: string;
          source_fingerprint?: string;
          fixture_status?: string;
          home_score?: number | null;
          away_score?: number | null;
          headline?: string;
          summary?: string;
          match_report?: string;
          post_match_analysis?: string;
          facts?: Json;
          statistics?: Json;
          events?: Json;
          data_quality?: string;
          model?: string | null;
          status?: string;
          generated_at?: string | null;
          updated_at?: string;
          published_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_ceo_autopilot_config: {
        Row: {
          id: string; status: string; kill_switch: boolean; cycle_minutes: number; max_cycles_per_day: number; max_ai_calls_per_day: number; min_ai_gap_minutes: number; skip_unchanged: boolean; auto_execute_low_risk: boolean; last_snapshot_fingerprint: string | null; last_cycle_at: string | null; last_ai_call_at: string | null; started_at: string | null; started_by: string | null; run_lock_owner: string | null; run_lock_expires_at: string | null; updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_ceo_autopilot_config"]["Row"]> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["ai_ceo_autopilot_config"]["Row"]>;
        Relationships: [];
      };
      ai_ceo_autopilot_runs: {
        Row: {
          id: string; trigger_source: string; status: string; snapshot_fingerprint: string | null; skipped_reason: string | null; ai_source: string | null; ai_call_used: boolean; decision_id: string | null; auto_approved: boolean; auto_executed: boolean; result: Json; error: string | null; started_at: string; completed_at: string | null;
        };
        Insert: {
          id?: string; trigger_source: string; status: string; snapshot_fingerprint?: string | null; skipped_reason?: string | null; ai_source?: string | null; ai_call_used?: boolean; decision_id?: string | null; auto_approved?: boolean; auto_executed?: boolean; result?: Json; error?: string | null; started_at?: string; completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["ai_ceo_autopilot_runs"]["Row"]>;
        Relationships: [];
      };
      competitor_scan_runs: {
        Row: {
          id: string; source: string; status: string; competitors_scanned: number; observations_found: number; gaps_found: number; error: string | null; metadata: Json; started_at: string; completed_at: string | null;
        };
        Insert: {
          id?: string; source?: string; status?: string; competitors_scanned?: number; observations_found?: number; gaps_found?: number; error?: string | null; metadata?: Json; started_at?: string; completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["competitor_scan_runs"]["Row"]>;
        Relationships: [];
      };
      competitor_observations: {
        Row: {
          id: string; competitor: string; url: string; content_type: string; title: string | null; fixture_id: string | null; home_team: string | null; away_team: string | null; topic: string | null; country: string | null; language: string | null; source: string; published_at: string | null; first_detected_at: string; last_detected_at: string; raw_metadata: Json; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; competitor: string; url: string; content_type?: string; title?: string | null; fixture_id?: string | null; home_team?: string | null; away_team?: string | null; topic?: string | null; country?: string | null; language?: string | null; source?: string; published_at?: string | null; first_detected_at?: string; last_detected_at?: string; raw_metadata?: Json; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["competitor_observations"]["Row"]>;
        Relationships: [];
      };
      competitor_gaps: {
        Row: {
          id: string; observation_id: string | null; competitor: string; gap_type: string; fixture_id: string | null; topic: string | null; country: string | null; language: string | null; zerra_prediction_exists: boolean; zerra_seo_exists: boolean; priority: number; status: string; reason: string | null; detected_at: string; resolved_at: string | null; metadata: Json;
        };
        Insert: {
          id?: string; observation_id?: string | null; competitor: string; gap_type: string; fixture_id?: string | null; topic?: string | null; country?: string | null; language?: string | null; zerra_prediction_exists?: boolean; zerra_seo_exists?: boolean; priority?: number; status?: string; reason?: string | null; detected_at?: string; resolved_at?: string | null; metadata?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["competitor_gaps"]["Row"]>;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      claim_ai_ceo_autopilot_lease: {
        Args: { p_owner: string; p_lease_seconds?: number };
        Returns: boolean;
      };
      release_ai_ceo_autopilot_lease: {
        Args: { p_owner: string };
        Returns: boolean;
      };
    };
    Enums: {};
    CompositeTypes: {};
  };
};