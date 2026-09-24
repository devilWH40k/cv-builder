# Notifications and save feedback

The app shell renders the shared toast host at the bottom right. Use
`ToastService.show(theme, message)` with `success`, `danger`, or `alert`.
Success messages dismiss after five seconds, pausing during hover or focus;
danger and alert messages remain until dismissed.

The CV-specific `SaveCv` service coordinates saves and their notifications.
It prevents overlapping submissions and preserves newer draft state when a save
finishes after navigation. `SavedCvs` remains responsible for IndexedDB access.
