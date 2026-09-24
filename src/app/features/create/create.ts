import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { Input } from '../../shared/ui/input/input';
import { Textarea } from '../../shared/ui/textarea/textarea';
import { FileUpload } from '../../shared/ui/file-upload/file-upload';
import { Button } from '../../shared/ui/button/button';
import { createCvForm, createExperienceForm, createLanguageForm } from './cv-form';
import { ExperienceEntry } from './experience-entry/experience-entry';
import { CvDraft } from '../cv/cv-draft';
import { LANGUAGES, LANGUAGE_LEVELS } from '../cv/languages';
import { Select } from '../../shared/ui/select/select';
import { LucideAngularModule, Plus, X } from 'lucide-angular';
import { MultiSelect } from '../../shared/ui/multi-select/multi-select';
import { TECHNOLOGY_GROUPS } from '../cv/technologies';

@Component({
  selector: 'app-create',
  imports: [RouterLink, ReactiveFormsModule, Input, Textarea, FileUpload, Button, Select, MultiSelect, LucideAngularModule, ExperienceEntry],
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

  constructor() {
    const info = this.draft.current();
    if (info) {
      for (const language of info.languages) {
        this.form.controls.languages.push(createLanguageForm(language));
      }
      for (const experience of info.experiences) {
        this.form.controls.experiences.push(createExperienceForm(experience));
      }
      this.form.setValue({ ...info, languages: [...info.languages], experiences: [...info.experiences] });
    }
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
