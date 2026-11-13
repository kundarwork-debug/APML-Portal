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
- `src/pages` — React route-level pages
- `src/styles.css` — shared responsive design system
- `public` — static brand assets

## Migration status
This repository is the new React frontend. The existing APML production portal and Cloudflare/Firebase services remain separate while each workflow is migrated and tested. The initial commit establishes the React application shell, responsive overview, module catalogue and route structure. Feature parity work (quotation generation, directories, Drive, Gallery, analytics, rate calculators, admin tools and policies) is the next phase.

The portal is an independent, unofficial employee utility website.
