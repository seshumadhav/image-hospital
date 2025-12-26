#!/bin/bash
# Update Nginx config to properly serve robots.txt and sitemap.xml
# Run this on EC2: sudo bash nginx-update.sh

sudo tee /etc/nginx/conf.d/image-hospital.conf << 'NGINX_EOF'
server {
    listen 80;
    server_name thegreyward.duckdns.org;

    # Allow uploads up to 6MB (backend limit is 5MB)
    client_max_body_size 6M;

    # Serve frontend static files
    root /home/ec2-user/image-hospital/ui/dist;
    index index.html;

    # Explicitly serve robots.txt and sitemap.xml (before catch-all)
    location = /robots.txt {
        access_log off;
        log_not_found off;
    }
    
    location = /sitemap.xml {
        access_log off;
        log_not_found off;
        add_header Content-Type "application/xml; charset=utf-8";
    }

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy - rewrite /api to backend routes
    location /api/ {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://localhost:3000/;
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
NGINX_EOF

# Test Nginx configuration
sudo nginx -t

# Reload Nginx if test passes
if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    echo "✅ Nginx configuration updated and reloaded"
    echo "Test: curl http://thegreyward.duckdns.org/robots.txt"
    echo "Test: curl http://thegreyward.duckdns.org/sitemap.xml"
else
    echo "❌ Nginx configuration test failed. Please check the config."
    exit 1
fi
