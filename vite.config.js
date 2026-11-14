import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// GitHub Pages serves this project from /APML-Portal/; Cloudflare Pages
// serves it from the domain root. Keep both deployment targets working.
const base = process.env.GITHUB_ACTIONS === 'true' ? '/APML-Portal/' : '/'

export default defineConfig({ plugins: [react()], base, resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } } })
