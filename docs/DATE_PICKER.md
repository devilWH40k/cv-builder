# Date picker

`app-date-picker` is a shared reactive-form field. Pass a non-nullable
`FormControl<string>`, `inputId`, and `label`, as with the other shared controls.

- `mode`: `year`, `month-year` (default), or `day-month-year`.
- `startViewMode`: `day`, `month` (default), or `year`. Views finer than the selected precision are clamped.
- `startFromDate`: optional `Date` used when opening an empty picker. Defaults to today.
- An existing selected value takes precedence over `startFromDate`.

Values are calendar strings: `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`. An empty string
means no date. Changing `mode` affects the next selection; it does not silently
rewrite an existing date. No timezone conversion is applied.

The heading moves from days to months to years. Previous/next buttons navigate
the visible period. Tab navigates controls; Enter/Space selects a date; Escape
closes the picker and returns focus to its trigger. Clear removes the date.

Experience periods default to month/year precision. Only company is required.
Current work displays Present and ignores the retained end date during validation.
Other periods validate ordering at the precision shared by both dates.
