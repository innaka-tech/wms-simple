<template>
  <div class="login-page">
    <!-- Animated Background -->
    <div class="login-bg">
      <div class="login-bg-gradient"></div>
      <div class="login-bg-grid"></div>
      <div class="login-bg-orb login-bg-orb--1"></div>
      <div class="login-bg-orb login-bg-orb--2"></div>
      <div class="login-bg-orb login-bg-orb--3"></div>
    </div>

    <!-- Floating Particles -->
    <div class="login-particles">
      <span v-for="i in 12" :key="i" class="login-particle" :style="particleStyle(i)"></span>
    </div>

    <!-- TOP BAR -->
    <header class="login-topbar">
      <div class="login-topbar__brand">
        <div class="login-topbar__icon">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <span class="login-topbar__title">WMS SIMPLE <span class="login-topbar__badge">ENTERPRISE</span></span>
      </div>
      <div class="flex items-center space-x-3">
        <div class="login-topbar__status">
          <span class="login-topbar__dot"></span>
          <span>API Active • PostgreSQL</span>
        </div>
        <ThemeToggle />
      </div>
    </header>

    <!-- MAIN LOGIN CARD -->
    <main class="login-main">
      <div class="login-card" :class="{ 'login-card--shake': shakeCard }">

        <!-- Left Panel: Brand & Info -->
        <div class="login-card__left">
          <div class="login-card__left-content">
            <!-- Version Badge -->
            <div class="login-card__version">
              <span class="login-card__version-dot"></span>
              <span>Platform v5.2.0 • Node WH-JKT-01</span>
            </div>

            <!-- Title -->
            <h1 class="login-card__left-title">
              Warehouse<br/>Management<br/>System
            </h1>
            <p class="login-card__left-desc">
              Arsitektur operasional terintegrasi untuk kargo curah, cross-docking,
              pos pemeriksaan armada, dan rantai dingin KDKMP.
            </p>

            <!-- Stats Grid -->
            <div class="login-stats">
              <div class="login-stat">
                <div class="login-stat__value">24/7</div>
                <div class="login-stat__label">Monitoring</div>
              </div>
              <div class="login-stat">
                <div class="login-stat__value">6</div>
                <div class="login-stat__label">Role Levels</div>
              </div>
              <div class="login-stat">
                <div class="login-stat__value">E2E</div>
                <div class="login-stat__label">Audit Trail</div>
              </div>
            </div>

            <!-- Bottom Compliance -->
            <div class="login-card__compliance">
              <div class="login-card__compliance-item">
                <span class="login-card__compliance-dot"></span>
                <span>OWASP Top 10 Verified</span>
              </div>
              <span class="login-card__compliance-sep">•</span>
              <span>ISO 27001</span>
            </div>
          </div>

          <!-- Decorative corner glow -->
          <div class="login-card__left-glow"></div>
        </div>

        <!-- Right Panel: Auth Form -->
        <div class="login-card__right">

          <!-- Mobile Header -->
          <div class="login-card__mobile-header">
            <div>
              <h2 class="text-base font-bold text-slate-900 dark:text-white">WMS SIMPLE</h2>
              <p class="text-xs text-slate-500">Enterprise Logistics Suite v5.2.0</p>
            </div>
            <span class="login-card__mobile-badge">WH-JKT-01</span>
          </div>

          <!-- Greeting -->
          <div class="login-greeting">
            <div class="login-greeting__icon">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <h2 class="login-greeting__title">Selamat Datang</h2>
              <p class="login-greeting__subtitle">Masuk ke Portal Operasional Gudang</p>
            </div>
          </div>

          <!-- Error Alert -->
          <Transition name="login-alert">
            <div v-if="authStore.errorMessage" class="login-error">
              <div class="login-error__content">
                <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{{ authStore.errorMessage }}</span>
              </div>
              <button @click="authStore.errorMessage = ''" class="login-error__close">✕</button>
            </div>
          </Transition>

          <!-- Login Form -->
          <form @submit.prevent="handleLogin" class="login-form">
            <!-- Username -->
            <div class="login-field">
              <label class="login-field__label">Nama Pengguna / ID Karyawan</label>
              <div class="login-field__wrapper">
                <div class="login-field__icon">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  v-model="username"
                  type="text"
                  required
                  placeholder="Contoh: superadmin / gate_officer"
                  class="login-field__input"
                  @focus="activeField = 'username'"
                  @blur="activeField = ''"
                />
                <div class="login-field__glow" :class="{ 'login-field__glow--active': activeField === 'username' }"></div>
              </div>
            </div>

            <!-- Password -->
            <div class="login-field">
              <div class="flex justify-between items-center">
                <label class="login-field__label">Kata Sandi</label>
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="login-field__toggle"
                >
                  {{ showPassword ? 'Sembunyikan' : 'Tampilkan' }}
                </button>
              </div>
              <div class="login-field__wrapper">
                <div class="login-field__icon">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0110 0v4"></path>
                  </svg>
                </div>
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  placeholder="Masukkan kata sandi..."
                  class="login-field__input"
                  @focus="activeField = 'password'"
                  @blur="activeField = ''"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="login-field__eye"
                >
                  <svg v-if="!showPassword" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                </button>
                <div class="login-field__glow" :class="{ 'login-field__glow--active': activeField === 'password' }"></div>
              </div>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="authStore.isLoading"
              class="login-submit"
            >
              <span v-if="authStore.isLoading" class="login-submit__spinner"></span>
              <span>{{ authStore.isLoading ? 'Memverifikasi...' : 'Masuk ke Konsol' }}</span>
              <svg v-if="!authStore.isLoading" class="w-4 h-4 login-submit__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </form>

          <!-- Quick Login UAT -->
          <div v-if="isQuickLoginEnabled" class="login-quick">
            <div class="login-quick__header">
              <div class="login-quick__indicator">
                <span class="login-quick__dot"></span>
                <span class="login-quick__label">Quick Login UAT</span>
              </div>
              <span class="login-quick__hint">pw: password123</span>
            </div>

            <div class="login-roles">
              <button
                v-for="role in demoRoles"
                :key="role.username"
                type="button"
                @click="quickLogin(role.username)"
                class="login-role"
              >
                <div class="login-role__avatar" :style="{ background: role.gradient }">
                  {{ role.initials }}
                </div>
                <div class="login-role__info">
                  <span class="login-role__title">{{ role.title }}</span>
                  <span class="login-role__name">{{ role.name }}</span>
                </div>
                <span class="login-role__badge" :class="role.badgeClass">{{ role.code }}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="login-footer">
      <p>© 2026 WMS Simple Enterprise. Seluruh hak cipta dilindungi.</p>
      <div class="login-footer__meta">
        <span>ISO/IEC 27001</span>
        <span>•</span>
        <span>OWASP Compliant</span>
        <span>•</span>
        <span>v5.2.0</span>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import ThemeToggle from '~/components/ThemeToggle.vue'

