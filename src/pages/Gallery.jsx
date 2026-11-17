import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Images, Image as ImageIcon, Video, Folder, FolderPlus, Upload,
  Link2, Download, ExternalLink, Pencil, Trash2, RotateCcw, ShieldCheck,
  ChevronLeft, ChevronRight, HardDrive, Grid2X2, X, FileImage
} from 'lucide-react'
import { getSwal, driveAlert, driveConfirm, driveInput, driveToast } from '../lib/sweetalert'
import { useApmlAdminAuth } from '../lib/supabaseAuth'
import './Gallery.css'

const firebaseConfig = {
  apiKey: 'AIzaSyDgJ6uRCABWxAHOU1bIY4VuA-nQ0zM3aF8',
  authDomain: 'apml-portal.firebaseapp.com',
  databaseURL: 'https://apml-portal-default-rtdb.firebaseio.com',
  projectId: 'apml-portal',
  storageBucket: 'apml-portal.firebasestorage.app',
  messagingSenderId: '479017159240',
  appId: '1:479017159240:web:0853422718e6195b74a67d'
}
const CLOUDINARY_UPLOAD = 'https://api.cloudinary.com/v1_1/wbrmw2pm/auto/upload'
const DRIVE_API_URL = 'https://apml-drive-api.kundar-work.workers.dev'
const FOLDER_STORAGE_KEY = 'apml_unlimited_gallery_folders_v7'
const MEDIA_CACHE_KEY = 'apml_gallery_cache_v1'
const DEFAULT_FOLDERS = [
  { id: 'truck', label: 'Truck & Fleet', icon: '🚚' },
  { id: 'crockery', label: 'Crockery', icon: '🍽️' },
  { id: 'packing-images', label: 'Packing Images', icon: '📦' },
  { id: 'bike-packing', label: 'Bike Packing', icon: '🏍️' },
  { id: 'car-transportation', label: 'Car Transportation', icon: '🚗' },
  { id: 'solid-box', label: 'Solid Box', icon: '🗃️' },
  { id: 'tv-box', label: 'TV Box', icon: '📺' },
  { id: 'electronic', label: 'Electronic', icon: '💻' },
  { id: 'furniture', label: 'Furniture', icon: '🪑' },
  { id: 'miscellaneous', label: 'Miscellaneous', icon: '🧰' },
  { id: 'others', label: 'Others', icon: '📁' }
]
const PROTECTED_FOLDERS = DEFAULT_FOLDERS.map(folder => folder.id)

const FOLDER_ICON_CLASSES = {
  truck: 'fa-truck',
  crockery: 'fa-utensils',
  'packing-images': 'fa-box-open',
  'bike-packing': 'fa-motorcycle',
  'car-transportation': 'fa-car',
  'solid-box': 'fa-box',
  'tv-box': 'fa-tv',
  electronic: 'fa-laptop',
  furniture: 'fa-couch',
  miscellaneous: 'fa-toolbox',
  others: 'fa-folder'
}
function folderIconClass(folder) {
  return FOLDER_ICON_CLASSES[folder.id] || 'fa-folder'
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = [...document.scripts].find(script => script.src === src)
    if (existing) {
      const ready = src.includes('firebase-auth') ? !!window.firebase?.auth
        : src.includes('firebase-database') ? !!window.firebase?.database
          : src.includes('firebase-app') ? !!window.firebase : existing.dataset.loaded === '1'
      if (ready || existing.dataset.loaded === '1') return resolve()
      existing.addEventListener('load', resolve, { once: true })
      existing.addEventListener('error', reject, { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.onload = () => { script.dataset.loaded = '1'; resolve() }
    script.onerror = reject
    document.head.appendChild(script)
  })
}
function optimizedUrl(url, width = 420) {
  if (!url || !url.includes('cloudinary.com')) return url
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`)
}
function formatBytes(bytes) {
  if (!bytes) return '0 KB'
  const units = ['Bytes', 'KB', 'MB', 'GB']
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`
}
function fileSource(url) {
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host.includes('cloudinary.com')) return { label: 'Cloudinary', color: '#3b82f6' }
    if (host.endsWith('catbox.moe')) return { label: 'Catbox', color: '#171717' }
  } catch {}
  return { label: 'External', color: '#64748b' }
}
function catboxInfo(raw) {
  let url
  try { url = new URL(raw) } catch { return { error: 'Please paste a complete HTTPS link.' } }
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'files.catbox.moe') {
    return { error: 'Only links from files.catbox.moe are accepted.' }
  }
  let file = ''
  try { file = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '') } catch {}
  const ext = file.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || ''
  const images = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp']
  const videos = ['mp4', 'webm', 'mov', 'm4v', 'ogv']
  if (images.includes(ext)) return { url: url.href, file, ext, isVideo: false }
  if (videos.includes(ext)) return { url: url.href, file, ext, isVideo: true }
  return { error: 'Supported formats: JPG, PNG, GIF, WEBP, AVIF, BMP, MP4, WEBM, MOV, M4V and OGV.' }
}

