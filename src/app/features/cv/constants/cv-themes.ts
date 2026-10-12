export const CV_THEMES = [
  { value: 'basic', label: 'Basic' },
  { value: 'dark-blue', label: 'Dark Blue' },
  { value: 'dark', label: 'Dark' }
] as const;

export type CvTheme = (typeof CV_THEMES)[number]['value'];
