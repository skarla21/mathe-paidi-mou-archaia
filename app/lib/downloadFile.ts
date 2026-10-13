import { lessonDownloadName } from '#shared/utils/lessonPreviewUrl.mjs'

export async function downloadRemoteFile(src: string, title: string) {
  const response = await fetch(src)
  if (!response.ok) throw new Error('download failed')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = lessonDownloadName(title, src)
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Firefox and Safari cancel the download if this URL dies in the same turn as the click.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
