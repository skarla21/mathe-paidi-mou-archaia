function entries(collection) {
  if (!collection) return []
  if (typeof collection.length === 'number') {
    const out = []
    for (let index = 0; index < collection.length; index += 1) {
      const entry = typeof collection.item === 'function' ? collection.item(index) : collection[index]
      if (entry) out.push(entry)
    }
    return out
  }
  return [...collection]
}

function canonicalType(type) {
  if (type === 'image/jpeg' || type === 'image/jpg') return 'image/jpeg'
  if (type === 'image/png') return 'image/png'
  return ''
}

function clipboardFileName(type) {
  return type === 'image/jpeg' ? 'clipboard.jpg' : 'clipboard.png'
}

export function namedClipboardFile(file, fallbackType = '') {
  const type = canonicalType(file?.type) || canonicalType(fallbackType)
  if (!file || !type) return null
  const name = typeof file.name === 'string' ? file.name.trim() : ''
  if (name && file.type === type) return file
  return new File([file], name || clipboardFileName(type), { type })
}

function fileFromItem(item) {
  if (!item || item.kind !== 'file') return null
  if (typeof item.getAsFile !== 'function') return null
  const file = item.getAsFile()
  if (!file) return null
  return namedClipboardFile(file, item.type)
}

function firstImageFile(files) {
  for (const file of entries(files)) {
    const named = namedClipboardFile(file)
    if (named) return named
  }
  return null
}

export function imageFileFromClipboard(data) {
  if (!data) return null
  for (const item of entries(data.items)) {
    const file = fileFromItem(item)
    if (file) return file
  }
  return firstImageFile(data.files)
}

function clipboardText(data) {
  if (!data || typeof data.getData !== 'function') return ''
  return data.getData('text/plain') || ''
}

function elementFromTarget(target) {
  if (!target) return null
  if (target.nodeType === 3) return target.parentElement || null
  if (target.nodeType === 1) return target
  return null
}

const TEXT_INPUT_TYPES = new Set(['', 'text', 'search', 'url', 'email', 'password', 'tel', 'number'])

export function eventTargetIsTextControl(target) {
  const element = elementFromTarget(target)
  if (!element) return false
  const tag = String(element.tagName || '').toUpperCase()
  if (tag === 'TEXTAREA') return true
  if (tag === 'INPUT') return TEXT_INPUT_TYPES.has(String(element.type || 'text').toLowerCase())
  return Boolean(element.isContentEditable)
}

export function nodeWithin(target, host) {
  if (!host || target == null || typeof host.contains !== 'function') return false
  return target === host || host.contains(target)
}

function shouldTakePastedFile({ file, busy, text, target, zone }) {
  if (!file || busy) return false
  if (nodeWithin(target, zone)) return true
  if (eventTargetIsTextControl(target) && String(text || '').trim()) return false
  return true
}

function lessonType(type) {
  if (type === 'application/pdf') return 'application/pdf'
  return canonicalType(type)
}

function namedLessonFile(file, fallbackType = '') {
  const image = namedClipboardFile(file, fallbackType)
  if (image) return image
  const type = lessonType(file?.type) || lessonType(fallbackType)
  if (!file || type !== 'application/pdf') return null
  const name = typeof file.name === 'string' ? file.name.trim() : ''
  if (name && file.type === type) return file
  return new File([file], name || 'clipboard.pdf', { type })
}

function lessonFileFromItem(item) {
  if (!item || item.kind !== 'file' || typeof item.getAsFile !== 'function') return null
  const file = item.getAsFile()
  if (!file) return null
  return namedLessonFile(file, item.type)
}

export function lessonFileFromClipboard(data) {
  if (!data) return null
  for (const item of entries(data.items)) {
    const file = lessonFileFromItem(item)
    if (file) return file
  }
  for (const file of entries(data.files)) {
    const named = namedLessonFile(file)
    if (named) return named
  }
  return null
}

export function pasteLessonFile(data, options) {
  const busy = options?.busy === true
  const target = options?.target ?? null
  const zone = options?.zone ?? null
  const file = lessonFileFromClipboard(data)
  if (!shouldTakePastedFile({ file, busy, text: clipboardText(data), target, zone })) return null
  return file
}

export function pasteClipboardImage(data, options) {
  const busy = options?.busy === true
  const target = options?.target ?? null
  const zone = options?.zone ?? null
  const file = imageFileFromClipboard(data)
  if (!shouldTakePastedFile({ file, busy, text: clipboardText(data), target, zone })) return null
  return file
}

export function pointerLeftDropzone(zone, relatedTarget) {
  if (!zone || typeof zone.contains !== 'function') return true
  if (relatedTarget != null && zone.contains(relatedTarget)) return false
  return true
}

export function dialogPasteHost(root) {
  if (!root || typeof root.closest !== 'function') return null
  const dialog = root.closest('[role="dialog"]')
  if (!dialog || dialog.nodeType !== 1) return null
  return dialog
}
