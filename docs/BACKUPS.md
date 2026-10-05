# CV backups

The header's **Import / Export** dialog transfers saved CVs and reusable saved
experiences between browsers, domains, and devices. Export defaults to
`cv-builder-dd.mm.yyyy.zip`, using the local calendar date. Save editor changes first.

Both stores are exported from one read-only IndexedDB transaction. Imports
preserve IDs and update timestamps. A matching ID is replaced with the imported
record, even if its timestamp is older; a new ID is inserted. Experience links
retain their original IDs. Records absent from the archive remain unchanged.

The **Wipe previous data** checkbox is unchecked whenever the dialog opens.
When selected, both the CV and experience stores are cleared before the imported
records are written. The archive is fully validated first, and clearing and
writing happen in one transaction. A failure rolls back all changes, including
the clear. An empty valid backup with this option clears both stores.
Internal migration metadata is retained. The current editor draft is unchanged.

## Archive format (version 2)

- `manifest.json`: `format: "cv-builder"`, `schemaVersion: 2`, and an ISO `exportedAt`.
- `cvs.json`: saved CV records (`id`, `updatedAt`, `info`).
- `experiences.json`: saved experience records (`id`, `updatedAt`, `experience`).
- `photos/<index>.png` or `photos/<index>.jpg`: original image bytes.

Photos in JSON are null or objects containing `path`, `name`, `type`, and
`lastModified`. CV content, layout settings, and experience links are preserved.
Internal migration metadata is not transferred.

Version 1 CV-only backups remain importable; they contain no saved-experience
library. Version 2 requires both JSON collections, even if one is empty.
Older apps that support only version 1 must be updated to read version 2 backups.

The codec loads on demand and uses fflate. JSON is compressed; JPEG and PNG are
stored without recompression. Limits: 1,000 CVs, 1,000 saved experiences, 1,003
entries, 100 MiB compressed and extracted data, and 10 MiB per JSON entry.
Invalid records, duplicate IDs or entries, unexpected paths, missing photos,
and unsupported versions are rejected.

Existing databases are opened at their current version. If a required object
store is missing, a version upgrade creates it without deleting existing stores.
Other tabs may need to close to allow the upgrade.

Backups are not encrypted. This is snapshot transfer, not ongoing synchronization.
