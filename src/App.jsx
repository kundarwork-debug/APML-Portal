import { Routes, Route } from 'react-router-dom'
import Shell from './components/Shell'
import Home from './pages/Home'
import ModulePage from './pages/ModulePage'
import InfoPage from './pages/InfoPage'
import EditorPage from './pages/Editor'
import { modules } from './data/modules'
function Placeholder({title}){return <div className="subpage"><div className="eyebrow muted">APML PORTAL</div><h1>{title}</h1><p className="info-lead">This section will be migrated into the React workspace as part of the portal rebuild.</p></div>}
export default function App(){return <Routes><Route element={<Shell/>}><Route index element={<Home/>}/><Route path="editor" element={<EditorPage/>}/><Route path=":id" element={<ModulePage/>}/><Route path="about" element={<InfoPage/>}/><Route path="bug-report" element={<Placeholder title="Report an issue"/>}/><Route path="privacy" element={<Placeholder title="Privacy policy"/>}/><Route path="terms" element={<Placeholder title="Terms of use"/>}/><Route path="*" element={<Placeholder title="Page not found"/>}/></Route></Routes>}