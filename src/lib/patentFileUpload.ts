import { cropFileToAspectRatio } from './imageCrop'

/** Images are center-cropped to 4:3 and re-encoded as JPEG; videos pass through unchanged. */
export async function fileForPatentStorage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  const blob = await cropFileToAspectRatio(file, 4 / 3)
  return new File([blob], 'upload.jpg', { type: 'image/jpeg' })
}
