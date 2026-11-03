# Tabs

An accessible tab strip with a required active model. The host renders panels matching the supplied panelId values.

Selector: `ui-tabs`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `tabs` | `readonly Tab[]` | **Required** |
| `active` | `string` | **Required** |
| `label` | `string` | `'Editor sections'` |

## Outputs

| Output | Payload |
| --- | --- |
| `activeChange` | `string` |

## Example

```ts
import { signal } from '@angular/core';
import { Tabs } from 'angular-shared-ui/tabs';
```

Add `Tabs` to the parent component's `imports`.

Parent class members:

```ts
readonly tabs = [{ id: 'details', label: 'Details', panelId: 'details-panel' }];
readonly active = signal('details');
```

```html
<ui-tabs [tabs]="tabs" [(active)]="active" label="Document sections" />
<section id="details-panel" role="tabpanel" [hidden]="active() !== 'details'">Details</section>
```