definePageMeta({
  layout: false
})

const router = useRouter()
const authStore = useAuthStore()

const isQuickLoginEnabled = true
const isDevBypassEnabled = import.meta.dev
const username = ref(isQuickLoginEnabled ? 'superadmin' : '')
const password = ref(isQuickLoginEnabled ? 'password123' : '')
const showPassword = ref(false)
const activeField = ref('')
const shakeCard = ref(false)

// DEV BYPASS: press "D" 3x rapidly
const bypassCount = ref(0)
let bypassTimer = null

function handleBypassKeypress(e) {
  if (!isDevBypassEnabled) return
  if (e.metaKey || e.ctrlKey || e.altKey) return
  if (e.key !== 'd' && e.key !== 'D') return

  bypassCount.value++
  if (bypassTimer) clearTimeout(bypassTimer)
  bypassTimer = setTimeout(() => { bypassCount.value = 0 }, 1500)

  if (bypassCount.value >= 3) {
    bypassCount.value = 0
    performBypassLogin()
  }
}

async function performBypassLogin() {
  const success = await authStore.login('superadmin', 'password123')
  if (success) {
    router.push('/')
  } else {
    authStore.errorMessage = 'Bypass gagal — pastikan backend API sudah berjalan di port 3000'
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleBypassKeypress)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleBypassKeypress)
  if (bypassTimer) clearTimeout(bypassTimer)
})

