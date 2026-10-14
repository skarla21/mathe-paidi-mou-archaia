import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { foldGreekName, foldGreekSearch, includesFolded, plainGreekLabel, searchLikePattern } from '../shared/utils/foldGreekSearch.mjs'

const YPOGEGRAMMENI = [837, 890]
const COMBINING_MARK_START = 768
const COMBINING_MARK_END = 879
const SPACING_MARKS = [96, 168, 180, 900, 8125, 8127, 8128, 8190]

function sqlMirror(value) {
  const lowered = value.normalize('NFD').toLowerCase()
  const withIota = [...lowered].map((char) => {
    const codePoint = char.codePointAt(0)
    return YPOGEGRAMMENI.includes(codePoint) ? 'ι' : char
  }).join('')
  const stripped = [...withIota].filter((char) => {
    const codePoint = char.codePointAt(0)
    return codePoint < COMBINING_MARK_START || codePoint > COMBINING_MARK_END
  }).join('').replace(/ς/g, 'σ')
  return [...stripped].filter((char) => !SPACING_MARKS.includes(char.codePointAt(0))).join('')
}

function foldFunctionSql(sql) {
  const match = sql.match(/create or replace function public\.fold_greek_search\(input text\)[\s\S]*?as \$\$\r?\n([\s\S]*?)\r?\n\$\$;/)
  assert.ok(match, 'fold_greek_search body')
  return match[1].replaceAll('\r\n', '\n').trim()
}

function latestFoldMigration() {
  const directory = new URL('../supabase/migrations/', import.meta.url)
  const sources = readdirSync(directory)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => readFileSync(new URL(name, directory), 'utf8'))
    .filter((sql) => sql.includes('function public.fold_greek_search'))
  assert.ok(sources.length > 0)
  return sources.at(-1)
}

describe('foldGreekSearch', () => {
  it('ignores case', () => {
    assert.equal(foldGreekSearch('Αγω'), 'αγω')
    assert.equal(foldGreekSearch('αγω'), foldGreekSearch('ΑΓΩ'))
  })

  it('ignores tonos', () => {
    assert.equal(foldGreekSearch('Άγω'), 'αγω')
    assert.equal(foldGreekSearch('άέήίόύώ'), 'αεηιουω')
  })

  it('ignores polytonic breathings, varia, and perispomeni', () => {
    assert.equal(foldGreekSearch('Ἀγών'), 'αγων')
    assert.equal(foldGreekSearch('ἀγώ'), 'αγω')
    assert.equal(foldGreekSearch('ἃ'), 'α')
    assert.equal(foldGreekSearch('ᾶ'), 'α')
    assert.equal(foldGreekSearch('τῷ'), 'τωι')
  })

  it('ignores dialytika and tonos combined with dialytika', () => {
    assert.equal(foldGreekSearch('ϊ'), 'ι')
    assert.equal(foldGreekSearch('ΐ'), 'ι')
    assert.equal(foldGreekSearch('ῒ'), 'ι')
    assert.equal(foldGreekSearch('ῗ'), 'ι')
    assert.equal(foldGreekSearch('ϋ'), 'υ')
    assert.equal(foldGreekSearch('ΰ'), 'υ')
    assert.equal(foldGreekSearch('Ϊ'), 'ι')
  })

  it('treats final sigma like sigma', () => {
    assert.equal(foldGreekSearch('ΑΓΩΣ'), 'αγωσ')
    assert.equal(foldGreekSearch('λόγος'), 'λογοσ')
    assert.equal(foldGreekSearch('λόγοσ'), foldGreekSearch('λόγος'))
  })

  it('keeps a plain query that already matches the folded title', () => {
    assert.equal(foldGreekSearch('αγω'), foldGreekSearch('Ἀγών').slice(0, 3))
  })

  it('treats iota subscript like an adscript iota', () => {
    assert.equal(foldGreekSearch('ᾅδης'), 'αιδησ')
    assert.equal(foldGreekSearch('αιδης'), 'αιδησ')
    assert.equal(foldGreekSearch('ᾳ'), 'αι')
    assert.equal(foldGreekSearch('ᾼ'), 'αι')
    assert.equal(foldGreekSearch('ᾧ'), 'ωι')
    assert.equal(foldGreekSearch('\u037Aα'), 'ια')
  })

  it('ignores spacing breathings and accents', () => {
    assert.equal(foldGreekSearch('᾿α'), 'α')
    assert.equal(foldGreekSearch('῾Ελλην'), 'ελλην')
    assert.equal(foldGreekSearch('᾿Ἀγών'), 'αγων')
    assert.equal(foldGreekSearch('\u1FEFα'), 'α')
    assert.equal(foldGreekSearch('\u1FFDα'), 'α')
  })

  it('matches the SQL fold for every Greek code point', () => {
    for (const [start, end] of [[0x370, 0x3FF], [0x1F00, 0x1FFF]]) {
      for (let codePoint = start; codePoint <= end; codePoint += 1) {
        const char = String.fromCodePoint(codePoint)
        assert.equal(foldGreekSearch(char), sqlMirror(char), char)
      }
    }
    for (const sample of ['Γραμματική', 'Συντακτικό', 'λόγος', 'Ἀγών', 'ᾅδης', '᾿α', 'τῷ']) {
      assert.equal(foldGreekSearch(sample), sqlMirror(sample), sample)
    }
  })
})

