# Dropdown

A menu trigger with projected trigger content, typed actions, keyboard navigation, and optional custom menu template. selected emits the complete DropdownItem.

Selector: `ui-dropdown`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `iconGrid` | `boolean` | `false` |
| `opensRight` | `boolean` | `false` |
| `compact` | `boolean` | `false` |
| `alignStart` | `boolean` | `false` |
| `menuId` | `string` | **Required** |
| `label` | `string` | **Required** |
| `closeOnSelect` | `boolean` | `true` |
| `openOnHover` | `boolean` | `true` |
| `items` | `readonly DropdownItem[]` | `[]` |
| `content` | `TemplateRef<unknown> \| null` | `null` |

## Outputs

| Output | Payload |
| --- | --- |
| `selected` | `DropdownItem` |

## Example

```ts
import { signal } from '@angular/core';
import { Dropdown } from 'angular-shared-ui/dropdown';
```

Add `Dropdown` to the parent component's `imports`.

Parent class members:

```ts
readonly items = [{ id: 'save', label: 'Save', shortcut: 'Ctrl+S' }];
readonly action = signal('');
```

```html
<ui-dropdown menuId="file-menu" label="File actions" [items]="items" (selected)="action.set($event.id)">File</ui-dropdown>
```
