const TICK_MS = 60_000

let subscribers = 0
let timer: ReturnType<typeof setInterval> | undefined

export function useRelativeNow() {
  const now = useState("comment-relative-now", () => Date.now())
  let active = false

  onMounted(() => {
    active = true
    subscribers += 1
    now.value = Date.now()
    if (timer) return
    timer = setInterval(() => {
      now.value = Date.now()
    }, TICK_MS)
  })

  onUnmounted(() => {
    if (!active) return
    active = false
    subscribers -= 1
    if (subscribers > 0 || !timer) return
    clearInterval(timer)
    timer = undefined
  })

  return now
}