describe('plainGreekLabel', () => {
  it('collapses whitespace that displays as the same name', () => {
    assert.equal(plainGreekLabel('  Αρχαία  Ελληνικά  '), 'Αρχαία Ελληνικά')
    assert.equal(plainGreekLabel('Αρχαία\u00A0Ελληνικά'), 'Αρχαία Ελληνικά')
    assert.equal(plainGreekLabel('Αρχαία\tΕλληνικά'), 'Αρχαία Ελληνικά')
    assert.equal(plainGreekLabel('Αρχαία\nΕλληνικά'), 'Αρχαία Ελληνικά')
    assert.equal(plainGreekLabel('Αρχαία\u200B'), 'Αρχαία')
    assert.equal(plainGreekLabel('\u200B'), '')
  })

  it('keeps visible punctuation', () => {
    assert.equal(plainGreekLabel('Αρχαία!'), 'Αρχαία!')
  })
})

describe('foldGreekName', () => {
  it('uses the plain label before the search fold', () => {
    assert.equal(foldGreekName('  ΑΡΧΑΙΑ  ΕΛΛΗΝΙΚΑ  '), foldGreekName('αρχαία ελληνικά'))
    assert.equal(foldGreekName('Αρχαία\u00A0Ελληνικά'), foldGreekName('Αρχαία Ελληνικά'))
    assert.equal(foldGreekName('Ἀρχαῖα\u200B'), foldGreekName('αρχαια'))
    assert.equal(foldGreekName('λόγοσ'), foldGreekName('λόγος'))
    assert.equal(foldGreekName('Αρχαία!'), `${foldGreekName('Αρχαία')}!`)
    assert.equal(foldGreekName('΄'), '')
    assert.equal(foldGreekName('   '), '')
  })
})

describe('includesFolded', () => {
  it('matches a name ignoring case, tonos, and final sigma', () => {
    assert.equal(includesFolded('Αντώνης Σκαρλάτος', 'αντωνης'), true)
    assert.equal(includesFolded('λόγος', 'ΛΟΓΟΣ'), true)
    assert.equal(includesFolded('λόγος', 'λόγοσ'), true)
  })

  it('rejects a bare tonos and a query that is not contained', () => {
    assert.equal(includesFolded('Αντώνης', '΄'), false)
    assert.equal(includesFolded('Αντώνης', 'μαρια'), false)
    assert.equal(includesFolded('', 'α'), false)
  })

  it('trims the query before folding', () => {
    assert.equal(includesFolded('Αντώνης', '  αντωνης  '), true)
    assert.equal(includesFolded('Αντώνης', '  ΄  '), false)
  })
})

describe('searchLikePattern', () => {
  it('wraps the folded query for a contains match', () => {
    assert.equal(searchLikePattern('Ἀγώ'), '%αγω%')
  })

  it('escapes LIKE wildcards', () => {
    assert.equal(searchLikePattern('100%'), '%100\\%%')
    assert.equal(searchLikePattern('a_b'), '%a\\_b%')
    assert.equal(searchLikePattern('a\\b'), '%a\\\\b%')
  })

  it('quotes PostgREST reserved characters and keeps LIKE escapes inside the quotes', () => {
    assert.equal(searchLikePattern('α,β'), '"%α,β%"')
    assert.equal(searchLikePattern('α.β'), '"%α.β%"')
    assert.equal(searchLikePattern('α:β'), '"%α:β%"')
    assert.equal(searchLikePattern('(α)'), '"%(α)%"')
    assert.equal(searchLikePattern('α"β'), '"%α\\"β%"')
    assert.equal(searchLikePattern('α,100%'), '"%α,100\\\\%%"')
  })
})

describe('fold_greek_search sql', () => {
  it('keeps schema.sql and the latest migration on the same function', () => {
    const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')
    const migration = latestFoldMigration()
    const body = foldFunctionSql(schema)
    assert.equal(body, foldFunctionSql(migration))
    const iota = body.indexOf('chr(837)')
    const spacingIota = body.indexOf('chr(890)')
    const rangeStart = body.indexOf('chr(768)')
    const rangeEnd = body.indexOf('chr(879)')
    const sigma = body.indexOf("'ς'")
    const spacing = body.indexOf('chr(96)')
    assert.ok(iota !== -1 && iota < spacingIota && spacingIota < rangeStart)
    assert.ok(rangeStart < rangeEnd && rangeEnd < sigma && sigma < spacing)
    for (const codePoint of SPACING_MARKS) {
      assert.ok(body.includes(`chr(${codePoint})`))
    }
    assert.match(schema, /update public\.chapters set title = title/)
    assert.match(schema, /update public\.lessons set title = title/)
    assert.match(migration, /update public\.chapters set title = title/)
    assert.match(migration, /update public\.lessons set title = title/)
  })
})
