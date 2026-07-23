#!/bin/bash
# First-time SSL setup. Run once from the project root.
# Usage: sudo bash scripts/setup-ssl.sh <subdomain> <email> <duckdns-token>

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

echo "Installing certbot and DuckDNS plugin..."
snap install certbot --classic 2>/dev/null || true
snap set certbot trust-plugin-with-root=ok
snap install certbot-dns-duckdns 2>/dev/null || true

echo "Saving credentials..."
mkdir -p /etc/letsencrypt/duckdns
cat > /etc/letsencrypt/duckdns/credentials.ini <<EOF
dns_duckdns_token=${TOKEN}
EOF
chmod 600 /etc/letsencrypt/duckdns/credentials.ini

echo "Getting SSL cert for ${SUBDOMAIN}.duckdns.org..."
certbot certonly \
  --authenticator dns-duckdns \
  --dns-duckdns-credentials /etc/letsencrypt/duckdns/credentials.ini \
  --dns-duckdns-propagation-seconds 60 \
  -d "${SUBDOMAIN}.duckdns.org" \
  --agree-tos \
  --email "$EMAIL" \
  --non-interactive

echo "Installing Nginx config..."
cp "$PROJECT_ROOT/nginx/image-hospital.conf" /etc/nginx/sites-available/image-hospital
ln -sf /etc/nginx/sites-available/image-hospital /etc/nginx/sites-enabled/image-hospital
rm -f /etc/nginx/sites-enabled/default

echo "Setting up auto-switch cron (every 5 min)..."
chmod +x "$PROJECT_ROOT/scripts/auto-switch.sh"
(crontab -l 2>/dev/null | grep -v "auto-switch"; echo "*/5 * * * * bash $PROJECT_ROOT/scripts/auto-switch.sh") | crontab -

echo "Running initial domain detection..."
bash "$PROJECT_ROOT/scripts/auto-switch.sh"

nginx -t && systemctl reload nginx

echo ""
echo "Done! https://${SUBDOMAIN}.duckdns.org is live."
echo "To add a new subdomain in future: trigger 'Add Subdomain' in GitHub Actions."
echo "To switch between known subdomains: just update the IP in DuckDNS."
