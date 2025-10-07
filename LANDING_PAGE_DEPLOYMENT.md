# Landing Page Production Deployment Configuration

## 🚀 Production URL Configuration

The landing page is configured to be served as the **main homepage** at:

### **https://evofitmeals.com/**

## 📁 File Structure for Production

```
/public/
├── landing/
│   ├── index.html      # Main landing page
│   ├── css/            # Styles
│   └── js/             # Scripts
└── uploads/            # User uploads

/client/
├── public/
│   └── landing/        # Copy of landing page for build
└── dist/               # Built React app (after build)
```

## 🔧 Server Configuration

The server (`server/index.ts`) has been configured with the following production routing:

### Production Routes:
- **`/`** → Landing page (public/landing/index.html)
- **`/login`** → React app login page
- **`/signup`** → React app signup page
- **`/dashboard`** → React app dashboard
- **`/admin/*`** → Admin panel (React app)
- **`/trainer/*`** → Trainer dashboard (React app)
- **`/customer/*`** → Customer portal (React app)
- **`/api/*`** → Backend API endpoints

## 🏗️ Build Process

### 1. Build the Application
```bash
# Install dependencies
npm install

# Build both client and server
npm run build
```

### 2. Verify Landing Page Files
```bash
# Ensure landing page is in public directory
ls -la public/landing/

# Ensure landing page is in client/public for build
ls -la client/public/landing/
```

### 3. Test Production Build Locally
```bash
# Set environment to production
export NODE_ENV=production

# Run production server locally
npm start

# Test at http://localhost:5001
```

## 🚢 Digital Ocean Deployment

### Docker Configuration
The Dockerfile already handles the landing page correctly:

```dockerfile
# Landing page files are in /app/public/landing/
# These are served by Express in production
```

### Deployment Steps:

#### 1. Build Docker Image
```bash
# Build production image
docker build --target prod -t fitnessmealplanner:prod .

# Tag for DigitalOcean registry
docker tag fitnessmealplanner:prod registry.digitalocean.com/bci/fitnessmealplanner:prod
```

#### 2. Push to Registry
```bash
# Push to DigitalOcean registry
docker push registry.digitalocean.com/bci/fitnessmealplanner:prod
```

#### 3. Deploy via DigitalOcean Dashboard
1. Navigate to: https://cloud.digitalocean.com/apps
2. Find: `fitnessmealplanner-prod`
3. Click: "Deploy" or "Force Rebuild and Deploy"
4. Wait: 3-5 minutes for deployment

## ✅ Production URL Structure

After deployment, the following URLs will be live:

### Public Pages (No Login Required):
- **https://evofitmeals.com/** - Landing page (homepage)
- **https://evofitmeals.com/landing/*** - Landing page assets

### Application Pages (Login Required):
- **https://evofitmeals.com/login** - Login page
- **https://evofitmeals.com/signup** - Sign up page
- **https://evofitmeals.com/dashboard** - User dashboard
- **https://evofitmeals.com/admin** - Admin panel
- **https://evofitmeals.com/trainer** - Trainer dashboard
- **https://evofitmeals.com/customer** - Customer portal

### API Endpoints:
- **https://evofitmeals.com/api/*** - All API endpoints

## 🔍 Verification Steps

After deployment, verify:

1. **Landing Page Loads**: Visit https://evofitmeals.com/
2. **All Sections Visible**: Hero, features, pricing, etc.
3. **CTAs Work**:
   - "Start Free Trial" → /signup
   - "Login" → /login
4. **Responsive Design**: Test on mobile devices
5. **Assets Load**: CSS, JS, fonts, icons all load
6. **Forms Work**: Any contact or signup forms
7. **App Still Works**: Login and check dashboards

## 📝 Important Notes

### Environment Variables
No changes needed to environment variables. The server automatically detects production mode and serves the landing page accordingly.

### SSL/HTTPS
DigitalOcean App Platform automatically handles SSL certificates. All traffic will be served over HTTPS.

### CDN Assets
The landing page currently uses CDN for:
- Tailwind CSS
- Font Awesome icons
- Google Fonts

Consider bundling these for production to reduce external dependencies.

### Analytics
Before going live, add Google Analytics tracking:
```html
<!-- Add to landing page <head> -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

## 🎯 Success Criteria

The deployment is successful when:

✅ https://evofitmeals.com/ shows the landing page
✅ All landing page sections load properly
✅ CTAs redirect to appropriate app pages
✅ Existing app functionality remains intact
✅ API endpoints continue working
✅ No console errors in browser
✅ Page loads in under 3 seconds
✅ Mobile responsive design works

## 🆘 Troubleshooting

### Landing Page Not Showing
1. Check Docker logs: `doctl apps logs 600abc04-b784-426c-8799-0c09f8b9a958`
2. Verify files exist in container: Check /app/public/landing/
3. Confirm NODE_ENV=production

### 404 Errors
1. Check server routing in production mode
2. Verify static file serving configuration
3. Check nginx/proxy configuration if applicable

### Assets Not Loading
1. Check paths in HTML (should be relative)
2. Verify public directory structure
3. Check Content-Type headers

### Existing App Broken
1. Ensure React app still builds correctly
2. Check that /api routes aren't intercepted
3. Verify authentication still works

## 🎉 Ready for Production!

Your landing page is configured to be the main homepage at https://evofitmeals.com/. The existing application will continue to work at its respective routes (/login, /dashboard, etc.).

When you deploy to DigitalOcean, visitors will see your high-converting landing page immediately upon visiting your domain!