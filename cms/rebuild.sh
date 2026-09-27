#!/usr/bin/env bash
# Rebuilds and restarts the site from whatever is currently in the CMS.
#
# The new image is built first and only swapped in if the build succeeds, so a
# CMS that is down or a collection whose permissions have been changed leaves
# the previous release serving rather than replacing it with an empty wall.
#
#   cms/rebuild.sh
#
# Run by the rebuild-hook container on a Directus save, and safe to run by
# hand — also the way to start everything on a fresh box, since a plain
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
# From inside the hook container, localhost is the container itself.
CMS_URL="${REBUILD_CMS_URL:-$DIRECTUS_URL}"

echo "==> $(date '+%F %T')  rebuilding from $CMS_URL"

# The build reads from the CMS, and `docker compose up` builds every image
# before it starts any container — so on a fresh box the CMS has to be brought
# up first. A no-op when it is already running.
#
# Not from the hook container: the CMS is up (it just called), and compose
# there sees the repo at /repo, so it would recreate the CMS with its data
# folders pointing at a /repo that does not exist on the host.
if [[ -z "${REBUILD_IN_CONTAINER:-}" ]]; then
  docker compose up -d directus-db directus rebuild-hook
fi

# Fail early with a clear message rather than deep inside the image build.
# Directus takes a few seconds to answer after its container starts.
for _ in $(seq 30); do
  curl -fsS -m 5 -o /dev/null "$CMS_URL/server/health" && break
  sleep 2
done || true
if ! curl -fsS -m 10 -o /dev/null "$CMS_URL/server/health"; then
  echo "!!  $CMS_URL is not answering; keeping the current release" >&2
  exit 1
fi

docker compose build portfolio
docker compose up -d portfolio

echo "==> $(date '+%F %T')  done"
