import type { DuelEvent } from './eventTypes'
import { emit, recordHistory } from './eventBus'

type ApplyFn = (event: DuelEvent) => void

let apply: ApplyFn | null = null

export function registerApply(fn: ApplyFn): void {
  apply = fn
}

export function dispatch(event: DuelEvent): void {
  if (!apply) {
    throw new Error(
      'Dispatcher has no apply function registered. Initialize the duel store before dispatching.',
    )
  }
  apply(event)
  recordHistory(event)
  emit(event)
}
