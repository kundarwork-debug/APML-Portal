import { useEffect } from 'react'

export default function NotFound() {
  useEffect(() => {
    // Load the migrated standalone 404 document directly, not inside the React shell.
    window.location.replace('/404.html')
  }, [])

  return null
}
