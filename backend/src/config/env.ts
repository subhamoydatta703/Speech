import { z } from 'zod';

const integer = (fallback: number, min: number, max: number) =>
  z.coerce.number().int().min(min).max(max).default(fallback);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: integer(4000, 1, 65535),
  DATABASE_URL: z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        ['postgresql:', 'postgres:'].includes(url.protocol) &&
        url.hostname.endsWith('.neon.tech') &&
        ['require', 'verify-full'].includes(url.searchParams.get('sslmode') ?? '')
      );
    }, 'Use a Neon PostgreSQL URL with sslmode=require or verify-full'),
  CLERK_JWT_KEY: z
    .string()
    .min(1)
    .transform((key) => key.replace(/\\n/g, '\n'))
    .refine((key) => key.includes('-----BEGIN PUBLIC KEY-----'), 'Use the Clerk PEM public key'),
  CLERK_ISSUER: z
    .string()
    .url()
    .refine((value) => new URL(value).protocol === 'https:'),
  CLERK_AUTHORIZED_PARTIES: z.string().min(1),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  MAX_CONCURRENT_REQUESTS: integer(4, 1, 32),
  REQUESTS_PER_MINUTE: integer(60, 1, 10000),
  REQUEST_TIMEOUT_MS: integer(10000, 1000, 180000),
});

export type Config = z.infer<typeof schema> & {
  origins: string[];
  authorizedParties: string[];
};

export function readConfig(env: Record<string, string | undefined> = process.env): Config {
  const value = schema.parse(env);
  const parseOrigins = (list: string) =>
    list.split(',').map((item) => {
      const origin = item.trim();
      const url = new URL(origin);
      if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Origins must be exact HTTP(S) origins without paths or trailing slashes');
      }
      if (value.NODE_ENV === 'production' && url.protocol !== 'https:') {
        throw new Error('Production origins must use HTTPS');
      }
      return origin;
    });
  return {
    ...value,
    origins: parseOrigins(value.CORS_ORIGINS),
    authorizedParties: parseOrigins(value.CLERK_AUTHORIZED_PARTIES),
  };
}
