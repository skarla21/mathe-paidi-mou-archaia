export function extrasMenuActive(path: string): boolean {
  return path === '/notes' || path.startsWith('/category/') || path === '/articles' || path.startsWith('/articles/')
}
