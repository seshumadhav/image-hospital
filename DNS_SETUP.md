# DNS Setup Guide

## Current Configuration

- **Domain**: `thegreyward.duckdns.org`
- **EC2 Public IP**: `3.235.226.64`
- **Provider**: DuckDNS (free dynamic DNS)

## Quick Setup (Manual Method)

1. **Go to DuckDNS**: https://www.duckdns.org/
2. **Sign in** with your DuckDNS account
3. **Find your domain**: Look for `thegreyward` in your domain list
4. **Update the IP address**:
   - Clear the existing IP field (if any)
   - Enter: `3.235.226.64`
5. **Click "Save"** or the update button
6. **Wait 1-2 minutes** for DNS propagation

## Verify DNS Update

After updating, verify the DNS is pointing to the correct IP:

```bash
# Check DNS resolution
nslookup thegreyward.duckdns.org

# Or use dig
dig thegreyward.duckdns.org +short

# Expected output: 3.235.226.64
```

**From your browser:**
- Open: `http://thegreyward.duckdns.org`
- Should load your application (same as `http://3.235.226.64`)

## API Method (Automated)

If you want to automate this, DuckDNS provides an API. You'll need your DuckDNS token (found on the DuckDNS website after signing in):

```bash
# Replace YOUR_TOKEN with your actual DuckDNS token
DUCKDNS_TOKEN="YOUR_TOKEN"
EC2_IP="3.235.226.64"

# Update the domain
curl "https://www.duckdns.org/update?domains=thegreyward&token=$DUCKDNS_TOKEN&ip=$EC2_IP"
```

**Expected response**: `OK` (if successful)

## Troubleshooting

### DNS Not Updating

1. **Wait a few minutes**: DNS changes can take 1-5 minutes to propagate
2. **Check your token**: Make sure you're using the correct DuckDNS token
3. **Verify IP format**: Ensure the IP is in correct format (no spaces, no extra characters)
4. **Check DuckDNS status**: Visit https://www.duckdns.org/ and verify your domain shows the correct IP

### Domain Not Resolving

1. **Clear DNS cache** (on your local machine):
   ```bash
   # macOS
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
   
   # Linux
   sudo systemd-resolve --flush-caches
   ```

2. **Try different DNS servers**: Use Google DNS (8.8.8.8) or Cloudflare (1.1.1.1) to test

3. **Check from EC2**: SSH into EC2 and test:
   ```bash
   curl http://thegreyward.duckdns.org
   ```

## Next Steps

After DNS is configured:

1. **Test the domain**: Visit `http://thegreyward.duckdns.org` in your browser
2. **Set up SSL/HTTPS**: See `DEPLOYMENT_MINIMAL.md` Step 11 for Let's Encrypt setup
3. **Update frontend config**: If using HTTPS, update `config/config.json` with `https://thegreyward.duckdns.org/api`
