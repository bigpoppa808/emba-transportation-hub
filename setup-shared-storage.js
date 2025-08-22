// Setup script to create a JSONBin for shared storage
// Run this once to set up your own shared storage

async function setupSharedStorage() {
    console.log('Setting up shared storage on JSONBin.io...');
    
    // Step 1: Create a free account at https://jsonbin.io
    // Step 2: Get your API key from https://jsonbin.io/app/api-keys
    // Step 3: Replace this with your API key
    const API_KEY = '$2a$10$SnFeCJbF0dMz8n8.yqxfYuezlQfIXNlU5KOkTZ3Vf1LX8MYfk9CIa';
    
    // Create initial bin with empty data
    const initialData = {
        entries: [],
        createdAt: new Date().toISOString(),
        description: 'UCLA Anderson EMBA 2027 Transportation Hub'
    };
    
    try {
        const response = await fetch('https://api.jsonbin.io/v3/b', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Access-Key': API_KEY,
                'X-Bin-Name': 'EMBA-2027-Transportation',
                'X-Bin-Private': false // Make it public for read access
            },
            body: JSON.stringify(initialData)
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Success! Your bin has been created.');
            console.log('Bin ID:', data.metadata.id);
            console.log('\nUpdate app-shared.js with:');
            console.log(`this.binId = '${data.metadata.id}';`);
            console.log(`this.apiKey = '${API_KEY}';`);
            
            return data.metadata.id;
        } else {
            console.error('Failed to create bin:', await response.text());
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the setup if this file is executed directly
if (typeof window !== 'undefined') {
    setupSharedStorage();
}