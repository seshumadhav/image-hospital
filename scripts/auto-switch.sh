#!/bin/bash
# Run by cron every 5 minutes.
# Scans existing SSL certs and switches to whichever subdomain
# currently resolves to this server's IP.

CURRENT_LINK="/etc/letsencrypt/live/current-duckdns"
LOG="/var/log/image-hospital-domain.log"

MY_IP=$(curl -s https://api.ipify.org 2>/dev/null)
if [ -z "$MY_IP" ]; then exit 0; fi

for cert_dir in /etc/letsencrypt/live/*.duckdns.org; do
  [ -d "$cert_dir" ] || continue
  full_domain=$(basename "$cert_dir")
  domain_ip=$(python3 -c "import socket; print(socket.gethostbyname('$full_domain'))" 2>/dev/null || echo "")
  if [ "$domain_ip" = "$MY_IP" ]; then
    current_cert=$(readlink -f "$CURRENT_LINK" 2>/dev/null || echo "")
    if [ "$current_cert" != "$cert_dir" ]; then
      ln -sfn "$cert_dir" "$CURRENT_LINK"
      nginx -t && systemctl reload nginx
      echo "$(date): Switched to $full_domain" >> "$LOG"
    fi
    break
  fi
done
