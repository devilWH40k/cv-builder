# CV Constructor

`/constructor` is a lazy-loaded Fabric.js feature. Choose **Open in constructor**
from a saved CV's context menu or preview, or use the same action on `/preview`. Constructor
conversion makes an independent design; editing the form later does not overwrite
the design, and constructor changes do not change the source CV.

The constructor supports editable text, font size/weight/style, text and page
alignment, solid and gradient fills, uploaded raster images, freehand drawing,
shapes, layers, locking, duplication, keyboard movement, and multiple A4 pages.
Undo and redo apply to the current page's editing session and reset when switching
pages. Page deletion requires confirmation.

Home's **Files** tab contains the existing CV and folder collection. **Designs**
lists all saved visual designs and opens them in the constructor. The constructor
landing page shows the six most recently visited saved designs under **Recently**.
Visit timestamps are stored separately in IndexedDB metadata, so opening a design
does not change its content modification time. Unsaved designs enter this list
after their first save; deleting a design also removes its visit history.

The editor opens as a full-viewport overlay using the shared `DialogOverlay`
directive. The background becomes inert and focus stays within the editor.
The top-right close action and Escape preserve unsaved-change confirmation and
return to the originating Home tab, or to the constructor landing page. **Fit page**
adjusts zoom to the available canvas space; manual zoom remains available.

## Code boundaries

All code lives under `src/app/features/constructor/`:

- `interfaces/constructor-document.ts` defines versioned saved documents, page
  coordinates and UI snapshots. Page coordinates use CSS pixels at 96 DPI.
- `helpers/preview-to-design.ts` measures an isolated, off-screen `Preview`,
  including its CSS column fragments, and converts the first flow into native
  Fabric text, images and decorations. It normalizes fonts before measuring.
  Text is imported as visual lines and style runs, preserving inline links as
  separate objects. Free positioning does not automatically reflow later pages.
- `services/constructor-editor.ts` owns the mutable Fabric canvas. Its commands
  and readonly selection/layer snapshots form the boundary used by components.
  Add editing operations here rather than accessing Fabric objects in templates.
- `services/constructor-session.ts` owns document metadata, page snapshots,
  dirty state and saves. Its state is scoped to the constructor route.
- `services/constructor-repository.ts` stores documents in IndexedDB's
  `constructor-designs` store using the existing `CvDatabase` connection.
- `helpers/design-validation.ts` checks documents before Fabric loads them.
  Portable files accept known object classes, embedded PNG/JPEG/WebP images and
  permitted URL schemes. They do not load remote image resources.
- `helpers/fabric-metadata.ts` registers persistent object identity, labels and
  hyperlinks. Extend this adapter when adding persisted object metadata.
- `helpers/design-pdf.ts` exports page objects as SVG with native text and explicit
  hyperlink wrappers, then uses the existing pdfmake dependency to create PDFs.
  Pages are never flattened into screenshots for PDF export.
- `components/` contains page orchestration, the reusable property/layer panel,
  and a shared design list used by Home and Recently.

When extending the persisted format, add a schema migration and validation rather
than relying on arbitrary Fabric JSON. New object classes must be included in
validation and tested through save/reopen and PDF export.

## Fonts, assets and exports

Constructor color pickers share `appDebouncedColor`: preview updates wait for a
150 ms input pause, with an immediate final commit on blur or an outside pointer
press before canvas selection changes. Pending work is canceled on destruction.

Undo/redo compares scenes by object ID and restores only changed/added objects,
removing deleted objects and restoring stack order and backgrounds. Unchanged
instances and decoded image caches remain live. History restoration redraws the
canvas without page-loading spinners; changing pages still uses loading indicators.

Copy style sits after Select and uses one selected object as the source. Clicking
a canvas object or layer applies compatible paints, border settings, shape blur,
text formatting or image filters in one undoable action. Content, links, position,
rotation, scale and frame dimensions are not copied. The tool returns to Select
after applying; Escape or Select cancels it. Locked targets are unchanged.

Leaving a dirty constructor uses the shared unsaved-changes dialog also used by
the CV editor: Save and leave, Leave, or Cancel. Close, Escape and backdrop clicks
cancel; saving blocks dismissal, and failed saves report a toast while retaining
the dialog. Browser reload/tab close still uses the native beforeunload warning.

Textbox handles resize the frame instead of scaling glyphs: horizontal changes
reflow text, while vertical changes retain at least the content height. The
`LayoutTextbox` subclass registers for native Textbox scenes, preserves font sizes
and stores optional frame height as `designTextHeight` through history and exports.

The session clipboard supports Copy/Cut/Paste for single objects and multi-selections
using object/layer context menus or Ctrl/Cmd+C/X/V. Right-clicking an already
selected object retains the full selection; right-clicking another selects it.
The empty canvas offers Paste. Ctrl/Cmd+A selects all page objects;
text fields keep native text clipboard behavior. Copies retain world transforms,
styles, effects and links, and paste with new layer IDs and a small repeated offset.
Each cut/paste/duplicate is one history action. Cut is disabled if any selected
object is locked. The in-app clipboard survives switching pages/designs during
the current session; it is not shared with other apps or browser tabs.

