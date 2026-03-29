import { Injectable } from '@angular/core';
import { Midi } from '@tonejs/midi';
import { Subject } from 'rxjs';
import { PianoAudioService } from './piano-audio.service';

interface ScheduledNote {
  timeoutId: number;
}

@Injectable({ providedIn: 'root' })
export class MidiPlayerService {
  private isPlaying = false;
  private scheduled: ScheduledNote[] = [];
  notePlayingChanged = new Subject<{ note: string; isPlaying: boolean }>();
  playbackComplete = new Subject<void>();

  constructor(private piano: PianoAudioService) {}

  async playFile(file: File): Promise<void> {
    this.stop();
    const arrayBuffer = await file.arrayBuffer();
    const midi = new Midi(arrayBuffer as ArrayBuffer);

    this.isPlaying = true;
    const notes = midi.tracks.flatMap((t) => t.notes);

    if (notes.length === 0) {
      return;
    }

    let maxEndTime = 0;

    for (const note of notes) {
      const noteName = this.normalizeNoteName(note.name);
      if (!noteName) {
        continue;
      }

      const delayMs = note.time * 1000;
      const durationMs = Math.max(note.duration * 1000, 100); // Use actual note duration, minimum 100ms
      const endTime = delayMs + durationMs;
      maxEndTime = Math.max(maxEndTime, endTime);

      const timeoutId = window.setTimeout(() => {
        if (!this.isPlaying) {
          return;
        }
        this.piano.playNote(noteName);
        // Emit that note is now playing
        this.notePlayingChanged.next({ note: noteName, isPlaying: true });

        // Stop highlighting after the note's actual duration
        const offTimeoutId = window.setTimeout(() => {
          this.notePlayingChanged.next({ note: noteName, isPlaying: false });
        }, durationMs);

        this.scheduled.push({ timeoutId: offTimeoutId });
      }, delayMs);

      this.scheduled.push({ timeoutId });
    }

    // Emit playback complete after all notes have finished
    const completeTimeoutId = window.setTimeout(() => {
      if (this.isPlaying) {
        this.playbackComplete.next();
      }
    }, maxEndTime);

    this.scheduled.push({ timeoutId: completeTimeoutId });
  }

  stop(): void {
    this.isPlaying = false;
    this.scheduled.forEach((s) => clearTimeout(s.timeoutId));
    this.scheduled = [];
  }

  private normalizeNoteName(name: string): string | null {
    // Convert flats to sharps where needed and ensure within piano range
    const match = name.match(/^([A-G])([b#]?)(\d)$/);
    if (!match) {
      return null;
    }
    let [, letter, accidental, octave] = match;
    const base = `${letter}${accidental}`;

    const flatToSharp: Record<string, string> = {
      Db: 'C#',
      Eb: 'D#',
      Gb: 'F#',
      Ab: 'G#',
      Bb: 'A#',
    };

    if (accidental === 'b' && flatToSharp[base]) {
      const sharp = flatToSharp[base];
      letter = sharp[0];
      accidental = '#';
    }

    const normalized = `${letter}${accidental}${octave}`;
    // Only play notes which exist on our piano
    return this.piano.hasNote(normalized) ? normalized : null;
  }
}

