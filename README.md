<div align="center">
  <img src="public/logo.svg" alt="APML Portal logo" width="92" height="92" />

  <h1>APML Portal</h1>
  <p><strong>Your everyday operations workspace.</strong></p>
  <p>A unified, responsive collection of tools designed to make selected work tasks simpler, faster and easier to access.</p>

  <p>
    <a href="https://apmlportal.vercel.app/"><strong>Open APML Portal ↗</strong></a>
    &nbsp;·&nbsp;
    <a href="https://kundarwork-debug.github.io/APML-Portal/">GitHub Pages ↗</a>
    &nbsp;·&nbsp;
    <a href="https://github.com/kundarwork-debug/APML-Portal/issues">Report an issue</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/React-19-20232A?logo=react&logoColor=61DAFB" alt="React 19" />
    <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" alt="Vite 6" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5" />
    <img src="https://img.shields.io/badge/Design-Responsive-B4232C" alt="Responsive design" />
    <img src="https://img.shields.io/badge/Status-Actively%20developed-2E8B57" alt="Actively developed" />
  </p>
</div>

---

## Welcome to your workspace

APML Portal brings frequently used utilities and operational resources together in one place. It is built as an independent, unofficial employee utility website, with a focus on a clean interface, practical workflows and access across desktop and mobile devices.

The portal is being migrated and refined as a native React application. The aim is to preserve the familiar APML experience while improving maintainability, responsiveness, accessibility and reliability.

## Explore the portal

| Workspace | What it does |
|---|---|
| **Home** | Central overview and quick access to portal modules. |
| **Quotation Editor** | Prepare quotations and generate formatted A4 PDF documents. |
| **APML Drive** | Organise and access uploaded files and folders. |
| **Gallery** | Browse and manage shared media. |
| **Branch Directory** | Find branch information and contact details. |
| **Field Officers** | Search field officer records and contact information. |
| **Local Rate Calculator** | Calculate local shifting estimates from entered values. |
| **Car Rate Calculator** | Estimate vehicle transportation rates. |
| **APML Lite** | Use the compact volume and rate calculator. |
| **System Health** | Review available service and system status information. |
| **Bug Report** | Send feedback and report issues. |
| **About & Policies** | Read project information, privacy, terms and cookie policies. |

<div align="center">
  <a href="https://apmlportal.vercel.app/"><strong>Launch the workspace →</strong></a>
</div>

## Designed for everyday use

- **One workspace:** Access multiple utilities through a shared navigation experience.
- **Responsive interface:** Layouts adapt to desktop, tablet and mobile screens.
- **Quotation workflow:** Build quotations and generate A4 PDF output.
- **File and media tools:** Dedicated areas for Drive and Gallery workflows.
- **Searchable directories:** Quickly locate branch and field officer information.
- **Consistent design:** A light, warm visual system with clear typography and APML-inspired accents.
- **Mobile install support:** Eligible mobile browsers can offer an install prompt for quick access.
- **Offline shell support:** A service worker provides limited offline app-shell caching; live data and connected services still require connectivity.

> **Note:** Features that depend on Firebase, Cloudinary, the Cloudflare Worker or other external services require those services to be available. The migration is ongoing, and feature parity with the earlier portal is still being verified.

## Technology

| Layer | Technology |
|---|---|
| UI | React 19 |
| Build tooling | Vite 6 |
| Language | JavaScript and TypeScript |
| Routing | React Router |
| Icons | Lucide React |
| Styling | CSS, Tailwind CSS utilities |
| UI primitives | Radix UI and class-variance-authority |
| Data and services | Firebase and separately hosted service integrations |
| Hosting | Vercel and GitHub Pages |

## Project structure

```text
APML-Portal/
├── public/                 # Static assets, logo, PWA and public files
├── src/
│   ├── components/         # Shared shell, navigation and UI components
│   ├── data/               # Module and navigation metadata
│   ├── lib/                # Firebase setup and shared utilities
│   ├── pages/              # Portal pages and workflows
│   ├── App.jsx             # Application routes
│   └── styles.css          # Global design tokens and styles
├── .github/
│   └── workflows/          # GitHub Actions deployment workflow
├── index.html
├── package.json
└── vite.config.js
```

