import test from 'node:test';
import assert from 'node:assert/strict';
import { launchReadiness, readinessSummary } from '../src/lib/launch/readiness';

test('launch readiness only marks fully configured production services ready', () => {
  const checks = launchReadiness({
    APP_URL: 'https://academy.example.com',
    MONGODB_URI: 'mongodb://example',
    AUTH_SECRET: '12345678901234567890123456789012',
    EMAIL_PROVIDER: 'smtp',
    SMTP_HOST: 'smtp.example.com',
    SMTP_USER: 'user',
    SMTP_PASSWORD: 'password',
    EMAIL_FROM: 'Ayat Academy <hello@example.com>',
    SMTP_PORT: '587',
    MEDIA_PROVIDER: 'cloud-provider',
    CARD_PROVIDER: 'provider',
    CARD_API_KEY: 'secret',
  });

  assert.equal(readinessSummary(checks).allReady, true);
});

test('launch readiness flags insecure or incomplete production config', () => {
  const checks = launchReadiness({
    APP_URL: 'http://localhost:3000',
    AUTH_SECRET: 'short',
    MEDIA_PROVIDER: 'local-dev',
  });

  const summary = readinessSummary(checks);
  assert.equal(summary.allReady, false);
  assert.ok(summary.percentage < 100);
  assert.equal(checks.find(item => item.key === 'app-url')?.ready, false);
  assert.equal(checks.find(item => item.key === 'media')?.ready, false);
});
