import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ConstructorSvgAssets } from './constructor-svg-assets';

describe('Constructor SVG assets', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()] }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('loads local SVG source once requested and decodes embedded SVGs without HTTP', async () => {
    const source = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24z"/></svg>';
    const assets = TestBed.inject(ConstructorSvgAssets);
    const pending = assets.read('/used-tech-icons/ic-typescript.svg');
    TestBed.inject(HttpTestingController).expectOne(location.origin + '/used-tech-icons/ic-typescript.svg').flush(source);
    expect(await pending).toBe(source);
    expect(await assets.read('data:image/svg+xml,' + encodeURIComponent(source))).toBe(source);
    expect(await assets.read('https://example.com/icon.svg')).toBeNull();
    expect(await assets.read('data:image/png;base64,AAAA')).toBeNull();
  });
});
