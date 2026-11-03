# Spinner

A visual loading indicator with a screen-reader label.

Selector: `app-spinner`.

## Inputs

| Input | Type | Default |
| --- | --- | --- |
| `label` | `string` | `'Loading'` |

## Outputs

None. Native DOM events can be handled on the host.

## Example

```ts
import { Spinner } from 'angular-shared-ui/spinner';
```

Add `Spinner` to the parent component's `imports`.

```html
<app-spinner label="Loading files" />
```
