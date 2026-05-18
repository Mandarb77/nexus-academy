/*
 * Normalize patent photo/video files before Supabase Storage upload
 *
 * Patent evidence photos should share a consistent aspect ratio in the UI and avoid
 * enormous PNGs from phone cameras. Non-images (e.g. short video of assembly) pass
 * through untouched so we do not break legitimate evidence types.
 */

import { cropFileToAspectRatio } from './imageCrop'

// -----------------------------------------------------------------------------
// `fileForPatentStorage` — images → 4:3 JPEG; other MIME types unchanged
// -----------------------------------------------------------------------------

export async function fileForPatentStorage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  const blob = await cropFileToAspectRatio(file, 4 / 3)
  return new File([blob], 'upload.jpg', { type: 'image/jpeg' })
}
