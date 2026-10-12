import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  dialogPasteHost,
  eventTargetIsTextControl,
  imageFileFromClipboard,
  lessonFileFromClipboard,
  nodeWithin,
  pasteClipboardImage,
  pasteLessonFile,
  pointerLeftDropzone,
} from '../shared/utils/clipboardImage.mjs'

function imageFile(name, type, bytes = [1, 2, 3]) {
  return new File([Uint8Array.from(bytes)], name, { type })
}

function itemFor(file) {
  return { kind: 'file', type: file.type, getAsFile: () => file }
}

function clipboard({ items = [], files = [], text = '' } = {}) {
  return {
    items,
    files,
    getData(kind) {
      return kind === 'text/plain' ? text : ''
    },
  }
}

describe('clipboard image file', () => {
  it('reads the first image from clipboard items', () => {
    const png = imageFile('shot.png', 'image/png')
    const jpeg = imageFile('other.jpg', 'image/jpeg')
    const file = imageFileFromClipboard(clipboard({
      items: [
        { kind: 'string', type: 'text/plain', getAsFile: () => null },
        itemFor(png),
      ],
      files: [jpeg],
    }))
    assert.equal(file, png)
  })

  it('reads a DataTransfer item list', () => {
    const png = imageFile('shot.png', 'image/png')
    const items = {
      length: 2,
      item: (index) => index === 1 ? itemFor(png) : { kind: 'string', type: 'text/plain' },
    }
    const files = { length: 0, item: () => null }
    assert.equal(imageFileFromClipboard({ items, files }), png)
  })

  it('falls back to clipboard files when items have no image', () => {
    const jpeg = imageFile('photo.jpg', 'image/jpeg')
    const file = imageFileFromClipboard(clipboard({
      items: [{ kind: 'string', type: 'text/plain' }],
      files: [new File([Uint8Array.from([1])], 'notes.txt', { type: 'text/plain' }), jpeg],
    }))
    assert.equal(file, jpeg)
  })

  it('returns nothing when the clipboard has only text', () => {
    assert.equal(imageFileFromClipboard(clipboard({ text: 'https://example.com/a.png' })), null)
    assert.equal(pasteClipboardImage(clipboard({ text: 'https://example.com/a.png' }), {
      target: { nodeType: 1, tagName: 'INPUT', type: 'url' },
    }), null)
  })

  it('rejects gif, webp, and svg clipboard images', () => {
    for (const type of ['image/gif', 'image/webp', 'image/svg+xml']) {
      assert.equal(imageFileFromClipboard(clipboard({
        items: [itemFor(imageFile('clip', type))],
      })), null, type)
    }
  })

  it('rejects a clipboard file with a blank type', () => {
    assert.equal(imageFileFromClipboard(clipboard({
      files: [imageFile('shot', '')],
    })), null)
  })

  it('normalizes a jpg clipboard type to jpeg', () => {
    const file = imageFileFromClipboard(clipboard({
      files: [imageFile('', 'image/jpg', [4])],
    }))
    assert.equal(file?.type, 'image/jpeg')
    assert.equal(file?.name, 'clipboard.jpg')
    assert.equal(file?.size, 1)
  })

  it('rewrites a named jpg file to image/jpeg', () => {
    const file = imageFileFromClipboard(clipboard({
      items: [itemFor(imageFile('photo.jpg', 'image/jpg', [7]))],
    }))
    assert.equal(file?.name, 'photo.jpg')
    assert.equal(file?.type, 'image/jpeg')
    assert.equal(file?.size, 1)
  })

  it('reads a png file when the clipboard item type is blank', () => {
    const png = imageFile('shot.png', 'image/png')
    const file = imageFileFromClipboard(clipboard({
      items: [{ kind: 'file', type: '', getAsFile: () => png }],
    }))
    assert.equal(file, png)
  })

  it('uses the item type when the file type is blank', () => {
    const blank = imageFile('shot.png', '')
    const file = imageFileFromClipboard(clipboard({
      items: [{ kind: 'file', type: 'image/png', getAsFile: () => blank }],
    }))
    assert.equal(file?.type, 'image/png')
    assert.equal(file?.name, 'shot.png')
    assert.equal(file?.size, 3)
  })

  it('names an empty clipboard image before upload', () => {
    const png = imageFile('  ', 'image/png', [9, 8])
    const jpeg = imageFile('', 'image/jpeg', [4])
    const namedPng = imageFileFromClipboard(clipboard({ items: [itemFor(png)] }))
    const namedJpeg = imageFileFromClipboard(clipboard({ files: [jpeg] }))
    assert.equal(namedPng.name, 'clipboard.png')
    assert.equal(namedPng.type, 'image/png')
    assert.equal(namedPng.size, 2)
    assert.equal(namedJpeg.name, 'clipboard.jpg')
    assert.equal(namedJpeg.type, 'image/jpeg')
    assert.equal(namedJpeg.size, 1)
  })
})

function textControl(tagName, type) {
  return { nodeType: 1, tagName, type }
}

