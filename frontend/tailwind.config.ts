import type { Config } from 'tailwindcss'

export default <Config>{
  darkMode: 'class',
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue'
  ],
  theme: {
    extend: {
      colors: {
        wms: {
          body: 'var(--wms-bg-body)',
          card: 'var(--wms-bg-card)',
          subtle: 'var(--wms-bg-subtle)',
          input: 'var(--wms-bg-input)',
          primary: 'var(--wms-text-primary)',
          secondary: 'var(--wms-text-secondary)',
          muted: 'var(--wms-text-muted)',
          border: 'var(--wms-border)',
          accent: 'var(--wms-accent)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    }
  }
}
