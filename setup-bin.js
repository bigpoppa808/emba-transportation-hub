const https = require('https');

const API_KEY = '$2a$10$SnFeCJbF0dMz8n8.yqxfYuezlQfIXNlU5KOkTZ3Vf1LX8MYfk9CIa';

const initialData = {
    entries: [],
    createdAt: new Date().toISOString(),
    description: 'UCLA Anderson EMBA 2027 Transportation Hub'
};

const postData = JSON.stringify(initialData);

const options = {
    hostname: 'api.jsonbin.io',
    path: '/v3/b',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        'X-Access-Key': API_KEY,
        'X-Bin-Name': 'EMBA-2027-Transportation',
        'X-Bin-Private': 'false'
    }
};

const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        const response = JSON.parse(data);
        if (res.statusCode === 200 || res.statusCode === 201) {
            console.log('✅ Bin created successfully!');
            console.log('Bin ID:', response.metadata.id);
            console.log('\nYour shared storage is ready!');
        } else {
            console.error('Failed:', response);
        }
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.write(postData);
req.end();
