/** The database reads DATABASE_URL directly in config/db.ts. */
export type Config = {
  HOST: string;
  PORT: number;
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_SECRET_KEY: string;
  origins: string[];
  MAX_CONCURRENT_REQUESTS: number;
  REQUESTS_PER_MINUTE: number;
  REQUEST_TIMEOUT_MS: number;
  WINDOWS_INSTALLER_PATH?: string;
};
