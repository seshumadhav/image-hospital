#!/bin/bash
# First-time SSL setup. Run once from the project root.
# Usage: sudo bash scripts/setup-ssl.sh <subdomain> <email> <duckdns-token>
# Example: sudo bash scripts/setup-ssl.sh kallallo you@email.com abc123

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SUBDOMAIN="$1"
EMAIL="$2"
TOKEN="$3"

if [ -z "$SUBDOMAIN" ] || [ -z "$EMAIL" ] || [ -z "$TOKEN" ]; then
  echo "Usage: sudo bash scripts/setup-ssl.sh <subdomain> <email> <duckdns-token>"
  echo "  Get your token at https://www.duckdns.org/"
  exit 1
fi

FULL_DOMAIN="${SUBDOMAIN}.duckdns.org"

echo "Domain: $FULL_DOMAIN"

echo "Updating DuckDNS IP..."
PUBLIC_IP=$(curl -s https://api.ipify.org)
curl -s "https://www.duckdns.org/update?domains=${SUBDOMAIN}&token=${TOKEN}&ip=${PUBLIC_IP}" | grep -q "OK" && echo "DuckDNS updated to $PUBLIC_IP" || echo "Warning: DuckDNS update may have failed"

echo "Installing certbot and DuckDNS plugin..."
snap install certbot --classic 2>/dev/null || true
snap set certbot trust-plugin-with-root=ok
snap install certbot-dns-duckdns 2>/dev/null || true

echo "Saving credentials..."
mkdir -p /etc/letsencrypt/duckdns
cat > /etc/letsencrypt/duckdns/credentials.ini <<EOF
dns_duckdns_token=${TOKEN}
# email for certbot renewals
duckdns_email=${EMAIL}
EOF
chmod 600 /etc/letsencrypt/duckdns/credentials.ini

echo "Getting SSL cert for $FULL_DOMAIN..."
certbot certonly \
  --authenticator dns-duckdns \
  --dns-duckdns-credentials /etc/letsencrypt/duckdns/credentials.ini \
  --dns-duckdns-propagation-seconds 60 \
  -d "$FULL_DOMAIN" \
  --agree-tos \
  --email "$EMAIL" \
  --non-interactive

echo "Creating symlink..."
ln -sfn "/etc/letsencrypt/live/$FULL_DOMAIN" /etc/letsencrypt/live/current-duckdns

echo "Installing Nginx config..."
cp "$PROJECT_ROOT/nginx/image-hospital.conf" /etc/nginx/sites-available/image-hospital
ln -sf /etc/nginx/sites-available/image-hospital /etc/nginx/sites-enabled/image-hospital
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx

echo "Setting up DuckDNS auto-update cron (runs every 5 min)..."
CRON_CMD="*/5 * * * * curl -s \"https://www.duckdns.org/update?domains=${SUBDOMAIN}&token=${TOKEN}&ip=\" > /dev/null 2>&1"
(crontab -l 2>/dev/null | grep -v "duckdns.org/update"; echo "$CRON_CMD") | crontab -

echo ""
echo "Done! Visit https://$FULL_DOMAIN"
echo ""
echo "Next: add these secrets to GitHub repo settings:"
echo "  EC2_HOST = $(curl -s https://api.ipify.org)"
echo "  EC2_SSH_KEY = (contents of your EC2 private key)"
echo "After that, domain switches happen automatically when you push config/domain.json changes."
