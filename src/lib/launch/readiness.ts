export type ReadinessItem = {
  key: string;
  label: string;
  ready: boolean;
  detail: string;
};

type EnvLike = Record<string, string | undefined>;

export function launchReadiness(env: EnvLike): ReadinessItem[] {
  let appUrlReady = false;
  try {
    const url = new URL(env.APP_URL || '');
    appUrlReady = url.protocol === 'https:';
  } catch {}

  const smtpPort = Number(env.SMTP_PORT || 587);
  const smtpReady = env.EMAIL_PROVIDER === 'smtp'
    && Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD && env.EMAIL_FROM)
    && Number.isInteger(smtpPort)
    && smtpPort > 0
    && smtpPort <= 65535;

  return [
    {
      key: 'app-url',
      label: 'Production application URL',
      ready: appUrlReady,
      detail: appUrlReady ? 'APP_URL uses HTTPS.' : 'Set APP_URL to the final HTTPS production URL.',
    },
    {
      key: 'database',
      label: 'MongoDB',
      ready: Boolean(env.MONGODB_URI),
      detail: env.MONGODB_URI ? 'Database connection string is configured.' : 'MONGODB_URI is missing.',
    },
    {
      key: 'auth',
      label: 'Authentication secret',
      ready: Boolean(env.AUTH_SECRET && env.AUTH_SECRET.length >= 32),
      detail: env.AUTH_SECRET && env.AUTH_SECRET.length >= 32 ? 'AUTH_SECRET is configured.' : 'Use an AUTH_SECRET of at least 32 characters.',
    },
    {
      key: 'email',
      label: 'Transactional email',
      ready: smtpReady,
      detail: smtpReady ? 'SMTP email is configured.' : 'Complete SMTP_HOST, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM, and EMAIL_PROVIDER=smtp.',
    },
    {
      key: 'media',
      label: 'Production media storage',
      ready: Boolean(env.MEDIA_PROVIDER && env.MEDIA_PROVIDER !== 'local-dev'),
      detail: env.MEDIA_PROVIDER && env.MEDIA_PROVIDER !== 'local-dev'
        ? 'A production media provider is configured.'
        : 'MEDIA_PROVIDER is still local-dev or unset. Production uploads need durable cloud storage.',
    },
    {
      key: 'payments',
      label: 'Live payment provider',
      ready: Boolean(env.CARD_PROVIDER && env.CARD_API_KEY),
      detail: env.CARD_PROVIDER && env.CARD_API_KEY
        ? 'A card provider is configured.'
        : 'Card payments are not configured. USDT can still be used when its admin wallet settings are complete.',
    },
  ];
}

export function readinessSummary(items: ReadinessItem[]) {
  const ready = items.filter(item => item.ready).length;
  return {
    ready,
    total: items.length,
    percentage: items.length ? Math.round((ready / items.length) * 100) : 0,
    allReady: ready === items.length,
  };
}
