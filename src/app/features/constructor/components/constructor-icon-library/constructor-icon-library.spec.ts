import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Mail, MapPin, User } from 'lucide-angular';
import { ConstructorIconLibrary } from './constructor-icon-library';
import { ConstructorIcons } from '../../services/constructor-icons';
import { ConstructorEditor } from '../../services/constructor-editor';

describe('Constructor icon library', () => {
  it('shows every icon, filters search, restores the full list and adds the chosen icon', async () => {
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
    const buttons = () => root.querySelectorAll<HTMLButtonElement>('.icons button');
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
    expect(buttons()[0].disabled).toBeTrue();
  });

  it('loads the complete alphabetically sorted Lucide catalogue', async () => {
    const icons = await new ConstructorIcons().load();
    expect(icons.length).toBeGreaterThan(1000);
    expect(icons.some(icon => icon.name === 'Mail')).toBeTrue();
    expect(new Set(icons.map(icon => icon.name)).size).toBe(icons.length);
    expect(icons.map(icon => icon.label)).toEqual(icons.map(icon => icon.label).sort((a, b) => a.localeCompare(b)));
  });
});
