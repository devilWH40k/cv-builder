import { Component, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Footer } from '../footer/footer';
import { Header } from './header';
import { THEME_STORAGE_KEY } from '../../theme/theme-store';

@Component({ template: '' })
class NavigationPage {}

describe('Header navigation', () => {
  let fixture: ComponentFixture<Header>;
  let page: HTMLElement;
  let originalTheme: string | undefined;

  beforeEach(async () => {
    originalTheme = document.documentElement.dataset['theme'];
    const getItem = Storage.prototype.getItem;
    spyOn(Storage.prototype, 'getItem').and.callFake(function (this: Storage, key) {
      return key === THEME_STORAGE_KEY ? 'light' : getItem.call(this, key);
    });
    spyOn(Storage.prototype, 'setItem').and.stub();
    TestBed.configureTestingModule({
      imports: [Header, Footer],
      providers: [provideZonelessChangeDetection(), provideRouter([
        { path: '', component: NavigationPage },
        { path: 'experiences', component: NavigationPage },
        { path: 'guides', component: NavigationPage }
      ])]
    });
    fixture = TestBed.createComponent(Header);
    page = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    if (originalTheme === undefined) delete document.documentElement.dataset['theme'];
    else document.documentElement.dataset['theme'] = originalTheme;
  });

  it('places an accessible animated theme switch immediately before Guides', async () => {
    const toggle = page.querySelector<HTMLButtonElement>('.theme-toggle')!;
    expect(toggle.nextElementSibling?.getAttribute('aria-label')).toBe('Guides');
    expect(toggle.getAttribute('role')).toBe('switch');
    expect(toggle.getAttribute('aria-label')).toBe('Dark theme');
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(toggle.title).toBe('Switch to dark theme');
    const sun = toggle.querySelector('.sun-icon')!;
    const moon = toggle.querySelector('.moon-icon')!;
    expect(getComputedStyle(sun).opacity).toBe('1');
    expect(getComputedStyle(moon).opacity).toBe('0');
    toggle.click();
    await fixture.whenStable();
    await Promise.all(toggle.getAnimations({ subtree: true }).map((animation) => animation.finished));
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(toggle.title).toBe('Switch to light theme');
    expect(getComputedStyle(sun).opacity).toBe('0');
    expect(getComputedStyle(moon).opacity).toBe('1');
    expect(Storage.prototype.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'dark');
    toggle.click();
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });

  it('shows the Usense logo, stacked title, direct menu actions, and Guides', () => {
    const logo = page.querySelector<HTMLImageElement>('.brand img')!;
    expect(logo.getAttribute('src')).toBe('usense-logo.svg');
    expect(Array.from(page.querySelectorAll('.brand-title span')).map((line) => line.textContent))
      .toEqual(['CV', 'Builder']);
    expect(page.querySelector('.brand')?.getAttribute('href')).toBe('/');
    expect(page.querySelector('app-dropdown')).toBeNull();
    expect(page.querySelector('[aria-label="Settings"]')).toBeNull();
    expect(Array.from(page.querySelectorAll('.header-menu .menu-item')).map((item) => item.textContent?.trim()))
      .toEqual(['Import / Export', 'Experiences', 'Technologies']);
    expect(page.querySelector('.header-actions [aria-label="Guides"]')?.getAttribute('href')).toBe('/guides');
    expect(page.querySelectorAll('.header-menu [aria-haspopup="dialog"]').length).toBe(2);
    expect(getComputedStyle(page.querySelector('header')!).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  });

  it('tracks the active route, including query changes, and moves the active state to Guides', async () => {
    const router = TestBed.inject(Router);
    const experiences = page.querySelector<HTMLAnchorElement>('.header-menu a')!;
    const guides = page.querySelector<HTMLAnchorElement>('.guides-link')!;
    experiences.click();
    await fixture.whenStable();
    expect(router.url).toBe('/experiences');
    expect(experiences.getAttribute('aria-current')).toBe('page');
    expect(experiences.classList.contains('active')).toBeTrue();
    expect(getComputedStyle(experiences).color).toBe('rgb(54, 212, 247)');
    const underline = getComputedStyle(experiences, '::after');
    expect(underline.backgroundColor).toBe('rgb(54, 212, 247)');
    expect(parseFloat(underline.borderRadius)).toBeGreaterThan(0);
    await router.navigateByUrl('/experiences?search=Angular');
    await fixture.whenStable();
    expect(experiences.getAttribute('aria-current')).toBe('page');
    guides.click();
    await fixture.whenStable();
    expect(router.url).toBe('/guides');
    expect(experiences.hasAttribute('aria-current')).toBeFalse();
    expect(experiences.classList.contains('active')).toBeFalse();
    expect(guides.getAttribute('aria-current')).toBe('page');
  });

  it('centers desktop navigation and keeps all items accessible on small screens', () => {
    const frame = document.createElement('iframe');
    frame.style.height = '300px';
    document.body.append(frame);
    try {
      const target = frame.contentDocument!;
      target.body.style.margin = '0';
      target.documentElement.style.overflow = 'hidden';
      for (const style of document.querySelectorAll('style, link[rel="stylesheet"]')) {
        target.head.append(style.cloneNode(true));
      }
      target.body.append(page.querySelector('header')!.cloneNode(true));
      for (const width of [1440, 1024, 768, 375, 320]) {
        frame.style.width = `${width}px`;
        const header = target.querySelector('.header-content')!.getBoundingClientRect();
        const nav = target.querySelector('nav')!.getBoundingClientRect();
        const brand = target.querySelector('.brand')!.getBoundingClientRect();
        const guides = target.querySelector('.guides-link')!.getBoundingClientRect();
        const toggle = target.querySelector('.theme-toggle')!.getBoundingClientRect();
        expect((nav.left + nav.right) / 2).toBeCloseTo((header.left + header.right) / 2, 0);
        expect(brand.right).toBeLessThanOrEqual(toggle.left);
        expect(toggle.right).toBeLessThanOrEqual(guides.left);
        expect(target.documentElement.scrollWidth).toBeLessThanOrEqual(width);
        if (width <= 768) expect(nav.top).toBeGreaterThanOrEqual(brand.bottom);
        else {
          expect(nav.left).toBeGreaterThanOrEqual(brand.right);
          expect(nav.right).toBeLessThanOrEqual(toggle.left);
        }
        for (const item of target.querySelectorAll('.menu-item')) {
          const bounds = item.getBoundingClientRect();
          expect(bounds.left).toBeGreaterThanOrEqual(0);
          expect(bounds.right).toBeLessThanOrEqual(width);
        }
      }
    } finally {
      frame.remove();
    }
  });

  it('uses a navy footer with white text', async () => {
    const footer = TestBed.createComponent(Footer);
    await footer.whenStable();
    const element: HTMLElement = footer.nativeElement.querySelector('footer');
    expect(getComputedStyle(element).backgroundColor).toBe('rgb(17, 33, 77)');
    expect(getComputedStyle(element).color).toBe('rgb(255, 255, 255)');
  });
});
