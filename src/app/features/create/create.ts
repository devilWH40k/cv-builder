import { SaveCvButton } from '../cv/save-cv-button';
import { SavedCvs } from '../cv/saved-cvs';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, PendingTasks, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { Input } from '../../shared/ui/input/input';
import { Textarea } from '../../shared/ui/textarea/textarea';
import { FileUpload } from '../../shared/ui/file-upload/file-upload';
import { Button } from '../../shared/ui/button/button';
import { createCvForm, createExperienceForm, createLanguageForm } from './cv-form';
import { ExperienceEntry } from './experience-entry/experience-entry';
import { CvDraft, CvInfo } from '../cv/cv-draft';
import { LANGUAGES, LANGUAGE_LEVELS } from '../cv/languages';
import { Select } from '../../shared/ui/select/select';
import { LucideAngularModule, Plus, X } from 'lucide-angular';
import { MultiSelect } from '../../shared/ui/multi-select/multi-select';
import { TECHNOLOGY_GROUPS } from '../cv/technologies';

@Component({
  selector: 'app-create',
  imports: [SaveCvButton, RouterLink, ReactiveFormsModule, Input, Textarea, FileUpload, Button, Select, MultiSelect, LucideAngularModule, ExperienceEntry],
  templateUrl: './create.html',
  styleUrl: './create.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Create {
  private readonly draft = inject(CvDraft);
  private readonly router = inject(Router);
  readonly form = createCvForm();
  protected readonly languageOptions = LANGUAGES;
  protected readonly levelOptions = LANGUAGE_LEVELS;
  protected readonly PlusIcon = Plus;
  protected readonly XIcon = X;
  protected readonly technologyGroups = TECHNOLOGY_GROUPS;
  private readonly selectedTechnologies = toSignal(
    this.form.controls.technologies.valueChanges.pipe(
      startWith(this.form.controls.technologies.value)
    ), { requireSync: true }
  );
  protected readonly selectedTechnologyGroups = computed(() => {
    const selected = this.selectedTechnologies();
    return TECHNOLOGY_GROUPS.map((group) => ({
      label: group.label,
      options: group.options.filter((option) => selected.includes(option))
    })).filter((group) => group.options.length > 0);
  });

  private readonly saved = inject(SavedCvs);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly loading = signal(false);
  protected readonly loadError = signal('');
  protected readonly snapshot = () => this.form.getRawValue();

  constructor() {
    const id = inject(ActivatedRoute).snapshot.queryParamMap.get('id');
    if (id && id !== this.draft.savedId()) {
      this.draft.reset();
      this.loading.set(true);
      inject(PendingTasks).run(() => this.loadSaved(id));
    } else {
      this.populate(this.draft.current());
    }
  }

  private async loadSaved(id: string): Promise<void> {
    try {
      const info = await this.saved.load(id);
      if (this.destroyRef.destroyed) return;
      if (info) {
        this.draft.save(info);
        this.draft.savedId.set(id);
        this.populate(info);
      } else {
        this.loadError.set('This saved CV could not be found.');
      }
    } catch {
      if (!this.destroyRef.destroyed) {
        this.loadError.set('This saved CV could not be opened. Browser storage may be unavailable.');
      }
    } finally {
      if (!this.destroyRef.destroyed) this.loading.set(false);
    }
  }

  private populate(info: CvInfo | null): void {
    if (!info) return;
    for (const language of info.languages) {
      this.form.controls.languages.push(createLanguageForm(language));
    }
    for (const experience of info.experiences) {
      this.form.controls.experiences.push(createExperienceForm(experience));
    }
    this.form.setValue({ ...info, languages: [...info.languages], experiences: [...info.experiences] });
  }

  protected addExperience(): void {
    this.form.controls.experiences.push(createExperienceForm());
  }

  protected removeExperience(index: number): void {
    this.form.controls.experiences.removeAt(index);
    this.form.markAsDirty();
  }

  protected addLanguage(): void {
    this.form.controls.languages.push(createLanguageForm());
  }

  protected removeLanguage(index: number): void {
    this.form.controls.languages.removeAt(index);
  }

  protected removeTechnology(technology: string): void {
    const control = this.form.controls.technologies;
    control.setValue(control.value.filter((item) => item !== technology));
    control.markAsDirty();
    control.markAsTouched();
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    this.draft.save(this.form.getRawValue());
    void this.router.navigate(['/preview']);
  }
}
