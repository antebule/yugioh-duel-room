import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { useDuelStore } from '@/state/duelStore'
import { useLogStore } from '@/state/logStore'
import { useCardCacheStore } from '@/state/cardCacheStore'

import '@/assets/styles/tokens.css'
import '@/assets/styles/reset.css'
import '@/assets/styles/global.css'

const app = createApp(App)

app.use(createPinia())

// Eager-init stores so the dispatcher's apply function is registered and
// the duel log is subscribed to the event bus before any user interaction.
useDuelStore()
useLogStore()
useCardCacheStore()

app.mount('#app')
