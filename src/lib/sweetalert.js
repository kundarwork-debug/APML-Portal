let swalPromise

export function getSwal() {
  if (window.Swal) return Promise.resolve(window.Swal)
  if (!swalPromise) {
    swalPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-apml-sweetalert],script[data-editor-sweetalert]')
      if (existing) {
        if (window.Swal) return resolve(window.Swal)
        existing.addEventListener('load', () => window.Swal ? resolve(window.Swal) : reject(new Error('SweetAlert service could not load.')), { once: true })
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

const apmlClasses = {
  popup: 'apml-swal-popup',
  title: 'apml-swal-title',
  htmlContainer: 'apml-swal-message',
  confirmButton: 'apml-swal-confirm',
  cancelButton: 'apml-swal-cancel',
  actions: 'apml-swal-actions'
}

export async function apmlDialog(options = {}) {
  try {
    const Swal = await getSwal()
    return await Swal.fire({
      buttonsStyling: false,
      confirmButtonColor: '#b4232c',
      customClass: apmlClasses,
      ...options,
      customClass: { ...apmlClasses, ...(options.customClass || {}) }
    })
  } catch (error) {
    console.error('APML feedback dialog unavailable:', error)
    if (options.showCancelButton) {
      return { isConfirmed: window.confirm([options.title, options.text].filter(Boolean).join('\n\n')) }
    }
    window.alert(options.text || options.title || 'Something went wrong.')
    return { isConfirmed: true }
  }
}

export async function driveAlert(title, text, icon = 'info') {
  return apmlDialog({ title, text, icon })
}

export async function driveConfirm(title, text, confirmText = 'Continue', icon = 'warning') {
  const result = await apmlDialog({
    title, text, icon, showCancelButton: true,
    confirmButtonText: confirmText, cancelButtonText: 'Cancel',
    reverseButtons: true, focusCancel: true
  })
  return !!result.isConfirmed
}

export async function driveInput(title, options = {}) {
  try {
    const Swal = await getSwal()
    const result = await Swal.fire({
      title, input: 'text', inputValue: options.value || '',
      inputPlaceholder: options.placeholder || '',
      inputAttributes: { maxlength: options.maxLength || 180, autocapitalize: 'off' },
      showCancelButton: true, confirmButtonText: options.confirmText || 'Save',
      cancelButtonText: 'Cancel', confirmButtonColor: '#b4232c',
      buttonsStyling: false, customClass: apmlClasses,
      reverseButtons: true, focusCancel: false,
      inputValidator: value => !String(value || '').trim() ? (options.requiredMessage || 'Please enter a value.') : undefined
    })
    return result.isConfirmed ? String(result.value || '').trim() : null
  } catch (error) {
    console.error('APML input dialog unavailable:', error)
    const value = window.prompt(title, options.value || '')
    return value?.trim() || null
  }
}

export async function driveToast(title, icon = 'success') {
  try {
    const Swal = await getSwal()
    return Swal.fire({
      toast: true, position: 'top-end', icon, title,
      showConfirmButton: false, timer: 2600, timerProgressBar: true,
      buttonsStyling: false, customClass: { popup: 'apml-swal-toast', title: 'apml-swal-toast-title' }
    })
  } catch (error) {
    console.error('APML toast unavailable:', error)
    return null
  }
}
