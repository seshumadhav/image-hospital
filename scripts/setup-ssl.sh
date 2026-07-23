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
  exit 1
fi

echo "Installing certbot in isolated virtualenv..."
dnf install -y python3 2>/dev/null || yum install -y python3 2>/dev/null || true
rm -rf /opt/certbot
python3 -m venv /opt/certbot
/opt/certbot/bin/pip install --quiet --upgrade pip
/opt/certbot/bin/pip install --quiet certbot certbot-dns-duckdns
CERTBOT=/opt/certbot/bin/certbot
echo "certbot version: $($CERTBOT --version)"

echo "Saving DuckDNS credentials..."
mkdir -p /etc/letsencrypt/duckdns
cat > /etc/letsencrypt/duckdns/credentials.ini <<EOF
dns_duckdns_token=${TOKEN}
EOF
chmod 600 /etc/letsencrypt/duckdns/credentials.ini

echo "Getting SSL cert for ${SUBDOMAIN}.duckdns.org..."
$CERTBOT certonly \
  --authenticator dns-duckdns \
  --dns-duckdns-credentials /etc/letsencrypt/duckdns/credentials.ini \
  --dns-duckdns-propagation-seconds 60 \
  -d "${SUBDOMAIN}.duckdns.org" \
  --agree-tos \
  --email "$EMAIL" \
  --non-interactive

echo "Creating cert symlink..."
ln -sfn "/etc/letsencrypt/live/${SUBDOMAIN}.duckdns.org" /etc/letsencrypt/live/current-duckdns

echo "Installing Nginx config..."
sed "s|/home/ubuntu/image-hospital|$PROJECT_ROOT|g" \
  "$PROJECT_ROOT/nginx/image-hospital.conf" > /etc/nginx/conf.d/image-hospital.conf

echo "Setting up auto-switch cron (every 5 min)..."
chmod +x "$PROJECT_ROOT/scripts/auto-switch.sh"
(crontab -l 2>/dev/null | grep -v "auto-switch"; echo "*/5 * * * * bash $PROJECT_ROOT/scripts/auto-switch.sh") | crontab -

nginx -t && systemctl reload nginx

echo ""
echo "Done! https://${SUBDOMAIN}.duckdns.org is live."
