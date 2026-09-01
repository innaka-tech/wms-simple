<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 antialiased flex flex-col font-sans select-none">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style>
/* Disable pull-to-refresh & double-tap zoom on handheld devices */
html, body {
  overscroll-behavior-y: contain;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
</style>
