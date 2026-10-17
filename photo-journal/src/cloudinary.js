// Direct-to-Cloudinary unsigned uploads (images AND video).
// Uses XMLHttpRequest (not fetch) so the UI gets real upload progress events.
//
// Config comes from build-time env vars (public values, safe in the client):
//   VITE_CLOUDINARY_CLOUD_NAME    — e.g. "dxyabc123"
//   VITE_CLOUDINARY_UPLOAD_PRESET — the unsigned preset name, e.g. "family-journal"
// If either is missing, uploads are disabled and the UI shows a setup hint.

const CLOUD_NAME = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '').trim()
const UPLOAD_PRESET = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '').trim()

export function cloudinaryConfigured() {
  return CLOUD_NAME.length > 0 && UPLOAD_PRESET.length > 0
}

// Cloudinary's unsigned endpoint caps single uploads around 100MB on free plans.
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024

export function friendlySize(bytes) {
  if (!bytes && bytes !== 0) return ''
  const mb = bytes / (1024 * 1024)
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  if (mb < 1000) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`
  return `${(mb / 1024).toFixed(1)} GB`
}

/**
 * Upload one File to Cloudinary. onProgress(fraction 0..1) is called as it goes.
 * Resolves { url, mediaType } where mediaType is 'image' or 'video'.
 * Rejects with a human-friendly Error.
 */
export function uploadFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    if (!cloudinaryConfigured()) {
      reject(new Error('Photo uploads need the 5-minute Cloudinary setup first — ask Fred.'))
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      reject(
        new Error(
          `"${file.name}" is ${friendlySize(file.size)} — uploads cap out around 100 MB. Try a shorter clip or a smaller photo.`
        )
      )
      return
    }

    const xhr = new XMLHttpRequest()
    const form = new FormData()
    form.append('file', file)
    form.append('upload_preset', UPLOAD_PRESET)
    // 'auto' resource type lets Cloudinary sniff image vs video itself.

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && typeof onProgress === 'function') {
        onProgress(e.loaded / e.total)
      }
    }

    xhr.onload = () => {
      let body = null
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        // fall through to the error below
      }
      if (xhr.status >= 200 && xhr.status < 300 && body && body.secure_url) {
        resolve({
          url: body.secure_url,
          mediaType: body.resource_type === 'video' ? 'video' : 'image',
        })
      } else {
        const detail = (body && body.error && body.error.message) || `server said ${xhr.status}`
        reject(new Error(`Upload of "${file.name}" didn't go through (${detail}). Give it another go.`))
      }
    }

    xhr.onerror = () => reject(new Error(`Couldn't reach the upload server for "${file.name}" — check your connection and retry.`))
    xhr.onabort = () => reject(new Error(`Upload of "${file.name}" was cancelled.`))

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`)
    xhr.send(form)
  })
}
