-- DisputeKit Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stripe_customer_id VARCHAR(255),
  subscription_status VARCHAR(50) DEFAULT 'trial',
  subscription_tier VARCHAR(50) DEFAULT 'free',
  subscriptionExpiresAt TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Connected Stripe accounts
CREATE TABLE public.stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_account_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_email VARCHAR(255),
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE
);

-- Disputes (cached from Stripe)
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_account_id VARCHAR(255),
  stripe_dispute_id VARCHAR(255) UNIQUE NOT NULL,
  charge_id VARCHAR(255),
  reason VARCHAR(100),
  amount INTEGER,
  currency VARCHAR(10),
  status VARCHAR(50),
  evidence_deadline TIMESTAMP WITH TIME ZONE,
  payment_method_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE
);

-- Generated evidence/responses
CREATE TABLE public.evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID REFERENCES public.disputes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  submitted_to_stripe BOOLEAN DEFAULT FALSE,
  stripe_evidence_id VARCHAR(255),
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_disputes_user ON public.disputes(user_id);
CREATE INDEX idx_disputes_status ON public.disputes(status);
CREATE INDEX idx_stripe_accounts_user ON public.stripe_accounts(user_id);
CREATE INDEX idx_evidence_dispute ON public.evidence(dispute_id);

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only access their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Stripe accounts: users can only access their own accounts
CREATE POLICY "Users can view own stripe accounts" ON public.stripe_accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stripe accounts" ON public.stripe_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own stripe accounts" ON public.stripe_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Disputes: users can only access their own disputes
CREATE POLICY "Users can view own disputes" ON public.disputes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own disputes" ON public.disputes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own disputes" ON public.disputes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own disputes" ON public.disputes
  FOR DELETE USING (auth.uid() = user_id);

-- Evidence: users can only access their own evidence
CREATE POLICY "Users can view own evidence" ON public.evidence
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own evidence" ON public.evidence
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own evidence" ON public.evidence
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own evidence" ON public.evidence
  FOR DELETE USING (auth.uid() = user_id);