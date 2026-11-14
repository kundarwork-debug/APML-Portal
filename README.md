# APML Portal — React rebuild

A fresh React implementation of the APML employee utility workspace.

## Stack
- React 19
- Vite
- React Router
- Lucide icons
- Responsive, light-first UI

## Run locally
```bash
npm install
npm run dev
```

## Production build
```bash
npm run build
npm run preview
```

## Project structure
- `src/components` — shared application shell and navigation
- `src/data` — module metadata and navigation catalogue
- `src/pages` — native React route-level pages
- `src/styles.css` — shared responsive design system
- `public` — static brand assets and notification client

## Migration status

The following routes are implemented as native React pages in this repository:

- Overview and shared application shell
- Quotation Editor
- System Health
- Local Rate Calculator
- Car Rate Calculator
- Branch Directory
- Field Officer Directory
- APML Drive
- Standards & Gallery
- Analytics
- APML Lite
- Bug Report
- Privacy, Terms and Cookies policies
- About

Feature-parity testing and integration verification are still in progress. Some advanced workflows may need further restoration or refinement against the original portal. Firebase, Cloudinary and the Cloudflare Worker remain separate backend services.

## Deployment

GitHub `main` is the source of truth for this migration. No Vercel project or deployment is required while development continues. Vercel can be connected later without changing the React source.

GitHub Pages publishes the compiled Vite `dist` output through `.github/workflows/deploy-pages.yml`. In repository Settings → Pages, set **Build and deployment → Source** to **GitHub Actions**. The React app uses the `/APML-Portal/` project-site base path and includes an SPA route fallback.\n\nThe app also includes a mobile-only install prompt (shown five seconds after the browser signals install eligibility), a service worker and offline shell caching.\n\nThe portal is an independent, unofficial employee utility website.
