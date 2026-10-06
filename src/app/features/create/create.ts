import { CvPdf } from '../cv/cv-pdf';
import { ExperiencesDialog } from './experiences-dialog/experiences-dialog';
import { SavedExperience } from '../cv/experience';
import { ToastService } from '../../shared/ui/toast/toast.service';
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
import { ArrowLeft, Download, Eye, Pencil, LucideAngularModule, X } from 'lucide-angular';
import { TechnologySelect } from '../cv/technology-select/technology-select';
import { TECHNOLOGY_GROUPS } from '../cv/technologies';
import { entryIcon } from '../../core/dialogs/custom-entry-dialog/custom-entry-icon';

@Component({
  selector: 'app-create',
  imports: [ExperiencesDialog, ExpandPanel, Tabs, Preview, StructureOptions, SaveCvButton, RouterLink, ReactiveFormsModule, Input, Textarea, FileUpload, Button, Select, TechnologySelect, LucideAngularModule, ExperienceEntry],
  templateUrl: './create.html',
  styleUrl: './create.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Create {
  protected readonly entryIcon = entryIcon;
  protected readonly pdf = inject(CvPdf);
  protected readonly draft = inject(CvDraft);
  protected readonly activeTab = signal('info');
  protected readonly mobilePreview = signal(false);
  protected readonly tabs = [
    { id: 'info', label: 'CV info', panelId: 'info-panel' },
    { id: 'structure', label: 'Structure', panelId: 'structure-panel' }
  ];
  protected readonly structure = computed(() => ({ ...DEFAULT_CV_STRUCTURE, ...this.draft.current()?.structure }));
  protected readonly ArrowLeftIcon = ArrowLeft;
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
    const known = new Set<string>(TECHNOLOGY_GROUPS.flatMap((group) => [...group.options]));
    return [...TECHNOLOGY_GROUPS, { label: 'Custom', options: selected.filter((option) => !known.has(option)) }].map((group) => ({
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
    this.form.patchValue({ ...fields, languages: [...info.languages], experiences: [...info.experiences] });
  }

  protected readonly experiencesOpen = signal(false);
  private readonly toasts = inject(ToastService);
  protected get linkedExperienceIds(): string[] {
    return this.form.controls.experiences.controls.flatMap((row) => {
      const id = row.controls.savedExperienceId.value;
      return id ? [id] : [];
    });
  }

  protected applyExperiences(records: readonly SavedExperience[]): void {
    const ids = new Set(this.linkedExperienceIds);
    for (const record of records) {
      if (ids.has(record.id)) continue;
      this.form.controls.experiences.push(createExperienceForm({ ...record.experience, savedExperienceId: record.id }));
      ids.add(record.id);
    }
    this.form.markAsDirty();
    this.experiencesOpen.set(false);
    this.toasts.show('success', 'Selected experiences have been added.');
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
    void this.pdf.download(this.snapshot());
  }
}
