import { CustomEntryIcons, entryIcon } from "../../../core/dialogs/custom-entry-dialog/custom-entry-icon";

interface UsedTechnologyGroup {
  readonly label: string;
  readonly options: readonly { readonly name: string; readonly icon: string }[];
}

export const USED_TECHNOLOGY_CATALOG = [
  {
    label: 'Languages',
    options: [
      { name: 'JavaScript', icon: 'ic-javascript.svg' },
      { name: 'TypeScript', icon: 'ic-typescript.svg' },
      { name: 'HTML', icon: 'ic-html.svg' },
      { name: 'CSS', icon: 'ic-css.svg' },
      { name: 'SCSS', icon: 'ic-scss.svg' }
    ]
  },
  {
    label: 'Frontend',
    options: [
      { name: 'Angular 2+', icon: 'angular-icon.svg' },
      { name: 'Angular Material', icon: 'ic-angularmaterial.svg' },
      { name: 'Angular Universal', icon: 'ic-angular-universal.svg' },
      { name: 'RxJS', icon: 'ic-rxjs.svg' },
      { name: 'NgRx', icon: 'ic-ngrx.svg' },
      { name: 'ngx-translate', icon: 'ic-ngx-translate.svg' },
      { name: 'Bootstrap', icon: 'ic-bootstrap.svg' },
      { name: 'AG Grid', icon: 'ic-aggrid.svg' },
      { name: 'Chart.js', icon: 'ic-chartjs.svg' }
    ]
  },
  {
    label: 'Backend & APIs',
    options: [
      { name: 'Node.js', icon: 'node-js-icon.svg' },
      { name: 'SignalR', icon: 'ic-signalR.svg' },
      { name: 'Google Maps API', icon: 'ic-googlemapsapi.svg' },
      { name: 'Stripe', icon: 'ic-stripe.svg' },
      { name: 'Twilio', icon: 'ic-twilio.svg' }
    ]
  },
  {
    label: 'Testing',
    options: [{ name: 'Playwright', icon: 'ic-playwright.svg' }]
  },
  {
    label: 'Tools & Cloud',
    options: [
      { name: 'Azure DevOps', icon: 'ic-azuredevops.svg' },
      { name: 'Prettier', icon: 'ic-prettier.svg' },
      { name: 'Sentry', icon: 'ic-sentry.svg' }
    ]
  }
] as const satisfies readonly UsedTechnologyGroup[];

export const USED_TECHNOLOGY_GROUPS = USED_TECHNOLOGY_CATALOG.map((group) => ({
  label: group.label,
  options: group.options.map((technology) => technology.name)
}));

const technologyIcons: Readonly<Record<string, string | undefined>> = Object.fromEntries(
  USED_TECHNOLOGY_CATALOG.flatMap((group) =>
    group.options.map((technology) => [
      technology.name, 'used-tech-icons/' + encodeURIComponent(technology.icon)
    ])
  )
);

export const USED_TECHNOLOGY_ICONS: Readonly<Record<string, string | undefined>> = {
  ...technologyIcons,
  // Older saved CVs used this name for Angular.
  Angular: technologyIcons['Angular 2+']
};

export function usedTechnologiesView(
  technologies: readonly string[], preferred: 'blocks' | 'comma-separated', customIcons: CustomEntryIcons = {}
): 'blocks' | 'comma-separated' {
  return technologies.some((technology) => !usedTechnologyIcon(technology, customIcons))
    ? 'comma-separated' : preferred;
}

export function usedTechnologyIcon(name: string, customIcons: CustomEntryIcons = {}): string | undefined {
  return entryIcon(USED_TECHNOLOGY_ICONS, name) ?? entryIcon(customIcons, name);
}
