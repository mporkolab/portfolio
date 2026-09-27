#!/usr/bin/env bash
# Rebuilds and restarts the site from whatever is currently in the CMS.
#
# The new image is built first and only swapped in if the build succeeds, so a
# CMS that is down or a collection whose permissions have been changed leaves
# the previous release serving rather than replacing it with an empty wall.
#
#   cms/rebuild.sh
#
# Meant to be run by cms/rebuild-hook.mjs on a Directus save, and safe to run
# by hand — also the way to start everything on a fresh box, since a plain
# `docker compose up` would build the site before the CMS it reads from is up.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

# DIRECTUS_URL and the contact-form settings come from the repo's own .env, the
# same file a manual `docker compose up` reads.
if [[ -f .env ]]; then
  set -a; . ./.env; set +a
fi

: "${DIRECTUS_URL:?DIRECTUS_URL is not set — add it to .env}"

echo "==> $(date '+%F %T')  rebuilding from $DIRECTUS_URL"

# The build reads from the CMS, and `docker compose up` builds every image
# before it starts any container — so on a fresh box the CMS has to be brought
# up first. A no-op when it is already running.
docker compose up -d directus-db directus

# Fail early with a clear message rather than deep inside the image build.
# Directus takes a few seconds to answer after its container starts.
for _ in $(seq 30); do
  curl -fsS -m 5 -o /dev/null "$DIRECTUS_URL/server/health" && break
  sleep 2
done || true
if ! curl -fsS -m 10 -o /dev/null "$DIRECTUS_URL/server/health"; then
  echo "!!  $DIRECTUS_URL is not answering; keeping the current release" >&2
  exit 1
fi

docker compose build portfolio
docker compose up -d portfolio

echo "==> $(date '+%F %T')  done"
