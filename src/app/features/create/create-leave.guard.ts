import { CanDeactivateFn } from '@angular/router';
import type { Create } from './components/create/create';

export const createLeaveGuard: CanDeactivateFn<Create> = (component) => component.canDeactivate();
