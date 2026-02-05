-- MyDepot Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create activity type enum
CREATE TYPE activity_type AS ENUM ('buy', 'sell', 'dividend', 'split', 'transfer');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  preferred_currency TEXT DEFAULT 'EUR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Positions table
CREATE TABLE IF NOT EXISTS positions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  average_price NUMERIC NOT NULL CHECK (average_price >= 0),
  currency TEXT DEFAULT 'EUR',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities table (transactions)
CREATE TABLE IF NOT EXISTS activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE NOT NULL,
  position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
  type activity_type NOT NULL,
  symbol TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  price NUMERIC NOT NULL CHECK (price >= 0),
  total_amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  fees NUMERIC DEFAULT 0,
  executed_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  notes TEXT,
  target_price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_portfolio_id ON positions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol);
CREATE INDEX IF NOT EXISTS idx_activities_portfolio_id ON activities(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_activities_position_id ON activities(position_id);
CREATE INDEX IF NOT EXISTS idx_activities_executed_at ON activities(executed_at);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_symbol ON watchlist(symbol);

-- Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Portfolios policies
CREATE POLICY "Users can view their own portfolios"
  ON portfolios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own portfolios"
  ON portfolios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolios"
  ON portfolios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolios"
  ON portfolios FOR DELETE
  USING (auth.uid() = user_id);

-- Positions policies (via portfolio ownership)
CREATE POLICY "Users can view positions in their portfolios"
  ON positions FOR SELECT
  USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create positions in their portfolios"
  ON positions FOR INSERT
  WITH CHECK (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update positions in their portfolios"
  ON positions FOR UPDATE
  USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete positions in their portfolios"
  ON positions FOR DELETE
  USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- Activities policies (via portfolio ownership)
CREATE POLICY "Users can view activities in their portfolios"
  ON activities FOR SELECT
  USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create activities in their portfolios"
  ON activities FOR INSERT
  WITH CHECK (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update activities in their portfolios"
  ON activities FOR UPDATE
  USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete activities in their portfolios"
  ON activities FOR DELETE
  USING (
    portfolio_id IN (
      SELECT id FROM portfolios WHERE user_id = auth.uid()
    )
  );

-- Watchlist policies
CREATE POLICY "Users can view their own watchlist"
  ON watchlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own watchlist"
  ON watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlist"
  ON watchlist FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own watchlist"
  ON watchlist FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );

  -- Create default portfolio for new user
  INSERT INTO public.portfolios (user_id, name, is_default)
  VALUES (NEW.id, 'Mein Portfolio', TRUE);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON portfolios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at
  BEFORE UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
