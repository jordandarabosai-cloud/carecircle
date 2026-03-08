const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const entitlementsPath = path.join(root, 'build', 'entitlements.mac.plist');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const issues = [];

if (!pkg.build) issues.push('Missing build section in desktop package.json');
if (!pkg.build?.mac) issues.push('Missing build.mac config');
if (pkg.build?.mac && pkg.build.mac.hardenedRuntime !== true) issues.push('build.mac.hardenedRuntime should be true');
if (pkg.build?.afterSign !== './scripts/notarize.js') issues.push('build.afterSign should point to ./scripts/notarize.js');
if (!fs.existsSync(entitlementsPath)) issues.push('Missing build/entitlements.mac.plist');

const requiredEnv = ['APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID'];
const missingEnv = requiredEnv.filter((k) => !process.env[k]);

if (issues.length) {
  console.error('MAC_CONFIG=FAIL');
  issues.forEach((x) => console.error(`- ${x}`));
  process.exit(1);
}

console.log('MAC_CONFIG=PASS');
if (missingEnv.length) {
  console.log(`NOTARIZATION_ENV_MISSING=${missingEnv.join(',')}`);
} else {
  console.log('NOTARIZATION_ENV=READY');
}
