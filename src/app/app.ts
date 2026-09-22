import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Download, LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LucideAngularModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('cv-builder');
  readonly DownloadIcon = Download;
}
