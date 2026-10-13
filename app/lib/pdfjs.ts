let loading: Promise<typeof import('pdfjs-dist')> | null = null
let workerGate = Promise.resolve()

export function loadPdfjs() {
  if (!loading) {
    loading = import('pdfjs-dist').then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
      return pdfjs
    }).catch((error: unknown) => {
      loading = null
      throw error
    })
  }
  return loading
}

export function releasePdfWorker(work: () => Promise<void>) {
  workerGate = workerGate.then(work, work).then(() => {}, () => {})
}

export function waitForPdfWorker() {
  return workerGate
}
