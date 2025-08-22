-- Run this SQL in your Supabase SQL Editor to set up the transportation table
-- Go to: https://supabase.com/dashboard/project/nscqhnqpmnqecruzhphq/sql/new

-- Create the transportation table
CREATE TABLE IF NOT EXISTS transportation (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    type VARCHAR(50) NOT NULL,
    date DATE,
    time TIME,
    from_location VARCHAR(255) NOT NULL,
    to_location VARCHAR(255) NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable Row Level Security (RLS)
ALTER TABLE transportation ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read" ON transportation;
DROP POLICY IF EXISTS "Allow public insert" ON transportation;
DROP POLICY IF EXISTS "Allow public delete" ON transportation;

-- Create policies to allow public access
CREATE POLICY "Allow public read" ON transportation
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON transportation
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public delete" ON transportation
    FOR DELETE USING (true);

-- Create an index for faster queries
CREATE INDEX idx_transportation_created_at ON transportation(created_at DESC);
CREATE INDEX idx_transportation_date ON transportation(date);
CREATE INDEX idx_transportation_type ON transportation(type);

-- Insert a test entry
INSERT INTO transportation (
    name, 
    phone, 
    type, 
    date, 
    time, 
    from_location, 
    to_location, 
    details
) VALUES (
    'Test User',
    '+1 (555) 123-4567',
    'offering-ride',
    CURRENT_DATE + INTERVAL '1 day',
    '14:00:00',
    'UCLA Campus',
    'LAX Airport',
    'This is a test entry - delete this after confirming the app works!'
);