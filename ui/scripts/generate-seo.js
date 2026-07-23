const fs = require('fs');
const path = require('path');

const domainConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../config/domain.json'), 'utf8')
);
const domain = process.env.ACTIVE_DOMAIN || domainConfig.domain;
const publicDir = path.join(__dirname, '../public');

if (domain.startsWith('*')) {
  console.log('Wildcard domain in config — set ACTIVE_DOMAIN env var to generate SEO files with a real URL.');
  process.exit(0);
}
const today = new Date().toISOString().split('T')[0];

fs.writeFileSync(path.join(publicDir, 'sitemap.xml'),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  <url>
    <loc>https://${domain}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`);

fs.writeFileSync(path.join(publicDir, 'robots.txt'),
`User-agent: *
Allow: /

Sitemap: https://${domain}/sitemap.xml

Crawl-delay: 1
`);

console.log(`Generated SEO files for ${domain}`);
