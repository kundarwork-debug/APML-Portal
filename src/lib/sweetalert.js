let swalPromise

export function getSwal() {
  if (window.Swal) return Promise.resolve(window.Swal)
  if (!swalPromise) {
    swalPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-apml-sweetalert]')
      if (existing) {
        existing.addEventListener('load', () => resolve(window.Swal), { once: true })
        existing.addEventListener('error', () => reject(new Error('SweetAlert service could not load.')), { once: true })
        return
      }
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11'
      script.async = true
      script.dataset.apmlSweetalert = 'true'
      script.onload = () => window.Swal ? resolve(window.Swal) : reject(new Error('SweetAlert service is unavailable.'))
      script.onerror = () => reject(new Error('SweetAlert service could not load.'))
      document.head.appendChild(script)
    }).catch(error => {
      swalPromise = null
      throw error
    })
  }
  return swalPromise
}

export async function driveAlert(title, text, icon = 'info') {
  const Swal = await getSwal()
  return Swal.fire({ title, text, icon, confirmButtonColor: '#b4232c' })
}

export async function driveConfirm(title, text, confirmText = 'Continue', icon = 'warning') {
  const Swal = await getSwal()
  const result = await Swal.fire({
    title, text, icon, showCancelButton: true,
    confirmButtonText: confirmText, cancelButtonText: 'Cancel',
    confirmButtonColor: '#b4232c', reverseButtons: true,
    focusCancel: true
  })
  return result.isConfirmed
}

export async function driveInput(title, options = {}) {
  const Swal = await getSwal()
  const result = await Swal.fire({
    title, input: 'text', inputValue: options.value || '',
    inputPlaceholder: options.placeholder || '',
    inputAttributes: { maxlength: options.maxLength || 180, autocapitalize: 'off' },
    showCancelButton: true, confirmButtonText: options.confirmText || 'Save',
    cancelButtonText: 'Cancel', confirmButtonColor: '#b4232c',
    reverseButtons: true, focusCancel: false,
    inputValidator: value => !String(value || '').trim() ? (options.requiredMessage || 'Please enter a value.') : undefined
  })
  return result.isConfirmed ? String(result.value || '').trim() : null
}

export async function driveToast(title, icon = 'success') {
  const Swal = await getSwal()
  return Swal.fire({
    toast: true, position: 'top-end', icon, title,
    showConfirmButton: false, timer: 2600, timerProgressBar: true
  })
}
