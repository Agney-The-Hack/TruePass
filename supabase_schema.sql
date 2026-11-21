-- ==========================================================
-- TruePass & BioVision AI - Supabase Cloud Database Schema (v3.0)
-- Run this in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==========================================================

-- 1. Create table for Enrolled People & Biometric Descriptors
CREATE TABLE IF NOT EXISTS public.faces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    photo_url TEXT DEFAULT '',
    descriptors JSONB NOT NULL, -- Stores 128-d biometric vectors
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create table for Recognition & Attendance Logs
CREATE TABLE IF NOT EXISTS public.face_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    confidence INTEGER,
    distance NUMERIC(6,4),
    photo_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create table for Pre-Registered Attendees & Onboarding Profiles (Zero-Leakage Privacy)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    email TEXT,
    phone TEXT,
    dob TEXT DEFAULT '',
    id_type TEXT DEFAULT 'Passport',
    id_number TEXT DEFAULT '',
    loyalty_tier TEXT DEFAULT 'Standard',
    photo_url TEXT DEFAULT '', -- Kept blank: Raw photos are never persisted
    notes TEXT DEFAULT '',
    descriptors JSONB DEFAULT '[]'::jsonb, -- Kept empty: Raw templates are never persisted
    biometric_commitment TEXT DEFAULT '', -- Salted bytes32 commitment hash
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create table for Purchased Event Tickets & Bookings
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id TEXT UNIQUE NOT NULL,
    event_id TEXT NOT NULL,
    event_title TEXT NOT NULL,
    venue TEXT NOT NULL,
    event_date TEXT NOT NULL,
    showtime TEXT NOT NULL,
    format TEXT DEFAULT '',
    seats JSONB NOT NULL, -- Array of seats e.g. ["A1", "A2"]
    total_amount NUMERIC(10,2) NOT NULL,
    buyer_name TEXT NOT NULL,
    buyer_email TEXT NOT NULL,
    buyer_phone TEXT DEFAULT '',
    id_type TEXT DEFAULT '',
    id_number TEXT DEFAULT '',
    loyalty_tier TEXT DEFAULT 'Standard',
    photo_url TEXT DEFAULT '', -- Kept blank: Raw photos are never persisted
    biometric_commitment TEXT DEFAULT '', -- Salted bytes32 commitment hash for gate turnstile
    face_verified BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'CONFIRMED', -- 'CONFIRMED' or 'REFUNDED'
    refunded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create table for Quai Network Decentralized Resale Listings
CREATE TABLE IF NOT EXISTS public.resale_listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_id TEXT UNIQUE NOT NULL,
    token_id TEXT NOT NULL,
    booking_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    event_title TEXT NOT NULL,
    artist TEXT DEFAULT '',
    venue TEXT NOT NULL,
    event_date TEXT NOT NULL,
    showtime TEXT NOT NULL,
    category TEXT DEFAULT 'concerts',
    seat_category TEXT DEFAULT '',
    seats JSONB NOT NULL,
    seller_name TEXT NOT NULL,
    seller_address TEXT NOT NULL,
    seller_loyalty_tier TEXT DEFAULT 'Standard',
    original_price_inr NUMERIC(10,2) NOT NULL,
    original_price_quai NUMERIC(10,3) NOT NULL,
    resale_price_quai NUMERIC(10,3) NOT NULL,
    resale_price_inr NUMERIC(10,2) NOT NULL,
    markup_percent NUMERIC(6,2) NOT NULL,
    platform_fee_quai NUMERIC(10,4) DEFAULT 0,
    royalty_fee_quai NUMERIC(10,4) DEFAULT 0,
    net_proceeds_quai NUMERIC(10,4) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_sold BOOLEAN DEFAULT false,
    buyer_name TEXT,
    buyer_address TEXT,
    quai_tx_hash TEXT DEFAULT '',
    settlement_tx_hash TEXT DEFAULT '',
    quai_shard TEXT DEFAULT 'Cyprus-1 (Shard 0x00)',
    listed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    sold_at TIMESTAMPTZ
);

-- 6. GRANT TABLE PERMISSIONS TO anon & authenticated ROLES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.faces TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.face_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.tickets TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.resale_listings TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.faces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resale_listings ENABLE ROW LEVEL SECURITY;

-- 8. Drop existing policies to allow clean re-running
DROP POLICY IF EXISTS "Allow public on faces" ON public.faces;
DROP POLICY IF EXISTS "Allow public on logs" ON public.face_logs;
DROP POLICY IF EXISTS "Allow public on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public on tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow public on resale_listings" ON public.resale_listings;

-- 9. Create clean, permissive policies for anon, authenticated & service_role
CREATE POLICY "Allow public on resale_listings"
    ON public.resale_listings FOR ALL
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);
CREATE POLICY "Allow public on faces" 
    ON public.faces FOR ALL 
    TO anon, authenticated, service_role 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Allow public on logs" 
    ON public.face_logs FOR ALL 
    TO anon, authenticated, service_role 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Allow public on profiles" 
    ON public.profiles FOR ALL 
    TO anon, authenticated, service_role 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Allow public on tickets" 
    ON public.tickets FOR ALL 
    TO anon, authenticated, service_role 
    USING (true) 
    WITH CHECK (true);

-- 9. Create Storage Bucket for Face Photos ('face-photos')
INSERT INTO storage.buckets (id, name, public)
VALUES ('face-photos', 'face-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for the 'face-photos' bucket
DROP POLICY IF EXISTS "Public Access for face-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload for face-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete for face-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public on photos" ON storage.objects;

CREATE POLICY "Allow public on photos"
    ON storage.objects FOR ALL
    TO anon, authenticated, service_role
    USING (bucket_id = 'face-photos')
    WITH CHECK (bucket_id = 'face-photos');
