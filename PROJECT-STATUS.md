# Yaelle PMU Website - Project Status

**Last Updated:** January 18, 2026
**Live URL:** https://yaelle.eu
**Admin URL:** https://yaelle.eu/yaelle-admin.html (password: yaelle2025)

---

## Completed Features

### Core Website
- HTML5, CSS3, Vanilla JavaScript
- Mobile-optimized with PWA support (manifest.json)
- Responsive design with touch targets (44px minimum)
- Safe area support for notched phones
- WhatsApp floating button

### Pages
- **Homepage** (index.html) - Hero, services, gallery, testimonials, booking form
- **Service Pages:**
  - /microblading - €350
  - /nanoblading - €380
  - /lip-blushing - €300
  - /lash-liner - €250
  - /brow-lamination - €60
- **Blog:**
  - /blog - Blog listing page (6 article previews)
  - /blog/microblading-complete-guide - Full SEO blog post
- **Admin Dashboard** - AI content generation with Claude API

### SEO Implementation
- Schema.org structured data (BeautySalon, Service, Blog, BreadcrumbList, FAQ)
- Open Graph and Twitter meta tags
- Geo meta tags for Limassol, Cyprus
- robots.txt configured
- sitemap.xml with 12 URLs
- Greek keywords included (μόνιμο μακιγιάζ, microblading Κύπρος)

### Technical Stack
- **Server:** Express.js on Railway
- **AI:** Claude API (claude-sonnet-4) for content generation
- **CDN/DNS:** Cloudflare
- **Images:** Unsplash CDN
- **Logging:** Server-side logging with /api/logs endpoint

---

## Pending Tasks

### Google Search Console - Sitemap Issue
**Status:** Sitemap serves correctly (verified 200 OK with application/xml content-type)
**Problem:** Google Search Console says "Sitemap could not be read"
**Likely Cause:** Google cached the error from before server fix was deployed

**Tomorrow's Actions:**
1. Go to Google Search Console > Sitemaps
2. Delete the existing sitemap entry
3. Re-add: `sitemap.xml` (or full URL: `https://yaelle.eu/sitemap.xml`)
4. Submit

**If still fails, check Cloudflare:**
- Security > Settings > Turn OFF "Browser Integrity Check"
- Security > WAF > Check for blocking rules
- Use URL Inspection tool in Search Console to see exact error

---

## File Structure

```
yaelle-pmu-website/
├── index.html              # Homepage
├── microblading.html       # Service page
├── nanoblading.html        # Service page
├── lip-blushing.html       # Service page
├── lash-liner.html         # Service page
├── brow-lamination.html    # Service page
├── blog.html               # Blog listing
├── blog/
│   └── microblading-complete-guide.html
├── yaelle-admin.html       # Admin dashboard
├── css/
│   ├── styles.css          # Main styles
│   ├── services.css        # Service page styles
│   ├── blog.css            # Blog styles
│   └── admin.css           # Admin styles
├── js/
│   ├── main.js             # Main scripts
│   └── admin.js            # Admin scripts
├── images/                 # Local images
├── server.js               # Express server
├── manifest.json           # PWA manifest
├── robots.txt              # Search engine rules
├── sitemap.xml             # Sitemap (12 URLs)
├── package.json
└── railway.json            # Railway config
```

---

## Contact Information

- **Phone:** +357 99 939 382
- **Email:** hello@yaelle.eu
- **WhatsApp:** wa.me/35799939382
- **Location:** Limassol, Cyprus

---

## Deployment

```bash
# Deploy to Railway (auto-deploys on git push)
git add -A
git commit -m "Your message"
git push
```

Railway auto-builds and deploys from GitHub: `idofi555-ux/yaelle-pmu-website`

---

## Cloudflare Settings (Current)

- **SSL:** Full
- **Bot Fight Mode:** OFF
- **Security Level:** Medium
- **Browser Integrity Check:** Check if ON (may need to disable)

---

## Future Enhancements (Optional)

- Add more blog posts for long-tail SEO
- Create individual blog post pages for remaining articles
- Add Google Analytics
- Add Facebook Pixel
- Implement booking calendar integration
- Add before/after gallery with real client photos
