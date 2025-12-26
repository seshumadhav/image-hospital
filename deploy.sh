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



