const fs = require('fs');
const path = require('path');

// This script runs during the Vercel build process.
// It takes the GEMINI_API_KEY from the Vercel Environment Variables
// and writes it into the env.js file that the browser loads.

const apiKey = process.env.GEMINI_API_KEY || '';

if (!apiKey) {
    console.warn('⚠️ WARNING: GEMINI_API_KEY is not set in environment variables.');
}

const envContent = `window.ENV = {
    GEMINI_API_KEY: "${apiKey}"
};
`;

try {
    fs.writeFileSync(path.join(__dirname, 'env.js'), envContent);
    console.log('✅ Successfully injected GEMINI_API_KEY into env.js');
} catch (err) {
    console.error('❌ Failed to write env.js:', err);
    process.exit(1);
}
