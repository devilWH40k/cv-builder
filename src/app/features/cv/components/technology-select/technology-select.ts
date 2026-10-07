import { afterNextRender, ChangeDetectionStrategy, Component, inject, input, PendingTasks, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MultiSelect, MultiSelectGroup } from '../../../../shared/ui/multi-select/multi-select';
import { CustomEntry } from '../../../../core/dialogs/custom-entry-dialog/custom-entry-dialog';
import { CustomEntryIcons } from '../../../../core/dialogs/custom-entry-dialog/custom-entry-icon';
import { SavedCvs } from '../../services/saved-cvs';

@Component({
  selector: 'app-technology-select',
  imports: [MultiSelect],
  template: `
    <app-multi-select [inputId]="inputId()" [label]="label()" [control]="control()"
      [groups]="groups()" [optionIcons]="optionIcons()" [allowCustom]="true"
      [customIcons]="customIcons().value" (customIconsChange)="customIcons().setValue($event)"
      [savedEntries]="saved.technologies()" [saveEntry]="saveEntry" [showIcons]="showIcons()" />
    @if (loadError()) {
      <p role="status">Saved technologies could not be loaded.
        <button type="button" (click)="load()">Try again</button>
      </p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TechnologySelect {
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly showIcons = input(true);
  readonly control = input.required<FormControl<readonly string[]>>();
  readonly groups = input.required<readonly MultiSelectGroup[]>();
  readonly optionIcons = input<Readonly<Record<string, string | undefined>>>({});
  readonly customIcons = input.required<FormControl<CustomEntryIcons>>();
  protected readonly saved = inject(SavedCvs);
  protected readonly loadError = signal(false);
  private readonly pending = inject(PendingTasks);
  protected readonly saveEntry = (entry: CustomEntry): Promise<CustomEntry> => this.saved.saveTechnology(entry);

  constructor() {
    afterNextRender(() => this.load());
  }

  protected load(): void {
    this.pending.run(async () => {
      try {
        await this.saved.loadTechnologies();
        this.loadError.set(false);
      } catch {
        this.loadError.set(true);
      }
    });
  }
}
