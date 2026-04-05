import { Injectable } from '@angular/core';

export interface PianoKey {
  note: string;
  frequency: number;
  isBlack: boolean;
  keyCode?: string;
}

export type Instrument = 'acoustic-piano' | 'electric-piano' | 'marimba' | 'strings' | 'flute' | 'clarinet';

interface HarmonicProfile {
  harmonics: { freq: number; amp: number; waveform: OscillatorType }[];
  duration: number;
  attackTime: number;
  decayTime: number;
  sustainLevel: number;
  noiseAttack: boolean;
  noiseAmount: number;
  filterFreq: number;
  filterQ: number;
}

@Injectable({ providedIn: 'root' })
export class PianoAudioService {
  private audioContext: AudioContext | null = null;
  private currentInstrument: Instrument = 'acoustic-piano';
  private readonly NOTE_FREQUENCIES: Record<string, number> = {
    'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'E2': 82.41, 'F2': 87.31,
    'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'A2': 110.00, 'A#2': 116.54, 'B2': 123.47,
    'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61,
    'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
    'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23,
    'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
    'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46,
    'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
    'C6': 1046.50
  };

  private readonly KEY_MAP: Record<string, string> = {
    'z': 'C3', 's': 'C#3', 'x': 'D3', 'd': 'D#3', 'c': 'E3', 'v': 'F3', 'g': 'F#3',
    'b': 'G3', 'h': 'G#3', 'n': 'A3', 'j': 'A#3', 'm': 'B3', ',': 'C4', 'l': 'C#4',
    '.': 'D4', ';': 'D#4', '/': 'E4',
    'q': 'C4', '2': 'C#4', 'w': 'D4', '3': 'D#4', 'e': 'E4', 'r': 'F4', '5': 'F#4',
    't': 'G4', '6': 'G#4', 'y': 'A4', '7': 'A#4', 'u': 'B4', 'i': 'C5', '9': 'C#5',
    'o': 'D5', '0': 'D#5', 'p': 'E5', '[': 'F5', '=': 'F#5', ']': 'G5'
  };

  private getHarmonicProfile(instrument: Instrument): HarmonicProfile {
    switch (instrument) {
      case 'acoustic-piano':
        return {
          harmonics: [
            { freq: 1, amp: 0.4, waveform: 'triangle' },
            { freq: 2, amp: 0.25, waveform: 'sine' },
            { freq: 3, amp: 0.15, waveform: 'sine' },
            { freq: 4, amp: 0.1, waveform: 'sine' },
            { freq: 5, amp: 0.08, waveform: 'sawtooth' },
            { freq: 6, amp: 0.06, waveform: 'sawtooth' },
            { freq: 7, amp: 0.04, waveform: 'sawtooth' },
            { freq: 8, amp: 0.03, waveform: 'sawtooth' }
          ],
          duration: 2.0,
          attackTime: 0.005,
          decayTime: 0.1,
          sustainLevel: 0.3,
          noiseAttack: true,
          noiseAmount: 0.1,
          filterFreq: 8000,
          filterQ: 1
        };

      case 'electric-piano':
        return {
          harmonics: [
            { freq: 1, amp: 0.5, waveform: 'sine' },
            { freq: 2, amp: 0.3, waveform: 'sine' },
            { freq: 3, amp: 0.2, waveform: 'sine' },
            { freq: 4, amp: 0.15, waveform: 'sine' },
            { freq: 5, amp: 0.1, waveform: 'sine' },
            { freq: 6, amp: 0.08, waveform: 'sine' },
            { freq: 8, amp: 0.05, waveform: 'square' }
          ],
          duration: 1.5,
          attackTime: 0.01,
          decayTime: 0.05,
          sustainLevel: 0.2,
          noiseAttack: false,
          noiseAmount: 0,
          filterFreq: 5000,
          filterQ: 2
        };

      case 'marimba':
        return {
          harmonics: [
            { freq: 1, amp: 0.6, waveform: 'sine' },
            { freq: 2, amp: 0.4, waveform: 'sine' },
            { freq: 3, amp: 0.3, waveform: 'sine' },
            { freq: 4, amp: 0.25, waveform: 'sine' },
            { freq: 5, amp: 0.2, waveform: 'sine' },
            { freq: 6, amp: 0.15, waveform: 'square' }
          ],
          duration: 0.8,
          attackTime: 0.01,
          decayTime: 0.15,
          sustainLevel: 0.1,
          noiseAttack: true,
          noiseAmount: 0.15,
          filterFreq: 9000,
          filterQ: 1.5
        };

      case 'strings':
        return {
          harmonics: [
            { freq: 1, amp: 0.5, waveform: 'sine' },
            { freq: 2, amp: 0.3, waveform: 'sine' },
            { freq: 3, amp: 0.2, waveform: 'sine' },
            { freq: 4, amp: 0.15, waveform: 'sine' },
            { freq: 5, amp: 0.1, waveform: 'sine' },
            { freq: 6, amp: 0.08, waveform: 'sine' }
          ],
          duration: 3.0,
          attackTime: 0.1,
          decayTime: 0.2,
          sustainLevel: 0.4,
          noiseAttack: false,
          noiseAmount: 0,
          filterFreq: 7000,
          filterQ: 1
        };

      case 'flute':
        return {
          harmonics: [
            { freq: 1, amp: 0.6, waveform: 'sine' },
            { freq: 2, amp: 0.2, waveform: 'sine' },
            { freq: 3, amp: 0.15, waveform: 'sine' },
            { freq: 4, amp: 0.1, waveform: 'sine' },
            { freq: 5, amp: 0.08, waveform: 'sine' },
            { freq: 6, amp: 0.05, waveform: 'sine' }
          ],
          duration: 2.0,
          attackTime: 0.05,
          decayTime: 0.1,
          sustainLevel: 0.35,
          noiseAttack: true,
          noiseAmount: 0.05,
          filterFreq: 8500,
          filterQ: 1.2
        };

      case 'clarinet':
        return {
          harmonics: [
            { freq: 1, amp: 0.6, waveform: 'sine' },
            { freq: 3, amp: 0.3, waveform: 'sine' },
            { freq: 5, amp: 0.18, waveform: 'sine' },
            { freq: 7, amp: 0.12, waveform: 'sine' },
            { freq: 9, amp: 0.08, waveform: 'sine' }
          ],
          duration: 2.2,
          attackTime: 0.03,
          decayTime: 0.12,
          sustainLevel: 0.38,
          noiseAttack: true,
          noiseAmount: 0.03,
          filterFreq: 6500,
          filterQ: 1.3
        };

      default:
        return this.getHarmonicProfile('acoustic-piano');
    }
  }

