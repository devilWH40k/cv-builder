# Components and directives

Import declarations from component entry points (for example `angular-shared-ui/button`) and add components/directives to the consuming standalone component's `imports`. Examples below show imports, parent class members, and templates. The root `angular-shared-ui` entry point also re-exports the complete API.

Each reference lists all inputs (including inherited form-field inputs), defaults, model outputs, and a usage example.

- [Button](button.md): A native button wrapper with primary, monochrome, danger, and outline variants.
- [Input](input.md): A labeled typed reactive-form input with validation feedback, suggestions, and optional icons.
- [Textarea](textarea.md): A labeled multiline reactive-form control with shared validation feedback.
- [Select](select.md): A labeled native select accepting either strings or value/label option objects.
- [AsyncSelect](async-select.md): An editable combobox that filters supplied suggestions while allowing custom text.
- [MultiSelect](multi-select.md): A searchable grouped multi-select with optional custom entries and SVG icons.
- [Checkbox](checkbox.md): A labeled boolean reactive-form control with optional help text.
- [Radio](radio.md): A native radio choice controlled through checked/disabled inputs and a selected event.
- [DatePicker](date-picker.md): A reactive-form calendar supporting year, month/year, or complete date selection.
- [FileUpload](file-upload.md): A reactive file picker with photo/icon previews, optional removal, and an additional action.
- [PhotoPreview](photo-preview.md): A modal photo crop/preview editor.
- [Dialog](dialog.md): A modal shell providing focus handling, backdrop/Escape dismissal, and projected body/actions.
- [DeleteConfirmation](delete-confirmation.md): A modal confirmation prompt for destructive actions.
- [UnsavedChangesDialog](unsaved-changes-dialog.md): A modal prompt with Save, Leave, and Cancel decisions.
- [CustomEntryDialog](custom-entry-dialog.md): A reusable modal for adding a name and optional SVG icon.
- [ContextMenu](context-menu.md): A body-mounted context menu with keyboard navigation, viewport fitting, disabled actions, icons, and safe links.
- [Dropdown](dropdown.md): A menu trigger with projected trigger content, typed actions, keyboard navigation, and optional custom menu template.
- [Draggable](draggable.md): A pointer-driven wrapper with a floating preview and cancellation handling.
- [Resizable](resizable.md): A square content wrapper with pointer and keyboard resizing.
- [ResizeHandle](resize-handle.md): A keyboard/pointer separator controlling an adjacent panel size in CSS pixels.
- [ExpandPanel](expand-panel.md): A collapsible section with a heading, optional count, and projected body.
- [ResponsiveDrawer](responsive-drawer.md): A sidebar on wide screens that becomes a modal drawer on compact screens.
- [Tabs](tabs.md): An accessible tab strip with a required active model.
- [Spinner](spinner.md): A visual loading indicator with a screen-reader label.
- [Toasts](toasts.md): The application-wide notification outlet backed by ToastService.
- [Joyride](joyride.md): A guided walkthrough that highlights registered JoyrideTarget elements.
- [TableWrapper](table-wrapper.md): A typed table with column templates, optional search/visibility controls, loading and empty states, and optional Router query-parameter synchronization.
- [Table](table.md): A low-level accessible table container.
- [TableHeader](table-header.md): A low-level table header row rendering labels as columnheader cells.
- [TableRow](table-row.md): A low-level accessible table row projecting TableCell children.
- [TableCell](table-cell.md): A low-level table cell.
- [Tooltip](tooltip.md): Shows accessible help on hover or focus.
- [DebouncedColor](debounced-color.md): Debounces native color input previews for 150ms, then flushes pending color changes on blur or outside interaction.
- [DropTarget](drop-target.md): Registers a drop zone with DragDrop for the accepted drag type.
- [JoyrideTarget](joyride-target.md): Registers a named element for Joyride walkthrough steps.
- [DialogOverlay](dialog-overlay.md): Focus/inertness and backdrop behavior for a native dialog.
- [TableCellTemplate](table-cell-template.md): A typed projected cell template for TableWrapper.

## Supporting APIs

- [Services, base classes, models, and helpers](services-and-helpers.md)
