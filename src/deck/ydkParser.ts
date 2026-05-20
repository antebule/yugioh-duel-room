import type { Deck, YdkParseResult } from './types'

type Section = 'preamble' | 'main' | 'extra' | 'side'

export function parseYdk(text: string, name: string): YdkParseResult {
  const errors: string[] = []
  const warnings: string[] = []
  const main: number[] = []
  const extra: number[] = []
  const side: number[] = []

  let section: Section = 'preamble'

  const lines = text.replace(/\r/g, '').split('\n')

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? ''
    const line = raw.trim()
    if (!line) continue

    if (line === '#main') {
      section = 'main'
      continue
    }
    if (line === '#extra') {
      section = 'extra'
      continue
    }
    if (line === '!side') {
      section = 'side'
      continue
    }

    if (line.startsWith('#') || line.startsWith('!')) continue // comment / unknown header

    if (!/^\d+$/.test(line)) {
      warnings.push(`Line ${i + 1}: unrecognized "${raw}"`)
      continue
    }

    const n = Number(line)
    if (n <= 0) {
      warnings.push(`Line ${i + 1}: invalid passcode "${line}"`)
      continue
    }

    if (section === 'preamble') {
      warnings.push(`Line ${i + 1}: card ${n} appears before #main`)
      continue
    }
    if (section === 'main') main.push(n)
    else if (section === 'extra') extra.push(n)
    else side.push(n)
  }

  if (main.length === 0 && extra.length === 0 && side.length === 0) {
    errors.push('No cards found in the YDK file')
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings }
  }

  if (main.length > 0) {
    if (main.length < 40) warnings.push(`Main deck has ${main.length} cards (below the 40 minimum)`)
    if (main.length > 60) warnings.push(`Main deck has ${main.length} cards (above the 60 maximum)`)
  }
  if (extra.length > 15) warnings.push(`Extra deck has ${extra.length} cards (above the 15 maximum)`)
  if (side.length > 15) warnings.push(`Side deck has ${side.length} cards (above the 15 maximum)`)

  const counts = new Map<number, number>()
  for (const id of [...main, ...extra, ...side]) {
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  for (const [id, count] of counts) {
    if (count > 3) warnings.push(`Card ${id} has ${count} copies (max 3)`)
  }

  const deck: Deck = {
    name,
    main,
    extra,
    side,
    importedAt: Date.now(),
    sourceText: text,
  }

  return { ok: true, deck, warnings }
}