export default function Gallery() {
  const [items, setItems] = useState([])
  const [folders, setFolders] = useState(DEFAULT_FOLDERS)
  const [activeFolder, setActiveFolder] = useState('')
  const [uploadFolder, setUploadFolder] = useState('')
  const { admin, signIn, signOut } = useApmlAdminAuth()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('Connecting to gallery…')
  const [lightbox, setLightbox] = useState(null)
  const [page, setPage] = useState(1)
  const [uploadStatus, setUploadStatus] = useState('Select destination category and choose photos or videos')
  const input = useRef(null)
  const dbRef = useRef(null)
  const pageSize = Math.max(16, (window.innerWidth <= 359 ? 1 : window.innerWidth <= 760 ? 2 : window.innerWidth <= 1100 ? 3 : 4) * 5)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(FOLDER_STORAGE_KEY) || 'null')
      if (Array.isArray(saved)) {
        const merged = [...saved]
        for (const folder of DEFAULT_FOLDERS) if (!merged.some(item => item.id === folder.id)) merged.push(folder)
        setFolders(merged)
      }
    } catch {}
    try { setItems(JSON.parse(localStorage.getItem(MEDIA_CACHE_KEY) || '[]')) } catch {}
    let live = true
    let ref
    let handler
    ;(async () => {
      try {
        await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js')
        await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js')
        if (!window.firebase.apps.length) window.firebase.initializeApp(firebaseConfig)
        ref = window.firebase.database().ref('apml_ranked_gallery')
        dbRef.current = ref
        handler = ref.on('value', snapshot => {
          if (!live) return
          const rows = Object.entries(snapshot.val() || {}).map(([key, value]) => ({ key, ...value }))
          setItems(rows)
          try { localStorage.setItem(MEDIA_CACHE_KEY, JSON.stringify(rows)) } catch {}
          setStatus('Live sync connected')
        }, error => setStatus(`Gallery sync error: ${error.message}`))
      } catch (error) {
        if (live) setStatus(`Gallery unavailable: ${error.message}`)
      }
    })()
    return () => {
      live = false
      if (ref && handler) ref.off('value', handler)
    }
  }, [])

  useEffect(() => {
    if (!lightbox) return
    const close = event => { if (event.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [lightbox])

  const activeItems = items.filter(item => item.folder !== 'deleted')
  const photos = activeItems.filter(item => !item.isVideo).length
  const videos = activeItems.filter(item => item.isVideo).length
  const visible = useMemo(() => items
    .filter(item => activeFolder === 'deleted'
      ? item.folder === 'deleted'
      : activeFolder === ''
        ? item.folder !== 'deleted' && item.folder !== 'others'
        : item.folder === activeFolder)
    .sort((a, b) => (Number(b.downloadsCount) * 2 + Number(b.viewsCount)) - (Number(a.downloadsCount) * 2 + Number(a.viewsCount)) || (b.timestamp || 0) - (a.timestamp || 0)),
  [items, activeFolder])
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageItems = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => { setPage(1) }, [activeFolder])

  function saveFolders(next) {
    setFolders(next)
    try { localStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(next)) } catch {}
  }
  function selectFolder(id) {
    setActiveFolder(id)
    setPage(1)
    if (id && id !== 'deleted') setUploadFolder(id)
  }
  async function toggleAdmin() {
    setBusy(true)
    try {
      if (admin) {
        await signOut()
        if (activeFolder === 'deleted') setActiveFolder('')
        await driveToast('Admin mode closed')
      } else {
        await signIn()
      }
    } catch (error) {
      await driveAlert('Admin sign-in failed', error.message || 'Please try again.', 'error')
    } finally { setBusy(false) }
  }
  async function addFolder() {
    const label = await driveInput('Create gallery folder', { placeholder: 'e.g. Fragile Items' })
    if (!label) return
    const id = label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (!id) return driveAlert('Invalid folder name', 'Use letters or numbers in the folder name.', 'error')
    if (folders.some(folder => folder.id === id)) return driveAlert('Folder already exists', 'Choose a different folder name.', 'warning')
    saveFolders([...folders, { id, label, icon: '📁' }])
    selectFolder(id)
    await driveToast('Folder created')
  }
  async function editFolder(folder) {
    if (!admin) return
    const label = await driveInput('Rename folder', { value: folder.label, placeholder: 'Folder name' })
    if (!label || label === folder.label) return
    saveFolders(folders.map(item => item.id === folder.id ? { ...item, label } : item))
    await driveToast('Folder renamed')
  }
  async function deleteFolder(folder) {
    if (!admin) return
    const confirmed = await driveConfirm('Delete this folder?', 'Media inside will remain in the gallery and will not be deleted.', 'Delete folder')
    if (!confirmed) return
    saveFolders(folders.filter(item => item.id !== folder.id))
    if (activeFolder === folder.id) setActiveFolder('')
    if (uploadFolder === folder.id) setUploadFolder('')
    await driveToast('Folder deleted')
  }
  function requireDestination() {
    const folder = activeFolder && activeFolder !== 'deleted' ? activeFolder : uploadFolder
    if (!folder || folder === 'deleted') {
      driveAlert('Folder required', 'Please select a destination folder before adding media.', 'warning')
      return null
    }
    return folder
  }
  async function upload(files) {
    if (!files?.length) return
    const folder = requireDestination()
    if (!folder) { if (input.current) input.current.value = ''; return }
    setBusy(true)
    let successes = 0
    const failures = []
    try {
      for (let index = 0; index < files.length; index++) {
        const file = files[index]
        const isVideo = file.type.startsWith('video/')
        if (!isVideo && !file.type.startsWith('image/')) { failures.push(`${file.name}: only photos and videos are supported`); continue }
        const limit = (isVideo ? 100 : 10) * 1024 * 1024
        if (file.size > limit) { failures.push(`${file.name}: exceeds ${isVideo ? '100 MB' : '10 MB'} limit`); continue }
        setUploadStatus(`Uploading ${index + 1} of ${files.length}: ${file.name}`)
        try {
          const form = new FormData()
          form.append('file', file)
          form.append('upload_preset', 'apml_drive')
          form.append('folder', 'apml-drive')
          const response = await fetch(CLOUDINARY_UPLOAD, { method: 'POST', body: form })
          const data = await response.json().catch(() => ({}))
          if (!response.ok || !data.secure_url) throw new Error(data.error?.message || `HTTP ${response.status}`)
          await window.firebase.database().ref('apml_ranked_gallery').push({
            url: data.secure_url, folder, name: file.name, size: file.size, isVideo,
            viewsCount: 0, downloadsCount: 0, timestamp: Date.now()
          })
          successes++
        } catch (error) { failures.push(`${file.name}: ${error.message}`) }
      }
    } finally {
      if (input.current) input.current.value = ''
      setBusy(false)
      setUploadStatus(successes ? `Successfully uploaded ${successes} media file${successes === 1 ? '' : 's'}` : 'Select destination category and choose photos or videos')
    }
    if (successes) await driveToast(`${successes} media file${successes === 1 ? '' : 's'} uploaded`)
    if (failures.length) await driveAlert('Some files were not uploaded', failures.join('\n'), 'warning')
  }
  async function addCatboxLink() {
    const folder = requireDestination()
    if (!folder) return
    const Swal = await getSwal()
    const result = await Swal.fire({
      title: 'Add media from Catbox',
      input: 'url',
      inputLabel: 'Catbox file link',
      inputPlaceholder: 'https://files.catbox.moe/example.jpg',
      inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
      showCancelButton: true,
      confirmButtonText: 'Add to Gallery',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#b4232c',
      reverseButtons: true,
      showLoaderOnConfirm: true,
      preConfirm: async value => {
        const info = catboxInfo(String(value || '').trim())
        if (info.error) { Swal.showValidationMessage(info.error); return false }
        if (items.some(item => item.url === info.url && item.folder === folder)) {
          Swal.showValidationMessage('This link is already in this folder.')
          return false
        }
        return info
      },
      allowOutsideClick: () => !Swal.isLoading()
    })
    if (!result.isConfirmed || !result.value) return
    const info = result.value
    const name = info.file.replace(/['"`<>\\]/g, '').trim() || info.file
    try {
      await window.firebase.database().ref('apml_ranked_gallery').push({
        url: info.url, folder, name, size: 0, isVideo: info.isVideo,
        viewsCount: 0, downloadsCount: 0, timestamp: Date.now()
      })
      await driveToast('Catbox media added')
    } catch (error) { await driveAlert('Could not add Catbox link', error.message, 'error') }
  }
  async function metric(item, field) {
    try {
      await window.firebase.database().ref(`apml_ranked_gallery/${item.key}/${field}`).transaction(value => (Number(value) || 0) + 1)
    } catch {}
  }
  function openMedia(item) {
    metric(item, 'viewsCount')
    setLightbox(item)
  }
  async function downloadMedia(item) {
    if (!item?.url) return driveAlert('Media unavailable', 'The media URL is missing.', 'error')
    const name = item.name || (item.isVideo ? 'apml-video.mp4' : 'apml-image.jpg')
    await metric(item, 'downloadsCount')
    try {
      if (window.apmlHasAnalyticsConsent?.()) {
        await window.firebase.database().ref('analytics/totalMediaDownloads').transaction(value => (Number(value) || 0) + 1)
      }
    } catch {}
    try {
      window.APMNotify?.send?.({
        type: 'gallery',
        title: item.isVideo ? 'Gallery video downloaded' : 'Gallery photo downloaded',
        file: name, link: item.url,
        details: {
          Folder: folders.find(folder => folder.id === item.folder)?.label || item.folder || '',
          Stored_on: fileSource(item.url).label,
          Size: item.size ? formatBytes(item.size) : ''
        }
      })
    } catch {}
    try {
      if (window.ApmNativeDownload?.start) {
        window.ApmNativeDownload.start(item.url, name)
      } else {
        let blob
        try {
          const response = await fetch(item.url)
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          blob = await response.blob()
        } catch (error) {
          if (!item.url.includes('catbox.moe')) throw error
          const response = await fetch(`${DRIVE_API_URL}/dl?url=${encodeURIComponent(item.url)}`)
          if (!response.ok) throw error
          blob = await response.blob()
        }
        const blobUrl = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = blobUrl
        anchor.download = name
        document.body.append(anchor)
        anchor.click()
        anchor.remove()
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 4000)
      }
      window.logDailyActivity?.('media')
      window.APMLMascot?.happy?.(item.isVideo ? 'Video download started!' : 'Photo download started!')
      await driveToast('Download started')
    } catch (error) {
      const anchor = document.createElement('a')
      anchor.href = item.url
      anchor.download = name
      anchor.target = '_blank'
      anchor.rel = 'noopener'
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      window.logDailyActivity?.('media')
      console.warn('Gallery download fallback:', error)
      await driveToast('Download opened in a new tab', 'info')
    }
  }
  async function move(item, folder) {
    if (!admin) return
    try {
      await window.firebase.database().ref(`apml_ranked_gallery/${item.key}`).update({ folder })
      await driveToast(folder === 'deleted' ? 'Media moved to trash' : 'Media moved')
    } catch (error) { await driveAlert('Could not move media', error.message, 'error') }
  }
  async function permanentDelete(item) {
    if (!admin) return
    const confirmed = await driveConfirm('Delete permanently?', `“${item.name || 'This media'}” will be permanently deleted. This cannot be undone.`, 'Delete permanently', 'error')
    if (!confirmed) return
    try {
      await window.firebase.database().ref(`apml_ranked_gallery/${item.key}`).remove()
      await driveToast('Media permanently deleted')
    } catch (error) { await driveAlert('Delete failed', error.message, 'error') }
  }
  async function trashMedia(item) {
    if (admin) return move(item, 'deleted')
    const confirmed = await driveConfirm('Move media to trash?', 'This media item will be moved to the Trash Archive.', 'Move to trash')
    if (!confirmed) return
    try {
      await window.firebase.database().ref(`apml_ranked_gallery/${item.key}`).update({ folder: 'deleted' })
      await driveToast('Media moved to trash')
    } catch (error) { await driveAlert('Could not move media', error.message, 'error') }
  }
  function handleDrop(event, folderId) {
    event.preventDefault()
    const key = event.dataTransfer.getData('text/plain')
    const item = items.find(entry => entry.key === key)
    if (admin && item && item.folder !== folderId) move(item, folderId)
  }
  function renderPagination() {
    if (pageCount <= 1) return null
    const start = Math.max(1, Math.min(currentPage - 1, pageCount - 2))
    const end = Math.min(pageCount, Math.max(currentPage + 1, 3))
    const pages = []
    for (let value = start; value <= end; value++) pages.push(value)
    return <nav className="gallery-pagination" aria-label="Gallery pages">
      <button disabled={currentPage <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}><ChevronLeft size={16}/> Previous</button>
      <span>Page <b>{currentPage}</b> of {pageCount} · {visible.length} items</span>
      <button disabled={currentPage >= pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))}>Next <ChevronRight size={16}/></button>
      {pageCount > 3 && <label className="gallery-page-jump">Go to <input type="number" min="1" max={pageCount} aria-label="Page number" onKeyDown={event => { if (event.key === 'Enter') { const value = Number(event.currentTarget.value); if (value >= 1 && value <= pageCount) setPage(value); else driveAlert('Invalid page', `Enter a page from 1 to ${pageCount}.`, 'warning') } }}/> <button onClick={event => { const input = event.currentTarget.parentElement.querySelector('input'); const value = Number(input.value); if (value >= 1 && value <= pageCount) setPage(value); else driveAlert('Invalid page', `Enter a page from 1 to ${pageCount}.`, 'warning') }}>Go</button></label>}
    </nav>
  }

  return <main className="gallery-page">
    <header className="gallery-head">
      <div className="gallery-heading-copy">
        <div className="gallery-eyebrow"><Images size={14}/> MEDIA LIBRARY</div>
        <h1 className="gallery-title">Standards &amp; <span>Gallery</span></h1>
        <p className="gallery-subtitle">Cloud-synced visual packaging assets and operational video documentation.</p>
        <div className="gallery-stats">
          <span><Images size={14}/><strong>{activeItems.length}</strong> Media</span>
          <span><ImageIcon size={14}/><strong>{photos}</strong> Photos</span>
          <span><Video size={14}/><strong>{videos}</strong> Videos</span>
        </div>
      </div>
      <button className={admin?'gallery-admin gallery-admin-active':'gallery-admin gallery-google-admin'} onClick={toggleAdmin} disabled={busy} title={admin?'Exit admin':'Sign in with Google'} aria-label={admin?'Exit admin':'Sign in with Google'}>
        {busy?<span className="admin-button-spinner"/>:admin?<><ShieldCheck size={16}/> Exit admin</>:<svg className="apml-google-mark" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44z"/><path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8z"/><path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.9 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12z"/></svg>}
      </button>
    </header>

    <section className="gallery-action-bar">
      <div className="gallery-action-heading">
        <span className="gallery-upload-icon"><Upload size={20}/></span>
        <div><strong>Upload Media Assets</strong><small>{uploadStatus}</small></div>
      </div>
      <div className="gallery-action-buttons">
        <label className="gallery-folder-select"><Folder size={15}/><select aria-label="Select destination folder" value={uploadFolder} onChange={event => setUploadFolder(event.target.value)}>
          <option value="">Select destination folder…</option>
          {folders.map(folder => <option key={folder.id} value={folder.id}>{folder.label}</option>)}
        </select></label>
        <button className="gallery-action gallery-action-primary" onClick={() => { if (requireDestination()) input.current?.click() }} disabled={busy}><Upload size={15}/> Upload Media</button>
        <button className="gallery-action" onClick={addCatboxLink} disabled={busy}><Link2 size={15}/> Catbox Link</button>
        <button className="gallery-action" onClick={addFolder} disabled={busy}><FolderPlus size={15}/> Add Folder</button>
        <input ref={input} hidden type="file" multiple accept="image/*,video/*" onChange={event => upload(event.target.files)}/>
      </div>
    </section>

    <section className="gallery-toolbar">
      <div className="gallery-folder-tabs">
        <button className={activeFolder === '' ? 'selected' : ''} onClick={() => selectFolder('')} onDragOver={event => admin && event.preventDefault()} onDrop={event => handleDrop(event, '')}><Grid2X2 size={15}/> All Media</button>
        {folders.map(folder => <span className="gallery-folder-tab" key={folder.id} onDragOver={event => admin && event.preventDefault()} onDrop={event => handleDrop(event, folder.id)}>
          <button className={activeFolder === folder.id ? 'selected' : ''} onClick={() => selectFolder(folder.id)}><i className={`fa-solid ${folderIconClass(folder)}`} aria-hidden="true"/>{folder.label}</button>
          {admin && !PROTECTED_FOLDERS.includes(folder.id) && <><button className="gallery-mini-action" title="Rename folder" onClick={() => editFolder(folder)}><Pencil size={12}/></button><button className="gallery-mini-action" title="Delete folder" onClick={() => deleteFolder(folder)}><X size={13}/></button></>}
        </span>)}
        {admin && <button className={activeFolder === 'deleted' ? 'selected' : ''} onClick={() => selectFolder('deleted')}><Trash2 size={14}/> Trash Archive</button>}
      </div>
    </section>

    <div className="gallery-live-status"><span className="gallery-live-dot"/>{status}<span>{visible.length} items</span></div>

    <section className="gallery-media-section">
      <div className="gallery-section-heading"><h2><FileImage size={17}/>{activeFolder === 'deleted' ? 'Archived Media' : activeFolder ? folders.find(folder => folder.id === activeFolder)?.label || 'Media' : 'All Media'}</h2><span>{visible.length} {visible.length === 1 ? 'item' : 'items'}</span></div>
      <div className="gallery-grid">
        {pageItems.map(item => {
          const source = fileSource(item.url)
          return <article className="gallery-card" key={item.key} draggable={admin} onDragStart={event => event.dataTransfer.setData('text/plain', item.key)}>
            <button className="gallery-media-preview" type="button" onClick={() => openMedia(item)} aria-label={`Preview ${item.name || 'media'}`}>
              {item.isVideo ? <video src={item.url} muted playsInline preload="metadata"/> : <img src={optimizedUrl(item.url)} loading="lazy" decoding="async" alt={item.name || 'Gallery media'}/>}
              {item.isVideo && <span className="gallery-video-mark"><Video size={13}/> VIDEO</span>}
              {!item.isVideo && <span className="gallery-image-mark">PHOTO</span>}
            </button>
            <div className="gallery-card-body">
              <div className="gallery-card-meta"><span><i style={{ background: source.color }}/> {source.label}</span><span>{formatBytes(item.size)}</span></div>
              <div className="gallery-card-stats"><span>{Number(item.viewsCount) || 0} views</span><span>{Number(item.downloadsCount) || 0} downloads</span></div>
              <div className="gallery-card-footer">
                <button className="gallery-download apml-download-btn" onClick={() => downloadMedia(item)}><Download size={14}/><span className="apml-download-label">Download</span><span className="apml-download-tray" aria-hidden="true"></span><span className="apml-download-tooltip">Download</span></button>
                <a className="gallery-open-link" href={item.url} target="_blank" rel="noreferrer" aria-label={`Open ${item.name || 'media'} in new tab`}><ExternalLink size={15}/></a>
                {activeFolder === 'deleted' && admin && <div className="gallery-admin-actions">
                  <button title="Restore media" onClick={() => move(item, 'others')}><RotateCcw size={14}/></button>
                  <button title="Delete permanently" onClick={() => permanentDelete(item)}><Trash2 size={14}/></button>
                </div>}
                {activeFolder !== 'deleted' && <div className="gallery-admin-actions">
                  {admin && <select aria-label="Move media to folder" value={item.folder || ''} onChange={event => move(item, event.target.value)}>{folders.map(folder => <option key={folder.id} value={folder.id}>{folder.label}</option>)}</select>}
                  <button title="Move to trash" onClick={() => trashMedia(item)}><Trash2 size={14}/></button>
                </div>}
              </div>
            </div>
          </article>
        })}
        {!pageItems.length && <div className="gallery-empty"><Images size={34}/><strong>{activeFolder === 'deleted' ? 'Your trash is clear' : 'Nothing here just yet'}</strong><span>{activeFolder === 'deleted' ? 'Deleted media will appear here.' : 'Images and videos added to this collection will appear here.'}</span></div>}
      </div>
      {renderPagination()}
    </section>

    {lightbox && <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={lightbox.name || 'Media preview'} onMouseDown={event => { if (event.target === event.currentTarget) setLightbox(null) }}>
      <button className="gallery-lightbox-close" onClick={() => setLightbox(null)} aria-label="Close preview"><X size={23}/></button>
      <div className="gallery-lightbox-content">
        {lightbox.isVideo ? <video src={lightbox.url} controls autoPlay playsInline/> : <img src={lightbox.url} alt={lightbox.name || 'Gallery media'}/>}
        <div><button className="apml-download-btn" onClick={() => downloadMedia(lightbox)}><Download size={14}/><span className="apml-download-label">Download original</span><span className="apml-download-tray" aria-hidden="true"></span><span className="apml-download-tooltip">Download</span></button></div>
      </div>
    </div>}
  </main>
}
