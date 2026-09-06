#!/usr/bin/env bash
# Re-shoots the interface captures in src/assets/app from the runtime's own hermetic e2e
# harness (surfaces/gui/e2e, a scripted fake agent: no model, no keys, deterministic).
# The spec and config live here; they are copied beside the harness to run, because the
# fixtures import from a relative path and Playwright resolves from the runtime's tree.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SITE="$(cd "$HERE/../.." && pwd)"
GUI="${REMIT_GUI:-$SITE/../ai_openWork/surfaces/gui}"
OUT="$SITE/src/assets/app"
mkdir -p "$GUI/e2e-site" "$OUT"
cp "$HERE/playwright.config.ts" "$HERE/shots.spec.ts" "$GUI/e2e-site/"
(cd "$GUI" && SHOTS_OUT="$OUT" npx playwright test -c e2e-site/playwright.config.ts "$@")
# PNG → WebP, and drop the captures the site does not use.
node - "$OUT" <<'JS'
const sharp = require(process.argv[1] + '/../../../node_modules/sharp');
const fs = require('fs'), path = require('path'), dir = process.argv[2];
(async () => {
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.png'))) {
    await sharp(path.join(dir, f)).webp({ quality: 90 }).toFile(path.join(dir, f.replace(/\.png$/, '.webp')));
    fs.unlinkSync(path.join(dir, f));
  }
})();
JS
echo "captures in $OUT"
