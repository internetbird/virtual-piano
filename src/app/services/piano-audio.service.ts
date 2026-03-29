import { Injectable } from '@angular/core';

export interface PianoKey {
  note: string;
  frequency: number;
  isBlack: boolean;
  keyCode?: string;
}

@Injectable({ providedIn: 'root' })
export class PianoAudioService {
  private audioContext: AudioContext | null = null;
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

  init(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
  }

  playNote(note: string): void {
    this.init();
    const frequency = this.NOTE_FREQUENCIES[note];
    if (!frequency || !this.audioContext) return;

    const now = this.audioContext.currentTime;

    // Create oscillators for richer piano-like sound
    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(frequency, now);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(frequency * 2, now);

    // Envelope: quick attack, decay, sustain
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);
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
