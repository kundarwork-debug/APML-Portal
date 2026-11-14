import { useLocation } from 'react-router-dom'
const pages = {
  '/field-officer': 'https://apmlportal.vercel.app/modules/field-officer.html',
  '/drive': 'https://apmlportal.vercel.app/modules/drive.html',
  '/gallery': 'https://apmlportal.vercel.app/modules/gallery.html',
  '/analytics': 'https://apmlportal.vercel.app/modules/analytics.html',
  '/apml-lite': 'https://apmlportal.vercel.app/modules/APML-Lite.html',
  '/bug-report': 'https://apmlportal.vercel.app/policy/bug-report.html',
  '/privacy': 'https://apmlportal.vercel.app/policy/privacy.html',
  '/terms': 'https://apmlportal.vercel.app/policy/terms.html',
  '/cookies': 'https://apmlportal.vercel.app/policy/cookies.html'
}
export default function LegacyPage(){
  const {pathname}=useLocation()
  const src=pages[pathname]
  return <section className="legacy-bridge">
    <iframe key={src} src={src} title={pathname.replace('/',' ').trim()+' — APML Portal'} loading="eager" allow="clipboard-read; clipboard-write" />
  </section>
}
