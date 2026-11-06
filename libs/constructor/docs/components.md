# Constructor components

Import `DesignList` from `constructor/core`; import editor components from
`constructor/editor`. Add each component to the consuming standalone component's
`imports`. Component class names are unchanged; selectors use `lib`.

## DesignList

`lib-design-list` displays saved/recent designs with links and deletion actions.

| Input | Type | Default |
| --- | --- | --- |
| `designs` | `readonly DesignSummary[]` | Required |
| `returnTab` | `'files' \| 'designs' \| null` | `null` |
| `recent` | `boolean` | `false` |
| `deletingIds` | `readonly string[]` | `[]` |

`deleteRequested` emits the selected `DesignSummary`. The host confirms and
performs deletion. Links open `/constructor?design=<id>` and preserve returnTab.

```html
<lib-design-list [designs]="designs()" returnTab="designs"
  (deleteRequested)="deleteDesign($event)" />
```

## ConstructorPageComponent

`lib-constructor-page` orchestrates the landing page and fullscreen editor. It has
no inputs/outputs; URL query parameters select a saved design (`design`), a saved
CV (`cv`), or the current draft (`from=draft`). It provides its editor/session/tour
state locally. The host supplies storage and optional CV/version integration as
described in the [README](../README.md). Call `canDeactivate()` in the host's route
guard; it returns a boolean or Promise resolving after unsaved-change confirmation.

```html
<lib-constructor-page>
  <app-preview constructorPreview [embedded]="true" [readOnly]="true"
    style="--preview-max-height: none; --preview-max-scale: 1" />
</lib-constructor-page>
```

The projected Preview in this example is owned by the host app.

## Editor controls

These controls consume the current `ConstructorEditor` from their enclosing
editor's injector. They have no inputs. `ConstructorLayers` emits
`contextRequested: { event: MouseEvent; layerId: string }`; `ConstructorShortcuts`
emits `dismissed: void`. Other controls expose no outputs.

| Component | Purpose | Example |
| --- | --- | --- |
| `ConstructorProperties` | Selected object/group properties | `<lib-constructor-properties />` |
| `ConstructorPageProperties` | File name/status and page background | `<lib-constructor-page-properties />` |
| `ConstructorLayers` | Layer selection, ordering, locking, naming and groups | `<lib-constructor-layers (contextRequested)="menu.open($event.event, $event.layerId)" />` |
| `ConstructorTypography` | Text formatting toolbar | `<lib-constructor-typography />` |
| `ConstructorRulers` | Page rulers and draggable guides | `<lib-constructor-rulers />` |
| `ConstructorIconLibrary` | Searchable, incrementally loaded Lucide icons | `<lib-constructor-icon-library />` |
| `ConstructorObjectMenu` | Canvas/layer context menus and clipboard actions | `<lib-constructor-object-menu #menu />` |
| `ConstructorShortcuts` | Keyboard/mouse shortcut dialog | `<lib-constructor-shortcuts (dismissed)="shortcutsOpen.set(false)" />` |

The page already mounts these controls. For a custom composition, provide
`ConstructorEditor`, `ConstructorSession`, and `ConstructorTour` at the enclosing
component, attach the editor to a canvas, and keep controls within that injector.
