import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideConstructorIndexedDbStorage } from 'constructor/indexeddb';
import { CvDatabase } from './features/cv/services/cv-database';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(),
    provideConstructorIndexedDbStorage(CvDatabase),
    provideRouter(routes)
  ]
};
