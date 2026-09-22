import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { CvDraft } from './features/cv/cv-draft';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'CV Builder',
    loadComponent: () => import('./features/home/home').then((m) => m.Home)
  },
  {
    path: 'create',
    title: 'Create your CV | CV Builder',
    loadComponent: () => import('./features/create/create').then((m) => m.Create)
  },
  {
    path: 'preview',
    title: 'Your CV Preview | CV Builder',
    canActivate: [() => inject(CvDraft).current() ? true : inject(Router).createUrlTree(['/create'])],
    loadComponent: () => import('./features/preview/preview').then((m) => m.Preview)
  }
];
