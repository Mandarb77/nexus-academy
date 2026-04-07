/**
 * Center-crop an image file to a target aspect ratio (width/height), then scale.
 * Outputs JPEG for predictable PDF/storage size.
 */
export async function cropFileToAspectRatio(
  file: File,
  aspectWidthOverHeight: number,
  maxEdgePx = 1600,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const w = bitmap.width
    const h = bitmap.height
    const imgAspect = w / h
    let sx = 0
    let sy = 0
    let sw = w
    let sh = h
    if (imgAspect > aspectWidthOverHeight) {
      sw = h * aspectWidthOverHeight
      sx = (w - sw) / 2
    } else {
      sh = w / aspectWidthOverHeight
      sy = (h - sh) / 2
    }
    const outW = Math.min(maxEdgePx, Math.round(sw))
    const outH = Math.round(outW / aspectWidthOverHeight)
    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outW, outH)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92),
    )
    if (!blob) throw new Error('Could not encode image')
    return blob
  } finally {
    bitmap.close()
  }
}
