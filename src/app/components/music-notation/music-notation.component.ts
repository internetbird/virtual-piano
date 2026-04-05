import { Component, OnInit, OnDestroy, Input, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { MusicNotationService, NotationNote } from '../../services/music-notation.service';
import { MidiPlayerService } from '../../services/midi-player.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'vp-music-notation',
  standalone: true,
  templateUrl: './music-notation.component.html',
  styleUrl: './music-notation.component.scss'
})
export class MusicNotationComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() isPlaying = false;
  
  noteStack: NotationNote[] = [];
  private currentNoteIndex = -1;
  private notePlayingSubscription: Subscription | null = null;
  private playbackCompleteSubscription: Subscription | null = null;
  private currentNoteIndexSubscription: Subscription | null = null;
  private vexflowReady = false;

  constructor(
    private notationService: MusicNotationService,
    private midiPlayer: MidiPlayerService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.notationService.noteStack$.subscribe(notes => {
      this.noteStack = notes;
      this.cdr.markForCheck();
      // Render the staff once we have notes and VexFlow is ready
      if (this.vexflowReady) {
        setTimeout(() => this.renderNotation(), 100);
      }
    });

    // Subscribe to current note index changes and re-render with highlight
    this.currentNoteIndexSubscription = this.notationService.currentNoteIndex$.subscribe(index => {
      this.currentNoteIndex = index;
      if (this.vexflowReady && this.noteStack.length > 0) {
        this.renderNotation();
      }
    });

    this.notePlayingSubscription = this.midiPlayer.notePlayingChanged.subscribe(event => {
      if (event.isPlaying) {
        // The MidiPlayerService now directly sets the note index in the notation service
        // so we don't need to do it here anymore
      }
    });

    this.playbackCompleteSubscription = this.midiPlayer.playbackComplete.subscribe(() => {
      this.isPlaying = false;
      this.renderNotation();
      this.cdr.markForCheck();
    });
  }

  ngAfterViewInit(): void {
    // Check if Vex is available from CDN
    let attempts = 0;
    const maxAttempts = 50; // Wait up to 5 seconds
    
    const checkVexFlow = () => {
      attempts++;
      const Vex = (window as any).Vex;
      
      console.log(`VexFlow check attempt ${attempts}/${maxAttempts}, Vex status:`, !!Vex);
      
      if (Vex && Vex.Flow) {
        console.log('✓ VexFlow is ready');
        this.vexflowReady = true;
        
        // Render a test staff to verify VexFlow works
        this.renderTestStaff();
        
        if (this.noteStack.length > 0) {
          console.log('Rendering notation with notes:', this.noteStack.length);
          this.renderNotation();
        }
      } else if (attempts < maxAttempts) {
        if (attempts % 10 === 0) {
          console.log(`Waiting for VexFlow... attempt ${attempts}/${maxAttempts}`);
        }
        // Wait a bit more for the script to load
        setTimeout(checkVexFlow, 100);
      } else {
        console.error('✗ VexFlow failed to load after', maxAttempts * 100, 'ms');
        console.error('Vex object:', (window as any).Vex);
        // Draw error message on canvas
        const canvas = document.getElementById('notation-canvas') as HTMLCanvasElement;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ff0000';
            ctx.font = '14px Arial';
            ctx.fillText('VexFlow library failed to load', 20, 100);
          }
        }
      }
    };
    
    // Start checking immediately and at regular intervals
    checkVexFlow();
  }

  private renderTestStaff(): void {
    const canvas = document.getElementById('notation-canvas') as HTMLCanvasElement;
    if (!canvas) {
      console.warn('Canvas not found');
      return;
    }

    try {
      const Vex = (window as any).Vex;
      console.log('Vex object:', Vex);
      
      if (!Vex) {
        console.error('Vex is not available');
        return;
      }

      console.log('Vex.Flow:', Vex.Flow);
      const VF = Vex.Flow;
      
      if (!VF) {
        console.error('Vex.Flow is not available');
        return;
      }

      console.log('Creating renderer...');
      const renderer = new VF.Renderer(canvas, VF.Renderer.Backends.CANVAS);
      console.log('Renderer created:', renderer);
      
      renderer.resize(canvas.width, canvas.height);
      const context = renderer.getContext();
      console.log('Context created:', context);

      // Draw stave
      console.log('Creating stave...');
      const stave = new VF.Stave(10, 40, 900);
      stave.addClef('treble')
        .addKeySignature('C')
        .addTimeSignature('4/4');
      stave.setContext(context).draw();
      console.log('Stave drawn');

      // Draw a test note
      console.log('Creating test notes...');
      const testNotes = [
        { keys: ['c/4'], duration: 'q' },
        { keys: ['d/4'], duration: 'q' },
        { keys: ['e/4'], duration: 'q' },
        { keys: ['f/4'], duration: 'q' }
      ];

      console.log('Test note data:', testNotes);

      const notes = testNotes.map((noteData, idx) => {
        try {
          console.log(`Creating note ${idx}:`, noteData);
          const note = new VF.StaveNote(noteData);
          console.log(`Note ${idx} created successfully:`, note);
          return note;
        } catch (e) {
          console.error(`Error creating note ${idx}:`, noteData, e);
          throw e;
        }
      });

      console.log('All notes created, creating voice...');
      const voice = new VF.Voice({ num_beats: 4, beat_value: 4 });
      voice.addTickables(notes);

      console.log('Creating formatter...');
      const formatter = new VF.Formatter();
      formatter.joinVoices([voice]).format([voice], 880);

      console.log('Drawing notes...');
      notes.forEach((note, idx) => {
        console.log(`Drawing note ${idx}`);
        note.setContext(context).draw();
      });

      console.log('✓ Test staff rendered successfully');
    } catch (error) {
      console.error('✗ Error rendering test staff:', error);
      console.error('Error message:', (error as Error).message);
      console.error('Stack:', (error as Error).stack);
    }
  }

  ngOnDestroy(): void {
    this.notePlayingSubscription?.unsubscribe();
    this.playbackCompleteSubscription?.unsubscribe();
    this.currentNoteIndexSubscription?.unsubscribe();
    this.notationService.clearTimeouts();
  }

  private renderNotation(): void {
    if (this.noteStack.length === 0 || !this.vexflowReady) return;
    
    try {
      // Pass the current note index to highlight it
      this.notationService.renderStaff('notation-canvas', this.noteStack, this.currentNoteIndex);
    } catch (error) {
      console.error('Error rendering notation:', error);
    }
  }
}
