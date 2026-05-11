// ─── Web Audio API Sound Effects ─────────────────────────────────────────────
// Generates pleasant notification sounds programmatically — no audio files needed.

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// ─── Send Sound (short, bright "whoosh") ────────────────────────────────────

export function playSendSound() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;

    // Main tone — quick ascending chirp
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.15);

    // Subtle harmonic
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(900, now + 0.02);
    osc2.frequency.exponentialRampToValueAtTime(1500, now + 0.1);

    gain2.gain.setValueAtTime(0.08, now + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc2.start(now + 0.02);
    osc2.stop(now + 0.12);
  } catch {
    // Silently fail if audio not available
  }
}

// ─── Receive Sound (soft, warm "ding") ──────────────────────────────────────

export function playReceiveSound() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;

    // Primary tone — warm ding
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.2);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.setValueAtTime(0.18, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.start(now);
    osc.stop(now + 0.35);

    // Second harmonic — soft bell
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1320, now + 0.03);
    osc2.frequency.exponentialRampToValueAtTime(880, now + 0.25);

    gain2.gain.setValueAtTime(0.1, now + 0.03);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc2.start(now + 0.03);
    osc2.stop(now + 0.3);

    // Third harmonic — shimmer
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.connect(gain3);
    gain3.connect(ctx.destination);

    osc3.type = "sine";
    osc3.frequency.setValueAtTime(1760, now + 0.06);

    gain3.gain.setValueAtTime(0.05, now + 0.06);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc3.start(now + 0.06);
    osc3.stop(now + 0.2);
  } catch {
    // Silently fail
  }
}

// ─── Notification Sound (attention-grabbing but pleasant) ───────────────────

export function playNotificationSound() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;

    // Double ding pattern
    const notes = [880, 1100, 880];
    const delays = [0, 0.12, 0.24];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + delays[i]);

      gain.gain.setValueAtTime(0, now + delays[i]);
      gain.gain.linearRampToValueAtTime(0.15, now + delays[i] + 0.02);
      gain.gain.setValueAtTime(0.15, now + delays[i] + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delays[i] + 0.25);

      osc.start(now + delays[i]);
      osc.stop(now + delays[i] + 0.25);
    });
  } catch {
    // Silently fail
  }
}

// ─── Network Post Sound (bright ascending chime — new job/post) ─────────────

export function playNetworkPostSound() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;

    // Rising three-note chime — "new announcement" feel
    const notes = [660, 880, 1100];
    const durations = [0.12, 0.12, 0.25];

    let offset = 0;
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + offset);

      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.14, now + offset + 0.015);
      gain.gain.setValueAtTime(0.14, now + offset + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + durations[i]);

      osc.start(now + offset);
      osc.stop(now + offset + durations[i]);

      // Add a soft harmonic shimmer on each note
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(freq * 2, now + offset + 0.01);

      gain2.gain.setValueAtTime(0, now + offset + 0.01);
      gain2.gain.linearRampToValueAtTime(0.04, now + offset + 0.03);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + offset + durations[i] * 0.8);

      osc2.start(now + offset + 0.01);
      osc2.stop(now + offset + durations[i] * 0.8);

      offset += durations[i] - 0.04; // slight overlap for smooth legato
    });
  } catch {
    // Silently fail
  }
}

// ─── Network Job Alert (deeper, more urgent two-tone) ───────────────────────

export function playNetworkJobSound() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;

    // Two quick attention-grabbing tones
    const notes = [523, 784]; // C5 → G5 — perfect fifth, sounds like an alert
    const timings = [0, 0.15];

    timings.forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(notes[i], now + t);

      gain.gain.setValueAtTime(0, now + t);
      gain.gain.linearRampToValueAtTime(0.16, now + t + 0.01);
      gain.gain.setValueAtTime(0.16, now + t + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.22);

      osc.start(now + t);
      osc.stop(now + t + 0.22);
    });

    // Final resolving tone — higher, softer
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.connect(gain3);
    gain3.connect(ctx.destination);

    osc3.type = "sine";
    osc3.frequency.setValueAtTime(1047, now + 0.3); // C6

    gain3.gain.setValueAtTime(0, now + 0.3);
    gain3.gain.linearRampToValueAtTime(0.1, now + 0.315);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc3.start(now + 0.3);
    osc3.stop(now + 0.55);
  } catch {
    // Silently fail
  }
}

// ─── Error Sound (gentle low tone) ──────────────────────────────────────────

export function playErrorSound() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch {
    // Silently fail
  }
}

// ─── Sound Settings ─────────────────────────────────────────────────────────

const SOUND_PREF_KEY = "chat-sound-enabled";

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const pref = localStorage.getItem(SOUND_PREF_KEY);
  return pref === null ? true : pref === "true";
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_PREF_KEY, String(enabled));
}

export function toggleSoundEnabled(): boolean {
  const current = isSoundEnabled();
  setSoundEnabled(!current);
  return !current;
}
