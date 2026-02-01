const fs = require('fs');
const path = require('path');

// 1. Setup Directories
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

// 2. Define files to copy
const filesToCopy = [
    'index.html',
    'app.js',
    'data.js',
    'neural.js',
    'voice.js',
    'PROBLEM_AND_SOLUTION.md',
    'README.md'
];

// 3. Copy files to dist
filesToCopy.forEach(file => {
    const src = path.join(__dirname, file);
    const dest = path.join(distDir, file);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`Synced: ${file}`);
    }
});

// 4. Inject Environment Variable into dist/env.js
const apiKey = process.env.GEMINI_API_KEY || '';
const envContent = `window.ENV = {
    GEMINI_API_KEY: "${apiKey}"
};
`;

try {
    fs.writeFileSync(path.join(distDir, 'env.js'), envContent);
    console.log('✅ Successfully injected GEMINI_API_KEY into dist/env.js');
} catch (err) {
    console.error('❌ Failed to write env.js:', err);
    process.exit(1);
}

console.log('🚀 Build complete - Output directory: dist');
