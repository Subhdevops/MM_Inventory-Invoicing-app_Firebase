
'use client';

// This function creates a short beep sound using the Web Audio API.
// It's designed to be called from the client-side only.
export const playBeep = () => {
  // Ensure this code only runs in the browser
  if (typeof window !== 'undefined' && window.AudioContext) {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Connect the nodes
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configure the sound
      gainNode.gain.value = 0.1; // Keep volume low to avoid being jarring
      oscillator.frequency.value = 880; // A pleasant 'A' note
      oscillator.type = 'sine'; // A clean, simple sound wave

      // Play the sound for a short duration (100ms)
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);

      // Close the context after the sound has played to free up resources
      setTimeout(() => {
        if (audioContext.state !== 'closed') {
          audioContext.close();
        }
      }, 200);
    } catch (error) {
      console.error("Could not play beep sound:", error);
    }
  }
};

// This function creates a short, lower-pitched "error" sound.
export const playErrorBeep = () => {
  if (typeof window !== 'undefined' && window.AudioContext) {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      gainNode.gain.value = 0.15; // Slightly louder to grab attention
      oscillator.frequency.value = 440; // A lower 'A' note
      oscillator.type = 'sawtooth'; // A harsher, more "buzzy" sound

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);

      setTimeout(() => {
        if (audioContext.state !== 'closed') {
          audioContext.close();
        }
      }, 250);
    } catch (error) {
      console.error("Could not play error beep sound:", error);
    }
  }
};
