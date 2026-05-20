<script setup lang="ts"></script>

<template>
  <div class="duel-room">
    <div class="duel-room__placeholder">Duel Room</div>
  </div>
</template>

<style scoped>
.duel-room {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
}

.duel-room__placeholder {
  color: var(--color-text-dim);
  font-size: 14px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
</style>
