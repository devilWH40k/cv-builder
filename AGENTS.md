## Project Overview

This project is an Angular 20 application written in TypeScript.

When working in this repository, follow modern Angular 20 and TypeScript practices. Prefer Angular's current APIs and patterns over legacy approaches unless the existing codebase requires otherwise.

## Technology Stack

* Angular 20
* TypeScript
* RxJS
* SCSS
* Standalone Angular APIs
* Angular Router
* Angular HttpClient

Check `package.json` before assuming exact library versions.

---

## General Working Rules

Before making changes:

1. Read the relevant existing files.
2. Understand the current implementation and surrounding architecture.
3. Look for existing patterns that solve similar problems.
4. Prefer the smallest change that correctly solves the task.
5. Do not refactor unrelated code.
6. Do not introduce new dependencies unless they are necessary.
7. Do not change public APIs unless the task requires it.

When requirements are ambiguous, inspect the existing codebase before choosing an implementation.

---

## Angular Architecture

Use modern Angular architecture.

Prefer:

* standalone components
* standalone directives
* standalone pipes
* functional providers
* functional HTTP interceptors
* functional route guards where appropriate
* lazy-loaded routes and features
* signals for synchronous reactive state
* RxJS for asynchronous streams and event composition
* built-in template control flow

Do not introduce new `NgModule`-based architecture unless required by an existing dependency or existing project structure.

Keep application bootstrap and global providers in the appropriate application configuration files.

---

## Components

Components should remain focused on presentation and UI orchestration.

Do not put substantial business logic directly inside components.

Extract reusable or domain-specific logic into appropriate:

* services
* utilities
* data-access layers
* state abstractions

Keep components small and cohesive.

Prefer external templates and styles when components become non-trivial.

Use `ChangeDetectionStrategy.OnPush` where appropriate.

---

## Signals

Prefer signals for local synchronous application and component state.

Use:

```ts
signal()
computed()
```

for reactive state and derived values.

Prefer:

```ts
readonly loading = signal(false);
readonly users = signal<User[]>([]);

readonly activeUsers = computed(() =>
  this.users().filter((user) => user.active),
);
```

over manually synchronized properties.

Use `computed()` for derived state instead of using `effect()` to copy values between signals.

Use `effect()` only for genuine side effects.

Do not mutate values stored inside signals directly.

Prefer:

```ts
this.users.update((users) => [...users, newUser]);
```

instead of mutating the existing array.

---

## Component Inputs and Outputs

For new components, prefer modern signal-based APIs where appropriate.

Prefer:

```ts
readonly user = input.required<User>();
readonly disabled = input(false);
```

over introducing new decorator-based inputs.

Use modern Angular output APIs where they fit the existing codebase.

Follow existing project conventions when modifying older components. Do not migrate unrelated components solely to modernize syntax.

---

## Dependency Injection

Prefer Angular's `inject()` API for new code where it improves readability.

Example:

```ts
private readonly http = inject(HttpClient);
private readonly router = inject(Router);
```

Do not rewrite existing constructor injection merely for stylistic reasons unless requested.

Services should use:

```ts
@Injectable({
  providedIn: 'root',
})
```

when they are intended to be application-wide singletons.

---

## Templates

Use Angular's built-in control flow for new code.

Prefer:

```html
@if (user()) {
  <app-user-details [user]="user()!" />
}
```

instead of:

```html
<div *ngIf="user">
```

Prefer:

```html
@for (user of users(); track user.id) {
  <app-user-card [user]="user" />
} @empty {
  <p>No users found.</p>
}
```

instead of introducing new `*ngFor` usage.

Always provide an appropriate `track` expression for `@for`.

Use:

* `@if`
* `@else`
* `@for`
* `@switch`
* `@defer`

where appropriate.

Keep complex expressions and business logic out of templates.

---

## TypeScript

Keep TypeScript strict.

Do not weaken compiler options to make errors disappear.

Avoid:

```ts
any
```

unless there is a documented and unavoidable reason.

Do not use:

```ts
as any
```

or unsafe type assertions merely to silence TypeScript errors.

Prefer:

* explicit domain types
* interfaces or type aliases
* generics
* type narrowing
* discriminated unions
* `unknown` for untrusted values
* readonly data where appropriate

Prefer:

```ts
unknown
```

over:

```ts
any
```

for values whose type is not yet known.

Narrow the value before using it.

---

## Type Inference

Allow TypeScript to infer obvious local types.

Prefer:

```ts
const count = 0;
const name = 'Angular';
```

instead of:

```ts
const count: number = 0;
const name: string = 'Angular';
```

Add explicit types where they improve API clarity, prevent ambiguity, or document domain behavior.

