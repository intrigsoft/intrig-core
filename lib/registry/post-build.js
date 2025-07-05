const fs = require('fs');
const path = require('path');

// Get package.json to read the version
const packageJson = require('./package.json');

// Define the path to the registry.js file
const filePath = path.resolve(__dirname, path.join('../../dist/lib/registry/src/lib/registry.js'));
console.log('Replacing version placeholder in ' + filePath);

// Read the file content
let content = fs.readFileSync(filePath, 'utf8');

// Replace the placeholder with the actual version
content = content.replace(/__INTRIG_REGISTRY_VERSION__/g, packageJson.version);

// Write the updated content back to the file
fs.writeFileSync(filePath, content);

console.log('Replaced version placeholder with ' + packageJson.version);