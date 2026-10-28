import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CompanyLogoPresets } from './company-logo-presets';

describe('Company logo presets', () => {
  it('loads the bundled SVG as a persistable logo file', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()] });
    const pending = TestBed.inject(CompanyLogoPresets).usense();
    const http = TestBed.inject(HttpTestingController);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"/>';
    http.expectOne('usense-logo.svg').flush(svg);
    const logo = await pending;
    expect(logo.name).toBe('usense-logo.svg');
    expect(logo.type).toBe('image/svg+xml');
    expect(await logo.text()).toBe(svg);
    http.verify();
  });
});
