import { useEffect, useMemo, useRef, useState } from 'react'
import { getSwal, driveAlert, driveConfirm, driveInput, driveToast } from '../lib/sweetalert'
import { incrementApmlMediaDownload } from '../lib/firebase'
import { logApmlAction } from '../lib/apmlActivity'
import './Gallery.css'
import { EmptyState } from '../components/ui/StateViews'
import WheelPagination from '../components/ui/WheelPagination'

const firebaseConfig = {
  apiKey: 'AIzaSyDgJ6uVJcdSw5A6xyO3Tykjcp1hFFG_dWM',
  authDomain: 'portalapml.firebaseapp.com',
  databaseURL: 'https://portalapml-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'portalapml',
  storageBucket: 'portalapml.firebasestorage.app',
  messagingSenderId: '461187970356',
  appId: '1:461187970356:web:e9dfc58a502fd3e04d2161',
  measurementId: 'G-GXLWXXBT7P'
}
const sourceFirebaseConfig = {
  apiKey: 'AIzaSyDgJ6uRCABWxAHOU1bIY4VuA-nQ0zM3aF8',
  authDomain: 'apml-portal.firebaseapp.com',
  databaseURL: 'https://apml-portal-default-rtdb.firebaseio.com',
  projectId: 'apml-portal',
  storageBucket: 'apml-portal.firebasestorage.app',
  messagingSenderId: '479017159240',
  appId: '1:479017159240:web:0853422718e6195b74a67d'
}
const ADMIN_EMAILS = new Set(['kundar.work@gmail.com', 'kundar701@gmail.com'])
function getGalleryDb() { return window.firebase.database(window.firebase.app('portalapml-gallery')) }
function usePortalAdminAuth() {
  const [user, setUser] = useState(null)
  useEffect(() => {
    let active = true, unsubscribe = null
    loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js').then(() => {
      if (!active) return
      const auth = window.firebase.auth(window.firebase.app('portalapml-gallery'))
      auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL).then(() => {
        if (!active) return
        unsubscribe = auth.onAuthStateChanged(async next => {
          if (!active) return
          const email = String(next?.email || '').toLowerCase().trim()
          if (next && !ADMIN_EMAILS.has(email)) { await auth.signOut(); if (active) setUser(null); return }
          setUser(next || null)
        })
      })
    }).catch(error => console.error('Gallery admin authentication unavailable:', error))
    return () => { active = false; if (unsubscribe) unsubscribe() }
  }, [])
  const email = String(user?.email || '').toLowerCase().trim()
  const signIn = async () => {
    await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js')
    const auth = window.firebase.auth(window.firebase.app('portalapml-gallery'))
    const provider = new window.firebase.auth.GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    await auth.signInWithPopup(provider)
  }
  const signOut = async () => {
    const auth = window.firebase.auth(window.firebase.app('portalapml-gallery'))
    await auth.signOut()
  }
  return { admin: Boolean(user && ADMIN_EMAILS.has(email)), signIn, signOut }
}
const CLOUDINARY_UPLOAD = 'https://api.cloudinary.com/v1_1/wbrmw2pm/auto/upload'
const DRIVE_API_URL = 'https://apml-drive-api.kundar-work.workers.dev'
const FOLDER_STORAGE_KEY = 'apml_branch_gallery_folders_v1'
const MEDIA_CACHE_KEY = 'apml_branch_gallery_cache_v1'
const DEFAULT_FOLDERS = [
  { id: 'truck', label: 'Truck & Fleet', icon: 'local_shipping' },
  { id: 'crockery', label: 'Crockery', icon: 'restaurant' },
  { id: 'packing-images', label: 'Packing Images', icon: 'inventory_2' },
  { id: 'bike-packing', label: 'Bike Packing', icon: 'two_wheeler' },
  { id: 'car-transportation', label: 'Car Transportation', icon: 'directions_car' },
  { id: 'solid-box', label: 'Solid Box', icon: 'archive' },
  { id: 'tv-box', label: 'TV Box', icon: 'tv' },
  { id: 'electronic', label: 'Electronic', icon: 'computer' },
  { id: 'furniture', label: 'Furniture', icon: 'chair' },
  { id: 'miscellaneous', label: 'Miscellaneous', icon: 'build' },
  { id: 'others', label: 'Others', icon: 'folder' }
]
const PROTECTED_FOLDERS = DEFAULT_FOLDERS.map(folder => folder.id)

