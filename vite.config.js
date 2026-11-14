import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Only use the repository subpath when explicitly building for GitHub Pages.
// GitHub Actions also runs the validation workflow, so GITHUB_ACTIONS alone
// must not change the asset base for Vercel or Cloudflare builds.
const base = process.env.GITHUB_PAGES === 'true' ? '/APML-Portal/' : '/'

export default defineConfig({ plugins: [react()], base, resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } } })
