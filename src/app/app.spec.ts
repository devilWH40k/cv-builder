import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), provideRouter(routes)]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the home page and navigate to the editor placeholder', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent)
      .toBe('Create your new CV');

    const link = harness.routeNativeElement?.querySelector<HTMLAnchorElement>('a');
    expect(link?.getAttribute('aria-label')).toBe('Create a new CV');
    expect(link?.getAttribute('href')).toBe('/create');
    link!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(TestBed.inject(Router).url).toBe('/create');
    expect(harness.routeNativeElement?.textContent).toContain('Your CV editor is coming soon.');
  });

  it('should open /create directly and navigate back home', async () => {
    const harness = await RouterTestingHarness.create('/create');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Create your CV');

    harness.routeNativeElement?.querySelector<HTMLAnchorElement>('a')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(TestBed.inject(Router).url).toBe('/');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent)
      .toBe('Create your new CV');
  });
});
