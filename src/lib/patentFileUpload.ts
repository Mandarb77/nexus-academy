/*
 * Normalize patent photo/video files before Supabase Storage upload
 *
 * Patent evidence photos should share a consistent aspect ratio in the UI and avoid
 * enormous PNGs from phone cameras. Non-images (e.g. short video of assembly) pass
 * through untouched so we do not break legitimate evidence types.
 *
 * Cropping is best-effort: if the browser cannot decode the file (HEIC, Live Photo,
 * timed-out decode), we upload the original so submit is not blocked.
 */

import { cropFileToAspectRatio } from './imageCrop'

function looksLikeHeic(file: File): boolean {
  const type = file.type.toLowerCase()
  const name = file.name.toLowerCase()
  return (
    type.includes('heic') ||
    type.includes('heif') ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  )
}

// -----------------------------------------------------------------------------
// `fileForPatentStorage` — images → 4:3 JPEG when possible; otherwise original
// -----------------------------------------------------------------------------

export async function fileForPatentStorage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') && !looksLikeHeic(file)) return file
  try {
    const blob = await cropFileToAspectRatio(file, 4 / 3)
    return new File([blob], 'upload.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}
