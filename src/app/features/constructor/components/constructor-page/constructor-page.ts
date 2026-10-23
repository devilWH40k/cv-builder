import { DebouncedColor } from '../../../../shared/directives/debounced-color';
import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  PendingTasks,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LucideAngularModule,
  Save,
  Download,
  MousePointer2,
  Paintbrush,
  Pencil,
  Type,
  ImagePlus,
  Square,
  Circle,
  Minus,
  Undo2,
  Redo2,
  Plus,
  FileJson,
  FolderOpen,
  ArrowLeft,
  Trash2,
  X,
} from 'lucide-angular';
import { CvDraft } from '../../../cv/services/cv-draft';
import { SavedCvs } from '../../../cv/services/saved-cvs';
import { Preview } from '../../../preview/components/preview/preview';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { Button } from '../../../../shared/ui/button/button';
import { DeleteConfirmationService } from '../../../../shared/ui/delete-confirmation/delete-confirmation.service';
import { ConstructorEditor } from '../../services/constructor-editor';
import { ConstructorRepository } from '../../services/constructor-repository';
import { ConstructorSession } from '../../services/constructor-session';
import { ConstructorProperties } from '../constructor-properties/constructor-properties';
import { DesignSummary } from '../../interfaces/constructor-document';
import { downloadDesignFile, loadDesignFonts } from '../../helpers/design-assets';
import { blankDesign, preparePreview, previewToDesign } from '../../helpers/preview-to-design';
import { parseDesign } from '../../helpers/design-validation';
import { DialogOverlay } from '../../../../shared/ui/dialog/dialog-overlay';
import { ConstructorLayers } from '../constructor-layers/constructor-layers';
import { ConstructorPageProperties } from '../constructor-page-properties/constructor-page-properties';
import { ResizeHandle } from '../../../../shared/ui/resize-handle/resize-handle';
import { DesignList } from '../design-list/design-list';
import { A4_HEIGHT, A4_WIDTH } from '../../interfaces/constructor-document';
import { ConstructorObjectMenu } from '../constructor-object-menu/constructor-object-menu';
import { Spinner } from '../../../../shared/ui/spinner/spinner';
import { UnsavedChangesDialog, UnsavedChangesDecision } from '../../../../shared/ui/unsaved-changes-dialog/unsaved-changes-dialog';
import { ConstructorSvgAssets } from '../../services/constructor-svg-assets';

@Component({
  selector: 'app-constructor-page',
  imports: [DebouncedColor,
    RouterLink,
    LucideAngularModule,
    Button,
    Preview,
    ConstructorProperties,
    DialogOverlay,
    DesignList,
    ConstructorLayers,
    ConstructorPageProperties,
    ResizeHandle,
    ConstructorObjectMenu,
    Spinner,
    UnsavedChangesDialog,
  ],
  providers: [CvDraft, ConstructorEditor, ConstructorSession],
  templateUrl: './constructor-page.html',
  styleUrls: ['./constructor-page.scss', './constructor-editor.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:beforeunload)': 'beforeUnload($event)' },
})
export class ConstructorPageComponent {
  protected readonly editor = inject(ConstructorEditor);
  protected readonly session = inject(ConstructorSession);
  protected readonly sourceDraft = inject(CvDraft, { skipSelf: true });
  private readonly previewDraft = inject(CvDraft);
  private readonly repository = inject(ConstructorRepository);
  private readonly svgAssets = inject(ConstructorSvgAssets);
  private readonly savedCvs = inject(SavedCvs);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pendingTasks = inject(PendingTasks);
  private readonly confirmation = inject(DeleteConfirmationService);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly preview = viewChild.required<ElementRef<HTMLElement>>('previewSource');
  private readonly overlay = viewChild.required(DialogOverlay);
  private readonly canvasViewport = viewChild.required<ElementRef<HTMLElement>>('canvasViewport');
  private readonly returnTab = this.route.snapshot.queryParamMap.get('returnTab');
  private resizeObserver: ResizeObserver | null = null;
  protected readonly propertiesHeight = signal(400);
  protected readonly leftWidth = signal(240);
  protected readonly rightWidth = signal(280);
  protected readonly fitPage = signal(true);
  protected readonly designs = signal<readonly DesignSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly workspaceLoading = computed(() =>
    this.loading() || (this.editor.busy() && !this.editor.restoringHistory() && !this.editor.clipboardBusy()),
  );
  protected readonly exporting = signal(false);
  private readonly toasts = inject(ToastService);
  protected readonly icons = {
    Save,
    Download,
    MousePointer2,
    Paintbrush,
    Pencil,
    Type,
    ImagePlus,
    Square,
    Circle,
    Minus,
    Undo2,
    Redo2,
    Plus,
    FileJson,
    FolderOpen,
    ArrowLeft,
    Trash2,
    X,
  };
  protected readonly leaveOpen = signal(false);
  protected readonly leaveSaving = signal(false);
  private leaveDecision: Promise<boolean> | null = null;
  private resolveLeave: ((leave: boolean) => void) | null = null;
  private routeRun = 0;

