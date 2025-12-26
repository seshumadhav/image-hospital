# Minimal EC2 Deployment Guide

This guide deploys everything on a single EC2 instance - simplest possible setup.

## Architecture

- **Single EC2 instance** running:
  - PostgreSQL (database) - *Note: Future iteration should use AWS RDS instead of local PostgreSQL*
  - Node.js backend (API)
  - Nginx (serves frontend + reverse proxy for API)
- **Domain**: `thegreyward.duckdns.org` → points to EC2 public IP

## Future Improvements

- **Database**: Migrate from local PostgreSQL to AWS RDS for better reliability, automatic backups, and easier scaling

## Prerequisites

- AWS EC2 instance (t2.micro, free tier)
- EC2 key pair (.pem file)
- Domain: `thegreyward.duckdns.org` (already secured - user-facing domain)

---

## Step 1: Create EC2 Instance

1. AWS Console → EC2 → Launch Instance
2. Configure:
   - **Name**: `image-hospital-server`
   - **AMI**: Amazon Linux 2023
   - **Instance type**: `t2.micro` (free tier)
   - **Key pair**: Create/download .pem file
   - **Network settings**: 
     - Allow SSH (22)
     - Allow HTTP (80)
     - Allow HTTPS (443)
     - Allow Custom TCP 3000 (for backend)
   - **Storage**: 8 GB
3. Launch instance
4. **Note the Public IP address** (e.g., `54.123.45.67`)

---

## Step 2: Connect to EC2

```bash
# On your local machine
chmod 400 /path/to/your-key.pem
ssh -i /path/to/your-key.pem ec2-user@<PUBLIC_IP>
```

---

## Step 3: Install Dependencies on EC2

Run these commands on your EC2 instance:

```bash
# Update system
sudo yum update -y

# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Install PostgreSQL
sudo yum install -y postgresql15 postgresql15-server

# Install Nginx
sudo yum install -y nginx

# Install Git
sudo yum install -y git

# Install PM2 (process manager for Node.js)
sudo npm install -g pm2

# Verify installations
node --version
npm --version
psql --version
nginx -v
```

---

## Step 4: Set Up PostgreSQL

```bash
# Initialize PostgreSQL
sudo postgresql-setup --initdb

# Start PostgreSQL
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE image_hospital;
CREATE USER image_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE image_hospital TO image_user;
\q
EOF
```

**Note**: Replace `your_secure_password_here` with a strong password!

---

## Step 5: Clone and Build Application

```bash
# Clone your repository
cd /home/ec2-user
git clone https://github.com/yourusername/image-hospital.git
cd image-hospital

# Build backend
npm install
npm run build

# Build frontend
cd ui
npm install
npm run build
cd ..
```

---

## Step 6: Configure Backend Environment

```bash
# Create .env file for backend
cat > /home/ec2-user/image-hospital/.env << EOF
PORT=3000
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=image_hospital
PG_USER=image_user
PG_PASSWORD=your_secure_password_here
NODE_ENV=production
EOF
```

**Important**: Replace `your_secure_password_here` with the password you set in Step 4!

---

## Step 7: Configure Frontend Environment

The frontend API URL is configured in `config/config.json` under `frontend.apiUrl`.

**Options:**
- **`/api`** (recommended) - Relative URL, works with any host/IP (e.g., `http://3.235.226.64` or `http://thegreyward.duckdns.org`)
- **`http://your-domain.com/api`** - Absolute URL with domain
- **`http://your-ip:3000`** - Direct backend URL (bypasses Nginx)

**If `frontend.apiUrl` is not set in config.json**, the frontend will:
- Use `/api` in production (relative, works with any host)
- Use `http://localhost:3000` in development

```bash
# Edit config.json to set frontend API URL (already configured in Step 6)
cd /home/ec2-user/image-hospital
# The config.json should already have:
# {
#   ...
#   "frontend": {
#     "apiUrl": "/api"
#   }
# }

# Build frontend (automatically copies config.json to public directory)
cd ui
npm run build
```

