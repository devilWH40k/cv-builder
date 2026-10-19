import { Routes } from '@angular/router';
import { provideAteEditor } from '@flogeez/angular-tiptap-editor';
import { Create } from './components/create/create';
import { createLeaveGuard } from './create-leave.guard';

export const CREATE_ROUTES: Routes = [
  { path: '', component: Create, canDeactivate: [createLeaveGuard], providers: [provideAteEditor()] }
];
