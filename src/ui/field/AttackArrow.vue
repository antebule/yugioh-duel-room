<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useUiStore } from '@/state/uiStore'

const ui = useUiStore()

// Fixed-pixel geometry (viewport space). The arrow points straight up from the
// attacking card to the top edge of the play mat.
const ARROW_WIDTH = 52
const HEAD_HEIGHT = 26
const SHAFT_WIDTH = 10

const DURATION_MS = 950

const visible = ref(false)
const animKey = ref(0)
const left = ref(0)
const top = ref(0)
const height = ref(0)

let timer: ReturnType<typeof setTimeout> | null = null

watch(
  () => ui.attackAnim,
  (anim) => {
    if (!anim) return
    const mat = document.querySelector('.play-mat')?.getBoundingClientRect()
    const endY = mat ? mat.top : 0
    left.value = anim.x - ARROW_WIDTH / 2
    top.value = endY
    height.value = Math.max(HEAD_HEIGHT, anim.y - endY)
    animKey.value = anim.id
    visible.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      visible.value = false
      ui.clearAttackAnim()
      timer = null
    }, DURATION_MS)
  },
)

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      :key="animKey"
      class="attack-arrow"
      :style="{
        left: `${left}px`,
        top: `${top}px`,
        width: `${ARROW_WIDTH}px`,
        height: `${height}px`,
      }"
    >
      <svg
        class="attack-arrow__svg"
        :width="ARROW_WIDTH"
        :height="height"
        :viewBox="`0 0 ${ARROW_WIDTH} ${height}`"
      >
        <line
          :x1="ARROW_WIDTH / 2"
          :y1="height"
          :x2="ARROW_WIDTH / 2"
          :y2="HEAD_HEIGHT"
          :stroke-width="SHAFT_WIDTH"
        />
        <polygon
          :points="`${ARROW_WIDTH / 2},0 0,${HEAD_HEIGHT} ${ARROW_WIDTH},${HEAD_HEIGHT}`"
        />
      </svg>
    </div>
  </Teleport>
</template>

<style scoped>
.attack-arrow {
  position: fixed;
  pointer-events: none;
  z-index: var(--z-toast);
  transform-origin: bottom center;
  animation: attack-arrow-strike v-bind('`${DURATION_MS}ms`') ease-out forwards;
  filter: drop-shadow(0 0 6px rgba(255, 60, 60, 0.7));
}

.attack-arrow__svg line {
  stroke: var(--color-danger);
  stroke-linecap: round;
}

.attack-arrow__svg polygon {
  fill: var(--color-danger);
}

@keyframes attack-arrow-strike {
  0% {
    transform: scaleY(0);
    opacity: 1;
  }
  35% {
    transform: scaleY(1);
    opacity: 1;
  }
  75% {
    transform: scaleY(1);
    opacity: 1;
  }
  100% {
    transform: scaleY(1);
    opacity: 0;
  }
}
</style>
