#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${CF_API_TOKEN:-}" ]]; then
  echo "CF_API_TOKEN environment variable must be set" >&2
  exit 1
fi

ZONE_NAME=${ZONE_NAME:-goldshore.org}
API="https://api.cloudflare.com/client/v4"

# Resolve the zone identifier when not provided explicitly.
if [[ -z "${CF_ZONE_ID:-}" ]]; then
  CF_ZONE_ID=$(curl -s -X GET "$API/zones?name=$ZONE_NAME" \
    -H "Authorization: Bearer $CF_API_TOKEN" \
    -H "Content-Type: application/json" | jq -r '.result[0].id')
fi

if [[ -z "${CF_ZONE_ID:-}" || "${CF_ZONE_ID}" == "null" ]]; then
  echo "Unable to resolve zone id for $ZONE_NAME" >&2
  exit 1
fi

records=$(cat <<JSON
[
  {"name": "goldshore.org", "type": "A", "content": "192.0.2.1", "proxied": true},
  {"name": "www.goldshore.org", "type": "A", "content": "192.0.2.1", "proxied": true},
  {"name": "preview.goldshore.org", "type": "A", "content": "192.0.2.1", "proxied": true},
  {"name": "dev.goldshore.org", "type": "A", "content": "192.0.2.1", "proxied": true}
]
JSON
)

echo "Syncing DNS records for zone $ZONE_NAME ($CF_ZONE_ID)"

echo "$records" | jq -c '.[]' | while read -r record; do
  name=$(echo "$record" | jq -r '.name')
  type=$(echo "$record" | jq -r '.type')
  content=$(echo "$record" | jq -r '.content')
  proxied=$(echo "$record" | jq -r '.proxied')

  existing=$(curl -s -X GET "$API/zones/$CF_ZONE_ID/dns_records?type=$type&name=$name" \
    -H "Authorization: Bearer $CF_API_TOKEN" \
    -H "Content-Type: application/json")
  record_id=$(echo "$existing" | jq -r '.result[0].id')

  payload=$(jq -n --arg type "$type" --arg name "$name" --arg content "$content" --argjson proxied $proxied '{type:$type,name:$name,content:$content,proxied:$proxied,ttl:1}')

  if [[ "$record_id" == "null" || -z "$record_id" ]]; then
    echo "Creating $type $name -> $content"
    curl -s -X POST "$API/zones/$CF_ZONE_ID/dns_records" \
      -H "Authorization: Bearer $CF_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data "$payload" | jq '.success'
  else
    echo "Updating $type $name -> $content"
    curl -s -X PUT "$API/zones/$CF_ZONE_ID/dns_records/$record_id" \
      -H "Authorization: Bearer $CF_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data "$payload" | jq '.success'
  fi

done
