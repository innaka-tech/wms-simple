export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt'
  ],
  app: {
    head: {
      title: 'WMS Simple - Mobile Field Ops',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover' },
        { name: 'theme-color', content: '#0f172a' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }
      ]
    }
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000/api'
    }
  }
})
