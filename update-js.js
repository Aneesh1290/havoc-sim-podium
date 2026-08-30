const fs = require('fs');
const path = require('path');

const directory = __dirname;
const jsFiles = fs.readdirSync(directory).filter(file => file.endsWith('.js') && file !== 'update-links.js' && file !== 'update-js.js' && file !== 'server.js' && file !== 'database.js');

jsFiles.forEach(file => {
    const filePath = path.join(directory, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace something.html with /something
    content = content.replace(/['"]([a-zA-Z0-9_-]+)\.html(\?[a-zA-Z0-9_=&-]+)?['"]/g, (match, p1, p2) => {
        const query = p2 || '';
        if (p1 === 'index') return `"/"`;
        return `"/${p1}${query}"`;
    });

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
});
