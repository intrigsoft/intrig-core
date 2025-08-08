const fs = require('fs');
const path = require('path');

// Path to the main.js file
const mainJsPath = path.join(__dirname, '../../dist/app/intrig/main.js');

// Read the file
let content = fs.readFileSync(mainJsPath, 'utf8');

// Replace the require statement for @intrig/common with a dynamic import
content = content.replace(
  /const\s+external_intrig_common_namespaceObject\s+=\s+__WEBPACK_EXTERNAL_createRequire\(import\.meta\.url\)\("@intrig\/common"\);/g,
  `const external_intrig_common_namespaceObject = await import("@intrig/common");`
);

// Write the updated content back to the file
fs.writeFileSync(mainJsPath, content);

console.log('Successfully updated imports in main.js');