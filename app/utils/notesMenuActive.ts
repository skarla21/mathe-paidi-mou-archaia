export function notesMenuActive(input: {
  path: string
  gradeSlugs: readonly string[]
  catalogFailed: boolean
  gradeParam: unknown
}): boolean {
  const segment = input.path.split('/').filter(Boolean)[0] ?? ''
  if (input.gradeSlugs.includes(segment)) return true
  const param = Array.isArray(input.gradeParam) ? input.gradeParam[0] : input.gradeParam
  return input.catalogFailed && typeof param === 'string' && param.length > 0
}
