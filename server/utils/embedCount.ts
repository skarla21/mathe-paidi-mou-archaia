export type CountEmbed = { count: number }[] | null | undefined

export function embedCount(value: CountEmbed): number {
  return value?.[0]?.count ?? 0
}

export function wantsCounts(value: unknown): boolean {
  return value === '1' || value === 'true' || value === true
}
