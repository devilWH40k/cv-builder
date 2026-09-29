import { SaveCvButton } from '../cv/save-cv-button';
import { SavedCvs } from '../cv/saved-cvs';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, Injector, PendingTasks, signal, viewChild, viewChildren } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { Input } from '../../shared/ui/input/input';
import { Textarea } from '../../shared/ui/textarea/textarea';
import { FileUpload } from '../../shared/ui/file-upload/file-upload';
import { Button } from '../../shared/ui/button/button';
import { createCvForm, createExperienceForm, createLanguageForm } from './cv-form';
import { ExperienceEntry } from './experience-entry/experience-entry';
import { CvDraft, CvInfo, DEFAULT_CV_STRUCTURE } from '../cv/cv-draft';
import { Preview } from '../preview/preview';
import { StructureOptions } from '../preview/structure-options/structure-options';
import { ExpandPanel } from '../../shared/ui/expand-panel/expand-panel';
import { Tabs } from '../../shared/ui/tabs/tabs';
import { LANGUAGES, LANGUAGE_LEVELS } from '../cv/languages';
import { Select } from '../../shared/ui/select/select';
import { Download, Eye, Pencil, LucideAngularModule, X } from 'lucide-angular';
import { MultiSelect } from '../../shared/ui/multi-select/multi-select';
import { TECHNOLOGY_GROUPS } from '../cv/technologies';

@Component({
  selector: 'app-create',
  imports: [ExpandPanel, Tabs, Preview, StructureOptions, SaveCvButton, RouterLink, ReactiveFormsModule, Input, Textarea, FileUpload, Button, Select, MultiSelect, LucideAngularModule, ExperienceEntry],
  templateUrl: './create.html',
  styleUrl: './create.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Create {
  protected readonly draft = inject(CvDraft);
  protected readonly activeTab = signal('info');
  protected readonly mobilePreview = signal(false);
  protected readonly tabs = [
    { id: 'info', label: 'CV info', panelId: 'info-panel' },
    { id: 'structure', label: 'Structure', panelId: 'structure-panel' }
  ];
  protected readonly structure = computed(() => ({ ...DEFAULT_CV_STRUCTURE, ...this.draft.current()?.structure }));
  protected readonly DownloadIcon = Download;
  protected readonly EyeIcon = Eye;
  protected readonly PencilIcon = Pencil;
  readonly form = createCvForm();
  private readonly injector = inject(Injector);
  private readonly formElement = viewChild<ElementRef<HTMLFormElement>>('cvForm');
  private readonly panels = viewChildren(ExpandPanel);
  protected readonly languageOptions = LANGUAGES;
  protected readonly levelOptions = LANGUAGE_LEVELS;
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
  protected readonly snapshot = (): CvInfo => {
    const structure = this.draft.current()?.structure;
    return { ...this.form.getRawValue(), ...(structure ? { structure } : {}) };
  };

  constructor() {
    const id = inject(ActivatedRoute).snapshot.queryParamMap.get('id');
    if (id && id !== this.draft.savedId()) {
      this.draft.reset();
      this.loading.set(true);
      inject(PendingTasks).run(() => this.loadSaved(id));
    } else {
      this.populate(this.draft.current());
      this.draft.save(this.snapshot());
    }
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.draft.save(this.snapshot());
    });
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
    const { structure, ...fields } = info;
    this.form.setValue({ ...fields, languages: [...info.languages], experiences: [...info.experiences] });
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

    if (!this.form.valid) {
      this.activeTab.set('info');
      this.mobilePreview.set(false);

      for (const panel of this.panels()) {
        if ((panel.panelId() === 'experience-panel' && this.form.controls.experiences.invalid) ||
          (panel.panelId() === 'languages-panel' && this.form.controls.languages.invalid)) {
          panel.expand();
        }
      }

      afterNextRender(() => {
        const error = this.formElement()?.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]');
        if (!error) return;
        error.focus({ preventScroll: true });
        error.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
          block: 'center'
        });
      }, { injector: this.injector });
      return;
    }

    this.draft.save(this.snapshot());
    window.print();
  }
}
