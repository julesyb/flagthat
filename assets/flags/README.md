# Flags

197 country flags bundled with the app, so flags load offline and never depend on a CDN.

- Source: [svg-country-flags](https://www.npmjs.com/package/svg-country-flags) v1.2.10 (public domain, from Wikimedia Commons), `png1000px` set.
- Resized to 800px wide and compressed to a 256-color palette.
- File name is the lowercase country code used in `src/data/countries.ts`.

After adding or replacing a file, regenerate the lookup table:

```
node scripts/generate-flag-assets.js
```
