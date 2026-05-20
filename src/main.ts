import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { useDuelStore } from '@/state/duelStore'
import { useLogStore } from '@/state/logStore'
import { useCardCacheStore } from '@/state/cardCacheStore'
import { DEV_SEED_PASSCODES } from '@/duel/devSeed'

import '@/assets/styles/tokens.css'
import '@/assets/styles/reset.css'
import '@/assets/styles/global.css'

const app = createApp(App)

app.use(createPinia())

// Eager-init stores so the dispatcher's apply function is registered and
// the duel log is subscribed to the event bus before any user interaction.
const duelStore = useDuelStore()
useLogStore()
const cardCacheStore = useCardCacheStore()

if (import.meta.env.DEV) {
  duelStore.devSeed()
  void cardCacheStore.ensureLoaded(DEV_SEED_PASSCODES)
}

app.mount('#app')
