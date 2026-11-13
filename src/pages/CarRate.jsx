import { useEffect, useState } from 'react'
import { CarFront, Search, ReceiptText, Route, CheckCircle2 } from 'lucide-react'
import './CarRate.css'

const RATES = {
  hatchback: { name: 'Hatchback', base: 10000, perKm: 12 },
  sedan: { name: 'Sedan / Compact SUV', base: 12000, perKm: 13 },
  suv: { name: 'SUV / Luxury / Big Car', base: 15000, perKm: 15 }
}
const INDIAN_CARS = [
  {name:'Maruti Suzuki Swift',cat:'hatchback'},{name:'Maruti Suzuki Alto K10',cat:'hatchback'},{name:'Maruti Suzuki WagonR',cat:'hatchback'},{name:'Maruti Suzuki Baleno',cat:'hatchback'},{name:'Maruti Suzuki Celerio',cat:'hatchback'},{name:'Maruti Suzuki Ignis',cat:'hatchback'},{name:'Hyundai i20 / i20 N Line',cat:'hatchback'},{name:'Hyundai Grand i10 Nios',cat:'hatchback'},{name:'Tata Tiago / Tiago EV',cat:'hatchback'},{name:'Tata Altroz',cat:'hatchback'},{name:'Toyota Glanza',cat:'hatchback'},{name:'Renault Kwid',cat:'hatchback'},
  {name:'Tata Nexon / Nexon EV',cat:'sedan'},{name:'Tata Punch / Punch EV',cat:'sedan'},{name:'Tata Curvv',cat:'sedan'},{name:'Hyundai Creta',cat:'sedan'},{name:'Hyundai Venue',cat:'sedan'},{name:'Hyundai Verna',cat:'sedan'},{name:'Hyundai Aura',cat:'sedan'},{name:'Hyundai Exter',cat:'sedan'},{name:'Maruti Suzuki Brezza',cat:'sedan'},{name:'Maruti Suzuki Dzire',cat:'sedan'},{name:'Maruti Suzuki Fronx',cat:'sedan'},{name:'Maruti Suzuki Ciaz',cat:'sedan'},{name:'Maruti Suzuki Grand Vitara',cat:'sedan'},{name:'Kia Seltos',cat:'sedan'},{name:'Kia Sonet',cat:'sedan'},{name:'Honda City',cat:'sedan'},{name:'Honda Amaze',cat:'sedan'},{name:'Honda Elevate',cat:'sedan'},{name:'Skoda Slavia',cat:'sedan'},{name:'Skoda Kushaq',cat:'sedan'},{name:'Skoda Kylaq',cat:'sedan'},{name:'Volkswagen Virtus',cat:'sedan'},{name:'Volkswagen Taigun',cat:'sedan'},{name:'Mahindra XUV 3XO',cat:'sedan'},
  {name:'Mahindra Thar / Thar Roxx',cat:'suv'},{name:'Mahindra Scorpio-N / Classic',cat:'suv'},{name:'Mahindra XUV700',cat:'suv'},{name:'Mahindra Bolero / Neo',cat:'suv'},{name:'Tata Harrier / Harrier EV',cat:'suv'},{name:'Tata Safari',cat:'suv'},{name:'Toyota Fortuner / Legender',cat:'suv'},{name:'Toyota Innova Crysta / Hycross',cat:'suv'},{name:'Toyota Urban Cruiser Hyryder',cat:'suv'},{name:'Maruti Suzuki Ertiga / XL6',cat:'suv'},{name:'Kia Carens',cat:'suv'},{name:'MG Hector / Hector Plus',cat:'suv'},{name:'MG Windsor EV',cat:'suv'},{name:'Land Rover Defender',cat:'suv'},{name:'Range Rover Velar / Sport',cat:'suv'},{name:'BMW X1 / X3 / X5 / X7 / 3 Series',cat:'suv'},{name:'Mercedes-Benz C-Class / E-Class / GLC / GLE',cat:'suv'},{name:'Audi Q3 / Q5 / Q7 / A4 / A6',cat:'suv'}
]
const money = n => '₹' + Math.round(n || 0).toLocaleString('en-IN')
function categorizeCarName(value) {
  const name = value.toLowerCase()
  if (['suv','thar','fortuner','scorpio','innova','safari','harrier','xuv700','defender','range rover','ertiga','xl6','carens','hector','bmw','mercedes','audi','vellfire','carnival'].some(x=>name.includes(x))) return 'suv'
  if (['sedan','city','verna','creta','dzire','nexon','seltos','brezza','slavia','virtus','ciaz','amaze','punch','venue','sonet','taigun','fronx','curvv','elevate','kushaq'].some(x=>name.includes(x))) return 'sedan'
  if (['swift','alto','wagon','i10','i20','baleno','tiago','altroz','kwid','celerio','ignis','glanza'].some(x=>name.includes(x))) return 'hatchback'
  return 'sedan'
}

