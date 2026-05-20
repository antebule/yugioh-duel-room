import { onMounted, onUnmounted } from 'vue'
import { useDeckStore } from '@/state/deckStore'
import { useUiStore } from '@/state/uiStore'

export function useDeckImport(): void {
  const deckStore = useDeckStore()
  const uiStore = useUiStore()

  let dragDepth = 0

  function hasFile(e: DragEvent): boolean {
    const items = e.dataTransfer?.items
    if (!items) return false
    for (let i = 0; i < items.length; i++) {
      if (items[i]?.kind === 'file') return true
    }
    return false
  }

  function onDragEnter(e: DragEvent): void {
    if (!hasFile(e)) return
    e.preventDefault()
    dragDepth++
    uiStore.setGlobalDragOver(true)
  }

  function onDragOver(e: DragEvent): void {
    if (!hasFile(e)) return
    e.preventDefault()
  }

  function onDragLeave(e: DragEvent): void {
    if (!hasFile(e)) return
    e.preventDefault()
    dragDepth--
    if (dragDepth <= 0) {
      dragDepth = 0
      uiStore.setGlobalDragOver(false)
    }
  }

  async function onDrop(e: DragEvent): Promise<void> {
    if (!hasFile(e)) return
    e.preventDefault()
    dragDepth = 0
    uiStore.setGlobalDragOver(false)

    const file = e.dataTransfer?.files?.[0]
    if (!file) return

    const result = await deckStore.importFromFile(file)
    if (!result.ok) {
      uiStore.openModal('deck-import')
    }
  }

  onMounted(() => {
    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
  })

  onUnmounted(() => {
    window.removeEventListener('dragenter', onDragEnter)
    window.removeEventListener('dragover', onDragOver)
    window.removeEventListener('dragleave', onDragLeave)
    window.removeEventListener('drop', onDrop)
  })
}
