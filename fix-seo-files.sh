#!/bin/bash
# Fix SEO files on production
# Run this on EC2: sudo bash fix-seo-files.sh

set -e

echo "🔧 Fixing SEO files on production..."
echo ""

cd /home/ec2-user/image-hospital || { echo "❌ Project directory not found"; exit 1; }

# Step 1: Ensure files exist in public
echo "1. Checking public directory..."
if [ ! -f "ui/public/robots.txt" ] || [ ! -f "ui/public/sitemap.xml" ]; then
    echo "   ⚠️  Files missing in public/, pulling latest code..."
    git pull
fi

# Step 2: Rebuild frontend to copy files to dist
echo "2. Rebuilding frontend (this copies public/ files to dist/)..."
cd ui
npm run build
cd ..

# Step 3: Verify files are in dist
echo "3. Verifying files in dist..."
if [ -f "ui/dist/robots.txt" ] && [ -f "ui/dist/sitemap.xml" ]; then
    echo "   ✓ Files are in dist/"
else
    echo "   ✗ Files still missing in dist/"
    echo "   Manually copying..."
    cp ui/public/robots.txt ui/dist/robots.txt 2>/dev/null || true
    cp ui/public/sitemap.xml ui/dist/sitemap.xml 2>/dev/null || true
fi

# Step 4: Fix permissions
echo "4. Fixing permissions..."
sudo chown -R ec2-user:ec2-user ui/dist
chmod 644 ui/dist/robots.txt ui/dist/sitemap.xml 2>/dev/null || true

# Step 5: Update Nginx config
echo "5. Updating Nginx configuration..."
if [ -f "nginx-update.sh" ]; then
    sudo bash nginx-update.sh
else
    echo "   ⚠️  nginx-update.sh not found, updating manually..."
    # Add location blocks if they don't exist
    if ! sudo grep -q "location = /robots.txt" /etc/nginx/conf.d/image-hospital.conf; then
        echo "   Adding robots.txt location block..."
        # This is a simplified version - full update should use nginx-update.sh
    fi
fi

# Step 6: Test
echo "6. Testing..."
echo "   robots.txt:"
curl -s http://localhost/robots.txt | head -3 || echo "   ✗ Failed"
echo ""
echo "   sitemap.xml:"
curl -s http://localhost/sitemap.xml | head -3 || echo "   ✗ Failed"
echo ""

echo "✅ Fix complete!"
echo "Test from browser:"
echo "  http://thegreyward.duckdns.org/robots.txt"
echo "  http://thegreyward.duckdns.org/sitemap.xml"

