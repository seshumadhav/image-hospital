# Server Info

- **IP**: `44.192.81.22`
- **Domain**: `kallallo.duckdns.org`
- **SSH**: `ssh -i /path/to/key.pem ubuntu@44.192.81.22`
- **Project path**: `/home/ubuntu/image-hospital`
- **Nginx config**: `/etc/nginx/sites-available/image-hospital`

## Access URLs

- Frontend: `https://kallallo.duckdns.org`
- API: `https://kallallo.duckdns.org/api`
- Health: `https://kallallo.duckdns.org/api/health`

## Quick Commands (run on EC2)

```bash
pm2 restart image-hospital       # restart backend
sudo systemctl reload nginx      # reload nginx
sudo certbot certificates        # check SSL cert status
```

## Switching DuckDNS Subdomains

1. Update IP at https://www.duckdns.org/
2. On EC2: `sudo scripts/switch-duckdns.sh <new-subdomain>`
