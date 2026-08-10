#!/usr/bin/env bash
set -euo pipefail
source .env.local

STORAGE_HOST="storage.bunnycdn.com"
API_HOST="api.bunny.net"

npm run build

find dist -type f | while IFS= read -r file; do
  rel="${file#dist/}"
  echo "Uploading $rel"
  curl --fail --silent --show-error -X PUT -H "AccessKey: $BUNNY_STORAGE_KEY" --data-binary "@$file" "https://$STORAGE_HOST/$BUNNY_STORAGE_ZONE/$rel"
done

echo "Purging Bunny cache"
curl --fail --silent --show-error -X POST -H "AccessKey: $BUNNY_API_KEY" "https://$API_HOST/pullzone/$BUNNY_PULL_ZONE_ID/purgeCache"

echo
echo "Frontend deployment complete."
