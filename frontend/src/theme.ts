export type ThemeMode = 'naval-cream' | 'aws-light' | 'github-dark' | 'datadog' | 'solarized-light';

export interface ThemeOption {
  id: ThemeMode;
  name: string;
  badge: string;
  description: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'naval-cream',
    name: 'Naval Cream (Default)',
    badge: 'Warm Cream / Deep Navy',
    description: 'Sophisticated warm-ivory enterprise SRE dashboard with deep navy accents',
  },
  {
    id: 'aws-light',
    name: 'AWS CloudWatch (Light)',
    badge: 'Enterprise White / Blue',
    description: 'Clean high-contrast corporate dashboard (AWS / Datadog style)',
  },
  {
    id: 'github-dark',
    name: 'GitHub SRE (Matte Dark)',
    badge: 'Charcoal / Slate',
    description: 'Flat engineering console, zero neon glare (GitHub style)',
  },
  {
    id: 'datadog',
    name: 'Datadog Navy (Dark)',
    badge: 'Deep Navy / Slate',
    description: 'Classic observability telemetry dashboard',
  },
  {
    id: 'solarized-light',
    name: 'Solarized Clean (Warm Light)',
    badge: 'Off-White / Indigo',
    description: 'High readability daylight operations console',
  },
];
