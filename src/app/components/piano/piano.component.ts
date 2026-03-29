import { Component, HostListener, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { PianoAudioService, PianoKey } from '../../services/piano-audio.service';
import { MidiPlayerService } from '../../services/midi-player.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'vp-piano',
  standalone: true,
  templateUrl: './piano.component.html',
  styleUrl: './piano.component.scss'
})
export class PianoComponent implements OnInit, OnDestroy {
  keys: PianoKey[] = [];
  activeKeys = new Set<string>();
  selectedFileName: string | null = null;
  isPlaying = false;
  private selectedFile: File | null = null;
  private noteSubscription: Subscription | null = null;
  private playbackCompleteSubscription: Subscription | null = null;

  constructor(
    public pianoAudio: PianoAudioService,
    private midiPlayer: MidiPlayerService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.keys = this.pianoAudio.getKeys();
    this.noteSubscription = this.midiPlayer.notePlayingChanged.subscribe(
      (event) => {
        if (event.isPlaying) {
          this.activeKeys.add(event.note);
        } else {
          this.activeKeys.delete(event.note);
        }
        this.cdr.markForCheck();
      }
    );

    this.playbackCompleteSubscription = this.midiPlayer.playbackComplete.subscribe(() => {
      this.isPlaying = false;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.noteSubscription?.unsubscribe();
    this.playbackCompleteSubscription?.unsubscribe();
  }

  onKeyDown(key: PianoKey, event?: MouseEvent | TouchEvent): void {
    if (event) {
      event.preventDefault();
    }
    if (!this.activeKeys.has(key.note)) {
      this.activeKeys.add(key.note);
      this.pianoAudio.playNote(key.note);
      this.cdr.markForCheck();
    }
  }

  onKeyUp(key: PianoKey, event?: MouseEvent | TouchEvent): void {
    if (event) {
      event.preventDefault();
    }
    if (this.activeKeys.has(key.note)) {
      this.activeKeys.delete(key.note);
      this.cdr.markForCheck();
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyboardDown(event: KeyboardEvent): void {
    const note = this.pianoAudio.getKeyForCode(event.key) ?? this.pianoAudio.getKeyForCode(event.code);
    if (note && !event.repeat) {
      this.onKeyDown({ note, frequency: 0, isBlack: note.includes('#') });
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyboardUp(event: KeyboardEvent): void {
    const note = this.pianoAudio.getKeyForCode(event.key) ?? this.pianoAudio.getKeyForCode(event.code);
    if (note) {
      this.onKeyUp({ note, frequency: 0, isBlack: note.includes('#') });
    }
  }

  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  onGlobalPointerUp(): void {
    this.activeKeys.clear();
    this.cdr.markForCheck();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.selectedFile = file;
    this.selectedFileName = file.name;
    this.isPlaying = true;
    await this.midiPlayer.playFile(file);
  }

  async playMidi(): Promise<void> {
    if (!this.selectedFile) {
      return;
    }
    this.isPlaying = true;
    this.activeKeys.clear();
    await this.midiPlayer.playFile(this.selectedFile);
  }

  stopMidi(): void {
    this.isPlaying = false;
    this.activeKeys.clear();
    this.cdr.markForCheck();
    this.midiPlayer.stop();
  }
}
