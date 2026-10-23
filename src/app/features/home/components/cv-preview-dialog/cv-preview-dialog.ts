import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, Pencil, PenTool } from 'lucide-angular';
import { Dialog } from '../../../../shared/ui/dialog/dialog';
import { CvDraft } from '../../../cv/services/cv-draft';
import { SavedCv } from '../../../cv/services/saved-cvs';
import { Preview } from '../../../preview/components/preview/preview';

@Component({
  selector: 'app-cv-preview-dialog',
  imports: [Dialog, Preview, RouterLink, LucideAngularModule],
  providers: [CvDraft],
  templateUrl: './cv-preview-dialog.html',
  styleUrl: './cv-preview-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CvPreviewDialog {
  readonly cv = input.required<SavedCv>();
  readonly dismissed = output<void>();
  protected readonly EditIcon = Pencil;
  protected readonly ConstructorIcon = PenTool;
  private readonly draft = inject(CvDraft);
  private readonly editorDraft = inject(CvDraft, { skipSelf: true });

  constructor() {
    effect(() => this.draft.save(this.cv().info));
  }

  protected editCv(): void {
    this.editorDraft.reset();
  }
}
