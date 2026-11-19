import { FileText, Calculator, MapPinned, Users, Cloud, Images, Activity, Truck, Map, ShieldCheck, CircleHelp } from 'lucide-react'

export const modules = [
  { id:'editor', title:'Quotation Editor', description:'Create polished customer quotations and export ready-to-share PDFs.', category:'Documents', icon:FileText, color:'red', path:'/editor', tag:'Popular' },
  { id:'local-rate', title:'Local Rate Calculator', description:'Quickly estimate local shifting and service rates.', category:'Calculators', icon:Calculator, color:'amber', path:'/local-rate' },
  { id:'car-rate', title:'Car Rate Calculator', description:'Check vehicle transportation rates with a simple workflow.', category:'Calculators', icon:Truck, color:'blue', path:'/car-rate' },
  { id:'directory', title:'Branch Directory', description:'Find branch contacts, locations and operational details.', category:'People', icon:MapPinned, color:'green', path:'/directory' },
  { id:'field-officer', title:'Field Officer Directory', description:'Browse field officer contacts and regional coverage.', category:'People', icon:Users, color:'violet', path:'/field-officer' },
  { id:'drive', title:'APML Drive', description:'Access shared files, folders and work documents.', category:'Workspace', icon:Cloud, color:'blue', path:'/drive' },
  { id:'gallery', title:'Standards & Gallery', description:'Explore reference images, standards and media resources.', category:'Workspace', icon:Images, color:'pink', path:'/gallery' },
  { id:'system-health', title:'System Health', description:'Check service status and connected platform services.', category:'Management', icon:Activity, color:'amber', path:'/system-health' },
  { id:'apml-lite', title:'APML Lite', description:'A lightweight collection of frequently used utilities.', category:'Utilities', icon:ShieldCheck, color:'slate', path:'/apml-lite' },
  { id:'about', title:'About APML Portal', description:'Learn about the portal, its purpose and useful links.', category:'Information', icon:CircleHelp, color:'slate', path:'/about' }
]
export const categories = ['All tools','Documents','Calculators','People','Workspace','Management','Utilities','Information']