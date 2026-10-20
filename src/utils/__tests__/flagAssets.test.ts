/**
 * Every country must ship with a bundled flag image, and the generated
 * lookup table must list every image. Otherwise that flag falls back to the
 * CDN and can fail to load ("Tap to retry").
 */
import fs from 'fs';
import path from 'path';
import { countries } from '../../data/countries';

const root = path.join(__dirname, '..', '..', '..');
const files = fs.readdirSync(path.join(root, 'assets', 'flags')).filter((f) => f.endsWith('.png'));
const table = fs.readFileSync(path.join(root, 'src', 'data', 'flagAssets.ts'), 'utf8');

describe('bundled flags', () => {
  it.each(countries.map((c) => c.id))('%s has a flag image', (id) => {
    expect(files).toContain(`${id}.png`);
  });

  it('lookup table lists every image', () => {
    for (const f of files) {
      expect(table).toContain(`require('../../assets/flags/${f}')`);
    }
  });
});
