import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { CvDraft } from './features/cv/services/cv-draft';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'CV Builder',
    loadComponent: () => import('./features/home/components/home/home').then((m) => m.Home)
  },
  {
    path: 'create',
    title: 'Create your CV | CV Builder',
    loadChildren: () => import('./features/create/create.routes').then((m) => m.CREATE_ROUTES)
  },
  {
    path: 'preview',
    title: 'Your CV Preview | CV Builder',
    canActivate: [() => inject(CvDraft).current() ? true : inject(Router).createUrlTree(['/create'])],
    loadComponent: () => import('./features/preview/components/preview/preview').then((m) => m.Preview)
  }
];