Public methods and important service boundaries should have clear types.

---

## Immutability

Prefer immutable updates.

Avoid modifying arrays or objects shared through application state.

Prefer:

```ts
const updatedUser = {
  ...user,
  name: newName,
};
```

and:

```ts
this.users.update((users) =>
  users.map((user) =>
    user.id === id
      ? { ...user, active: true }
      : user,
  ),
);
```

---

## RxJS

Use RxJS when working with:

* HTTP streams
* event streams
* asynchronous composition
* cancellation
* debouncing
* combining multiple asynchronous sources

Do not replace useful RxJS pipelines with signals merely for the sake of using signals.

Avoid nested subscriptions.

Do not write:

```ts
this.userService.getUser().subscribe((user) => {
  this.orderService.getOrders(user.id).subscribe(...);
});
```

Prefer composition using operators such as:

```ts
switchMap()
map()
filter()
combineLatest()
catchError()
```

Use `takeUntilDestroyed()` for imperative subscriptions tied to Angular lifecycle when needed.

Prefer the `async` pipe or signal interop when explicit subscriptions are unnecessary.

---

## RxJS and Signals

Use the appropriate abstraction for the problem.

A general guideline:

* Signals: synchronous application/UI state
* `computed()`: derived synchronous state
* RxJS: asynchronous streams and event composition
* HTTP: Observable-based data access
* `toSignal()`: expose an Observable as signal state when useful
* `toObservable()`: bridge signal state into an RxJS pipeline when necessary

Do not repeatedly convert between signals and Observables without a clear reason.

---

## HTTP

Use Angular `HttpClient`.

Keep HTTP access outside presentation components where practical.

Prefer dedicated data-access services.

Example structure:

```text
features/
  users/
    data-access/
      users-api.service.ts
```

Prefer functional HTTP interceptors for new interceptors.

Handle errors deliberately.

Do not silently swallow HTTP errors.

Do not expose authentication tokens, credentials, API secrets, or sensitive information in logs.

---

## Forms

Use Angular Reactive Forms for complex production forms unless the project explicitly uses another supported forms approach.

Prefer typed forms.

Avoid untyped form APIs.

Example:

```ts
readonly form = new FormGroup({
  email: new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.email,
    ],
  }),
});
```

Keep complicated validation logic outside templates.

---

## Routing

Prefer lazy loading for feature routes.

Example:

```ts
{
  path: 'users',
  loadChildren: () =>
    import('./features/users/users.routes')
      .then((m) => m.USERS_ROUTES),
}
```

For individual standalone pages:

```ts
{
  path: 'settings',
  loadComponent: () =>
    import('./features/settings/settings-page')
      .then((m) => m.SettingsPage),
}
```

Avoid eagerly loading large features without a reason.

---

## Project Structure

Prefer feature-oriented organization.

Example:

```text
src/app/
  core/
    auth/
    config/
    http/

  shared/
    ui/
    directives/
    pipes/
    utils/

  features/
    users/
      components/
      data-access/
      models/
      pages/
      users.routes.ts

    settings/
      components/
      data-access/
      pages/
      settings.routes.ts

  app.config.ts
  app.routes.ts
```

### `core/`

Use for application-wide infrastructure such as:

* authentication
* global HTTP infrastructure
* application configuration
* global services

### `shared/`

Use for genuinely reusable functionality such as:

* reusable UI components
* directives
* pipes
* generic utilities

Do not put feature-specific business logic in `shared/`.

### `features/`

Keep code belonging to a business feature together.

Prefer feature cohesion over organizing the entire application by technical type.

---

## Naming

Follow Angular and TypeScript naming conventions already established in the project.

Use descriptive names.

Avoid vague names such as:

```text
data
value
obj
temp
helper
manager
stuff
```

when a meaningful domain name is available.

Boolean values should generally communicate a condition:

```ts
isLoading
isAuthenticated
hasPermission
canSubmit
shouldRefresh
```

---

## Access Modifiers

Use appropriate visibility.

Prefer `private` for implementation details.

Use `readonly` when a reference should not be reassigned.

Example:

```ts
private readonly http = inject(HttpClient);

readonly users = signal<User[]>([]);
readonly isLoading = signal(false);
```

Do not expose internal implementation details unnecessarily.

---

## Error Handling

Do not hide errors without a reason.

Avoid empty error handlers such as:

```ts
catchError(() => EMPTY)
```

unless intentionally ignoring the failure is part of the required behavior.

Provide meaningful error handling at the appropriate application layer.

Do not expose internal server errors or sensitive information directly to users.

---

## Security

Never commit secrets.

Do not place private secrets in:

* Angular environment files
* TypeScript source
* client-side configuration
* repository files