function particleStyle(i) {
  const size = 2 + Math.random() * 3
  const x = Math.random() * 100
  const delay = Math.random() * 8
  const duration = 6 + Math.random() * 10
  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `${x}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`
  }
}

const demoRoles = [
  {
    title: 'Super Admin',
    name: 'System Administrator',
    username: 'superadmin',
    code: 'SA',
    initials: 'SA',
    gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    badgeClass: 'login-role__badge--purple'
  },
  {
    title: 'Admin Ops',
    name: 'Siti Rahmawati',
    username: 'admin_adm',
    code: 'AD',
    initials: 'SR',
    gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)',
    badgeClass: 'login-role__badge--blue'
  },
  {
    title: 'WH Manager',
    name: 'Bambang Sudiro',
    username: 'mgr_jkt',
    code: 'MG',
    initials: 'BS',
    gradient: 'linear-gradient(135deg, #d97706, #f59e0b)',
    badgeClass: 'login-role__badge--amber'
  },
  {
    title: 'WH Staff',
    name: 'Joko Susanto',
    username: 'staff_jkt',
    code: 'ST',
    initials: 'JS',
    gradient: 'linear-gradient(135deg, #059669, #10b981)',
    badgeClass: 'login-role__badge--green'
  },
  {
    title: 'Driver',
    name: 'Budi Santoso',
    username: 'driver_budi',
    code: 'DR',
    initials: 'BD',
    gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)',
    badgeClass: 'login-role__badge--cyan'
  },
  {
    title: 'Gate Officer',
    name: 'Sersan Hendro',
    username: 'gate_officer',
    code: 'GO',
    initials: 'SH',
    gradient: 'linear-gradient(135deg, #e11d48, #f43f5e)',
    badgeClass: 'login-role__badge--rose'
  }
]

async function handleLogin() {
  const success = await authStore.login(username.value, password.value)
  if (success) {
    router.push('/')
  } else {
    shakeCard.value = true
    setTimeout(() => { shakeCard.value = false }, 600)
  }
}

async function quickLogin(selectedUsername) {
  username.value = selectedUsername
  password.value = 'password123'
  await handleLogin()
}
</script>

<style scoped>
/* ═══════════════════════════════════════════
   LOGIN PAGE — PREMIUM ENTERPRISE REDESIGN
   ═══════════════════════════════════════════ */

.login-page {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: #0f172a;
}

:root.dark .login-page,
html.dark .login-page {
  color: #e2e8f0;
}

/* ── Animated Background ── */
.login-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}

.login-bg-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 30%, #dbeafe 60%, #ede9fe 100%);
  transition: background 0.5s ease;
}

html.dark .login-bg-gradient {
  background: linear-gradient(135deg, #020617 0%, #0f172a 30%, #1e1b4b 60%, #0c0a1a 100%);
}

.login-bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px);
  background-size: 60px 60px;
}

html.dark .login-bg-grid {
  background-image:
    linear-gradient(rgba(71,85,105,0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(71,85,105,0.12) 1px, transparent 1px);
}

.login-bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
  animation: orbFloat 15s ease-in-out infinite;
}

.login-bg-orb--1 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, #3b82f6, transparent 70%);
  top: -120px;
  right: -100px;
  animation-delay: 0s;
}

.login-bg-orb--2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, #8b5cf6, transparent 70%);
  bottom: -80px;
  left: -60px;
  animation-delay: -5s;
}

.login-bg-orb--3 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, #06b6d4, transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -10s;
  opacity: 0.2;
}

html.dark .login-bg-orb { opacity: 0.15; }

@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -20px) scale(1.05); }
  66% { transform: translate(-20px, 15px) scale(0.95); }
}

