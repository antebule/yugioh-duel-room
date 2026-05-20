export interface Deck {
  name: string
  main: number[]
  extra: number[]
  side: number[]
  importedAt: number
  sourceText: string
}

export interface RecentDeck {
  key: string
  name: string
  cardCount: { main: number; extra: number; side: number }
  importedAt: number
}

export interface DeckRef {
  key: string
  name: string
}

export type YdkParseResult =
  | { ok: true; deck: Deck; warnings: string[] }
  | { ok: false; errors: string[]; warnings: string[] }
