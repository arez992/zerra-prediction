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
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};