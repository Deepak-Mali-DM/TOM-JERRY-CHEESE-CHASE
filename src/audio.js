/**
 * Web Audio API Sound Synthesizer.
 * Provides rich, dynamic retro-arcade sound effects without external audio files.
 */

export class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playMove() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      // Soft playful mouse scurry pitter-patter
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const f = 240 + Math.random() * 80;
      osc.frequency.setValueAtTime(f, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.035);

      gain.gain.setValueAtTime(0.025, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.035);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.035);
    } catch (e) {}
  }

  playKeyPickup() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      // Cartoon cheese chomp / bite sound followed by happy ascending chime
      const t = this.ctx.currentTime;
      // 1. Chomp crackle
      const chompOsc = this.ctx.createOscillator();
      const chompGain = this.ctx.createGain();
      chompOsc.type = 'triangle';
      chompOsc.frequency.setValueAtTime(320, t);
      chompOsc.frequency.exponentialRampToValueAtTime(120, t + 0.06);

      chompGain.gain.setValueAtTime(0.2, t);
      chompGain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
      chompOsc.connect(chompGain);
      chompGain.connect(this.ctx.destination);
      chompOsc.start(t);
      chompOsc.stop(t + 0.06);

      // 2. Sweet happy chime (E5, G5, B5, E6)
      const chimes = [659.25, 783.99, 987.77, 1318.51];
      chimes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const noteStart = t + 0.04 + idx * 0.05;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.12, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(noteStart);
        osc.stop(noteStart + 0.18);
      });
    } catch (e) {}
  }

  playUnlockExit() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      // Welcoming magical chime for mouse hole opening
      const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C major 9
      chord.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = this.ctx.currentTime + i * 0.07;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.6);
      });
    } catch (e) {}
  }

  playHit() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      // Slapstick cartoon smack + spring boing
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.25);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    } catch (e) {}
  }

  playAlert() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      osc.frequency.setValueAtTime(1320, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
    } catch (e) {}
  }

  playWarningTick() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(950, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.07, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {}
  }

  playVictory() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      // Upbeat victory fanfare
      const melody = [
        { f: 523.25, d: 0.12 }, // C5
        { f: 659.25, d: 0.12 }, // E5
        { f: 783.99, d: 0.12 }, // G5
        { f: 1046.5, d: 0.35 }  // C6
      ];
      let t = this.ctx.currentTime;
      melody.forEach(note => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(note.f, t);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + note.d);
        t += note.d * 0.9;
      });
    } catch (e) {}
  }

  playGameOver() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      // Classic cartoon "womp-womp-womp-wommmmmp" descending slide
      const notes = [392, 369.99, 349.23, 293.66]; // G4 -> F#4 -> F4 -> D4
      let t = this.ctx.currentTime;
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);
        // Add cartoon vibrato pitch waver on the last note
        if (i === notes.length - 1) {
          osc.frequency.linearRampToValueAtTime(freq - 30, t + 0.7);
        }

        const dur = i === notes.length - 1 ? 0.75 : 0.22;
        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + dur);
        t += 0.25;
      });
    } catch (e) {}
  }

  playEMP() {
    this.playStunTrap();
  }

  playStunTrap() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      // 1. High comical cartoon spring BOING!
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.15);
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.35);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);

      // 2. Comical dizzy stars twinkle (spinning around Tom's head)
      [0.08, 0.16, 0.24, 0.32, 0.40].forEach((offset, idx) => {
        const sOsc = this.ctx.createOscillator();
        const sGain = this.ctx.createGain();
        const start = t + offset;
        sOsc.type = 'triangle';
        sOsc.frequency.setValueAtTime(1200 + (idx % 2) * 400, start);

        sGain.gain.setValueAtTime(0.08, start);
        sGain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);

        sOsc.connect(sGain);
        sGain.connect(this.ctx.destination);
        sOsc.start(start);
        sOsc.stop(start + 0.1);
      });
    } catch (e) {}
  }

  playHeartbeat() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      // Double lub-dub heartbeat thump
      [0, 0.12].forEach((offset, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const start = this.ctx.currentTime + offset;
        const freq = idx === 0 ? 80 : 65;

        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.exponentialRampToValueAtTime(35, start + 0.1);

        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.1);
      });
    } catch (e) {}
  }

  playButtonClick() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(700, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(250, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {}
  }
}

export const sound = new SoundFX();