/* ── Particles ── */
.login-particles {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.login-particle {
  position: absolute;
  bottom: -10px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.35);
  animation: particleRise linear infinite;
  opacity: 0;
}

html.dark .login-particle {
  background: rgba(139, 92, 246, 0.3);
}

@keyframes particleRise {
  0% { opacity: 0; transform: translateY(0) scale(0); }
  10% { opacity: 1; }
  90% { opacity: 0.6; }
  100% { opacity: 0; transform: translateY(-100vh) scale(1); }
}

/* ── Top Bar ── */
.login-topbar {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 80rem;
  margin: 0 auto;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.login-topbar__brand {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.login-topbar__icon {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(59,130,246,0.3);
}

.login-topbar__title {
  font-weight: 700;
  font-size: 0.875rem;
  letter-spacing: -0.01em;
  color: #0f172a;
}

html.dark .login-topbar__title { color: #fff; }

.login-topbar__badge {
  font-size: 0.65rem;
  font-weight: 700;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.login-topbar__status {
  display: none;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.65rem;
  font-family: 'JetBrains Mono', monospace;
  color: #64748b;
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(8px);
  padding: 0.375rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(226,232,240,0.6);
}

html.dark .login-topbar__status {
  background: rgba(15,23,42,0.7);
  border-color: rgba(51,65,85,0.5);
  color: #94a3b8;
}

@media (min-width: 640px) {
  .login-topbar__status { display: flex; }
}

.login-topbar__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ── Main Card Container ── */
.login-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 1rem;
  position: relative;
  z-index: 10;
}

.login-card {
  width: 100%;
  max-width: 64rem;
  border-radius: 1.25rem;
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr;
  background: rgba(255,255,255,0.75);
  backdrop-filter: blur(20px) saturate(1.8);
  border: 1px solid rgba(226,232,240,0.5);
  box-shadow:
    0 20px 60px rgba(0,0,0,0.06),
    0 4px 20px rgba(0,0,0,0.04),
    inset 0 1px 0 rgba(255,255,255,0.5);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  animation: cardEnter 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

html.dark .login-card {
  background: rgba(15,23,42,0.65);
  border-color: rgba(51,65,85,0.4);
  box-shadow:
    0 20px 60px rgba(0,0,0,0.3),
    0 4px 20px rgba(0,0,0,0.2),
    inset 0 1px 0 rgba(255,255,255,0.03);
}

@media (min-width: 1024px) {
  .login-card {
    grid-template-columns: 5fr 7fr;
  }
}

.login-card--shake {
  animation: shake 0.5s ease-in-out;
}

@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-5px); }
  80% { transform: translateX(5px); }
}

/* ── Left Panel ── */
.login-card__left {
  display: none;
  position: relative;
  background: linear-gradient(160deg, #0f172a 0%, #1e293b 40%, #1e1b4b 100%);
  padding: 2.5rem;
  overflow: hidden;
}

@media (min-width: 1024px) {
  .login-card__left { display: flex; }
}

.login-card__left-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  min-height: 420px;
}

.login-card__left-glow {
  position: absolute;
  bottom: -80px;
  right: -80px;
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, rgba(59,130,246,0.2), transparent 70%);
  border-radius: 50%;
  filter: blur(40px);
}

.login-card__version {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  background: rgba(30,41,59,0.8);
  border: 1px solid rgba(71,85,105,0.4);
  color: #94a3b8;
  font-size: 0.625rem;
  font-family: 'JetBrains Mono', monospace;
  width: fit-content;
}

.login-card__version-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #10b981;
  animation: pulse 2s ease-in-out infinite;
}

.login-card__left-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #fff;
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin-top: 1.5rem;
}

.login-card__left-desc {
  font-size: 0.75rem;
  color: #94a3b8;
  line-height: 1.6;
  margin-top: 0.75rem;
}

/* Stats */
.login-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.login-stat {
  padding: 0.75rem;
  border-radius: 0.625rem;
  background: rgba(30,41,59,0.6);
  border: 1px solid rgba(71,85,105,0.3);
  text-align: center;
}

