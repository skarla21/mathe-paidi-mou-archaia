export function closedAvatarBlob({ open, preview, uploading }) {
  if (open || uploading) return ''
  if (typeof preview !== 'string' || !preview.startsWith('blob:')) return ''
  return preview
}
