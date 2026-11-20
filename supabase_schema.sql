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

-- 3. Create table for Pre-Registered Attendees & Onboarding Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    email TEXT,
    phone TEXT,
    dob TEXT DEFAULT '',
    id_type TEXT DEFAULT 'Passport',
    id_number TEXT DEFAULT '',
    loyalty_tier TEXT DEFAULT 'Standard',
    photo_url TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    descriptors JSONB, -- 128-d biometric vectors
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
    photo_url TEXT DEFAULT '',
    face_verified BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'CONFIRMED', -- 'CONFIRMED' or 'REFUNDED'
    refunded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. GRANT TABLE PERMISSIONS TO anon & authenticated ROLES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.faces TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.face_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.tickets TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.faces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- 7. Drop existing policies to allow clean re-running
DROP POLICY IF EXISTS "Allow public on faces" ON public.faces;
DROP POLICY IF EXISTS "Allow public on logs" ON public.face_logs;
DROP POLICY IF EXISTS "Allow public on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public on tickets" ON public.tickets;

-- 8. Create clean, permissive policies for anon, authenticated & service_role
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
