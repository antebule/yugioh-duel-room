import { useUiStore } from '@/state/uiStore'

const OPEN_DELAY_MS = 200
const CARD_LEAVE_GRACE_MS = 300
const MENU_LEAVE_GRACE_MS = 150

let openTimer: ReturnType<typeof setTimeout> | null = null
let closeTimer: ReturnType<typeof setTimeout> | null = null
let pendingUuid: string | null = null

function clearOpenTimer(): void {
  if (openTimer) {
    clearTimeout(openTimer)
    openTimer = null
  }
  pendingUuid = null
}

function clearCloseTimer(): void {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

export function useContextMenu() {
  const ui = useUiStore()

  function onCardEnter(instanceUuid: string, el: HTMLElement): void {
    clearCloseTimer()

    if (ui.contextMenuInstanceUuid === instanceUuid) return

    if (ui.contextMenuInstanceUuid) {
      // Switching cards: close the current menu immediately and start fresh open timer.
      ui.closeContextMenu()
    }

    clearOpenTimer()
    pendingUuid = instanceUuid
    openTimer = setTimeout(() => {
      if (pendingUuid !== instanceUuid) return
      const rect = el.getBoundingClientRect()
      ui.openContextMenu(instanceUuid, {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      })
      openTimer = null
      pendingUuid = null
    }, OPEN_DELAY_MS)
  }

  function onCardLeave(instanceUuid: string): void {
    if (pendingUuid === instanceUuid) {
      clearOpenTimer()
      return
    }
    if (ui.contextMenuInstanceUuid !== instanceUuid) return
    clearCloseTimer()
    closeTimer = setTimeout(() => {
      ui.closeContextMenu()
      closeTimer = null
    }, CARD_LEAVE_GRACE_MS)
  }

  function onMenuEnter(): void {
    clearCloseTimer()
  }

  function onMenuLeave(): void {
    clearCloseTimer()
    closeTimer = setTimeout(() => {
      ui.closeContextMenu()
      closeTimer = null
    }, MENU_LEAVE_GRACE_MS)
  }

  function closeNow(): void {
    clearOpenTimer()
    clearCloseTimer()
    ui.closeContextMenu()
  }

  return { onCardEnter, onCardLeave, onMenuEnter, onMenuLeave, closeNow }
}
