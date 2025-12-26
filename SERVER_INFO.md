# Server Information & Quick Reference

## EC2 Instance Details

- **Public IP**: `3.235.226.64`
- **Domain**: `thegreyward.duckdns.org`
- **Instance Name**: `image-hospital-server`
- **SSH User**: `ec2-user`
- **Project Path**: `/home/ec2-user/image-hospital`

## DNS Configuration

**To bind the domain to the EC2 IP**, see `DNS_SETUP.md` for detailed instructions.

**Quick method:**
1. Go to https://www.duckdns.org/
2. Sign in
3. Update `thegreyward` subdomain IP to: `3.235.226.64`
4. Click "Save"
5. Wait 1-2 minutes for DNS propagation

## SSH Connection

```bash
# Replace /path/to/your-key.pem with your actual key file path
ssh -i /path/to/your-key.pem ec2-user@3.235.226.64
```

## Running the Server

### Local Development

**Backend:**
```bash
cd /Users/smc/coding-projects/personal-projects/image-hospital
npm install
PG_USER=$(whoami) npm run dev
```
Backend runs on: `http://localhost:3000`

**Frontend:**
```bash
cd /Users/smc/coding-projects/personal-projects/image-hospital/ui
npm install
npm run dev
```
Frontend runs on: `http://localhost:5173`

### Production (EC2)

**Deploy updates:**
```bash
# SSH into EC2 first
ssh -i /path/to/your-key.pem ec2-user@3.235.226.64

# Then run deployment script
cd /home/ec2-user/image-hospital
./deploy.sh
```

**Manual deployment (if deploy.sh is not available):**
```bash
# On EC2
cd /home/ec2-user/image-hospital
git pull
npm run build
cd ui && npm run build && cd ..
pm2 restart image-hospital
sudo systemctl reload nginx
```

## Access URLs

- **Production Frontend**: `http://3.235.226.64` or `http://thegreyward.duckdns.org`
- **Production API**: `http://3.235.226.64/api` or `http://thegreyward.duckdns.org/api`
- **Health Check**: `http://3.235.226.64/api/health`

## Quick Test Commands

**From your local machine:**
```bash
EC2_IP="3.235.226.64"

# Test frontend
curl -s -o /dev/null -w "Status: %{http_code}\n" http://$EC2_IP

# Test health check
curl http://$EC2_IP/api/health

# Test upload (replace with actual image path)
curl -X POST -F "file=@/path/to/image.jpg" http://$EC2_IP/api/upload
```

**From EC2 instance:**
```bash
# Test backend directly
curl http://localhost:3000/health

# Check PM2 status
pm2 list
pm2 logs image-hospital

# Check Nginx status
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

## Service Management

**PM2 (Backend Process Manager):**
```bash
# View status
pm2 list

# View logs
pm2 logs image-hospital

# Restart backend
pm2 restart image-hospital

# Stop backend
pm2 stop image-hospital

# Start backend
pm2 start image-hospital
```

**Nginx (Web Server):**
```bash
# Check status
sudo systemctl status nginx

# Restart
sudo systemctl restart nginx

# Reload config (without downtime)
sudo systemctl reload nginx

# View error logs
sudo tail -f /var/log/nginx/error.log

# Test config
sudo nginx -t
```

**PostgreSQL:**
```bash
# Check status
sudo systemctl status postgresql

# Start
sudo systemctl start postgresql

# Stop
sudo systemctl stop postgresql

# Connect to database
psql -h localhost -U image_user -d image_hospital
```

## Configuration Files

- **Backend Config**: `/home/ec2-user/image-hospital/config/config.json`
- **Nginx Config**: `/etc/nginx/conf.d/image-hospital.conf`
- **PM2 Config**: `~/.pm2/` (auto-generated)

## Important Notes

- **Database Password**: Stored in `config/config.json` (not committed to git)
- **Deployment Script**: `./deploy.sh` in project root on EC2
- **File Storage**: Images stored in `/home/ec2-user/image-hospital/blobs/`
- **Frontend Build**: `/home/ec2-user/image-hospital/ui/dist/`