  constructor() {
    afterNextRender(() => {
      this.editor.attach(this.canvas().nativeElement, () => {
        this.session.markChanged();
      });
      this.resizeObserver = new ResizeObserver(() => this.fitCanvas());
      this.resizeObserver.observe(this.canvasViewport().nativeElement);
      void this.pendingTasks.run(() => this.initialize());
    });
    afterRenderEffect(() => {
      if (this.session.document()) {
        if (this.loading() || this.editor.busy() || this.session.saving()) return;
        this.overlay().open();
        this.fitCanvas();
      } else this.overlay().close();
    });
    this.destroyRef.onDestroy(() => {
      this.finishLeaving(false);
      this.routeRun++;
      this.resizeObserver?.disconnect();
      void this.editor.dispose();
    });
  }

  private async initialize(): Promise<void> {
    try {
      await loadDesignFonts();
      if (this.destroyRef.destroyed) return;
      await this.refreshLibrary();
      this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
        void this.pendingTasks.run(() => this.loadRoute(params));
      });
    } catch {
      this.toasts.show('danger', 'The constructor could not start. Reload the page to try again.');
      this.loading.set(false);
    }
  }

  private async loadRoute(params: ParamMap): Promise<void> {
    const id = params.get('design');
    if (id && id === this.session.document()?.id) return;
    if (params.get('new') === this.session.document()?.id) return;
    if (this.session.document() && !(await this.canDeactivate())) {
      await this.setDesignUrl(this.session.document()!.id);
      return;
    }
    const run = ++this.routeRun;
    this.loading.set(true);
    try {
      if (id) {
        const design = await this.repository.load(id);
        if (run !== this.routeRun || this.destroyRef.destroyed) return;
        if (!design) throw new Error('This saved design could not be found.');
        await this.session.open(design);
        await this.repository.recordVisit(id);
      } else if (params.get('cv') || params.get('from') === 'draft') {
        const cvId = params.get('cv');
        const info = cvId ? await this.savedCvs.load(cvId) : this.sourceDraft.current();
        if (run !== this.routeRun || this.destroyRef.destroyed) return;
        if (!info) throw new Error('Choose a CV from Home and open it in the constructor.');
        this.previewDraft.save(info);
        // Let Angular render the isolated preview before measuring its layout.
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        await preparePreview(this.preview().nativeElement);
        const design = await previewToDesign(
          this.preview().nativeElement,
          info.name ? `${info.name}_design` : 'CV_design',
          cvId ?? this.sourceDraft.savedId(),
          (source) => this.svgAssets.read(source),
        );
        if (run !== this.routeRun || this.destroyRef.destroyed) return;
        await this.session.open(design, true);
        this.toasts.show('success', 'Design created from your CV. Your original CV is unchanged.');
      } else if (this.session.document()) {
        this.session.close();
      }
    } catch (error: unknown) {
      this.toasts.show(
        'danger',
        error instanceof Error
          ? error.message
          : 'The design could not be opened. Please try again.',
      );
    } finally {
      if (run === this.routeRun && !this.destroyRef.destroyed) {
        this.previewDraft.reset();
        this.loading.set(false);
      }
    }
  }

  protected async newBlank(): Promise<void> {
    if (!(await this.canDeactivate())) return;
    await this.run(async () => {
      await this.session.open(blankDesign(), true);
      await this.router.navigate(['/constructor'], {
        queryParams: { new: this.session.document()!.id },
        replaceUrl: true,
      });
    });
  }

  protected async library(): Promise<void> {
    if (!(await this.canDeactivate())) return;
    this.session.close();
    await this.router.navigate(['/constructor']);
    await this.refreshLibrary();
  }

  protected async closeEditor(event?: Event): Promise<void> {
    event?.preventDefault();
    if (this.returnTab === 'files' || this.returnTab === 'designs') {
      if (!(await this.canDeactivate())) return;
      // The explicit confirmation above also covers same-route closing; avoid asking twice.
      this.session.close();
      await this.router.navigate(['/'], {
        queryParams: { tab: this.returnTab === 'designs' ? 'designs' : null },
      });
    } else await this.library();
  }

  protected changeZoom(value: string): void {
    this.fitPage.set(value === 'fit');
    if (value === 'fit') this.fitCanvas();
    else this.editor.setZoom(Number(value));
  }

  private fitCanvas(): void {
    if (!this.fitPage() || !this.session.document()) return;
    const viewport = this.canvasViewport().nativeElement;
    const style = getComputedStyle(viewport);
    const width =
      viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const height =
      viewport.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    if (width > 0 && height > 0)
      this.editor.setZoom(Math.min(width / A4_WIDTH, height / A4_HEIGHT, 1));
  }

  protected async save(): Promise<void> {
    await this.run(async () => {
      const id = await this.session.save();
      if (!id) return;
      await this.repository.recordVisit(id);
      await this.setDesignUrl(id);
      await this.refreshLibrary();
      this.toasts.show('success', 'Design saved in this browser.');
    }, false);
  }

  protected async exportPdf(): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set(true);
    try {
      const snapshot = this.session.snapshot();
      if (!snapshot) return;
      const { designPdfBlob } = await import('../../helpers/design-pdf');
      downloadDesignFile(await designPdfBlob(snapshot), `${snapshot.title || 'CV design'}.pdf`);
      this.toasts.show('success', 'PDF exported with text and links.');
    } catch {
      this.toasts.show('danger', 'Your PDF could not be exported. Please try again.');
    } finally {
      this.exporting.set(false);
    }
  }

  protected exportDesign(): void {
    const snapshot = this.session.snapshot();
    if (!snapshot) return;
    downloadDesignFile(
      new Blob([JSON.stringify(snapshot)], { type: 'application/json' }),
      `${snapshot.title || 'CV design'}.cv-design.json`,
    );
    this.toasts.show('success', 'Editable design downloaded, including its images.');
  }

  protected async importDesign(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file || !(await this.canDeactivate())) return;
    await this.run(async () => {
      if (file.size > 50 * 1024 ** 2) throw new Error('Choose a design file up to 50 MB.');
      const design = parseDesign(JSON.parse(await file.text()));
      // Import a copy rather than replacing an existing design with the same ID.
      await this.session.open({ ...design, id: crypto.randomUUID(), updatedAt: Date.now() }, true);
      await this.router.navigate(['/constructor'], {
        queryParams: { new: this.session.document()!.id },
        replaceUrl: true,
      });
    });
  }

  protected async insertImage(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (file) await this.run(() => this.editor.addImage(file));
  }

  protected async deleteDesign(design: DesignSummary): Promise<void> {
    if (
      !(await this.confirmation.confirm(
        { title: 'Delete design', itemName: design.title },
        this.destroyRef,
      ))
    )
      return;
    await this.run(async () => {
      await this.repository.delete(design.id);
      await this.refreshLibrary();
    });
  }

  protected async removePage(): Promise<void> {
    if (
      !(await this.confirmation.confirm(
        {
          title: 'Delete page',
          itemName: `Page ${this.session.activePage() + 1}`,
          message: 'All objects on this page will be removed.',
        },
        this.destroyRef,
      ))
    )
      return;
    await this.run(() => this.session.removePage());
  }

  protected async page(index: number): Promise<void> {
    await this.run(() => this.session.switchPage(index));
  }
  protected async addPage(): Promise<void> {
    await this.run(() => this.session.addPage());
  }

  protected keyboard(event: KeyboardEvent): void {
    if (
      event.target instanceof HTMLElement &&
      event.target.closest('input, textarea, select, [contenteditable="true"]')
    )
      return;
    if (this.loading() || this.editor.busy()) return;
    if (event.key === 'Escape' && this.editor.tool() === 'style') {
      event.preventDefault();
      event.stopPropagation();
      this.editor.setTool('select');
      return;
    }
    const modifier = event.ctrlKey || event.metaKey;
    const key = /^Key[A-Z]$/.test(event.code) ? event.code.slice(3).toLowerCase() : event.key.toLowerCase();
    if (modifier && key === 's') {
      event.preventDefault();
      void this.save();
      } else if (modifier && key === 'a') {
        event.preventDefault();
        this.editor.selectAll();
      } else if (modifier && ['c', 'x', 'v'].includes(key)) {
        if ((key === 'v' && !this.editor.canPaste()) || (key !== 'v' && !this.editor.selectionCount())) return;
        event.preventDefault();
        const action = key === 'c' ? 'copy' : key === 'x' ? 'cut' : 'paste';
        void this.run(() => this.editor[action](), false);
      } else if (modifier && key === 'z') {
      event.preventDefault();
      void this.run(() => (event.shiftKey ? this.editor.redo() : this.editor.undo()), false);
    } else if (modifier && key === 'd') {
      event.preventDefault();
      void this.run(() => this.editor.duplicate(), false);
    } else if (['Delete', 'Backspace'].includes(event.key)) {
      event.preventDefault();
      this.editor.remove();
    } else if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      const distance = event.shiftKey ? 10 : 1;
      this.editor.nudge(
        event.key === 'ArrowLeft' ? -distance : event.key === 'ArrowRight' ? distance : 0,
        event.key === 'ArrowUp' ? -distance : event.key === 'ArrowDown' ? distance : 0,
      );
    }
  }

  canDeactivate(): boolean | Promise<boolean> {
    this.editor.finishEditing();
    if (this.leaveDecision) return this.leaveDecision;
    if (this.session.saving() || this.editor.busy() || (this.loading() && !!this.session.document())) return false;
    if (!this.session.dirty()) return true;
    this.leaveOpen.set(true);
    this.leaveDecision = new Promise((resolve) => { this.resolveLeave = resolve; });
    return this.leaveDecision;
  }

  protected async handleLeaveDecision(decision: UnsavedChangesDecision): Promise<void> {
    if (this.leaveSaving() || this.session.saving()) return;
    if (decision !== 'save') {
      this.finishLeaving(decision === 'leave');
      return;
    }
    this.leaveSaving.set(true);
    try {
      const id = await this.session.save();
      if (this.destroyRef.destroyed) return;
      if (!id || this.session.dirty()) {
        this.toasts.show('danger', 'Your design has newer changes. Save again before leaving.');
        return;
      }
      await this.repository.recordVisit(id);
      if (!this.destroyRef.destroyed) this.finishLeaving(true);
    } catch {
      if (!this.destroyRef.destroyed)
        this.toasts.show('danger', 'Your design could not be saved. Try again, leave without saving, or cancel.');
    } finally {
      this.leaveSaving.set(false);
    }
  }

  private finishLeaving(leave: boolean): void {
    this.leaveOpen.set(false);
    this.resolveLeave?.(leave);
    this.resolveLeave = null;
    this.leaveDecision = null;
  }

  protected beforeUnload(event: BeforeUnloadEvent): void {
    this.editor.finishEditing();
    if (this.session.dirty() || this.session.saving() || this.leaveSaving()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  protected async history(action: 'undo' | 'redo'): Promise<void> {
    await this.run(() => (action === 'undo' ? this.editor.undo() : this.editor.redo()), false);
  }

  private async refreshLibrary(): Promise<void> {
    this.designs.set(await this.repository.recentlyVisited());
  }
  private setDesignUrl(id: string): Promise<boolean> {
    return this.router.navigate(['/constructor'], {
      queryParams: { design: id, returnTab: this.returnTab },
      replaceUrl: true,
    });
  }

  private async run(action: () => Promise<unknown>, block = true): Promise<void> {
    await this.pendingTasks.run(async () => {
      if (block) this.loading.set(true);
      try {
        await action();
      } catch (error: unknown) {
        this.toasts.show(
          'danger',
          error instanceof Error
            ? error.message
            : 'The action could not be completed. Please try again.',
        );
      } finally {
        if (block) this.loading.set(false);
      }
    });
  }
}
