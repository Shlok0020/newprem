const fs = require('fs');
const path = require('path');

const directory = './'; // Root directory of your GlassHouse project

// The order of these replacements is important! 
// We replace the longest/most specific URLs first.
const replacements = [
  // 1. Backend API URLs
  { match: /https:\/\/api\.newpremglasshouse\.in/g, replace: 'http://localhost:5000' },
  { match: /api\.newpremglasshouse\.in/g, replace: 'localhost:5000' },
  
  // 2. Admin Panel URLs
  { match: /https:\/\/admin\.newpremglasshouse\.in/g, replace: 'http://localhost:5174' },
  { match: /admin\.newpremglasshouse\.in/g, replace: 'localhost:5174' },
  
  // 3. Frontend URLs
  { match: /https:\/\/newpremglasshouse\.in/g, replace: 'http://localhost:5173' },
  { match: /newpremglasshouse\.in/g, replace: 'localhost:5173' },
  
  // 4. Clean up cookie domains for localhost testing 
  { match: /domain=\.newpremglasshouse\.in;/g, replace: '' }
];

const walkSync = (dir, filelist = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      // Skip node_modules, git, and build folders to avoid corrupting dependencies/builds
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'build') {
        walkSync(filepath, filelist);
      }
    } else {
      // Only modify source code files
      if (filepath.match(/\.(js|jsx|json|ts|tsx|html|env)$/)) {
        filelist.push(filepath);
      }
    }
  }
  return filelist;
};

console.log('Scanning directories for files to update...');
const files = walkSync(directory);
let changedCount = 0;

files.forEach(file => {
  // Prevent script from modifying itself
  if (file.includes('replaceUrls.js')) return;

  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  replacements.forEach(({match, replace}) => {
    content = content.replace(match, replace);
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated: ${file}`);
    changedCount++;
  }
});

console.log(`\nDone! Successfully updated ${changedCount} files to point to localhost.`);
