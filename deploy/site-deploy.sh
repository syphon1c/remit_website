#!/usr/bin/env bash
# The forced command behind the site's deploy key on the web server. The CI job pipes a
# tarball of the built site over SSH; this script unpacks it beside the live directory,
# checks it, and swaps it in atomically, keeping the previous release for a rollback.
#
#   authorized_keys:  command="/usr/local/bin/site-deploy",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding ssh-ed25519 AAAA… site-deploy
#
# The key can do nothing but run this. Releases live in /var/www/remit-ai.app.releases/<stamp>;
# /var/www/remit-ai.app is a symlink to the current one.
set -euo pipefail
ROOT="${SITE_ROOT:-/var/www/remit-ai.app}"
RELEASES="${ROOT}.releases"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
NEW="$RELEASES/$STAMP"
mkdir -p "$NEW"
tar -xzf - -C "$NEW"
# A site without a home page or the manual's index is not a site.
test -s "$NEW/index.html" && test -s "$NEW/docs/index.html" || { echo "deploy: incomplete build" >&2; rm -rf "$NEW"; exit 1; }
find "$NEW" -type d -exec chmod 755 {} + && find "$NEW" -type f -exec chmod 644 {} +
PREV="$(readlink -f "$ROOT" 2>/dev/null || true)"
ln -sfn "$NEW" "$ROOT.tmp" && mv -Tf "$ROOT.tmp" "$ROOT"
echo "deploy: live $STAMP (previous: ${PREV:-none})"
# Keep the five newest releases.
ls -1dt "$RELEASES"/* | tail -n +6 | xargs -r rm -rf