.login-stat__value {
  font-size: 1rem;
  font-weight: 800;
  font-family: 'JetBrains Mono', monospace;
  background: linear-gradient(135deg, #60a5fa, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.login-stat__label {
  font-size: 0.6rem;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.125rem;
}

/* Compliance */
.login-card__compliance {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(71,85,105,0.3);
  font-size: 0.6rem;
  font-family: 'JetBrains Mono', monospace;
  color: #64748b;
  margin-top: auto;
}

.login-card__compliance-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.login-card__compliance-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #10b981;
}

.login-card__compliance-sep {
  color: #475569;
}

/* ── Right Panel ── */
.login-card__right {
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

@media (min-width: 640px) {
  .login-card__right { padding: 2.5rem; }
}

/* Mobile Header */
.login-card__mobile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid rgba(226,232,240,0.5);
}

html.dark .login-card__mobile-header {
  border-color: rgba(51,65,85,0.5);
}

@media (min-width: 1024px) {
  .login-card__mobile-header { display: none; }
}

.login-card__mobile-badge {
  font-size: 0.6rem;
  font-family: 'JetBrains Mono', monospace;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  background: rgba(241,245,249,0.8);
  border: 1px solid rgba(226,232,240,0.6);
  color: #475569;
  font-weight: 700;
}

html.dark .login-card__mobile-badge {
  background: rgba(30,41,59,0.6);
  border-color: rgba(51,65,85,0.5);
  color: #94a3b8;
}

/* Greeting */
.login-greeting {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.login-greeting__icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1));
  border: 1px solid rgba(59,130,246,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  flex-shrink: 0;
}

html.dark .login-greeting__icon {
  background: linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15));
  border-color: rgba(59,130,246,0.2);
  color: #60a5fa;
}

.login-greeting__title {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #0f172a;
}

html.dark .login-greeting__title { color: #fff; }

.login-greeting__subtitle {
  font-size: 0.8rem;
  color: #64748b;
  margin-top: 0.125rem;
}

html.dark .login-greeting__subtitle { color: #94a3b8; }

/* Error Alert */
.login-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.15);
  color: #dc2626;
  font-size: 0.75rem;
  margin-bottom: 1rem;
}

html.dark .login-error {
  background: rgba(239,68,68,0.1);
  border-color: rgba(239,68,68,0.2);
  color: #fb7185;
}

.login-error__content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.login-error__close {
  font-weight: 700;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
  padding: 0.25rem;
}
.login-error__close:hover { opacity: 1; }

.login-alert-enter-active { animation: alertIn 0.3s ease; }
.login-alert-leave-active { animation: alertIn 0.2s ease reverse; }
@keyframes alertIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Form */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.login-field__label {
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 0.375rem;
  letter-spacing: 0.01em;
}

html.dark .login-field__label { color: #94a3b8; }

.login-field__wrapper {
  position: relative;
}

.login-field__icon {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  pointer-events: none;
  z-index: 2;
}

.login-field__input {
  width: 100%;
  padding: 0.625rem 2.25rem 0.625rem 2.5rem;
  font-size: 0.8rem;
  border-radius: 0.625rem;
  border: 1.5px solid rgba(203,213,225,0.6);
  background: rgba(255,255,255,0.6);
  color: #0f172a;
  outline: none;
  transition: all 0.25s ease;
  font-family: inherit;
}

html.dark .login-field__input {
  border-color: rgba(51,65,85,0.5);
  background: rgba(15,23,42,0.5);
  color: #e2e8f0;
}

.login-field__input::placeholder {
  color: #94a3b8;
  font-size: 0.75rem;
}

.login-field__input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}

html.dark .login-field__input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
}

.login-field__glow {
  position: absolute;
  inset: -1px;
  border-radius: 0.75rem;
  opacity: 0;
  background: linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15));
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: 0;
}

.login-field__glow--active {
  opacity: 1;
}

