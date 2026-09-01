import { onMounted, onUnmounted, ref } from 'vue';

export function useBarcodeScanner(onScanCallback?: (barcode: string) => void) {
  const isListening = ref(false);
  const lastScanned = ref<string>('');
  let buffer = '';
  let lastKeyTime = 0;
  const SCANNER_TIMEOUT_MS = 60; // Barcode scanners type very fast (<30ms per character)

  function playAudioFeedback(type: 'SUCCESS' | 'ERROR') {
    if (typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'SUCCESS') {
        osc.frequency.setValueAtTime(1800, audioCtx.currentTime); // High pleasant beep
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08); // 80ms
      } else {
        osc.frequency.setValueAtTime(400, audioCtx.currentTime); // Low buzz
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25); // 250ms
      }
    } catch {
      // Audio context might be restricted before user interaction
    }

    // Trigger haptic vibration on mobile devices
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (type === 'SUCCESS') {
        navigator.vibrate(50);
      } else {
        navigator.vibrate([100, 50, 100]);
      }
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    const currentTime = Date.now();

    // Reset buffer if delay is too long (manual typing vs laser scanner)
    if (currentTime - lastKeyTime > SCANNER_TIMEOUT_MS && buffer.length > 0) {
      buffer = '';
    }
    lastKeyTime = currentTime;

    if (e.key === 'Enter') {
      if (buffer.length >= 3) {
        const scannedCode = buffer.trim();
        lastScanned.value = scannedCode;
        playAudioFeedback('SUCCESS');

        if (onScanCallback) {
          onScanCallback(scannedCode);
        }
        buffer = '';
        e.preventDefault();
      }
    } else if (e.key.length === 1) {
      buffer += e.key;
    }
  }

  function startListening() {
    if (typeof window !== 'undefined' && !isListening.value) {
      window.addEventListener('keydown', handleKeyDown);
      isListening.value = true;
    }
  }

  function stopListening() {
    if (typeof window !== 'undefined' && isListening.value) {
      window.removeEventListener('keydown', handleKeyDown);
      isListening.value = false;
    }
  }

  onMounted(() => {
    startListening();
  });

  onUnmounted(() => {
    stopListening();
  });

  return {
    isListening,
    lastScanned,
    playAudioFeedback,
    startListening,
    stopListening
  };
}
