import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ModalName = 'deck-import' | 'dice' | 'coin' | null

export const useUiStore = defineStore('ui', () => {
  const modal = ref<ModalName>(null)
  const globalDragOver = ref(false)

  function openModal(name: Exclude<ModalName, null>): void {
    modal.value = name
  }

  function closeModal(): void {
    modal.value = null
  }

  function setGlobalDragOver(value: boolean): void {
    globalDragOver.value = value
  }

  return { modal, globalDragOver, openModal, closeModal, setGlobalDragOver }
})