describe('clipboard image paste decision', () => {
  it('takes an image-only paste even when a text field is focused', () => {
    const png = imageFile('shot.png', 'image/png')
    const file = pasteClipboardImage(clipboard({ items: [itemFor(png)] }), {
      target: textControl('TEXTAREA'),
    })
    assert.equal(file, png)
  })

  it('leaves text in a text field when the clipboard also has an image', () => {
    const png = imageFile('shot.png', 'image/png')
    const title = textControl('INPUT', 'text')
    const file = pasteClipboardImage(clipboard({
      items: [itemFor(png)],
      text: 'τίτλος μαθήματος',
    }), { target: title })
    assert.equal(file, null)
  })

  it('takes an image plus text when the paste lands in the dropzone', () => {
    const png = imageFile('shot.png', 'image/png')
    const field = textControl('INPUT', 'text')
    const zone = {
      contains(node) {
        return node === field
      },
    }
    const file = pasteClipboardImage(clipboard({
      items: [itemFor(png)],
      text: 'https://example.com/a.png',
    }), { target: field, zone })
    assert.equal(file, png)
  })

  it('ignores a paste while a save or upload is running', () => {
    const png = imageFile('shot.png', 'image/png')
    const file = pasteClipboardImage(clipboard({ items: [itemFor(png)] }), { busy: true })
    assert.equal(file, null)
  })
})

describe('lesson clipboard file', () => {
  it('reads a pasted pdf and a pasted image', () => {
    const pdf = imageFile('notes.pdf', 'application/pdf', [4, 5])
    const png = imageFile('shot.png', 'image/png')
    assert.equal(lessonFileFromClipboard(clipboard({ items: [itemFor(pdf)] })), pdf)
    assert.equal(lessonFileFromClipboard(clipboard({ files: [png] })), png)
  })

  it('names an empty pdf before upload and ignores a paste while busy', () => {
    const blank = imageFile('', 'application/pdf', [9])
    const named = lessonFileFromClipboard(clipboard({ files: [blank] }))
    assert.equal(named?.name, 'clipboard.pdf')
    assert.equal(named?.type, 'application/pdf')
    assert.equal(named?.size, 1)
    assert.equal(pasteLessonFile(clipboard({ items: [itemFor(imageFile('notes.pdf', 'application/pdf'))] }), {
      busy: true,
    }), null)
    assert.equal(pasteLessonFile(clipboard({ text: 'τίτλος' })), null)
  })

  it('leaves a text paste alone when the clipboard also has a file', () => {
    const pdf = imageFile('notes.pdf', 'application/pdf', [4])
    const description = { nodeType: 1, tagName: 'TEXTAREA' }
    assert.equal(pasteLessonFile(clipboard({
      items: [itemFor(pdf)],
      text: 'παράγραφος',
    }), { target: description }), null)
    const zone = { contains: (node) => node === description }
    assert.equal(pasteLessonFile(clipboard({
      items: [itemFor(pdf)],
      text: 'παράγραφος',
    }), { target: description, zone }), pdf)
  })
})

describe('clipboard paste target', () => {
  it('treats inputs, textareas, and contenteditable as text', () => {
    assert.equal(eventTargetIsTextControl({ nodeType: 1, tagName: 'TEXTAREA' }), true)
    assert.equal(eventTargetIsTextControl({ nodeType: 1, tagName: 'INPUT', type: 'text' }), true)
    assert.equal(eventTargetIsTextControl({ nodeType: 1, tagName: 'INPUT', type: 'file' }), false)
    assert.equal(eventTargetIsTextControl({ nodeType: 1, tagName: 'DIV', isContentEditable: true }), true)
    assert.equal(eventTargetIsTextControl({ nodeType: 3, parentElement: { nodeType: 1, tagName: 'TEXTAREA' } }), true)
    assert.equal(eventTargetIsTextControl(null), false)
  })

  it('knows when the paste target is inside the dropzone', () => {
    const input = { id: 'title' }
    const zone = {
      contains(node) {
        return node === input
      },
    }
    assert.equal(nodeWithin(input, zone), true)
    assert.equal(nodeWithin(zone, zone), true)
    assert.equal(nodeWithin({ id: 'outside' }, zone), false)
    assert.equal(nodeWithin(input, null), false)
  })

  it('keeps the drop highlight while the pointer is still inside', () => {
    const button = { id: 'pick' }
    const zone = {
      contains(node) {
        return node === button || node === zone
      },
    }
    assert.equal(pointerLeftDropzone(zone, button), false)
    assert.equal(pointerLeftDropzone(zone, { id: 'outside' }), true)
    assert.equal(pointerLeftDropzone(zone, null), true)
  })

  it('binds paste to the open dialog', () => {
    const dialog = { nodeType: 1 }
    const root = {
      closest(selector) {
        return selector === '[role="dialog"]' ? dialog : null
      },
    }
    assert.equal(dialogPasteHost(root), dialog)
    assert.equal(dialogPasteHost({ closest: () => null }), null)
    assert.equal(dialogPasteHost(null), null)
  })
})
