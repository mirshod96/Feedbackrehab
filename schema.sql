-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create responses table
CREATE TABLE IF NOT EXISTS public.responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    course_name TEXT NOT NULL DEFAULT 'Rehabilitology & Sports Medicine',
    submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    last_class_date DATE NOT NULL,
    answers JSONB NOT NULL,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create consent_logs table
CREATE TABLE IF NOT EXISTS public.consent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    consent_given BOOLEAN NOT NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;

-- Allow insert for anonymous users on responses
CREATE POLICY "Allow anonymous inserts on responses"
ON public.responses FOR INSERT
TO anon
WITH CHECK (true);

-- Allow reading for anonymous users on responses (for the public analytics)
CREATE POLICY "Allow anonymous selects on responses"
ON public.responses FOR SELECT
TO anon
USING (true);

-- Allow insert for anonymous users on consent_logs
CREATE POLICY "Allow anonymous inserts on consent_logs"
ON public.consent_logs FOR INSERT
TO anon
WITH CHECK (true);

-- Note: to create the storage bucket, run this in Supabase SQL editor:
INSERT INTO storage.buckets (id, name, public) 
VALUES ('feedback_photos', 'feedback_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies (must be run on storage.objects)
CREATE POLICY "Give anon users access to upload" ON storage.objects
FOR INSERT TO anon WITH CHECK (bucket_id = 'feedback_photos');

CREATE POLICY "Give anon users access to read" ON storage.objects
FOR SELECT TO anon USING (bucket_id = 'feedback_photos');
