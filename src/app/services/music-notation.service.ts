import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

declare const Vex: any;

export interface NotationNote {
  keys: string[];
  duration: string;
  displayNote?: string;
}

@Injectable({ providedIn: 'root' })
export class MusicNotationService {
  private noteStackSubject = new BehaviorSubject<NotationNote[]>([]);
  public noteStack$ = this.noteStackSubject.asObservable();

  private currentPlayingNoteSubject = new BehaviorSubject<string | null>(null);
  public currentPlayingNote$ = this.currentPlayingNoteSubject.asObservable();

  private currentNoteIndexSubject = new BehaviorSubject<number>(-1);
  public currentNoteIndex$ = this.currentNoteIndexSubject.asObservable();

  private noteTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  setNoteStack(notes: NotationNote[]): void {
    this.noteStackSubject.next(notes);
  }

  setCurrentPlayingNote(note: string | null): void {
    this.currentPlayingNoteSubject.next(note);
  }

  getCurrentPlayingNote(): string | null {
    return this.currentPlayingNoteSubject.value;
  }

  setCurrentNoteIndex(index: number): void {
    this.currentNoteIndexSubject.next(index);
  }

  getCurrentNoteIndex(): number {
    return this.currentNoteIndexSubject.value;
  }

  clearTimeouts(): void {
    this.noteTimeouts.forEach(timeout => clearTimeout(timeout));
    this.noteTimeouts.clear();
  }

  // Convert piano note (e.g., "C4") to VexFlow format (e.g., "c/4")
  static convertToVexFlowNote(note: string): string {
    if (!note || note.length < 2) return '';
    
    // Extract note letter and accidental
    const noteLetter = note[0].toLowerCase();
    let accidental = '';
    let octave = '';

    if (note.length === 2) {
      // Simple case: C4, D4, etc.
      octave = note[1];
    } else if (note.length === 3) {
      // Accidental case: C#4, Db4, etc.
      accidental = note[1] === '#' ? '#' : 'b';
      octave = note[2];
    }

    return `${noteLetter}${accidental}/${octave}`;
  }

  renderStaff(canvasId: string, notes: NotationNote[], highlightIndex: number = -1): void {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      console.warn('Canvas not found:', canvasId);
      return;
    }

    const Vex = (window as any).Vex;
    if (!Vex) {
      console.warn('Vex not loaded yet');
      return;
    }

    try {
      // Clear canvas
      const context = canvas.getContext('2d');
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }

      const VF = Vex.Flow;
      const renderer = new VF.Renderer(canvas, VF.Renderer.Backends.CANVAS);
      renderer.resize(canvas.width, canvas.height);
      const vexContext = renderer.getContext();

      // Create stave
      const stave = new VF.Stave(10, 40, 900);
      stave.addClef('treble')
        .addKeySignature('C')
        .addTimeSignature('4/4');
      stave.setContext(vexContext).draw();

      if (notes.length === 0) {
        console.log('No notes to render');
        return;
      }

      // Create notes - limit to first 8 for display
      const vexflowNotes = [];
      for (let i = 0; i < Math.min(notes.length, 8); i++) {
        const note = notes[i];
        try {
          const vexNote = new VF.StaveNote({
            keys: note.keys,
            duration: note.duration
          });
          // IMPORTANT: Set the stave for the note
          vexNote.setStave(stave);
          vexflowNotes.push(vexNote);
        } catch (e) {
          console.error(`Error creating VexFlow note ${i}:`, note, e);
        }
      }

      if (vexflowNotes.length === 0) {
        console.log('No valid VexFlow notes created');
        return;
      }

      // Try to use voice and formatter
      try {
        const voice = new VF.Voice({ num_beats: 4, beat_value: 4 });
        voice.addTickables(vexflowNotes);

        const formatter = new VF.Formatter();
        formatter.joinVoices([voice]).format([voice], 880);
      } catch (e) {
        console.warn('Warning with voice/formatter:', e);
        // Continue anyway - try drawing without formatter
      }

      // Draw notes with highlighting for current note
      vexflowNotes.forEach((note, idx) => {
        try {
          // Highlight the current playing note
          if (idx === highlightIndex) {
            // Draw a colored circle/box around the note
            vexContext.save();
            vexContext.strokeStyle = '#FF6B6B'; // Red highlight
            vexContext.fillStyle = 'rgba(255, 107, 107, 0.2)';
            vexContext.lineWidth = 2;
            
            // Get note bounds and draw highlight
            const bounds = note.getBoundingBox();
            vexContext.fillRect(bounds.x - 5, bounds.y - 8, bounds.w + 10, bounds.h + 16);
            vexContext.strokeRect(bounds.x - 5, bounds.y - 8, bounds.w + 10, bounds.h + 16);
            vexContext.restore();
          }
          
          note.setContext(vexContext).draw();
        } catch (e) {
          console.error(`Error drawing note ${idx}:`, e);
        }
      });
      
      console.log('✓ Staff rendered successfully');
    } catch (error) {
      console.error('Error rendering staff:', error);
      console.error('Error details:', (error as Error).message);
    }
  }

  highlightNote(canvasId: string, noteIndex: number): void {
    // For now, just redraw - highlighting in VexFlow requires more complex setup
    this.renderStaff(canvasId, this.noteStackSubject.value);
  }

  // Convert MIDI notes to notation format  
  convertMidiNotesToNotation(midiNotes: Array<{ name: string; duration: number }>): NotationNote[] {
    return midiNotes.map(note => ({
      keys: [MusicNotationService.convertToVexFlowNote(note.name)],
      duration: this.getDurationString(note.duration || 0.5),
      displayNote: note.name
    }));
  }

  private getDurationString(duration: number): string {
    // Convert seconds to VexFlow duration string
    // Common durations: whole (1), half (2), quarter (4), eighth (8), sixteenth (16)
    if (duration >= 2) return 'w';      // Whole note
    if (duration >= 1) return 'h';      // Half note
    if (duration >= 0.5) return 'q';    // Quarter note
    if (duration >= 0.25) return '8';   // Eighth note
    if (duration >= 0.125) return '16'; // Sixteenth note
    return '32';                         // Thirty-second note
  }
}
