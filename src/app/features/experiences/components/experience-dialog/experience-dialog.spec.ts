import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ExperienceDialog } from './experience-dialog';
import { SavedCvs } from '../../../cv/services/saved-cvs';
import { SavedExperience } from '../../../cv/interfaces/experience';

const record: SavedExperience = {
  id: 'project-1', updatedAt: 1, experience: {
    company: 'Replique', position: 'Developer', startDate: '2020', endDate: '',
    isCurrent: true, technologies: ['Angular'], description: '<p>A CRM project</p>'
  }
};

describe('Experience details dialog', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] }));

  async function setup(readOnly = false, experience = record.experience) {
    const save = spyOn(TestBed.inject(SavedCvs), 'saveExperience').and.resolveTo(record.id);
    const fixture = TestBed.createComponent(ExperienceDialog);
    fixture.componentRef.setInput('record', { ...record, experience });
    fixture.componentRef.setInput('readOnly', readOnly);
    const saved = jasmine.createSpy('saved');
    fixture.componentInstance.saved.subscribe(saved);
    await fixture.whenStable();
    const dialog = document.querySelector<HTMLDialogElement>('#experience-details')!;
    return { fixture, dialog, save, saved };
  }

  it('leaves new fields blank on older records and saves metadata on the same ID', async () => {
    const { fixture, dialog, save, saved } = await setup();
    expect(dialog.textContent).not.toContain('Experience 1');
    const label = dialog.querySelector<HTMLElement>('#experience-updated-label')!;
    const radios = dialog.querySelectorAll<HTMLElement>('.updated app-radio');
    const center = (element: HTMLElement) => {
      const bounds = element.getBoundingClientRect();
      return bounds.top + bounds.height / 2;
    };
    expect(center(label)).toBeCloseTo(center(radios[0]), 0);
    expect(center(label)).toBeCloseTo(center(radios[1]), 0);
    const alternativeNames = dialog.querySelector<HTMLInputElement>('#experience-alternative-names')!;
    expect(alternativeNames.value).toBe('');
    expect(dialog.querySelectorAll('input[type="radio"]:checked').length).toBe(0);
    alternativeNames.value = 'Modelize';
    alternativeNames.dispatchEvent(new Event('input'));
    const responsibilities = dialog.querySelector<HTMLTextAreaElement>('#experience-responsibilities')!;
    responsibilities.value = 'Develop the CRM frontend';
    responsibilities.dispatchEvent(new Event('input'));
    dialog.querySelector<HTMLInputElement>('input[type="radio"][value="false"]')!.click();
    dialog.querySelector<HTMLButtonElement>('[dialogActions] app-button:last-child button')!.click();
    await fixture.whenStable();
    expect(save).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      company: 'Replique', savedExperienceId: record.id, alternativeNames: 'Modelize',
      responsibilities: 'Develop the CRM frontend', isUpdated: false, technologies: ['Angular']
    }));
    expect(saved).toHaveBeenCalledWith(jasmine.objectContaining({ id: record.id }));
  });

  it('retains edits after a failed save and supports retry', async () => {
    const { fixture, dialog, save, saved } = await setup();
    save.and.rejectWith(new Error('Write failed'));
    const input = dialog.querySelector<HTMLInputElement>('#experience-developer')!;
    input.value = 'Ada';
    input.dispatchEvent(new Event('input'));
    const button = dialog.querySelector<HTMLButtonElement>('[dialogActions] app-button:last-child button')!;
    button.click();
    await fixture.whenStable();
    expect(saved).not.toHaveBeenCalled();
    expect(input.value).toBe('Ada');
    expect(input.disabled).toBeFalse();
    expect(button.disabled).toBeFalse();
    save.and.resolveTo(record.id);
    button.click();
    await fixture.whenStable();
    expect(saved).toHaveBeenCalled();
  });

  it('shows information without editable controls or save actions in read-only mode', async () => {
    const { fixture, dialog, save, saved } = await setup(true, {
      ...record.experience, alternativeNames: 'Modelize', responsibilities: 'Frontend development',
      webLink: 'https://replique.io/', photos: 'https://example.com/photos',
      teamlead: 'Team lead', developer: 'Ada', isUpdated: true
    });
    expect(dialog.textContent).toContain('Modelize');
    expect(dialog.textContent).toContain('Frontend development');
    expect(dialog.textContent).toContain('true');
    expect(dialog.querySelector('input, textarea, select, [contenteditable="true"]')).toBeNull();
    expect(dialog.textContent).not.toContain('Save changes');
    const cancelled = jasmine.createSpy('cancelled');
    fixture.componentInstance.cancelled.subscribe(cancelled);
    dialog.querySelector<HTMLButtonElement>('[dialogActions] button')!.click();
    expect(cancelled).toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(saved).not.toHaveBeenCalled();
  });

  it('scrolls content inside the rounded shell and keeps the header and actions visible', async () => {
    const { dialog } = await setup();
    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.inset = '0 auto auto 0';
    document.body.append(frame);
    try {
      const target = frame.contentDocument!;
      for (const style of document.querySelectorAll('style, link[rel="stylesheet"]')) {
        target.head.append(style.cloneNode(true));
      }
      target.body.append(dialog.parentElement!.cloneNode(true));
      const shell = target.querySelector<HTMLDialogElement>('#experience-details')!;
      const content = shell.querySelector<HTMLElement>(':scope > .content')!;
      const header = shell.querySelector<HTMLElement>(':scope > header')!;
      const footer = shell.querySelector<HTMLElement>(':scope > footer')!;
      for (const theme of ['light', 'dark']) {
        target.documentElement.dataset['theme'] = theme;
        for (const [width, height] of [[1024, 600], [375, 360]]) {
          frame.style.width = `${width}px`;
          frame.style.height = `${height}px`;
          content.scrollTop = 0;
          const bounds = shell.getBoundingClientRect();
          const headerTop = header.getBoundingClientRect().top;
          const footerBottom = footer.getBoundingClientRect().bottom;
          expect(bounds.top).toBeGreaterThanOrEqual(0);
          expect(bounds.bottom).toBeLessThanOrEqual(height);
          expect(getComputedStyle(shell).overflowY).toBe('hidden');
          expect(getComputedStyle(content).overflowY).toBe('auto');
          expect(content.scrollHeight).toBeGreaterThan(content.clientHeight);
          expect(content.getBoundingClientRect().right).toBeLessThan(bounds.right);
          content.scrollTop = content.scrollHeight;
          expect(content.scrollTop).toBeGreaterThan(0);
          expect(content.scrollTop + content.clientHeight).toBeCloseTo(content.scrollHeight, 0);
          expect(header.getBoundingClientRect().top).toBe(headerTop);
          expect(footer.getBoundingClientRect().bottom).toBe(footerBottom);
          expect(headerTop).toBeGreaterThan(bounds.top);
          expect(footerBottom).toBeLessThan(bounds.bottom);
          expect(target.documentElement.scrollWidth).toBeLessThanOrEqual(width);
        }
      }
    } finally {
      frame.remove();
    }
  });
});
