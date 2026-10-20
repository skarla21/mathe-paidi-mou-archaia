const LETTERS = {
  α: 'a',
  β: 'v',
  γ: 'g',
  δ: 'd',
  ε: 'e',
  ζ: 'z',
  η: 'i',
  θ: 'th',
  ι: 'i',
  κ: 'k',
  λ: 'l',
  μ: 'm',
  ν: 'n',
  ξ: 'x',
  ο: 'o',
  π: 'p',
  ρ: 'r',
  σ: 's',
  ς: 's',
  τ: 't',
  υ: 'y',
  φ: 'f',
  χ: 'ch',
  ψ: 'ps',
  ω: 'o',
}

const VOICED = new Set(['α', 'ε', 'η', 'ι', 'ο', 'υ', 'ω', 'β', 'γ', 'δ', 'ζ', 'λ', 'μ', 'ν', 'ρ'])

function transliterateWord(word) {
  let out = ''
  for (let i = 0; i < word.length; i += 1) {
    const pair = word.slice(i, i + 2)
    const next = word[i + 2]
    if (pair === 'ου') {
      out += 'ou'
      i += 1
      continue
    }
    if (pair === 'γγ' || pair === 'γκ') {
      out += i === 0 && pair === 'γκ' ? 'gk' : 'ng'
      i += 1
      continue
    }
    if (pair === 'γξ') {
      out += 'nx'
      i += 1
      continue
    }
    if (pair === 'γχ') {
      out += 'nch'
      i += 1
      continue
    }
    if (pair === 'μπ') {
      out += i === 0 ? 'b' : 'mp'
      i += 1
      continue
    }
    if (pair === 'ντ') {
      out += 'nt'
      i += 1
      continue
    }
    if (pair === 'αυ' || pair === 'ευ' || pair === 'ηυ') {
      const head = pair[0] === 'α' ? 'a' : pair[0] === 'ε' ? 'e' : 'i'
      const voiced = next !== undefined && VOICED.has(next)
      out += head + (voiced ? 'v' : 'f')
      i += 1
      continue
    }
    const char = word[i] ?? ''
    out += LETTERS[char] ?? char
  }
  return out
}

export function slugifyGreek(value) {
  const prepared = value
    .normalize('NFC')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/['’΄´`ʹ\u0374\u0384\u02B9\u02BC]/g, ' ')
  const words = prepared.match(/[0-9a-zα-ωϊϋς]+/g) ?? []
  return words.map(transliterateWord).filter(Boolean).join('-')
}

export function uniqueSlug(base, taken) {
  const root = base || 'item'
  const used = new Set(taken)
  if (!used.has(root)) return root
  let n = 2
  while (used.has(`${root}-${n}`)) n += 1
  return `${root}-${n}`
}

export function stableSlug(current, taken) {
  const root = current || 'item'
  const used = new Set(taken)
  if (!used.has(root)) return root
  return uniqueSlug(root, taken)
}

const RESERVED_CHAPTER_SLUGS = ['lesson']

export const RESERVED_GRADE_SLUGS = [
  'about',
  'admin',
  'api',
  'articles',
  'category',
  'dashboard',
  'login',
  'notes',
  'oroi',
  'profile',
  'register',
  'reset-password',
  'search',
]

export function gradeSlug(base, taken) {
  return uniqueSlug(base || 'grade', [...taken, ...RESERVED_GRADE_SLUGS])
}

export function chapterSlug(base, taken) {
  return uniqueSlug(base || 'chapter', [...taken, ...RESERVED_CHAPTER_SLUGS])
}
