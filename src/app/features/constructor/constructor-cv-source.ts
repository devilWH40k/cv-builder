import { inject, Injectable } from '@angular/core';
import { ConstructorSource, ConstructorSourceDocument } from 'constructor/core';
import { CvDraft } from '../cv/services/cv-draft';
import { SavedCvs } from '../cv/services/saved-cvs';

@Injectable()
export class ConstructorCvSource implements ConstructorSource {
  private readonly draft = inject(CvDraft);
  private readonly sourceDraft = inject(CvDraft, { skipSelf: true });
  private readonly savedCvs = inject(SavedCvs);

  async load(id: string | null): Promise<ConstructorSourceDocument | null> {
    const info = id ? await this.savedCvs.load(id) : this.sourceDraft.current();
    if (!info) return null;
    return {
      title: info.name ? `${info.name}_design` : 'CV_design',
      sourceCvId: id ?? this.sourceDraft.savedId(),
      render: () => this.draft.save(info),
    };
  }

  reset(): void {
    this.draft.reset();
  }
}
