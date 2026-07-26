#!/bin/bash
# Deployment script for image-hospital
# Run this script from EC2 home directory: ~/deploy.sh

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Navigate to project directory
cd /home/ec2-user/image-hospital || { echo "❌ Project directory not found"; exit 1; }

# Pull latest code
echo "📥 Pulling latest code..."
git pull || { echo "❌ Git pull failed"; exit 1; }

# Rebuild backend (if needed)
echo "🔨 Building backend..."
npm run build || { echo "❌ Backend build failed"; exit 1; }

# Fix permissions for UI dist directory (in case Nginx created files)
echo "🔧 Fixing permissions..."
sudo chown -R ec2-user:ec2-user ui/dist 2>/dev/null || true

# Rebuild frontend
echo "🎨 Building frontend..."
cd ui
npm run build || { echo "❌ Frontend build failed"; exit 1; }
# Ensure SEO files are copied (Vite should do this automatically, but verify)
if [ ! -f "dist/robots.txt" ] && [ -f "public/robots.txt" ]; then
    echo "   Copying robots.txt to dist..."
    cp public/robots.txt dist/robots.txt
fi
if [ ! -f "dist/sitemap.xml" ] && [ -f "public/sitemap.xml" ]; then
    echo "   Copying sitemap.xml to dist..."
    cp public/sitemap.xml dist/sitemap.xml
fi
cd ..

# Restart backend with PM2
echo "🔄 Restarting backend..."
pm2 restart image-hospital || { echo "⚠️  PM2 restart failed, trying to start..."; pm2 start dist/server.js --name image-hospital || true; }

# Sync Nginx config (repo may have changed it since last deploy)
# Written to a plain temp file first (no sudo needed) then moved into place
# with a single sudo call, since a `sudo ... | sudo tee ...` pipe can silently
# no-op under non-interactive SSH exec sessions without tripping `set -e`.
echo "🔧 Syncing Nginx config..."
GENERATED_CONF="$(mktemp)"
sed "s|/home/ubuntu/image-hospital|$(pwd)|g" nginx/image-hospital.conf > "$GENERATED_CONF"
sudo cp "$GENERATED_CONF" /etc/nginx/conf.d/image-hospital.conf
rm -f "$GENERATED_CONF"
if ! cmp -s <(sed "s|/home/ubuntu/image-hospital|$(pwd)|g" nginx/image-hospital.conf) /etc/nginx/conf.d/image-hospital.conf; then
  echo "❌ Nginx config sync failed: live config does not match repo"
  exit 1
fi
echo "   ✓ Nginx config synced"
sudo nginx -t || { echo "❌ Nginx config test failed"; exit 1; }

# Reload Nginx
echo "🌐 Reloading Nginx..."
sudo systemctl reload nginx || { echo "❌ Nginx reload failed"; exit 1; }

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 PM2 Status:"
pm2 list | grep image-hospital || echo "⚠️  Backend not running"
echo ""
echo "🌐 Test your deployment:"
echo "   Frontend: http://$(curl -s ifconfig.me || echo 'YOUR_IP')"
echo "   Health: http://$(curl -s ifconfig.me || echo 'YOUR_IP')/api/health"
echo ""



