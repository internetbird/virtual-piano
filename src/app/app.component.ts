import { Component } from '@angular/core';
import { PianoComponent } from './components/piano/piano.component';

@Component({
  selector: 'vp-root',
  imports: [PianoComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {}
