import { ref } from 'vue';

const isDarkMode = ref(false);

export function useTheme() {
  function applyTheme(dark: boolean) {
    isDarkMode.value = dark;
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      const body = document.body;
      if (dark) {
        root.classList.add('dark');
        root.classList.remove('light');
        body.classList.add('dark');
        body.classList.remove('light');
        root.setAttribute('data-theme', 'dark');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0f172a');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        body.classList.remove('dark');
        body.classList.add('light');
        root.setAttribute('data-theme', 'light');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f8fafc');
      }
      localStorage.setItem('wms_theme', dark ? 'dark' : 'light');
    }
  }

  function toggleTheme() {
    applyTheme(!isDarkMode.value);
  }

  function initTheme() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wms_theme');
      if (saved) {
        applyTheme(saved === 'dark');
      } else {
        // Default to Light mode
        applyTheme(false);
      }
    }
  }

  return {
    isDarkMode,
    applyTheme,
    toggleTheme,
    initTheme
  };
}
