#!/bin/bash
# Diagnostic script to check if robots.txt and sitemap.xml are working
# Run this on EC2

echo "=== Checking SEO Files on Production ==="
echo ""

# Check if files exist in dist
echo "1. Checking if files exist in dist directory:"
ls -la /home/ec2-user/image-hospital/ui/dist/robots.txt 2>/dev/null && echo "   ✓ robots.txt exists" || echo "   ✗ robots.txt NOT FOUND"
ls -la /home/ec2-user/image-hospital/ui/dist/sitemap.xml 2>/dev/null && echo "   ✓ sitemap.xml exists" || echo "   ✗ sitemap.xml NOT FOUND"
echo ""

# Check if files exist in public
echo "2. Checking if files exist in public directory:"
ls -la /home/ec2-user/image-hospital/ui/public/robots.txt 2>/dev/null && echo "   ✓ robots.txt exists in public" || echo "   ✗ robots.txt NOT FOUND in public"
ls -la /home/ec2-user/image-hospital/ui/public/sitemap.xml 2>/dev/null && echo "   ✓ sitemap.xml exists in public" || echo "   ✗ sitemap.xml NOT FOUND in public"
echo ""

# Check Nginx config
echo "3. Checking Nginx configuration:"
if sudo grep -q "location = /robots.txt" /etc/nginx/conf.d/image-hospital.conf; then
    echo "   ✓ robots.txt location block found"
else
    echo "   ✗ robots.txt location block NOT FOUND"
fi

if sudo grep -q "location = /sitemap.xml" /etc/nginx/conf.d/image-hospital.conf; then
    echo "   ✓ sitemap.xml location block found"
else
    echo "   ✗ sitemap.xml location block NOT FOUND"
fi
echo ""

# Test via curl
echo "4. Testing via HTTP:"
echo "   robots.txt:"
curl -s -o /dev/null -w "   Status: %{http_code}\n" http://localhost/robots.txt || echo "   ✗ Failed to fetch"
echo "   sitemap.xml:"
curl -s -o /dev/null -w "   Status: %{http_code}\n" http://localhost/sitemap.xml || echo "   ✗ Failed to fetch"
echo ""

# Check Nginx error log
echo "5. Recent Nginx errors (last 5 lines):"
sudo tail -5 /var/log/nginx/error.log 2>/dev/null | grep -E "(robots|sitemap)" || echo "   No relevant errors found"
echo ""

echo "=== Recommendations ==="
echo "If files don't exist in dist:"
echo "  cd /home/ec2-user/image-hospital/ui"
echo "  npm run build"
echo ""
echo "If Nginx config is missing:"
echo "  sudo bash /home/ec2-user/image-hospital/nginx-update.sh"
echo ""

