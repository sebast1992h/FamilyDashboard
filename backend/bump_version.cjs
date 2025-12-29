// Bump only the last digit in version.txt
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'version.txt');
let version = '0.0.1';
if (fs.existsSync(file)) {
  version = fs.readFileSync(file, 'utf-8').trim();
}
const parts = version.split('.');
if (parts.length === 3) {
  parts[2] = String(Number(parts[2]) + 1);
  version = parts.join('.');
  fs.writeFileSync(file, version, 'utf-8');
  console.log('Version bumped to', version);
} else {
  console.log('Invalid version format, expected x.x.x');
}
