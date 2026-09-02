<template>
  <svg 
    :class="customClass || 'w-4 h-4'" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    :stroke-width="strokeWidth || 1.75" 
    stroke-linecap="round" 
    stroke-linejoin="round"
  >
    <!-- Home / Dashboard -->
    <g v-if="name === 'home' || name === 'dashboard'">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </g>

    <!-- Stock / Ledger -->
    <g v-else-if="name === 'stock' || name === 'chart'">
      <line x1="18" y1="20" x2="18" y2="10"></line>
      <line x1="12" y1="20" x2="12" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="14"></line>
    </g>

    <!-- Truck / Gate Pass / Fleet -->
    <g v-else-if="name === 'truck' || name === 'gate-pass' || name === 'gate_pass'">
      <rect x="1" y="3" width="15" height="13"></rect>
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
      <circle cx="5.5" cy="18.5" r="2.5"></circle>
      <circle cx="18.5" cy="18.5" r="2.5"></circle>
    </g>

    <!-- Inbound / Receive -->
    <g v-else-if="name === 'inbound' || name === 'box-in'">
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    </g>

    <!-- De-bulking / Scale / Repack -->
    <g v-else-if="name === 'debulking' || name === 'scale'">
      <path d="M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"></path>
      <path d="M2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"></path>
      <path d="M7 21h10"></path>
      <path d="M12 3v18"></path>
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"></path>
    </g>

    <!-- POD / Signature / Pen -->
    <g v-else-if="name === 'pod' || name === 'outbound_pod' || name === 'signature' || name === 'edit'">
      <path d="M12 20h9"></path>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
    </g>

    <!-- Refresh -->
    <g v-else-if="name === 'refresh'">
      <polyline points="23 4 23 10 17 10"></polyline>
      <polyline points="1 20 1 14 7 14"></polyline>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </g>

    <!-- Printer -->
    <g v-else-if="name === 'printer'">
      <polyline points="6 9 6 2 18 2 18 9"></polyline>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
      <rect x="6" y="14" width="12" height="8"></rect>
    </g>

    <!-- Camera / Photo -->
    <g v-else-if="name === 'camera'">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
      <circle cx="12" cy="13" r="4"></circle>
    </g>

    <!-- Search -->
    <g v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </g>

    <!-- Barcode / Scan -->
    <g v-else-if="name === 'scan' || name === 'barcode'">
      <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
      <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
      <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
      <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
      <line x1="7" y1="8" x2="7" y2="16"></line>
      <line x1="10" y1="8" x2="10" y2="16"></line>
      <line x1="14" y1="8" x2="14" y2="16"></line>
      <line x1="17" y1="8" x2="17" y2="16"></line>
    </g>

    <!-- Package / Box -->
    <g v-else-if="name === 'package' || name === 'box'">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </g>

    <!-- User -->
    <g v-else-if="name === 'user'">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </g>

    <!-- Shield / Audit -->
    <g v-else-if="name === 'shield' || name === 'checkpoint'">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </g>

    <!-- Trash -->
    <g v-else-if="name === 'trash'">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </g>

    <!-- Logout / Door -->
    <g v-else-if="name === 'logout'">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </g>

    <!-- Check -->
    <g v-else-if="name === 'check'">
      <polyline points="20 6 9 17 4 12"></polyline>
    </g>

    <!-- Alert / Warning -->
    <g v-else-if="name === 'alert'">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </g>

    <!-- Default generic icon -->
    <g v-else>
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </g>
  </svg>
</template>

<script setup>
defineProps({
  name: {
    type: String,
    required: true
  },
  customClass: {
    type: String,
    default: 'w-4 h-4'
  },
  strokeWidth: {
    type: [Number, String],
    default: 1.75
  }
})
</script>
