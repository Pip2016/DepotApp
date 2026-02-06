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