function MaterialIcon({ name, className = '', style = {}, title }) { return <span className={`material-symbols-rounded ${className}`} style={style} aria-hidden="true" title={title}>{name}</span> }

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

export default function GalleryPortal() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [folders, setFolders] = useState(DEFAULT_FOLDERS)
  const [activeFolder, setActiveFolder] = useState('')
  const [uploadFolder, setUploadFolder] = useState('')
  const { admin, signIn, signOut } = usePortalAdminAuth()
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
    try { const cachedItems = JSON.parse(localStorage.getItem(MEDIA_CACHE_KEY) || '[]'); setItems(cachedItems); if (cachedItems.length) setLoading(false) } catch {}
    let live = true
    let ref
    let handler
    ;(async () => {
      try {
        await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js')
        await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js')
        if (!window.firebase.apps.some(app => app.name === 'portalapml-gallery')) window.firebase.initializeApp(firebaseConfig, 'portalapml-gallery')
        if (!window.firebase.apps.some(app => app.name === 'apml-gallery-source')) window.firebase.initializeApp(sourceFirebaseConfig, 'apml-gallery-source')
        ref = getGalleryDb().ref('apml_ranked_gallery')
        dbRef.current = ref
        const sourceRef = window.firebase.database(window.firebase.app('apml-gallery-source')).ref('apml_ranked_gallery')
        const [sourceSnapshot, targetSnapshot] = await Promise.all([sourceRef.once('value'), ref.once('value')])
        const targetData = targetSnapshot.val()
        const targetHasRecords = targetSnapshot.exists() && targetData && Object.keys(targetData).length > 0
        if (!targetHasRecords && sourceSnapshot.exists()) await ref.set(sourceSnapshot.val())
        if (!live) return
        handler = ref.on('value', snapshot => {
          if (!live) return
          const rows = Object.entries(snapshot.val() || {}).map(([key, value]) => ({ key, ...value }))
          setItems(rows)
          try { localStorage.setItem(MEDIA_CACHE_KEY, JSON.stringify(rows)) } catch {}
          setStatus('Live sync connected')
          setLoading(false)
        }, error => { setStatus(`Gallery sync error: ${error.message}`); setLoading(false) })
      } catch (error) {
        if (live) { setStatus(`Gallery unavailable: ${error.message}`); setLoading(false) }
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
    .filter(item => admin && activeFolder === 'deleted'
      ? item.folder === 'deleted'
      : activeFolder === ''
        ? item.folder !== 'deleted' && item.folder !== 'others'
        : item.folder === activeFolder && item.folder !== 'deleted')
    .sort((a, b) => (Number(b.downloadsCount) * 2 + Number(b.viewsCount)) - (Number(a.downloadsCount) * 2 + Number(a.viewsCount)) || (b.timestamp || 0) - (a.timestamp || 0)),
  [items, activeFolder, admin])
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageItems = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => { setPage(1) }, [activeFolder])

  function saveFolders(next) {
    setFolders(next)
    try { localStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(next)) } catch {}
  }
  function selectFolder(id) {
    if (id === 'deleted' && !admin) return
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
    saveFolders([...folders, { id, label, icon: 'folder' }])
    selectFolder(id)
    await driveToast('Folder created')
  }
  async function editFolder(folder) {
    const label = await driveInput('Rename folder', { value: folder.label, placeholder: 'Folder name' })
    if (!label || label === folder.label) return
    saveFolders(folders.map(item => item.id === folder.id ? { ...item, label } : item))
    await driveToast('Folder renamed')
  }
  async function deleteFolder(folder) {
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
          await getGalleryDb().ref('apml_ranked_gallery').push({
            url: data.secure_url, folder, name: file.name, size: file.size, isVideo,
            viewsCount: 0, downloadsCount: 0, timestamp: Date.now()
          })
          void logApmlAction({action:'Media uploaded',module:'Gallery',item:file.name,details:folder,fileName:file.name,folder,fileSize:file.size,fileType:file.type})
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
      await getGalleryDb().ref('apml_ranked_gallery').push({
        url: info.url, folder, name, size: 0, isVideo: info.isVideo,
        viewsCount: 0, downloadsCount: 0, timestamp: Date.now()
      })
      void logApmlAction({action:'Media link added',module:'Gallery',item:name,details:folder,fileName:name,folder,fileType:'External link'})
      await driveToast('Catbox media added')
    } catch (error) { await driveAlert('Could not add Catbox link', error.message, 'error') }
  }
  async function metric(item, field) {
    try {
      await getGalleryDb().ref(`apml_ranked_gallery/${item.key}/${field}`).transaction(value => (Number(value) || 0) + 1)
    } catch {}
  }
  function openMedia(item) {
    metric(item, 'viewsCount')
    setLightbox(item)
  }
  async function downloadMedia(item) {
    if (!item?.url) return driveAlert('Media unavailable', 'The media URL is missing.', 'error')
    const name = item.name || (item.isVideo ? 'apml-video.mp4' : 'apml-image.jpg')
    try {
      if (window.ApmNativeDownload?.start) {
        await Promise.resolve(window.ApmNativeDownload.start(item.url, name))
        void incrementApmlMediaDownload().catch(error => console.warn('Gallery download counter unavailable', error))
        window.APMNotify?.send?.({type:'gallery',title:item.isVideo?'Gallery video downloaded':'Gallery photo downloaded',file:name,folder:folders.find(folder=>folder.id===item.folder)?.label||item.folder||'Gallery'})
        void metric(item, 'downloadsCount')
        void logApmlAction({action:'Media downloaded',module:'Gallery',item:name,fileName:name,folder:folders.find(folder=>folder.id===item.folder)?.label||item.folder||'Gallery',fileSize:item.size,fileType:item.isVideo?'Video':'Image'})
        window.APMLMascot?.happy?.(item.isVideo ? 'Video download started!' : 'Photo download started!')
        await driveToast('Download started')
        return
      }

      let response
      try {
        response = await fetch(item.url)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
      } catch (error) {
        if (!item.url.includes('catbox.moe')) throw error
        response = await fetch(`${DRIVE_API_URL}/dl?url=${encodeURIComponent(item.url)}`)
        if (!response.ok) throw new Error(`Download proxy returned HTTP ${response.status}`)
      }

      const blob = await response.blob()
      if (!blob.size) throw new Error('The downloaded file is empty.')
      const blobUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = blobUrl
      anchor.download = name
      anchor.style.display = 'none'
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      void incrementApmlMediaDownload().catch(error => console.warn('Gallery download counter unavailable', error))
      window.APMNotify?.send?.({type:'gallery',title:item.isVideo?'Gallery video downloaded':'Gallery photo downloaded',file:name,folder:folders.find(folder=>folder.id===item.folder)?.label||item.folder||'Gallery'})
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)

      void metric(item, 'downloadsCount')
      void logApmlAction({action:'Media downloaded',module:'Gallery',item:name})
      window.APMLMascot?.happy?.(item.isVideo ? 'Video download started!' : 'Photo download started!')
      await driveToast('Download started')
    } catch (error) {
      console.warn('Gallery download fallback:', error)
      await driveAlert('Download could not start', 'Your browser blocked the download. Open the media preview and use the browser’s save option.', 'warning')
    }
  }
  async function move(item, folder) {
    try {
      await getGalleryDb().ref(`apml_ranked_gallery/${item.key}`).update({ folder, trashedAt: folder === 'deleted' ? Date.now() : null })
      void logApmlAction({action:folder==='deleted'?'Media moved to trash':'Media moved',module:'Gallery',item:item.name||'Media',details:folder})
      await driveToast(folder === 'deleted' ? 'Media moved to trash' : 'Media moved')
    } catch (error) { await driveAlert('Could not move media', error.message, 'error') }
  }
  async function permanentDelete(item) {
    const confirmed = await driveConfirm('Delete permanently?', `“${item.name || 'This media'}” will be permanently deleted from Gallery and Cloudinary. This cannot be undone.`, 'Delete permanently', 'error')
    if (!confirmed) return
    try {
      if (item.url) {
        const user = window.firebase?.auth?.(window.firebase.app('portalapml-gallery'))?.currentUser
        if (!user) throw new Error('Admin session expired. Please sign in again.')
        const token = await user.getIdToken()
        const response = await fetch(`${DRIVE_API_URL}/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ urls: [item.url] })
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok || result.ok !== true) throw new Error(result.error || 'Cloudinary could not delete this media. The Gallery record was kept.')
      }
      await getGalleryDb().ref(`apml_ranked_gallery/${item.key}`).remove()
      void logApmlAction({action:'Permanently deleted',module:'Gallery',item:item.name||'Media',details:'Cloudinary asset and Gallery record'})
      await driveToast('Media permanently deleted from Gallery and cloud storage')
    } catch (error) { await driveAlert('Delete failed', error.message, 'error') }
  }
  async function trashMedia(item) {
    return move(item, 'deleted')
  }
  function handleDrop(event, folderId) {
    event.preventDefault()
    const key = event.dataTransfer.getData('text/plain')
    const item = items.find(entry => entry.key === key)
    if (item && item.folder !== folderId) move(item, folderId)
  }
  function renderPagination() {
    return <WheelPagination totalPages={pageCount} currentPage={currentPage} visibleCount={5} summary={`${visible.length} items`} onChange={setPage}/>
  }

  return <main className="gallery-page">
    <header className="gallery-head">
      <div className="gallery-heading-copy">
        <div className="gallery-eyebrow"><MaterialIcon name="photo_library" style={{ fontSize: 14 }}/> MEDIA LIBRARY</div>
        <h1 className="gallery-title">Standards &amp; <span>Gallery</span></h1>
        <p className="gallery-subtitle">Cloud-synced visual packaging assets and operational video documentation.</p>
        <div className="gallery-stats">
          <span><MaterialIcon name="photo_library" style={{ fontSize: 14 }}/><strong>{activeItems.length}</strong> Media</span>
          <span><MaterialIcon name="image" style={{ fontSize: 14 }}/><strong>{photos}</strong> Photos</span>
          <span><MaterialIcon name="videocam" style={{ fontSize: 14 }}/><strong>{videos}</strong> Videos</span>
        </div>
      </div>
      <button className={admin?'gallery-admin gallery-admin-active':'gallery-admin gallery-google-admin'} onClick={toggleAdmin} disabled={busy} title={admin?'Exit admin':'Sign in with Google'} aria-label={admin?'Exit admin':'Sign in with Google'}>
        {busy?<span className="admin-button-spinner"/>:admin?<><MaterialIcon name="verified_user" style={{ fontSize: 16 }}/> Exit admin</>:<svg className="apml-google-mark" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44z"/><path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8z"/><path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.9 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12z"/></svg>}
      </button>
    </header>

    <section className="gallery-action-bar">
      <div className="gallery-action-heading">
        <span className="gallery-upload-icon"><MaterialIcon name="upload" style={{ fontSize: 20 }}/></span>
        <div><strong>Upload Media Assets</strong><small>{uploadStatus}</small></div>
      </div>
      <div className="gallery-action-buttons">
        <label className="gallery-folder-select"><MaterialIcon name="folder" style={{ fontSize: 15 }}/><select aria-label="Select destination folder" value={uploadFolder} onChange={event => setUploadFolder(event.target.value)}>
          <option value="">Select destination folder…</option>
          {folders.map(folder => <option key={folder.id} value={folder.id}>{folder.label}</option>)}
        </select></label>
        <button className="gallery-action gallery-action-primary" onClick={() => { if (requireDestination()) input.current?.click() }} disabled={busy}><MaterialIcon name="upload" style={{ fontSize: 15 }}/> Upload Media</button>
        <button className="gallery-action" onClick={addCatboxLink} disabled={busy}><MaterialIcon name="link" style={{ fontSize: 15 }}/> Catbox Link</button>
        <button className="gallery-action" onClick={addFolder} disabled={busy}><MaterialIcon name="create_new_folder" style={{ fontSize: 15 }}/> Add Folder</button>
        <input ref={input} hidden type="file" multiple accept="image/*,video/*" onChange={event => upload(event.target.files)}/>
      </div>
    </section>

    <section className="gallery-toolbar">
      <div className="gallery-folder-tabs">
        <button className={activeFolder === '' ? 'selected' : ''} onClick={() => selectFolder('')} onDragOver={event => event.preventDefault()} onDrop={event => handleDrop(event, '')}><MaterialIcon name="grid_view" style={{ fontSize: 15 }}/> All Media</button>
        {folders.map(folder => <span className="gallery-folder-tab" key={folder.id} onDragOver={event => event.preventDefault()} onDrop={event => handleDrop(event, folder.id)}>
          <button className={activeFolder === folder.id ? 'selected' : ''} onClick={() => selectFolder(folder.id)}><MaterialIcon name={folder.icon || 'folder'} style={{ fontSize: 16 }}/>{folder.label}</button>
          {!PROTECTED_FOLDERS.includes(folder.id) && <><button className="gallery-mini-action" title="Rename folder" onClick={() => editFolder(folder)}><MaterialIcon name="edit" style={{ fontSize: 12 }}/></button><button className="gallery-mini-action" title="Delete folder" onClick={() => deleteFolder(folder)}><MaterialIcon name="close" style={{ fontSize: 13 }}/></button></>}
        </span>)}
        {admin && <button className={activeFolder === 'deleted' ? 'selected' : ''} onClick={() => selectFolder('deleted')}><MaterialIcon name="delete" style={{ fontSize: 14 }}/> Trash Archive</button>}
      </div>
    </section>

    <div className="gallery-live-status"><span className="gallery-live-dot"/>{status}<span>{visible.length} items</span></div>

    {loading ? <section className="gallery-media-section apml-loading-section" aria-label="Loading gallery media" aria-busy="true"><div className="gallery-section-heading"><h2><MaterialIcon name="collections" style={{ fontSize: 17 }}/> Preparing your gallery</h2><span>Syncing media…</span></div><div className="gallery-grid apml-gallery-skeleton-grid">{Array.from({ length: 8 }, (_, index) => <div className="gallery-card apml-gallery-skeleton-card" key={index}><span className="apml-skeleton-preview"/><span className="apml-skeleton-line long"/><span className="apml-skeleton-line short"/></div>)}</div></section> : <section className="gallery-media-section">
      <div className="gallery-section-heading"><h2><MaterialIcon name="collections" style={{ fontSize: 17 }}/>{activeFolder === 'deleted' ? 'Archived Media' : activeFolder ? folders.find(folder => folder.id === activeFolder)?.label || 'Media' : 'All Media'}</h2><span>{visible.length} {visible.length === 1 ? 'item' : 'items'}</span></div>
      <div className="gallery-grid">
        {pageItems.map(item => {
          const source = fileSource(item.url)
          return <article className="gallery-card" key={item.key} draggable={true} onDragStart={event => event.dataTransfer.setData('text/plain', item.key)}>
            <button className="gallery-media-preview" type="button" onClick={() => openMedia(item)} aria-label={`Preview ${item.name || 'media'}`}>
              {item.isVideo ? <video src={item.url} muted playsInline preload="metadata"/> : <img src={optimizedUrl(item.url)} loading="lazy" decoding="async" alt={item.name || 'Gallery media'}/>}
              {item.isVideo && <span className="gallery-video-mark"><MaterialIcon name="videocam" style={{ fontSize: 13 }}/> VIDEO</span>}
              {!item.isVideo && <span className="gallery-image-mark">PHOTO</span>}
            </button>
            <div className="gallery-card-body">
              <strong className="gallery-card-name" title={item.name}>{item.name || 'Untitled media'}</strong>
              <div className="gallery-card-meta"><span><i style={{ background: source.color }}/> {source.label}</span><span>{formatBytes(item.size)}</span></div>
              <div className="gallery-card-stats"><span>{Number(item.viewsCount) || 0} views</span><span>{Number(item.downloadsCount) || 0} downloads</span></div>
              <div className="gallery-card-footer">
                <button className="gallery-download apml-download-btn" onClick={() => downloadMedia(item)}><div className="button-content"><div className="text-container"><div className="text">Download</div></div><div className="svg-container"><svg className="download-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M19.479 10.092c-.212-3.951-3.473-7.092-7.479-7.092-4.005 0-7.267 3.141-7.479 7.092-2.57.463-4.521 2.706-4.521 5.408 0 3.037 2.463 5.5 5.5 5.5h13c3.037 0 5.5-2.463 5.5-5.5 0-2.702-1.951-4.945-4.521-5.408zm-7.479 6.908l-4-4h3v-4h2v4h3l-4 4z"></path></svg></div></div></button>
                <a className="gallery-open-link" href={item.url} target="_blank" rel="noreferrer" aria-label={`Open ${item.name || 'media'} in new tab`}><MaterialIcon name="open_in_new" style={{ fontSize: 15 }}/></a>
                {activeFolder === 'deleted' && <div className="gallery-admin-actions">
                  <button title="Restore media" onClick={() => move(item, 'others')}><MaterialIcon name="restore" style={{ fontSize: 14 }}/></button>
                  <button title="Delete permanently" onClick={() => permanentDelete(item)}><MaterialIcon name="delete" style={{ fontSize: 14 }}/></button>
                </div>}
                {activeFolder !== 'deleted' && <div className="gallery-admin-actions">
                  <select aria-label="Move media to folder" value={item.folder || ''} onChange={event => move(item, event.target.value)}>{folders.map(folder => <option key={folder.id} value={folder.id}>{folder.label}</option>)}</select>
                  <button title="Move to trash" onClick={() => trashMedia(item)}><MaterialIcon name="delete" style={{ fontSize: 14 }}/></button>
                </div>}
              </div>
            </div>
          </article>
        })}
        {!pageItems.length && <EmptyState className="gallery-empty" illustration="/illustrations/apml-empty-folder.svg" title={activeFolder === 'deleted' ? 'Your trash is clear' : 'Nothing here just yet'} description={activeFolder === 'deleted' ? 'Deleted media will appear here.' : 'Images and videos added to this collection will appear here.'}/>}
      </div>
      {renderPagination()}
    </section>}

    {lightbox && <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={lightbox.name || 'Media preview'} onMouseDown={event => { if (event.target === event.currentTarget) setLightbox(null) }}>
      <button className="gallery-lightbox-close" onClick={() => setLightbox(null)} aria-label="Close preview"><MaterialIcon name="close" style={{ fontSize: 23 }}/></button>
      <div className="gallery-lightbox-content">
        {lightbox.isVideo ? <video src={lightbox.url} controls autoPlay playsInline/> : <img src={lightbox.url} alt={lightbox.name || 'Gallery media'}/>}
        <div><strong>{lightbox.name || 'Untitled media'}</strong><button className="apml-download-btn" onClick={() => downloadMedia(lightbox)}><div className="button-content"><div className="text-container"><div className="text">Download original</div></div><div className="svg-container"><svg className="download-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M19.479 10.092c-.212-3.951-3.473-7.092-7.479-7.092-4.005 0-7.267 3.141-7.479 7.092-2.57.463-4.521 2.706-4.521 5.408 0 3.037 2.463 5.5 5.5 5.5h13c3.037 0 5.5-2.463 5.5-5.5 0-2.702-1.951-4.945-4.521-5.408zm-7.479 6.908l-4-4h3v-4h2v4h3l-4 4z"></path></svg></div></div></button></div>
      </div>
    </div>}
  </main>
}