---

## Step 8: Configure Nginx

```bash
# Create Nginx configuration
sudo tee /etc/nginx/conf.d/image-hospital.conf << 'EOF'
server {
    listen 80;
    server_name thegreyward.duckdns.org;

    # Serve frontend static files
    root /home/ec2-user/image-hospital/ui/dist;
    index index.html;

    # Explicitly serve robots.txt and sitemap.xml (before catch-all)
    location = /robots.txt {
        try_files $uri =404;
        access_log off;
        log_not_found off;
    }
    
    location = /sitemap.xml {
        try_files $uri =404;
        access_log off;
        log_not_found off;
        add_header Content-Type "application/xml; charset=utf-8";
    }

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy - rewrite /api to backend routes
    location /api {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Direct image access (no /api prefix needed)
    location /image/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000/health;
    }
}
EOF

# Test Nginx configuration
sudo nginx -t

# Start and enable Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## Step 9: Start Backend with PM2

```bash
cd /home/ec2-user/image-hospital

# Start backend with PM2
pm2 start dist/server.js --name "image-hospital"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions it prints (run the sudo command it shows)
```

---

## Step 10: Update DuckDNS

1. Go to https://www.duckdns.org/
2. Sign in
3. Update `thegreyward` subdomain to point to your EC2 **Public IP**
4. Click "Save"

---

## Step 11: Set Up SSL/HTTPS (Optional but Recommended)

```bash
# Install Certbot
sudo yum install -y certbot python3-certbot-nginx

# Get SSL certificate (free from Let's Encrypt)
sudo certbot --nginx -d thegreyward.duckdns.org

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)

# Certbot will automatically update Nginx config
# Test auto-renewal
sudo certbot renew --dry-run
```

---

## Step 12: Update Frontend API URL for HTTPS

After SSL is set up, update frontend to use HTTPS:

```bash
cd /home/ec2-user/image-hospital/ui
cat > .env.production << EOF
VITE_API_URL=https://thegreyward.duckdns.org/api
EOF

# Rebuild frontend
npm run build

# Restart Nginx
sudo systemctl restart nginx
```

---

## Deployment Commands Summary

**To deploy updates in the future:**

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@<PUBLIC_IP>

# Pull latest code
cd /home/ec2-user/image-hospital
git pull

# Rebuild backend
npm run build

# Rebuild frontend
cd ui
npm run build
cd ..

# Restart backend
pm2 restart image-hospital

# Restart Nginx
sudo systemctl restart nginx
```

---

## Troubleshooting

**Check backend logs:**
```bash
pm2 logs image-hospital
```

**Check Nginx logs:**
```bash
sudo tail -f /var/log/nginx/error.log
```

**Check PostgreSQL:**
```bash
sudo systemctl status postgresql
```

**Test backend directly:**
```bash
curl http://localhost:3000/health
```

**Test frontend:**
```bash
curl http://localhost/
```

---

## Security Notes

1. **Firewall**: Only ports 22 (SSH), 80 (HTTP), 443 (HTTPS) should be open
2. **Database password**: Use a strong password, never commit to git
3. **SSH key**: Keep your .pem file secure, never share it
4. **Regular updates**: Run `sudo yum update -y` periodically

---

## Cost Estimate

- **EC2 t2.micro**: Free (750 hours/month for 12 months)
- **Storage (8GB)**: Free (30GB free tier)
- **Data transfer**: Free (1GB/month outbound)
- **Total**: **$0/month** (within free tier limits)

---

## Next Steps

1. Complete Steps 1-10 to get basic deployment working
2. Test the application at `http://thegreyward.duckdns.org`
3. Set up SSL (Step 11) for HTTPS
4. Update frontend for HTTPS (Step 12)

**Ready to start?** Begin with Step 1 (create EC2 instance)!

