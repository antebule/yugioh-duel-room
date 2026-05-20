import type { DuelEvent } from './eventTypes'

type Listener = (event: DuelEvent) => void

const listeners = new Set<Listener>()
const history: DuelEvent[] = []

export function subscribe(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function emit(event: DuelEvent): void {
  for (const fn of listeners) fn(event)
}

export function recordHistory(event: DuelEvent): void {
  history.push(event)
}

export function getHistory(): readonly DuelEvent[] {
  return history
}

export function clearHistory(): void {
  history.length = 0
}
