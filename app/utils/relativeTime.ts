const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR = 365 * DAY

const relative = new Intl.RelativeTimeFormat("el", { numeric: "always" })
const exact = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Athens",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

type RelativeUnit = "minute" | "hour" | "day" | "week" | "month" | "year"

export function formatRelativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""

  const elapsed = now - then
  const abs = Math.abs(elapsed)
  const direction = elapsed >= 0 ? -1 : 1
  const format = (amount: number, unit: RelativeUnit) =>
    relative.format(direction * amount, unit)

  if (abs < MINUTE) return "μόλις τώρα"

  const minutes = Math.floor(abs / MINUTE)
  if (minutes < 60) return format(minutes, "minute")

  const hours = Math.floor(abs / HOUR)
  if (hours < 24) return format(hours, "hour")

  const days = Math.floor(abs / DAY)
  if (days < 7) return format(days, "day")

  const weeks = Math.floor(abs / WEEK)
  if (weeks < 5) return format(weeks, "week")

  const months = Math.floor(abs / MONTH)
  if (months < 12) return format(months, "month")

  const years = Math.floor(abs / YEAR)
  if (years < 1) return format(months, "month")
  return format(years, "year")
}

export function formatExactTime(iso: string): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return ""
  const parts = exact.formatToParts(then)
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ""
  return `${pick("day")}/${pick("month")}/${pick("year")}, ${pick("hour")}:${pick("minute")}`
}
