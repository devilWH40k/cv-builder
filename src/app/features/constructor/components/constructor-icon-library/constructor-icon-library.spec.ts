import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Mail, MapPin, User } from 'lucide-angular';
import { ConstructorIconLibrary } from './constructor-icon-library';
import { ConstructorIcons } from '../../services/constructor-icons';
import { ConstructorEditor } from '../../services/constructor-editor';

describe('Constructor icon library', () => {
  it('shows a small catalogue, filters search, restores the list and adds the chosen icon', async () => {
    const icons = [
      { name: 'Mail', label: 'Mail', data: Mail },
      { name: 'MapPin', label: 'Map Pin', data: MapPin },
      { name: 'User', label: 'User', data: User },
    ];
    const addIcon = jasmine.createSpy('addIcon').and.resolveTo();
    const busy = signal(false);
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(),
      { provide: ConstructorIcons, useValue: { load: () => Promise.resolve(icons) } },
      { provide: ConstructorEditor, useValue: { busy, addIcon } },
    ] });
    const fixture = TestBed.createComponent(ConstructorIconLibrary);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const buttons = () => root.querySelectorAll<HTMLButtonElement>('.icons button:not(.load-more)');
    const search = root.querySelector('input')!;
    const query = async (value: string) => {
      search.value = value;
      search.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    expect(buttons().length).toBe(3);
    expect(buttons()[0].textContent?.trim()).toBe('');
    expect(buttons()[0].getAttribute('aria-label')).toBe('Add Mail icon');
    expect(buttons()[0].title).toBe('Add Mail');
    await query(' PIN map ');
    expect(buttons().length).toBe(1);
    buttons()[0].click();
    await fixture.whenStable();
    expect(addIcon).toHaveBeenCalledOnceWith('Map Pin', MapPin);
    await query('no such icon');
    expect(root.textContent).toContain('No icons found');
    await query('');
    expect(buttons().length).toBe(3);
    busy.set(true);
    await fixture.whenStable();
    // The library blocks interaction with the entire section while the editor is busy.
    expect(root.querySelector('section')?.inert).toBeTrue();
  });

  it('renders batches of 50, searches the full catalogue, and resets batches when searching or clearing', async () => {
    const icons = Array.from({ length: 125 }, (_, index) => ({
      name: `Icon${index}`,
      label: `${index < 105 ? 'Mail' : 'User'} ${index}`,
      data: Mail,
    }));
    const addIcon = jasmine.createSpy('addIcon').and.resolveTo();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(),
      { provide: ConstructorIcons, useValue: { load: () => Promise.resolve(icons) } },
      { provide: ConstructorEditor, useValue: { busy: signal(false), addIcon } },
    ] });
    const fixture = TestBed.createComponent(ConstructorIconLibrary);
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const buttons = () => root.querySelectorAll<HTMLButtonElement>('.icons button:not(.load-more)');
    const more = () => root.querySelector<HTMLButtonElement>('.load-more');
    const loadMore = async () => {
      more()!.click();
      await fixture.whenStable();
    };
    const search = async (query: string) => {
      const input = root.querySelector('input')!;
      input.value = query;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };

    expect(buttons().length).toBe(50);
    expect(more()?.parentElement).toBe(root.querySelector<HTMLElement>('.icons'));
    expect(root.querySelector('.count')?.textContent).toContain('50 of 125 icons');
    await loadMore();
    expect(buttons().length).toBe(100);
    await loadMore();
    expect(buttons().length).toBe(125);
    expect(more()).toBeNull();
    buttons()[124].click();
    await fixture.whenStable();
    expect(addIcon).toHaveBeenCalledOnceWith('User 124', Mail);

    await search('mail');
    expect(buttons().length).toBe(50);
    expect(root.querySelector('.count')?.textContent).toContain('50 of 105 icons');
    await loadMore();
    expect(buttons().length).toBe(100);
    await loadMore();
    expect(buttons().length).toBe(105);
    expect(more()).toBeNull();

    await search('user');
    expect(buttons().length).toBe(20);
    expect(buttons()[0].getAttribute('aria-label')).toBe('Add User 105 icon');
    expect(more()).toBeNull();
    await search('');
    expect(buttons().length).toBe(50);
    expect(more()).not.toBeNull();
    await search('no match');
    expect(buttons().length).toBe(0);
    expect(root.textContent).toContain('No icons found');
    expect(more()).toBeNull();
  });

  it('loads the complete alphabetically sorted Lucide catalogue', async () => {
    const icons = await new ConstructorIcons().load();
    expect(icons.length).toBeGreaterThan(1000);
    expect(icons.some(icon => icon.name === 'Mail')).toBeTrue();
    expect(new Set(icons.map(icon => icon.name)).size).toBe(icons.length);
    expect(icons.map(icon => icon.label)).toEqual(icons.map(icon => icon.label).sort((a, b) => a.localeCompare(b)));
  });
});
