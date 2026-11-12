import { contractLabelKeys } from '@hallomada/shared/job-offer-options';

// French labels mirrored from apps/web/messages/fr/jobs.json until the mobile
// app gets shared i18n.
const labels = {
  jobTypes: {
    auPair: 'Au pair',
    training: 'Formation',
    voluntary: 'Volontariat',
    internship: 'Stage',
    miniJob: 'Mini-job',
    job: 'Emploi',
    freelance: 'Freelance',
    scholarship: "Bourse d'étude",
  },
  contracts: {
    CDI: 'CDI',
    CDD: 'CDD',
    'FSJ/FOJ/BFD': 'FSJ/FOJ/BFD',
    fullTime: 'Temps plein',
    partTime: 'Temps partiel',
    freelance: 'Freelance',
    apprenticeship: 'Apprentissage',
  },
  workModes: { onSite: 'Sur site', hybrid: 'Hybride', remote: 'À distance' },
  salaryPeriods: { hour: 'heure', month: 'mois', year: 'année' },
  workTimes: { fullTime: 'Temps plein', partTime: 'Temps partiel' },
} as const;

/** Resolves a `labels.<group>.<value>` key; falls back to the raw value. */
function label(key: string) {
  const [, group, value] = key.split('.');
  const groupLabels = labels[group as keyof typeof labels] as Record<string, string> | undefined;
  return groupLabels?.[value] ?? value;
}

export function jobTypeLabel(type: keyof typeof labels.jobTypes) {
  return labels.jobTypes[type];
}

export function workModeLabel(mode: keyof typeof labels.workModes) {
  return labels.workModes[mode];
}

export function contractLabel(job: Parameters<typeof contractLabelKeys>[0]) {
  return contractLabelKeys(job).map(label).join(' · ');
}

export function locationLabel(job: {
  city: string;
  workMode?: keyof typeof labels.workModes;
  remoteLocation?: string;
}) {
  return job.workMode === 'remote'
    ? job.remoteLocation || labels.workModes.remote
    : job.city;
}

export function salaryLabel(salary: number, period?: keyof typeof labels.salaryPeriods) {
  const amount = salary.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
  return period ? `${amount} / ${labels.salaryPeriods[period]}` : amount;
}

/** Stored dates are plain `YYYY-MM-DD` strings. */
export function formatDate(value: string | number) {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : new Date(value);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
