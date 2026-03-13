#!/bin/bash
# Convert app store screenshot HTML files to PNG images
# Requirements: Google Chrome or Chromium installed
#
# Usage: ./convert-to-png.sh
#
# Output: PNG files at 1290x2796 (iPhone 6.7" - required for App Store)
# These also work for Google Play (auto-scaled).

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/png"
mkdir -p "$OUTPUT_DIR"

# Detect Chrome/Chromium
if command -v google-chrome &>/dev/null; then
  CHROME="google-chrome"
elif command -v chromium &>/dev/null; then
  CHROME="chromium"
elif command -v chromium-browser &>/dev/null; then
  CHROME="chromium-browser"
elif [[ -f "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]]; then
  CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
else
  echo "Error: Chrome or Chromium not found. Install one to convert screenshots."
  echo ""
  echo "Alternative: Open each HTML file in a browser and use DevTools to capture:"
  echo "  1. Open the HTML file"
  echo "  2. Open DevTools (F12)"
  echo "  3. Toggle device toolbar (Ctrl+Shift+M)"
  echo "  4. Set dimensions to 1290x2796"
  echo "  5. Right-click > Capture full size screenshot"
  exit 1
fi

echo "Using: $CHROME"
echo "Converting screenshots to PNG..."
echo ""

for html_file in "$SCRIPT_DIR"/*.html; do
  filename=$(basename "$html_file" .html)
  output="$OUTPUT_DIR/${filename}.png"

  echo "  Converting: $filename.html -> $filename.png"

  "$CHROME" \
    --headless \
    --disable-gpu \
    --no-sandbox \
    --screenshot="$output" \
    --window-size=1290,2796 \
    --hide-scrollbars \
    --force-device-scale-factor=1 \
    "file://$html_file" \
    2>/dev/null

done

echo ""
echo "Done! PNG files saved to: $OUTPUT_DIR/"
echo ""
echo "App Store requirements:"
echo "  iPhone 6.7\" (required): 1290 x 2796 px  [generated]"
echo "  iPhone 6.5\":            1284 x 2778 px  [crop/resize if needed]"
echo "  iPad 12.9\":             2048 x 2732 px  [create separate set]"
ls -la "$OUTPUT_DIR"
