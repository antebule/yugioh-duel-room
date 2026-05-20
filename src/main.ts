import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

import '@/assets/styles/tokens.css'
import '@/assets/styles/reset.css'
import '@/assets/styles/global.css'

const app = createApp(App)

app.use(createPinia())

app.mount('#app')
