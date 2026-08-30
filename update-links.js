const fs = require('fs');
const path = require('path');

const directory = __dirname;
const htmlFiles = fs.readdirSync(directory).filter(file => file.endsWith('.html'));

htmlFiles.forEach(file => {
    const filePath = path.join(directory, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace href="something.html" with href="/something"
    content = content.replace(/href="([a-zA-Z0-9_-]+)\.html"/g, (match, p1) => {
        if (p1 === 'index') return 'href="/"';
        return `href="/${p1}"`;
    });

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
});