Remember that Angular applications execute in the browser. Values included in an Angular bundle must be considered publicly accessible.

Do not log:

* authentication tokens
* passwords
* private API keys
* sensitive customer information

Validate and sanitize data at appropriate trust boundaries.

Do not assume client-side validation provides server-side security.

---

## Dependencies

Before adding a dependency:

1. Check whether Angular or TypeScript already provides the required functionality.
2. Check whether the project already has a suitable dependency.
3. Prefer small and actively maintained dependencies.
4. Consider bundle-size impact.
5. Avoid adding dependencies for trivial functionality.

Do not:

* upgrade Angular
* upgrade TypeScript
* upgrade RxJS
* replace major libraries
* modify dependency versions

unless required by the task.

Do not modify `package-lock.json` unless dependency changes require it.

---

## Formatting and Style

Follow the existing repository formatting.

If Prettier is configured, respect the project's Prettier configuration.

If ESLint is configured, follow its rules.

Do not disable lint rules simply to make errors disappear.

Do not make formatting-only changes to unrelated files.

---

## Testing

Add or update tests when behavior changes.

Tests should focus on observable behavior rather than implementation details.

For bug fixes, add a regression test when practical.

Do not:

* delete tests to make the suite pass
* weaken assertions without justification
* mark failing tests as skipped simply to make CI pass
* rewrite unrelated tests

Run the smallest relevant test set during development, then run the broader suite when appropriate.

---

## Validation

After modifying code, run the checks available in `package.json`.

Typically:

```bash
npm test
npm run build
```

If linting exists:

```bash
npm run lint
```

For focused changes, run relevant tests first.

Before considering the task complete:

1. Ensure TypeScript compiles.
2. Ensure the Angular build succeeds.
3. Run relevant tests.
4. Run lint when configured.
5. Check that no new warnings or errors were introduced.

If an existing unrelated error prevents validation, report it rather than modifying unrelated code.

---

## Code Changes

Keep diffs focused.

Do not:

* refactor unrelated files
* rename unrelated symbols
* reformat entire files unnecessarily
* move files without a reason
* change existing behavior outside the requested scope
* introduce abstractions for hypothetical future requirements

Prefer simple implementations over unnecessary abstraction.

Follow existing patterns unless there is a strong technical reason not to.

---

## Comments

Prefer self-explanatory code.

Add comments when they explain:

* why unusual behavior exists
* non-obvious business rules
* workarounds
* external constraints

Do not add comments that merely restate the code.

Avoid leaving outdated comments after changing implementation.

---

## Documentation

Update documentation when changes affect:

* setup
* configuration
* developer workflow
* public APIs
* architecture
* environment requirements

Do not create documentation for trivial implementation details.

---

## Git

Do not create commits unless explicitly requested.

Do not push changes unless explicitly requested.

Do not:

* rewrite Git history
* force push
* change branches
* amend existing commits
* discard existing uncommitted changes

unless explicitly instructed.

Before modifying a file, preserve existing user changes.

---

## Codex Workflow

For non-trivial tasks:

1. Inspect the relevant code.
2. Identify related components, services, routes, types, and tests.
3. Understand the data flow.
4. Determine the smallest appropriate solution.
5. Implement the change.
6. Run relevant tests.
7. Run the Angular build when appropriate.
8. Review the resulting diff.
9. Report what changed and any remaining concerns.

For debugging tasks, determine the root cause before applying speculative fixes.

When asked only to investigate or explain an issue, do not modify files.

---

## Avoid Legacy Patterns in New Code

Unless required by existing code or a dependency, do not introduce new usage of:

* unnecessary NgModules
* `*ngIf` when `@if` is appropriate
* `*ngFor` when `@for` is appropriate
* untyped Reactive Forms
* `any`
* nested RxJS subscriptions
* manual subscription cleanup when `takeUntilDestroyed()` is appropriate
* unnecessary manual change detection
* class-based HTTP interceptors when a functional interceptor is suitable
* mutable shared state
* unnecessary Zone.js-dependent patterns

Do not automatically migrate existing working legacy code unless migration is part of the task.

---

## Final Principle

Optimize for:

1. Correctness
2. Type safety
3. Simplicity
4. Maintainability
5. Testability
6. Performance

Prefer clear Angular code over clever abstractions.

When multiple implementations are valid, choose the simplest solution that fits the existing architecture and modern Angular 20 practices.

Before implementing or modifying UI, read
`docs/DESIGN_SYSTEM.md` and `src/styles/_tokens.scss`.

For icons use the lucide-angular library
Example:

```html
<lucide-icon [img]="DownloadIcon" [size]="20" />
```
