import { Routes } from '@angular/router';

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
  }
];