  init(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
  }

  playNote(note: string): void {
    this.init();
    const frequency = this.NOTE_FREQUENCIES[note];
    if (!frequency || !this.audioContext) return;

    const profile = this.getHarmonicProfile(this.currentInstrument);
    const now = this.audioContext!.currentTime;
    const duration = profile.duration;

    // Create oscillators for each harmonic
    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];

    profile.harmonics.forEach(harmonic => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = harmonic.waveform;
      osc.frequency.setValueAtTime(frequency * harmonic.freq, now);

      // Detune slightly for more realistic sound (except for specific instruments)
      if (this.currentInstrument !== 'clarinet' && this.currentInstrument !== 'strings') {
        const detune = (Math.random() - 0.5) * 5; // ±2.5 cents
        osc.detune.setValueAtTime(detune, now);
      }

      oscillators.push(osc);
      gains.push(gain);
      osc.connect(gain);
    });

    // Create noise generator if needed
    let noiseSource: AudioBufferSourceNode | null = null;
    let noiseGain: GainNode | null = null;

    if (profile.noiseAttack) {
      const noiseBuffer = this.audioContext!.createBuffer(1, this.audioContext!.sampleRate * 0.1, this.audioContext!.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseData.length * 0.3));
      }

      noiseSource = this.audioContext!.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseGain = this.audioContext!.createGain();
      noiseSource.connect(noiseGain);
    }

    // Low-pass filter
    const filter = this.audioContext!.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(profile.filterFreq, now);
    filter.Q.setValueAtTime(profile.filterQ, now);

    // Master gain node
    const masterGain = this.audioContext!.createGain();

    // Connect everything
    gains.forEach(gain => gain.connect(masterGain));
    if (noiseGain) {
      noiseGain.connect(masterGain);
    }
    masterGain.connect(filter);
    filter.connect(this.audioContext!.destination);

    // ADSR Envelope for harmonics
    gains.forEach((gain, index) => {
      const harmonic = profile.harmonics[index];
      const attackTime = profile.attackTime + (Math.random() - 0.5) * profile.attackTime * 0.5;
      const decayTime = profile.decayTime + (Math.random() - 0.5) * profile.decayTime * 0.5;
      const sustainLevel = harmonic.amp * profile.sustainLevel;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(harmonic.amp, now + attackTime);
      gain.gain.exponentialRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    });

    // Noise envelope
    if (noiseGain) {
      noiseGain.gain.setValueAtTime(profile.noiseAmount, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    }

    // Start oscillators
    oscillators.forEach(osc => osc.start(now));
    if (noiseSource) {
      noiseSource.start(now);
    }

    // Stop oscillators
    oscillators.forEach(osc => osc.stop(now + duration));
    if (noiseSource) {
      noiseSource.stop(now + duration);
    }
  }

  setInstrument(instrument: Instrument): void {
    this.currentInstrument = instrument;
  }

  getCurrentInstrument(): Instrument {
    return this.currentInstrument;
  }

  getInstruments(): { id: Instrument; label: string }[] {
    return [
      { id: 'acoustic-piano', label: 'Acoustic Piano' },
      { id: 'electric-piano', label: 'Electric Piano' },
      { id: 'marimba', label: 'Marimba' },
      { id: 'strings', label: 'Strings' },
      { id: 'flute', label: 'Flute' },
      { id: 'clarinet', label: 'Clarinet' }
    ];
  }

  hasNote(note: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.NOTE_FREQUENCIES, note);
  }

  getKeyForCode(keyOrCode: string): string | null {
    const key = keyOrCode.toLowerCase()
      .replace(/^key/, '')
      .replace(/^digit/, '')
      .replace(/^numpad/, '');
    return this.KEY_MAP[key] ?? this.KEY_MAP[keyOrCode.toLowerCase()] ?? null;
  }

  getBlackKeyLeft(note: string): number | null {
    const positions: Record<string, number> = {
      'C#2': 1, 'D#2': 2, 'F#2': 4, 'G#2': 5, 'A#2': 6,
      'C#3': 8, 'D#3': 9, 'F#3': 11, 'G#3': 12, 'A#3': 13,
      'C#4': 15, 'D#4': 16, 'F#4': 18, 'G#4': 19, 'A#4': 20,
      'C#5': 22, 'D#5': 23, 'F#5': 25, 'G#5': 26, 'A#5': 27,
      'C#6': 29
    };
    const pos = positions[note];
    return pos != null ? (pos * 36 - 12) : null;
  }

  getKeys(): PianoKey[] {
    const keys: PianoKey[] = [];
    const keyOrder = [
      'C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2',
      'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3',
      'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
      'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5',
      'C6'
    ];

    keyOrder.forEach(note => {
      keys.push({
        note,
        frequency: this.NOTE_FREQUENCIES[note],
        isBlack: note.includes('#')
      });
    });

    return keys;
  }
}
