export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          preferred_currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          preferred_currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          preferred_currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      portfolios: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'portfolios_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      positions: {
        Row: {
          id: string;
          portfolio_id: string;
          symbol: string;
          name: string;
          quantity: number;
          average_price: number;
          currency: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          portfolio_id: string;
          symbol: string;
          name: string;
          quantity: number;
          average_price: number;
          currency?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          portfolio_id?: string;
          symbol?: string;
          name?: string;
          quantity?: number;
          average_price?: number;
          currency?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'positions_portfolio_id_fkey';
            columns: ['portfolio_id'];
            isOneToOne: false;
            referencedRelation: 'portfolios';
            referencedColumns: ['id'];
          }
        ];
      };
      activities: {
        Row: {
          id: string;
          portfolio_id: string;
          position_id: string | null;
          type: 'buy' | 'sell' | 'dividend' | 'split' | 'transfer';
          symbol: string;
          quantity: number;
          price: number;
          total_amount: number;
          currency: string;
          fees: number;
          executed_at: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          portfolio_id: string;
          position_id?: string | null;
          type: 'buy' | 'sell' | 'dividend' | 'split' | 'transfer';
          symbol: string;
          quantity: number;
          price: number;
          total_amount: number;
          currency?: string;
          fees?: number;
          executed_at: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          portfolio_id?: string;
          position_id?: string | null;
          type?: 'buy' | 'sell' | 'dividend' | 'split' | 'transfer';
          symbol?: string;
          quantity?: number;
          price?: number;
          total_amount?: number;
          currency?: string;
          fees?: number;
          executed_at?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'activities_portfolio_id_fkey';
            columns: ['portfolio_id'];
            isOneToOne: false;
            referencedRelation: 'portfolios';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activities_position_id_fkey';
            columns: ['position_id'];
            isOneToOne: false;
            referencedRelation: 'positions';
            referencedColumns: ['id'];
          }
        ];
      };
      watchlist: {
        Row: {
          id: string;
          user_id: string;
          symbol: string;
          name: string;
          notes: string | null;
          target_price: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          symbol: string;
          name: string;
          notes?: string | null;
          target_price?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          symbol?: string;
          name?: string;
          notes?: string | null;
          target_price?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'watchlist_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      stock_cache: {
        Row: {
          id: string;
          cache_key: string;
          symbol: string;
          data_type: 'quote' | 'fundamentals' | 'historical' | 'news';
          data: Json;
          provider: string | null;
          fetched_at: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          cache_key: string;
          symbol: string;
          data_type: 'quote' | 'fundamentals' | 'historical' | 'news';
          data: Json;
          provider?: string | null;
          fetched_at?: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          cache_key?: string;
          symbol?: string;
          data_type?: 'quote' | 'fundamentals' | 'historical' | 'news';
          data?: Json;
          provider?: string | null;
          fetched_at?: string;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      stock_metadata: {
        Row: {
          id: string;
          symbol: string;
          isin: string | null;
          wkn: string | null;
          name: string;
          type: 'stock' | 'etf' | 'fund' | 'crypto' | 'other';
          currency: string;
          exchange: string | null;
          country: string | null;
          sector: string | null;
          industry: string | null;
          yahoo_symbol: string | null;
          stooq_symbol: string | null;
          finnhub_symbol: string | null;
          is_active: boolean;
          last_updated: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          symbol: string;
          isin?: string | null;
          wkn?: string | null;
          name: string;
          type?: 'stock' | 'etf' | 'fund' | 'crypto' | 'other';
          currency?: string;
          exchange?: string | null;
          country?: string | null;
          sector?: string | null;
          industry?: string | null;
          yahoo_symbol?: string | null;
          stooq_symbol?: string | null;
          finnhub_symbol?: string | null;
          is_active?: boolean;
          last_updated?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          symbol?: string;
          isin?: string | null;
          wkn?: string | null;
          name?: string;
          type?: 'stock' | 'etf' | 'fund' | 'crypto' | 'other';
          currency?: string;
          exchange?: string | null;
          country?: string | null;
          sector?: string | null;
          industry?: string | null;
          yahoo_symbol?: string | null;
          stooq_symbol?: string | null;
          finnhub_symbol?: string | null;
          is_active?: boolean;
          last_updated?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      stock_historical: {
        Row: {
          id: string;
          symbol: string;
          date: string;
          open: number | null;
          high: number | null;
          low: number | null;
          close: number;
          adjusted_close: number | null;
          volume: number | null;
          source: 'yahoo_csv' | 'stooq_csv' | 'finnhub_api' | 'yahoo_api' | 'manual' | 'api_daily';
          created_at: string;
        };
        Insert: {
          id?: string;
          symbol: string;
          date: string;
          open?: number | null;
          high?: number | null;
          low?: number | null;
          close: number;
          adjusted_close?: number | null;
          volume?: number | null;
          source: 'yahoo_csv' | 'stooq_csv' | 'finnhub_api' | 'yahoo_api' | 'manual' | 'api_daily';
          created_at?: string;
        };
        Update: {
          id?: string;
          symbol?: string;
          date?: string;
          open?: number | null;
          high?: number | null;
          low?: number | null;
          close?: number;
          adjusted_close?: number | null;
          volume?: number | null;
          source?: 'yahoo_csv' | 'stooq_csv' | 'finnhub_api' | 'yahoo_api' | 'manual' | 'api_daily';
          created_at?: string;
        };
        Relationships: [];
      };
      data_import_log: {
        Row: {
          id: string;
          import_type: 'csv_yahoo' | 'csv_stooq' | 'csv_manual' | 'api_bulk' | 'api_daily';
          symbols: string[] | null;
          symbol_count: number | null;
          records_imported: number | null;
          records_skipped: number | null;
          records_failed: number | null;
          date_from: string | null;
          date_to: string | null;
          status: 'started' | 'completed' | 'failed' | 'partial';
          error_message: string | null;
          triggered_by: string | null;
          user_id: string | null;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          import_type: 'csv_yahoo' | 'csv_stooq' | 'csv_manual' | 'api_bulk' | 'api_daily';
          symbols?: string[] | null;
          symbol_count?: number | null;
          records_imported?: number | null;
          records_skipped?: number | null;
          records_failed?: number | null;
          date_from?: string | null;
          date_to?: string | null;
          status?: 'started' | 'completed' | 'failed' | 'partial';
          error_message?: string | null;
          triggered_by?: string | null;
          user_id?: string | null;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          import_type?: 'csv_yahoo' | 'csv_stooq' | 'csv_manual' | 'api_bulk' | 'api_daily';
          symbols?: string[] | null;
          symbol_count?: number | null;
          records_imported?: number | null;
          records_skipped?: number | null;
          records_failed?: number | null;
          date_from?: string | null;
          date_to?: string | null;
          status?: 'started' | 'completed' | 'failed' | 'partial';
          error_message?: string | null;
          triggered_by?: string | null;
          user_id?: string | null;
          started_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      cron_job_runs: {
        Row: {
          id: string;
          job_name: string;
          status: 'started' | 'completed' | 'failed';
          symbols_processed: number;
          symbols_failed: number;
          error_messages: Json | null;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          job_name: string;
          status?: 'started' | 'completed' | 'failed';
          symbols_processed?: number;
          symbols_failed?: number;
          error_messages?: Json | null;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          job_name?: string;
          status?: 'started' | 'completed' | 'failed';
          symbols_processed?: number;
          symbols_failed?: number;
          error_messages?: Json | null;
          started_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      stock_symbols: {
        Row: {
          id: string;
          symbol: string;
          name: string | null;
          currency: string;
          yahoo_symbol: string | null;
          stooq_symbol: string | null;
          is_active: boolean;
          last_updated: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          symbol: string;
          name?: string | null;
          currency?: string;
          yahoo_symbol?: string | null;
          stooq_symbol?: string | null;
          is_active?: boolean;
          last_updated?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          symbol?: string;
          name?: string | null;
          currency?: string;
          yahoo_symbol?: string | null;
          stooq_symbol?: string | null;
          is_active?: boolean;
          last_updated?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      stock_fundamentals: {
        Row: {
          id: string;
          symbol: string;
          fiscal_year: number;
          fiscal_year_end: string | null;
          is_estimate: boolean;
          currency: string;
          eps: number | null;
          pe_ratio: number | null;
          earnings_growth_pct: number | null;
          peg_ratio: number | null;
          dividend_per_share: number | null;
          dividend_yield_pct: number | null;
          payout_ratio_pct: number | null;
          operating_cashflow: number | null;
          cashflow_per_share: number | null;
          pcf_ratio: number | null;
          free_cashflow: number | null;
          revenue: number | null;
          revenue_growth_pct: number | null;
          revenue_per_employee: number | null;
          employee_count: number | null;
          book_value_per_share: number | null;
          pb_ratio: number | null;
          total_assets: number | null;
          total_equity: number | null;
          total_debt: number | null;
          equity_ratio_pct: number | null;
          debt_ratio_pct: number | null;
          dynamic_debt_ratio_pct: number | null;
          accounting_standard: string | null;
          market_cap: number | null;
          enterprise_value: number | null;
          market_cap_to_revenue: number | null;
          market_cap_to_employee: number | null;
          ev_to_ebitda: number | null;
          gross_margin_pct: number | null;
          operating_margin_pct: number | null;
          net_margin_pct: number | null;
          cashflow_margin_pct: number | null;
          ebit: number | null;
          ebit_margin_pct: number | null;
          ebitda: number | null;
          ebitda_margin_pct: number | null;
          roe_pct: number | null;
          roa_pct: number | null;
          roic_pct: number | null;
          net_income: number | null;
          shares_outstanding: number | null;
          data_source: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          symbol: string;
          fiscal_year: number;
          fiscal_year_end?: string | null;
          is_estimate?: boolean;
          currency?: string;
          eps?: number | null;
          pe_ratio?: number | null;
          earnings_growth_pct?: number | null;
          peg_ratio?: number | null;
          dividend_per_share?: number | null;
          dividend_yield_pct?: number | null;
          payout_ratio_pct?: number | null;
          operating_cashflow?: number | null;
          cashflow_per_share?: number | null;
          pcf_ratio?: number | null;
          free_cashflow?: number | null;
          revenue?: number | null;
          revenue_growth_pct?: number | null;
          revenue_per_employee?: number | null;
          employee_count?: number | null;
          book_value_per_share?: number | null;
          pb_ratio?: number | null;
          total_assets?: number | null;
          total_equity?: number | null;
          total_debt?: number | null;
          equity_ratio_pct?: number | null;
          debt_ratio_pct?: number | null;
          dynamic_debt_ratio_pct?: number | null;
          accounting_standard?: string | null;
          market_cap?: number | null;
          enterprise_value?: number | null;
          market_cap_to_revenue?: number | null;
          market_cap_to_employee?: number | null;
          ev_to_ebitda?: number | null;
          gross_margin_pct?: number | null;
          operating_margin_pct?: number | null;
          net_margin_pct?: number | null;
          cashflow_margin_pct?: number | null;
          ebit?: number | null;
          ebit_margin_pct?: number | null;
          ebitda?: number | null;
          ebitda_margin_pct?: number | null;
          roe_pct?: number | null;
          roa_pct?: number | null;
          roic_pct?: number | null;
          net_income?: number | null;
          shares_outstanding?: number | null;
          data_source?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          symbol?: string;
          fiscal_year?: number;
          fiscal_year_end?: string | null;
          is_estimate?: boolean;
          currency?: string;
          eps?: number | null;
          pe_ratio?: number | null;
          earnings_growth_pct?: number | null;
          peg_ratio?: number | null;
          dividend_per_share?: number | null;
          dividend_yield_pct?: number | null;
          payout_ratio_pct?: number | null;
          operating_cashflow?: number | null;
          cashflow_per_share?: number | null;
          pcf_ratio?: number | null;
          free_cashflow?: number | null;
          revenue?: number | null;
          revenue_growth_pct?: number | null;
          revenue_per_employee?: number | null;
          employee_count?: number | null;
          book_value_per_share?: number | null;
          pb_ratio?: number | null;
          total_assets?: number | null;
          total_equity?: number | null;
          total_debt?: number | null;
          equity_ratio_pct?: number | null;
          debt_ratio_pct?: number | null;
          dynamic_debt_ratio_pct?: number | null;
          accounting_standard?: string | null;
          market_cap?: number | null;
          enterprise_value?: number | null;
          market_cap_to_revenue?: number | null;
          market_cap_to_employee?: number | null;
          ev_to_ebitda?: number | null;
          gross_margin_pct?: number | null;
          operating_margin_pct?: number | null;
          net_margin_pct?: number | null;
          cashflow_margin_pct?: number | null;
          ebit?: number | null;
          ebit_margin_pct?: number | null;
          ebitda?: number | null;
          ebitda_margin_pct?: number | null;
          roe_pct?: number | null;
          roa_pct?: number | null;
          roic_pct?: number | null;
          net_income?: number | null;
          shares_outstanding?: number | null;
          data_source?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cron_logs: {
        Row: {
          id: string;
          job_name: string;
          status: 'started' | 'completed' | 'failed';
          symbols_total: number | null;
          symbols_success: number | null;
          symbols_failed: number | null;
          details: Json | null;
          error_message: string | null;
          started_at: string;
          completed_at: string | null;
          duration_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_name?: string;
          status: 'started' | 'completed' | 'failed';
          symbols_total?: number | null;
          symbols_success?: number | null;
          symbols_failed?: number | null;
          details?: Json | null;
          error_message?: string | null;
          started_at?: string;
          completed_at?: string | null;
          duration_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_name?: string;
          status?: 'started' | 'completed' | 'failed';
          symbols_total?: number | null;
          symbols_success?: number | null;
          symbols_failed?: number | null;
          details?: Json | null;
          error_message?: string | null;
          started_at?: string;
          completed_at?: string | null;
          duration_ms?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      activity_type: 'buy' | 'sell' | 'dividend' | 'split' | 'transfer';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Helper types for easier access
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Portfolio = Database['public']['Tables']['portfolios']['Row'];
export type Position = Database['public']['Tables']['positions']['Row'];
export type Activity = Database['public']['Tables']['activities']['Row'];
export type WatchlistItem = Database['public']['Tables']['watchlist']['Row'];

export type InsertProfile = Database['public']['Tables']['profiles']['Insert'];
export type InsertPortfolio =
  Database['public']['Tables']['portfolios']['Insert'];
export type InsertPosition = Database['public']['Tables']['positions']['Insert'];
export type InsertActivity = Database['public']['Tables']['activities']['Insert'];
export type InsertWatchlistItem =
  Database['public']['Tables']['watchlist']['Insert'];

export type UpdateProfile = Database['public']['Tables']['profiles']['Update'];
export type UpdatePortfolio =
  Database['public']['Tables']['portfolios']['Update'];
export type UpdatePosition = Database['public']['Tables']['positions']['Update'];
export type UpdateActivity = Database['public']['Tables']['activities']['Update'];
export type UpdateWatchlistItem =
  Database['public']['Tables']['watchlist']['Update'];

// Extended types with relationships
export interface PortfolioWithPositions extends Portfolio {
  positions: Position[];
}

export interface PositionWithActivities extends Position {
  activities: Activity[];
}