## Run the project locally

### Requirements

- Node.js (LTS recommended)
- npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/kundarwork-debug/APML-Portal.git
cd APML-Portal
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

Open the local URL printed by Vite in your browser.

### 4. Create a production build

```bash
npm run build
```

### 5. Preview the production build

```bash
npm run preview
```

## Deployment

The repository is the source code for the React portal. Production hosting and GitHub Pages are separate deployment targets.

### Vercel

The Vercel project is connected to this repository. Push reviewed changes to the production branch to trigger the configured deployment workflow. Check the Vercel deployment status before treating a change as live.

- Production portal: [apmlportal.vercel.app](https://apmlportal.vercel.app/)
- Repository: [kundarwork-debug/APML-Portal](https://github.com/kundarwork-debug/APML-Portal)

### GitHub Pages

This repository also includes a GitHub Actions workflow that publishes the Vite `dist` output.

To enable or verify GitHub Pages:

1. Open the repository **Settings**.
2. Select **Pages**.
3. Under **Build and deployment**, set the source to **GitHub Actions**.
4. Confirm the workflow in `.github/workflows/deploy-pages.yml` completes successfully.

GitHub Pages URL: [kundarwork-debug.github.io/APML-Portal](https://kundarwork-debug.github.io/APML-Portal/)

The Vite project-site base path is configured for `/APML-Portal/`. If the repository name or Pages URL changes, review the Vite base path and route fallback configuration.

## Integrations and data

Some portal modules connect to services hosted separately from this repository. These may include:

- **Firebase** for configured application data and related services.
- **Cloudinary** for supported media storage and delivery.
- **Cloudflare Worker** for selected API and background workflows.

Keep credentials and private keys in the appropriate hosting environment variables or secret manager. Never commit service credentials, private tokens or user data to the repository. Public client configuration is not a substitute for Firebase security rules or server-side authorization.

## Development notes

- Keep shared interface elements in `src/components` rather than duplicating them across pages.
- Prefer shared design tokens in `src/styles.css` for consistent colours, typography and surfaces.
- Test responsive layouts after changing page or shared component styles.
- Verify data-dependent workflows against their connected services.
- Preserve existing records and backend data when changing integrations.
- Run `npm run build` before considering a change ready for release.

## Project status

APML Portal is under active development. The React migration is progressing module by module, with visual consistency, accessibility, responsive behaviour and integration parity being refined.

The presence of a module in the portal does not imply that every legacy workflow has been fully restored. Please report reproducible issues with the page name, device/browser and steps to reproduce.

## Support and feedback

Found a problem or have an improvement in mind?

- [Report an issue on GitHub](https://github.com/kundarwork-debug/APML-Portal/issues)
- [Open the portal's Bug Report page](https://apmlportal.vercel.app/bug-report)
- [Contact the project maintainer](mailto:Kundar.work@gmail.com)

When reporting an issue, include the affected page, what you expected to happen, what actually happened and (if possible) a screenshot. Do not include passwords, private customer information, access tokens or other sensitive data.

## Ownership and legal

APML Portal is an **independent, unofficial employee utility website**. It is not an official website, product or service of APML unless separately authorised by the relevant organisation.

The original project materials are proprietary. Copyright © 2026 PRASAD KUNDAR. All rights reserved. Reuse, modification, redistribution or commercial use of original project materials requires prior written permission, except where applicable law or a third-party licence provides otherwise.

- [Licence](./LICENSE.md)
- [Copyright notice](./COPYRIGHT.md)
- [Third-party notices](./NOTICE.md)

Third-party libraries and dependencies remain subject to their respective licences.

---

<div align="center">
  <p><strong>APML Portal</strong></p>
  <p>One workspace. Practical tools. Easier everyday workflows.</p>
  <p><a href="https://apmlportal.vercel.app/">Visit APML Portal ↗</a></p>
  <sub>Built and maintained independently.</sub>
</div>
