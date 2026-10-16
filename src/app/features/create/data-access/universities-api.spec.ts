import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { UniversitiesApi } from './universities-api';

describe('University suggestions API', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()]
  }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('searches education organizations over HTTPS and returns unique display names', () => {
    let suggestions: readonly string[] = [];
    TestBed.inject(UniversitiesApi).search('Harvard').subscribe((names) => suggestions = names);
    const request = TestBed.inject(HttpTestingController).expectOne((request) =>
      request.url === 'https://api.ror.org/v2/organizations' && request.params.get('query') === 'Harvard');
    expect(request.request.params.get('filter')).toBe('types:education');
    request.flush({ items: [
      { names: [{ value: 'HU', types: ['acronym'] }, { value: 'Harvard University', types: ['ror_display'] }] },
      { names: [{ value: 'Harvard University', types: ['ror_display'] }] },
      { names: [{ value: 123, types: ['ror_display'] }] }, null
    ] });
    expect(suggestions).toEqual(['Harvard University']);
  });

  it('reports malformed responses and HTTP failures to the caller', () => {
    for (const malformed of [true, false]) {
      const error = jasmine.createSpy('error');
      TestBed.inject(UniversitiesApi).search('University').subscribe({ error });
      const request = TestBed.inject(HttpTestingController).expectOne(() => true);
      if (malformed) request.flush({ unexpected: [] });
      else request.flush('Unavailable', { status: 503, statusText: 'Service unavailable' });
      expect(error).toHaveBeenCalled();
    }
  });
});