.login-field__toggle {
  font-size: 0.65rem;
  color: #64748b;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;
}
.login-field__toggle:hover { color: #0f172a; }
html.dark .login-field__toggle:hover { color: #e2e8f0; }

.login-field__eye {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  cursor: pointer;
  transition: color 0.2s;
  z-index: 2;
}
.login-field__eye:hover { color: #3b82f6; }

/* Submit Button */
.login-submit {
  width: 100%;
  padding: 0.75rem 1.5rem;
  border-radius: 0.625rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(37,99,235,0.3);
  margin-top: 0.25rem;
  position: relative;
  overflow: hidden;
}

.login-submit::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #1d4ed8, #6d28d9);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.login-submit:hover::before { opacity: 1; }
.login-submit:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(37,99,235,0.4);
}

.login-submit:active {
  transform: translateY(0);
}

.login-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.login-submit > * { position: relative; z-index: 1; }

.login-submit__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.login-submit__arrow {
  transition: transform 0.3s ease;
}

.login-submit:hover .login-submit__arrow {
  transform: translateX(3px);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Quick Login Section ── */
.login-quick {
  padding-top: 1.25rem;
  margin-top: 1.25rem;
  border-top: 1px solid rgba(226,232,240,0.4);
}

html.dark .login-quick {
  border-color: rgba(51,65,85,0.3);
}

.login-quick__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.login-quick__indicator {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.login-quick__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f59e0b;
  animation: pulse 2s ease-in-out infinite;
}

.login-quick__label {
  font-size: 0.65rem;
  font-weight: 700;
  color: #d97706;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

html.dark .login-quick__label { color: #fbbf24; }

.login-quick__hint {
  font-size: 0.6rem;
  color: #94a3b8;
  font-family: 'JetBrains Mono', monospace;
}

/* Roles Grid */
.login-roles {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

@media (min-width: 640px) {
  .login-roles { grid-template-columns: repeat(3, 1fr); }
}

.login-role {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  border-radius: 0.625rem;
  border: 1px solid rgba(226,232,240,0.5);
  background: rgba(255,255,255,0.4);
  cursor: pointer;
  transition: all 0.25s ease;
  text-align: left;
}

html.dark .login-role {
  border-color: rgba(51,65,85,0.4);
  background: rgba(30,41,59,0.3);
}

.login-role:hover {
  border-color: rgba(59,130,246,0.3);
  background: rgba(59,130,246,0.04);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

html.dark .login-role:hover {
  border-color: rgba(59,130,246,0.3);
  background: rgba(59,130,246,0.08);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.login-role__avatar {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.55rem;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

.login-role__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.login-role__title {
  font-size: 0.65rem;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

html.dark .login-role__title { color: #e2e8f0; }

.login-role__name {
  font-size: 0.575rem;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.login-role__badge {
  font-size: 0.55rem;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  flex-shrink: 0;
  display: none;
}

@media (min-width: 640px) {
  .login-role__badge { display: inline; }
}

.login-role__badge--purple { background: rgba(139,92,246,0.1); color: #8b5cf6; }
.login-role__badge--blue { background: rgba(59,130,246,0.1); color: #3b82f6; }
.login-role__badge--amber { background: rgba(245,158,11,0.1); color: #f59e0b; }
.login-role__badge--green { background: rgba(16,185,129,0.1); color: #10b981; }
.login-role__badge--cyan { background: rgba(6,182,212,0.1); color: #06b6d4; }
.login-role__badge--rose { background: rgba(244,63,94,0.1); color: #f43f5e; }

/* ── Footer ── */
.login-footer {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 80rem;
  margin: 0 auto;
  padding: 1rem 1.5rem;
  text-align: center;
  font-size: 0.65rem;
  color: #94a3b8;
  border-top: 1px solid rgba(226,232,240,0.3);
}

html.dark .login-footer {
  border-color: rgba(51,65,85,0.2);
  color: #475569;
}

@media (min-width: 640px) {
  .login-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    text-align: left;
  }
}

.login-footer__meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6rem;
}

@media (min-width: 640px) {
  .login-footer__meta { margin-top: 0; }
}
</style>
