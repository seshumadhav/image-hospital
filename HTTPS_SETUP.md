# HTTPS Setup Guide for The Grey Ward

This guide will set up HTTPS for `thegreyward.duckdns.org` using Let's Encrypt (free SSL certificates).

## Prerequisites

- EC2 instance running and accessible
- Domain `thegreyward.duckdns.org` pointing to EC2 IP (`3.235.226.64`)
- Nginx installed and configured
- Ports 80 (HTTP) and 443 (HTTPS) open in EC2 Security Group

## Step 1: Verify DNS and HTTP Access

First, make sure your domain is working over HTTP:

```bash
# From your local machine
curl -I http://thegreyward.duckdns.org

# Should return HTTP 200 or 301/302
```

If DNS isn't working, update it at https://www.duckdns.org/

## Step 2: Install Certbot

SSH into your EC2 instance and install Certbot:

```bash
# SSH into EC2
ssh -i /path/to/your-key.pem ec2-user@3.235.226.64

# Install Certbot and Nginx plugin
sudo yum install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

## Step 3: Obtain SSL Certificate

Run Certbot to get your SSL certificate:

```bash
sudo certbot --nginx -d thegreyward.duckdns.org
```

**Follow the prompts:**
1. **Email address**: Enter your email (for renewal notifications)
2. **Terms of Service**: Type `A` to agree
3. **Share email with EFF**: Type `Y` or `N` (your choice)
4. **Redirect HTTP to HTTPS**: Type `2` to redirect (recommended)

Certbot will:
- Automatically obtain the certificate from Let's Encrypt
- Update your Nginx configuration
- Set up automatic renewal

## Step 4: Verify Certificate

Check that the certificate was installed:

```bash
# Check certificate status
sudo certbot certificates

# Test HTTPS access
curl -I https://thegreyward.duckdns.org

# Should return HTTP 200 with SSL
```

## Step 5: Test Auto-Renewal

Let's Encrypt certificates expire every 90 days. Certbot should auto-renew them:

```bash
# Test renewal (dry run)
sudo certbot renew --dry-run

# If successful, you're all set!
```

Certbot sets up a systemd timer to auto-renew certificates. You can verify:

```bash
# Check renewal timer
sudo systemctl status certbot.timer
```

## Step 6: Update Frontend Configuration

After HTTPS is set up, update the frontend to use HTTPS URLs:

```bash
cd /home/ec2-user/image-hospital

# Update config.json to use HTTPS
cat > config/config.json << 'EOF'
{
  "server": {
    "port": 3000
  },
  "database": {
    "host": "localhost",
    "port": 5432,
    "database": "image_hospital",
    "user": "image_user",
    "password": "YOUR_PASSWORD_HERE",
    "connectionString": ""
  },
  "blobStorage": {
    "storage": "local",
    "local": {
      "directory": "/home/ec2-user/image-hospital/blobs"
    },
    "s3": {
      "bucket": "",
      "region": "us-east-1",
      "accessKeyId": "",
      "secretAccessKey": ""
    }
  },
  "supportedFileTypes": "jpeg,jpg,png,webp",
  "frontend": {
    "apiUrl": "/api"
  }
}
EOF

# Rebuild frontend (this will copy config.json to public/)
cd ui
npm run build
cd ..

# Restart services
pm2 restart image-hospital
sudo systemctl reload nginx
```

**Note**: The frontend uses relative URLs (`/api`), so it will automatically use HTTPS when accessed via `https://thegreyward.duckdns.org`. No additional changes needed!

## Step 7: Verify HTTPS is Working

Test from your browser and command line:

```bash
# Test HTTPS endpoint
curl https://thegreyward.duckdns.org

# Test API over HTTPS
curl https://thegreyward.duckdns.org/api/health

# Check SSL certificate
openssl s_client -connect thegreyward.duckdns.org:443 -servername thegreyward.duckdns.org < /dev/null 2>/dev/null | openssl x509 -noout -dates
```

## Step 8: Update Security Group (if needed)

Make sure your EC2 Security Group allows:
- **Port 80 (HTTP)** - for Let's Encrypt validation and redirects
- **Port 443 (HTTPS)** - for secure connections

## Troubleshooting

### Certificate Not Issued

If Certbot fails:

1. **Check DNS**: Verify domain points to EC2 IP
   ```bash
   nslookup thegreyward.duckdns.org
   ```

2. **Check Nginx**: Make sure Nginx is running and accessible
   ```bash
   sudo systemctl status nginx
   curl http://thegreyward.duckdns.org
   ```

3. **Check Firewall**: Ensure ports 80 and 443 are open
   ```bash
   sudo netstat -tlnp | grep -E ':(80|443)'
   ```

4. **Check Nginx Config**: Verify server_name matches domain
   ```bash
   sudo nginx -t
   sudo cat /etc/nginx/conf.d/image-hospital.conf | grep server_name
   ```

### Certificate Renewal Fails

If auto-renewal fails:

1. **Check Certbot logs**:
   ```bash
   sudo tail -f /var/log/letsencrypt/letsencrypt.log
   ```

2. **Manual renewal**:
   ```bash
   sudo certbot renew
   ```

3. **Check timer**:
   ```bash
   sudo systemctl status certbot.timer
   sudo systemctl enable certbot.timer
   ```

### Mixed Content Warnings

If you see mixed content warnings (HTTP resources on HTTPS page):

- The frontend uses relative URLs, so this shouldn't happen
- If it does, check that all API calls use `/api` (relative) not `http://...`

## Security Notes

1. **Certificate Expiry**: Let's Encrypt certificates expire every 90 days. Auto-renewal should handle this, but monitor it.

2. **HTTP Redirect**: Certbot sets up HTTP to HTTPS redirect automatically. This is recommended.

3. **HSTS**: Consider adding HSTS headers for additional security (Certbot may do this automatically).

4. **Firewall**: Only ports 22, 80, and 443 should be open to the public.

## Next Steps

After HTTPS is set up:

1. ✅ Test the site: `https://thegreyward.duckdns.org`
2. ✅ Verify API works: `https://thegreyward.duckdns.org/api/health`
3. ✅ Test image upload and access
4. ✅ Update any bookmarks or links to use HTTPS
5. ✅ Monitor certificate renewal (check logs periodically)

## Quick Reference

**Check certificate expiry:**
```bash
sudo certbot certificates
```

**Renew certificate manually:**
```bash
sudo certbot renew
```

**View Nginx SSL config:**
```bash
sudo cat /etc/nginx/conf.d/image-hospital.conf
```

**Test SSL connection:**
```bash
openssl s_client -connect thegreyward.duckdns.org:443 -servername thegreyward.duckdns.org
```

