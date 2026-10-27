# CV backups

The header's **Import / Export** dialog transfers saved CVs and reusable saved
experiences, folders, and the technology library between browsers, domains, and devices. Export defaults to
`cv-builder-dd.mm.yyyy.zip`, using the local calendar date. Save editor changes first.

All four stores are exported from one read-only IndexedDB transaction. Imports
preserve IDs and update timestamps. A matching ID is replaced with the imported
record, even if its timestamp is older; a new ID is inserted. Experience links
retain their original IDs. Folder membership from the archive takes precedence
over existing assignments, keeping each CV in at most one folder. Matching folder
IDs replace that folder's membership. Records absent from the archive remain unchanged.

The **Wipe previous data** checkbox is unchecked whenever the dialog opens.
When selected, the CV, experience, technology, and folder stores are cleared before the imported
records are written. The archive is fully validated first, and clearing and
writing happen in one transaction. A failure rolls back all changes, including
the clear. An empty valid backup with this option clears all four stores.
Internal migration metadata is retained. The current editor draft is unchanged.

## Archive format (version 6)

- `manifest.json`: `format: "cv-builder"`, `schemaVersion: 6`, and an ISO `exportedAt`.
- `cvs.json`: saved CV records (`id`, `updatedAt`, `info`).
- `experiences.json`: saved experience records (`id`, `updatedAt`, `experience`).
- `technologies.json`: saved technology records with optional custom icons.
- `folders.json`: one-level folder records (`id`, `name`, `cvIds`).
- `photos/<index>.png` or `photos/<index>.jpg`: original image bytes.
- `logos/<index>.png` or `logos/<index>.jpg` or `logos/<index>.svg`: original optional company logo bytes.

Photos and company logos in JSON are null or objects containing `path`, `name`, `type`, and
`lastModified`. CV content, layout settings, and experience links are preserved.
Internal migration metadata is not transferred. Version 5 preserves optional
contact information (`phone`, `email`, and `socials` entries with `network` and
`value`). Older CVs without contact information remain supported. Invalid contact
values can be restored for editing, but are omitted from preview and PDF links.

Version 6 adds optional company logos; older CVs without a logo remain supported.
Versions 1 through 5 remain importable. Version 1 contains CVs only, version 2 adds
saved experiences, and version 3 adds technologies. These versions have no folders.
Version 4 requires all four JSON collections, even when empty. Folder names must
be nonblank and at most 120 characters; membership must reference CVs in the archive,
with no duplicate assignments or nested folders. Older apps must be updated to read
version 6 backups to preserve company logos.

The codec loads on demand and uses fflate. JSON is compressed; JPEG and PNG are
stored without recompression. Limits: 1,000 CVs, 1,000 saved experiences, 1,000
technologies, 1,000 folders, 2,005
entries, 100 MiB compressed and extracted data, and 10 MiB per JSON entry.
Invalid records, duplicate IDs or entries, unexpected paths, missing photos or logos,
and unsupported versions are rejected.

Existing databases are opened at their current version. If a required object
store is missing, a version upgrade creates it without deleting existing stores.
Other tabs may need to close to allow the upgrade.

Backups are not encrypted. This is snapshot transfer, not ongoing synchronization.