Select multiple unlocked objects and choose **Group** from the context menu or
press Ctrl/Cmd+G to move them together. **Ungroup** (Ctrl/Cmd+Shift+G) releases
the selected groups while preserving their positions. Groups can contain groups;
Layers shows expandable member rows. Each double-click enters one group level:
select an inner group first, then double-click again to select a member or edit
its text. Selecting the outer group again restores whole-group movement.
Grouping participates in history, saved/portable scenes, copying and PDF export.
Groups use the existing version 1 Fabric Group representation.
Resizing groups or multi-selections reflows their text frames without stretching
glyphs or changing font sizes, including text inside nested groups.
The Properties panel exposes controls shared by all group members, including
text formatting, rectangle borders, shape blur and image filters when applicable.
Differing values are marked Mixed. Changes apply recursively to unlocked members
in one history action; movement and page alignment still act on the group.
Each Layers row has a pen button for renaming. Enter, the check button or blur
saves; Escape cancels. Empty or whitespace-only names leave the name unchanged.
Custom names change only layer labels, including for text objects, and persist
through history, copying and portable designs. The optional `designLayerName`
metadata is additive to version 1 scenes; older scenes keep their existing labels.

Circles and rectangles support 0–40 px blur while retaining editable geometry.
`EffectRect`/`EffectCircle` extend native Fabric rendering and register for native
scene types, including existing imported shapes. Image filters use Fabric's pixel
filters: brightness, contrast, saturation, blur, grayscale, sepia and invert.
Resetting filters restores the embedded original image. All settings participate
in history and saved scenes. PDF exports embed processed image pixels and rasterize
only blurred shapes at up to 2× resolution (8192 px maximum side), retaining native
text and link annotations. CSS/SVG filter support is not required from PDF readers.
Groups containing blurred shapes render without geometry-sized group caches so
the blur extends past group edges, including nested groups and reopened designs.
Groups without blur retain normal caching; explicit clip paths still clip artwork.
PDF blur images are rendered in their parent group's coordinates so nested
transforms and opacity apply once, while text and unaffected artwork stay vector.

Dragging snaps visual edges/centers to the page edges, 16 mm margins, page center,
and other objects. Axis-aligned resizing matches other object dimensions or the
page content width/height while retaining the opposite anchor. A six-screen-pixel
tolerance scales with zoom. Hold Alt to bypass snapping. Temporary guides are
drawn outside the scene objects and are excluded from saves and exports.

Personal summaries and project descriptions import as editable multiline text
blocks, retaining measured line breaks, bullets and inline styles. A description
crossing an A4 boundary becomes one block per page. Existing saved scenes retain
their objects; import the source CV again to use the grouped conversion. Inline
description links are embedded with the text and preserved in PDF exports.

CV-based designs default to `<cv_name>_design`. The editor has Page properties on
the left and separate Properties and Layers panels on the right. The shared
`app-resize-handle` controls sidebar widths with pointer dragging or arrow keys
(Shift for larger steps, Home/End for limits). Its `size` model and `axis` input
also support the vertical divider between Properties and Layers, using Up/Down
keys. Layers scroll only at the outer panel. Panels stack on narrow screens.
Each page stores its background color and optional embedded image in its Fabric
scene. Images cover the page with centered cropping. Background edits participate
in undo/redo, save/reopen, portable designs, and PDF export, without becoming object
layers. Constructor notifications use the shared toast service.

The editor uses Roboto and its regular, bold, italic and bold-italic variants from
pdfmake's existing virtual font files. Loading those same files through `FontFace`
keeps browser and PDF font metrics aligned without external font requests. Adding
font families requires registering files for both the canvas and PDF renderer.

Constructor image uploads reuse the shared photo preview dialog, offering the
original file, a transparent circular crop, or a rectangle with independent width
and height controls. Applying inserts the result; cancelling leaves the canvas
unchanged. CV uploads retain their existing circular preview and square export
for the portrait renderer's own mask.

Raster images are embedded as data URLs in versioned scene JSON. Imported CV SVG
contact, technology and social icons retain vector paths/groups, viewport padding,
colors, gradients, clipping and links through enlargement, save/reopen and PDF
export. SVGs containing bitmaps or unsupported effects use the existing raster
fallback. Previously saved PNG icons and custom icons already normalized to PNG
cannot recover their vector geometry; reopen the original CV to import its SVG
sources again. Text remains editable/vector content. This makes
individual `.cv-design.json` files self-contained. A future asset repository can
replace inline data with references behind the editor/storage boundary.

**Save** persists the design in this browser. Its `?design=<id>` URL can reopen it
after refresh. **Design file** downloads an editable, portable JSON backup;
**Import design** opens a copy with a new ID. These files are separate from the
existing CV database ZIP backups, which continue to cover structured CVs, folders,
experiences and technologies. Wiping that CV library does not delete designs.

Links can be set on text, images and shapes. In the editor, **Open link in new tab**
opens the selected object's link without interfering with selection. PDF export
preserves link annotations and selectable text, including gradient text. Text copy
order follows object order; free-form designs are not tagged or guaranteed to
provide a semantic document reading order for every PDF consumer.

## Validation

```sh
npm test -- --watch=false --browsers=ChromeHeadless --include="src/app/features/constructor/**/*.spec.ts"
npm run build
```

Tests cover conversion across preview columns, text and image serialization,
gradient/link export, history, locking, independent pages, concurrent/failed saves,
portable-file validation, and upgrading existing databases without losing CVs.
