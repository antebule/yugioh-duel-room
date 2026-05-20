import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ModalName = 'deck-import' | 'dice' | 'coin' | null

export const useUiStore = defineStore('ui', () => {
  const modal = ref<ModalName>(null)
  const globalDragOver = ref(false)

  const hoveredInstanceUuid = ref<string | null>(null)
  const previewedInstanceUuid = ref<string | null>(null)
  const previewSticky = ref(false)

  function openModal(name: Exclude<ModalName, null>): void {
    modal.value = name
  }

  function closeModal(): void {
    modal.value = null
  }

  function setGlobalDragOver(value: boolean): void {
    globalDragOver.value = value
  }

  function hoverInstance(uuid: string): void {
    hoveredInstanceUuid.value = uuid
    if (!previewSticky.value) {
      previewedInstanceUuid.value = uuid
    }
  }

  function unhoverInstance(uuid: string): void {
    if (hoveredInstanceUuid.value === uuid) {
      hoveredInstanceUuid.value = null
    }
    // Intentionally do not clear previewedInstanceUuid: the last previewed card
    // stays visible until another card is hovered (or unpinned from a pinned state).
  }

  function togglePreviewPin(): void {
    if (previewSticky.value) {
      previewSticky.value = false
      if (hoveredInstanceUuid.value) {
        previewedInstanceUuid.value = hoveredInstanceUuid.value
      }
    } else if (previewedInstanceUuid.value) {
      previewSticky.value = true
    }
  }

  return {
    modal,
    globalDragOver,
    hoveredInstanceUuid,
    previewedInstanceUuid,
    previewSticky,
    openModal,
    closeModal,
    setGlobalDragOver,
    hoverInstance,
    unhoverInstance,
    togglePreviewPin,
  }
})
