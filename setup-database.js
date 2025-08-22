// Setup script to create Supabase table
// Run with: node setup-database.js

const https = require('https');

const SUPABASE_URL = 'nscqhnqpmnqecruzhphq.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zY3FobnFwbW5xZWNydXpocGhxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkwMzUwNCwiZXhwIjoyMDcxNDc5NTA0fQ.X6VVTa8tGFo4Q-ZfD1WKs5qpe0R3F-hbZ3j3GK8KcoU';

const sql = `
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

-- Enable Row Level Security
ALTER TABLE transportation ENABLE ROW LEVEL SECURITY;

-- Allow public access policies
CREATE POLICY "Allow public read" ON transportation FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON transportation FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete" ON transportation FOR DELETE USING (true);
`;

const postData = JSON.stringify({ query: sql });

const options = {
    hostname: SUPABASE_URL,
    path: '/rest/v1/rpc/exec_sql',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
    }
};

console.log('Setting up Supabase database table...');

const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 204) {
            console.log('✅ Database table created successfully!');
            console.log('Your transportation hub is ready to use.');
            console.log('\nNext steps:');
            console.log('1. Open index.html and change the script src to app-supabase.js');
            console.log('2. Commit and push to GitHub');
            console.log('3. Share the link with your classmates!');
        } else {
            console.log('Response status:', res.statusCode);
            console.log('Response:', data);
            console.log('\n⚠️  Please run the SQL manually in Supabase:');
            console.log('1. Go to: https://supabase.com/dashboard/project/nscqhnqpmnqecruzhphq/sql/new');
            console.log('2. Copy the contents of setup-supabase.sql');
            console.log('3. Run the SQL query');
        }
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.write(postData);
req.end();