// Rebuilds src/data/flagAssets.ts from the PNGs in assets/flags.
// Run after adding or replacing a flag image: node scripts/generate-flag-assets.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'assets', 'flags');
const codes = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4)).sort();

const lines = [
  '// Generated from assets/flags (public-domain flags, svg-country-flags, 800px wide).',
  '// Flags ship with the app so the game works offline and never waits on a CDN.',
  '// Regenerate with: node scripts/generate-flag-assets.js',
  "import { ImageSourcePropType } from 'react-native';",
  '',
  'export const FLAG_ASSETS: Record<string, ImageSourcePropType> = {',
  ...codes.map((c) => `  ${c.includes('-') ? `'${c}'` : c}: require('../../assets/flags/${c}.png'),`),
  '};',
];
fs.writeFileSync(path.join(root, 'src', 'data', 'flagAssets.ts'), lines.join('\n') + '\n');
console.log(`Wrote ${codes.length} flags`);
