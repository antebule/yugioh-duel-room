import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ZoneKind } from '@/duel/types'

export type ModalName = 'deck-import' | 'dice' | 'coin' | null

export interface ContextMenuAnchor {
  x: number
  y: number
  width: number
  height: number
}

export type ZonePickerKind = 'normal_summon' | 'special_summon' | 'set_monster' | 'activate' | 'set_st' | 'activate_field' | 'move_zone'

export interface ZonePicker {
  instanceUuid: string
  kind: ZonePickerKind
  validZoneKinds: ZoneKind[]
}

export const useUiStore = defineStore('ui', () => {
  const modal = ref<ModalName>(null)
  const globalDragOver = ref(false)

  const hoveredInstanceUuid = ref<string | null>(null)
  const previewedInstanceUuid = ref<string | null>(null)
  const previewSticky = ref(false)

  const contextMenuInstanceUuid = ref<string | null>(null)
  const contextMenuAnchor = ref<ContextMenuAnchor | null>(null)

  const zonePicker = ref<ZonePicker | null>(null)

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

  function openContextMenu(instanceUuid: string, anchor: ContextMenuAnchor): void {
    contextMenuInstanceUuid.value = instanceUuid
    contextMenuAnchor.value = anchor
  }

  function closeContextMenu(): void {
    contextMenuInstanceUuid.value = null
    contextMenuAnchor.value = null
  }

  function startZonePicker(picker: ZonePicker): void {
    zonePicker.value = picker
  }

  function cancelZonePicker(): void {
    zonePicker.value = null
  }

  return {
    modal,
    globalDragOver,
    hoveredInstanceUuid,
    previewedInstanceUuid,
    previewSticky,
    contextMenuInstanceUuid,
    contextMenuAnchor,
    zonePicker,
    openModal,
    closeModal,
    setGlobalDragOver,
    hoverInstance,
    unhoverInstance,
    togglePreviewPin,
    openContextMenu,
    closeContextMenu,
    startZonePicker,
    cancelZonePicker,
  }
})