export default function CarRate() {
  const [model,setModel] = useState('')
  const [category,setCategory] = useState('hatchback')
  const [distance,setDistance] = useState('600')
  const [suggestions,setSuggestions] = useState([])
  const [isOpen,setIsOpen] = useState(false)
  const [searching,setSearching] = useState(false)
  const [badge,setBadge] = useState('India Cars Search Active')
  const [searchNote,setSearchNote] = useState('')

  useEffect(() => {
    const query = model.trim().toLowerCase()
    if (query.length < 2) { setSuggestions([]); setIsOpen(false); setSearching(false); return }
    let cancelled = false
    const timer = setTimeout(async () => {
      const local = INDIAN_CARS.filter(item=>item.name.toLowerCase().includes(query))
      setSearching(true); setIsOpen(true); setSearchNote('')
      try {
        const url = 'https://en.wikipedia.org/w/api.php?action=opensearch&format=json&origin=*&search=' + encodeURIComponent(query + ' India car') + '&limit=5'
        const response = await fetch(url)
        if (!response.ok) throw new Error('Search unavailable')
        const data = await response.json()
        const combined = [...local]
        ;(data[1] || []).forEach(title => {
          const name = title.replace(/ \(car\)| \(automobile\)| \(SUV\)/gi,'')
          if (!combined.some(item=>item.name.toLowerCase()===name.toLowerCase())) combined.push({name,cat:categorizeCarName(name)})
        })
        if (!cancelled) { setSuggestions(combined.slice(0,7)); if (!combined.length) setSearchNote('No Indian car models found.'); }
      } catch {
        if (!cancelled) { setSuggestions(local.slice(0,7)); setSearchNote(local.length ? 'Showing saved Indian car models; live search is unavailable.' : 'Live search is unavailable. Try a saved model or choose a category.'); }
      } finally { if (!cancelled) setSearching(false) }
    },250)
    return () => { cancelled = true; clearTimeout(timer) }
  },[model])

  const km = Math.max(0,parseInt(distance,10)||0)
  const rate = RATES[category]
  const extraKm = Math.max(0,km-600)
  const extraCharge = extraKm * rate.perKm
  const total = km > 0 ? rate.base + extraCharge : 0
  const chooseCar = item => { setModel(item.name); setCategory(item.cat); setBadge('Detected: '+RATES[item.cat].name); setIsOpen(false); setSuggestions([]); setSearchNote('') }

  return <div className="car-page">
    <header className="car-hero"><span className="car-kicker"><CarFront size={15}/> VEHICLE TRANSPORT</span><h1>Vehicle Transport Calculator</h1><p>Estimate car transportation charges by vehicle category and travel distance.</p></header>
    <div className="car-grid">
      <section className="car-card">
        <div className="car-card-title"><h2><CarFront size={19}/> Vehicle Details</h2><span className="car-badge"><CheckCircle2 size={13}/>{badge}</span></div>
        <div className="car-field"><label htmlFor="car-model">Car Model Name (India Database)</label><div className="car-search"><Search size={17}/><input id="car-model" type="text" autoComplete="off" placeholder="e.g. Nexon, Creta, Thar Roxx, Brezza, Swift…" value={model} onChange={e=>{const value=e.target.value;setModel(value);const cat=categorizeCarName(value);setCategory(cat);setBadge('Auto: '+RATES[cat].name);setSearchNote('')}} onFocus={()=>model.trim().length>=2&&setIsOpen(true)}/></div>
          {isOpen && <div className="car-suggestions" role="listbox" aria-label="Car model suggestions">{searching&&<div className="car-suggestion-note">Searching India car index…</div>}{suggestions.map(item=><button type="button" role="option" key={item.name} onClick={()=>chooseCar(item)}><span>{item.name}</span><small>{RATES[item.cat].name}</small></button>)}{!searching&&searchNote&&<div className="car-suggestion-note">{searchNote}</div>}</div>}
        </div>
        <div className="car-field"><label htmlFor="car-category">Vehicle Category</label><select id="car-category" value={category} onChange={e=>{setCategory(e.target.value);setBadge('Selected: '+RATES[e.target.value].name)}}><option value="hatchback">Hatchback (Small Car)</option><option value="sedan">Sedan / Compact SUV</option><option value="suv">SUV / Luxury / Big Car</option></select></div>
        <div className="car-field"><label htmlFor="car-distance">Transport Distance (KM)</label><input id="car-distance" type="number" min="1" value={distance} onChange={e=>setDistance(e.target.value)} /></div>
        <p className="car-search-help">Start typing at least two letters to search the saved Indian car list and live suggestions.</p>
      </section>
      <section className="car-card car-cost"><div className="car-card-title"><h2><ReceiptText size={19}/> Cost Breakdown</h2></div>
        <div className="car-price-row"><span>Base Rate (Up to 600 KM)</span><b>{money(km ? rate.base : 0)}</b></div>
        <div className="car-price-row"><span>Extra Distance Charge</span><b>{money(extraCharge)}{extraKm>0&&<small> ({extraKm} KM @ ₹{rate.perKm}/KM)</small>}{km>0&&extraKm===0&&<small> (Flat minimum rate applied)</small>}</b></div>
        <div className="car-price-row"><span>Included Distance</span><b>{km} KM</b></div>
        <div className="car-total"><span>Total Transport Rate</span><b>{money(total)}</b></div>
        <p className="car-note">Rates are estimates based on the selected category. Confirm applicable charges before booking.</p>
      </section>
    </div>
    <section className="car-card car-matrix"><h2><Route size={19}/> Standard Rate Matrix</h2><div className="car-table-wrap"><table><thead><tr><th>Category</th><th>Base Rate (up to 600 KM)</th><th>Per Extra KM Rate</th></tr></thead><tbody>{Object.entries(RATES).map(([key,item])=><tr className={category===key?'selected':''} key={key}><td>{item.name}</td><td>{money(item.base)}</td><td>₹{item.perKm} / KM</td></tr>)}</tbody></table></div></section>
  </div>
}
