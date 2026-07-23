#!/bin/bash
# First-time SSL setup. Run once from the project root.
# Usage: sudo bash scripts/setup-ssl.sh <email> <duckdns-token>

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DOMAIN_JSON="$PROJECT_ROOT/config/domain.json"

EMAIL="$1"
TOKEN="$2"

if [ -z "$EMAIL" ] || [ -z "$TOKEN" ]; then
  echo "Usage: sudo bash scripts/setup-ssl.sh <email> <duckdns-token>"
  echo "  Get your token at https://www.duckdns.org/"
  exit 1
fi

SUBDOMAINS=$(python3 -c "import json; print(' '.join(json.load(open('$DOMAIN_JSON')).get('subdomains', [])))")

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

for subdomain in $SUBDOMAINS; do
  FULL_DOMAIN="${subdomain}.duckdns.org"
  echo "Getting SSL cert for $FULL_DOMAIN..."
  certbot certonly \
    --authenticator dns-duckdns \
    --dns-duckdns-credentials /etc/letsencrypt/duckdns/credentials.ini \
    --dns-duckdns-propagation-seconds 60 \
    -d "$FULL_DOMAIN" \
    --agree-tos \
    --email "$EMAIL" \
    --non-interactive
done

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
echo "Done! Auto-switching is active."
echo "To switch domains: just update the IP in DuckDNS. Server switches within 5 minutes."
