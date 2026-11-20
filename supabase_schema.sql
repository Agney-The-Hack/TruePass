-- ============================================================================
-- TRUEPASS SUPABASE SCHEMA (IDEMPOTENT & SAFE TO RE-RUN)
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ============================================================================

-- 1. Create Profiles Table (Attendees & Face Commitments)
create table if not exists public.profiles (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    phone text not null unique,
    city text default 'Bengaluru',
    interests text[] default '{}',
    biometric_hash text not null,
    face_snapshot text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Tickets / Passes Table (Checked by Turnstile Scanner)
create table if not exists public.tickets (
    id uuid primary key default gen_random_uuid(),
    token_id integer not null unique,
    event_id integer not null,
    event_title text not null,
    event_date text,
    venue text,
    city text,
    tier text,
    price integer not null,
    attendee_name text not null,
    attendee_phone text not null,
    biometric_hash text not null,
    face_snapshot text,
    status text default 'ACTIVE' check (status in ('ACTIVE', 'USED', 'CANCELLED')),
    tx_hash text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    redeemed_at timestamp with time zone
);

-- 3. Indexes for Instant Scanning & Lookup at Turnstiles
create index if not exists idx_tickets_token_id on public.tickets (token_id);
create index if not exists idx_tickets_phone on public.tickets (attendee_phone);
create index if not exists idx_tickets_status on public.tickets (status);

-- 4. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.tickets enable row level security;

-- 5. Drop existing policies if they already exist (Fixes ERROR 42710)
drop policy if exists "Allow public read on profiles" on public.profiles;
drop policy if exists "Allow public insert on profiles" on public.profiles;
drop policy if exists "Allow public update on profiles" on public.profiles;

drop policy if exists "Allow public read on tickets" on public.tickets;
drop policy if exists "Allow public insert on tickets" on public.tickets;
drop policy if exists "Allow public update on tickets" on public.tickets;

-- 6. Re-create Permissive Development Policies
create policy "Allow public read on profiles" on public.profiles for select using (true);
create policy "Allow public insert on profiles" on public.profiles for insert with check (true);
create policy "Allow public update on profiles" on public.profiles for update using (true);

create policy "Allow public read on tickets" on public.tickets for select using (true);
create policy "Allow public insert on tickets" on public.tickets for insert with check (true);
create policy "Allow public update on tickets" on public.tickets for update using (true);

-- 7. Safely Enable Realtime on Tickets Table (Checks if already added)
do $$
begin
    if not exists (
        select 1 from pg_publication_tables 
        where pubname = 'supabase_realtime' 
        and schemaname = 'public' 
        and tablename = 'tickets'
    ) then
        alter publication supabase_realtime add table public.tickets;
    end if;
end $$;
