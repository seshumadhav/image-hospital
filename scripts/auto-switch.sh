#!/bin/bash
# Run by cron every 5 minutes.
# Detects which registered subdomain points to this server's IP
# and switches the active SSL cert automatically.

DOMAIN_JSON="/home/ubuntu/image-hospital/config/domain.json"
CURRENT_LINK="/etc/letsencrypt/live/current-duckdns"
LOG="/var/log/image-hospital-domain.log"

MY_IP=$(curl -s https://api.ipify.org 2>/dev/null)
if [ -z "$MY_IP" ]; then exit 0; fi

SUBDOMAINS=$(python3 -c "import json; print(' '.join(json.load(open('$DOMAIN_JSON')).get('subdomains', [])))" 2>/dev/null)

for subdomain in $SUBDOMAINS; do
  DOMAIN_IP=$(python3 -c "import socket; print(socket.gethostbyname('${subdomain}.duckdns.org'))" 2>/dev/null || echo "")
  if [ "$DOMAIN_IP" = "$MY_IP" ]; then
    NEW_CERT="/etc/letsencrypt/live/${subdomain}.duckdns.org"
    CURRENT_CERT=$(readlink -f "$CURRENT_LINK" 2>/dev/null || echo "")
    if [ "$CURRENT_CERT" != "$NEW_CERT" ] && [ -d "$NEW_CERT" ]; then
      ln -sfn "$NEW_CERT" "$CURRENT_LINK"
      nginx -t && systemctl reload nginx
      echo "$(date): Switched to ${subdomain}.duckdns.org" >> "$LOG"
    fi
    break
  fi
done
