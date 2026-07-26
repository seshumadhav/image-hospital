# Server Info

- **IP**: `44.192.81.22`
- **Domain**: `imagehospital.duckdns.org`
- **SSH**: `ssh -i /path/to/key.pem ec2-user@44.192.81.22`
- **Project path**: `/home/ec2-user/image-hospital`
- **Nginx config**: `/etc/nginx/conf.d/image-hospital.conf`

## Access URLs

- Frontend: `https://imagehospital.duckdns.org`
- API: `https://imagehospital.duckdns.org/api`
- Health: `https://imagehospital.duckdns.org/api/health`

## Quick Commands (run on EC2)

```bash
pm2 restart image-hospital                 # restart backend
sudo systemctl reload nginx                # reload nginx
sudo /opt/certbot/bin/certbot certificates # check SSL cert status
```

## Adding / Switching DuckDNS Subdomains

Nginx is configured for `*.duckdns.org`, so any registered subdomain works without code changes.

1. **Register a new subdomain** (one-time, needs an SSL cert): run the `Add Subdomain` GitHub Actions workflow
   (`.github/workflows/add-subdomain.yml`) with the new subdomain name, or manually on EC2:
   ```bash
   sudo /opt/certbot/bin/certbot certonly \
     --authenticator dns-duckdns \
     --dns-duckdns-credentials /etc/letsencrypt/duckdns/credentials.ini \
     --dns-duckdns-propagation-seconds 60 \
     -d "<subdomain>.duckdns.org" --non-interactive
   ```
2. **Switch which subdomain is active**: update that subdomain's IP to `44.192.81.22` at https://www.duckdns.org/.
   `scripts/auto-switch.sh` runs via cron every 5 minutes, detects whichever registered subdomain resolves to
   this server, and flips the active Nginx cert automatically (or run it manually to switch immediately:
   `sudo bash scripts/auto-switch.sh`).
