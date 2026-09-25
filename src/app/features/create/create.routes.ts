import { Routes } from '@angular/router';
import { provideAteEditor } from '@flogeez/angular-tiptap-editor';
import { Create } from './create';

export const CREATE_ROUTES: Routes = [
  { path: '', component: Create, providers: [provideAteEditor()] }
];
