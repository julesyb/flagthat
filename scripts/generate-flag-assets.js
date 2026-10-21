// Rebuilds src/data/flagAssets.ts from the PNGs in assets/flags.
// Run after adding or replacing a flag image: node scripts/generate-flag-assets.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'assets', 'flags');
const codes = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4)).sort();

// Width / height from the PNG header (bytes 16-23), so flags can show at their true shape
function aspect(code) {
  const buf = fs.readFileSync(path.join(dir, `${code}.png`));
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return Math.round((width / height) * 1000) / 1000;
}
const key = (c) => (c.includes('-') ? `'${c}'` : c);

const lines = [
  '// Generated from assets/flags (public-domain flags, svg-country-flags, 800px wide).',
  '// Flags ship with the app so the game works offline and never waits on a CDN.',
  '// Regenerate with: node scripts/generate-flag-assets.js',
  "import { ImageSourcePropType } from 'react-native';",
  '',
  'export const FLAG_ASSETS: Record<string, ImageSourcePropType> = {',
  ...codes.map((c) => `  ${key(c)}: require('../../assets/flags/${c}.png'),`),
  '};',
  '',
  '/** Each flag\'s true width / height. Flags differ (Switzerland 1, Qatar 2.55), and the shape is part of learning them. */',
  'export const FLAG_ASPECTS: Record<string, number> = {',
  ...codes.map((c) => `  ${key(c)}: ${aspect(c)},`),
  '};',
  '',
  '/** True width / height of a flag, or 3:2 for a code we don\'t ship. */',
  'export function getFlagAspect(code: string): number {',
  '  return FLAG_ASPECTS[code.toLowerCase()] ?? 3 / 2;',
  '}',
];
fs.writeFileSync(path.join(root, 'src', 'data', 'flagAssets.ts'), lines.join('\n') + '\n');
console.log(`Wrote ${codes.length} flags`);
