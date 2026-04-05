import { Injectable } from '@angular/core';
import { Midi } from '@tonejs/midi';
import { Subject } from 'rxjs';
import { PianoAudioService } from './piano-audio.service';
import { MusicNotationService } from './music-notation.service';

interface ScheduledNote {
  timeoutId: number;
}

@Injectable({ providedIn: 'root' })
export class MidiPlayerService {
  private isPlaying = false;
  private scheduled: ScheduledNote[] = [];
  notePlayingChanged = new Subject<{ note: string; isPlaying: boolean }>();
  playbackComplete = new Subject<void>();
  notesLoaded = new Subject<Array<{ name: string; duration: number }>>();

  constructor(
    private piano: PianoAudioService,
    private notation: MusicNotationService
  ) {}

  async playFile(file: File): Promise<void> {
    this.stop();
    const arrayBuffer = await file.arrayBuffer();
    const midi = new Midi(arrayBuffer as ArrayBuffer);

    this.isPlaying = true;
    const notes = midi.tracks.flatMap((t) => t.notes);

    if (notes.length === 0) {
      return;
    }

    // Extract valid notes for notation
    const validNotes = notes
      .map(note => ({
        name: this.normalizeNoteName(note.name) || note.name,
        duration: note.duration,
        originalNote: note
      }))
      .filter(n => this.piano.hasNote(n.name));

    // Convert and set notation
    const notationNotes = this.notation.convertMidiNotesToNotation(
      validNotes.map(n => ({ name: n.name, duration: n.duration }))
    );
    this.notation.setNoteStack(notationNotes);
    this.notesLoaded.next(validNotes.map(n => ({ name: n.name, duration: n.duration })));

    // Create a mapping of time to notation index for highlighting
    const timeToNotationIndexMap = new Map<number, number>();
    let notationIndex = 0;
    for (let i = 0; i < notes.length; i++) {
      if (this.normalizeNoteName(notes[i].name)) {
        timeToNotationIndexMap.set(notes[i].time * 1000, notationIndex);
        notationIndex++;
      }
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

        // Update notation highlight
        const highlightIndex = timeToNotationIndexMap.get(delayMs);
        if (highlightIndex !== undefined) {
          this.notation.setCurrentNoteIndex(highlightIndex);
        }

        // Stop highlighting after the note's actual duration
        const offTimeoutId = window.setTimeout(() => {
          this.notePlayingChanged.next({ note: noteName, isPlaying: false });
          this.notation.setCurrentNoteIndex(-1); // Clear highlight
        }, durationMs);

        this.scheduled.push({ timeoutId: offTimeoutId });
      }, delayMs);

      this.scheduled.push({ timeoutId });
    }

    // Emit playback complete after all notes have finished
    const completeTimeoutId = window.setTimeout(() => {
      if (this.isPlaying) {
        this.playbackComplete.next();
        this.notation.setCurrentNoteIndex(-1); // Clear highlight
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

