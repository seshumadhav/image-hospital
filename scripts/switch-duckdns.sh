#!/bin/bash
# Switch to a new DuckDNS subdomain.
# Usage: sudo bash scripts/switch-duckdns.sh <subdomain>
# Example: sudo bash scripts/switch-duckdns.sh mynewname

set -e

SUBDOMAIN="$1"
CREDS="/etc/letsencrypt/duckdns/credentials.ini"

if [ -z "$SUBDOMAIN" ]; then
  echo "Usage: sudo bash scripts/switch-duckdns.sh <subdomain>"
  exit 1
fi

if [ ! -f "$CREDS" ]; then
  echo "Credentials not found at $CREDS. Run setup-ssl.sh first."
  exit 1
fi

FULL_DOMAIN="${SUBDOMAIN}.duckdns.org"
TOKEN=$(grep "^dns_duckdns_token" "$CREDS" | cut -d= -f2 | tr -d ' ')

echo "Switching to $FULL_DOMAIN..."

echo "Updating DuckDNS IP..."
PUBLIC_IP=$(curl -s https://api.ipify.org)
curl -s "https://www.duckdns.org/update?domains=${SUBDOMAIN}&token=${TOKEN}&ip=${PUBLIC_IP}" | grep -q "OK" && echo "DuckDNS updated to $PUBLIC_IP" || echo "Warning: DuckDNS update may have failed"

echo "Getting SSL cert..."
certbot certonly \
  --authenticator dns-duckdns \
  --dns-duckdns-credentials "$CREDS" \
  --dns-duckdns-propagation-seconds 60 \
  -d "$FULL_DOMAIN" \
  --non-interactive

echo "Updating symlink..."
ln -sfn "/etc/letsencrypt/live/$FULL_DOMAIN" /etc/letsencrypt/live/current-duckdns

nginx -t && systemctl reload nginx

echo "Done! https://$FULL_DOMAIN is live."
