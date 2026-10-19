import type { RequestHandler } from 'express';
import type { Config } from '../types/app-config';
import { AdmissionControl } from '../lib/limiter';

/** Bound concurrent account requests without changing the supplied auth middleware. */
export function createRequestLifecycle(config: Config): RequestHandler {
  const limits = new AdmissionControl(config.MAX_CONCURRENT_REQUESTS, config.REQUESTS_PER_MINUTE);
  return (_req, res, next) => {
    const release = limits.acquire();
    // Close a stalled connection; do not race the auth middleware by sending another response.
    // This bounds HTTP waiting, not an already-running database query.
    const timer = setTimeout(() => {
      res.destroy();
    }, config.REQUEST_TIMEOUT_MS);
    timer.unref();
    const cleanup = () => {
      clearTimeout(timer);
      release();
      res.off('finish', cleanup);
      res.off('close', cleanup);
    };
    res.once('finish', cleanup);
    res.once('close', cleanup);
    next();
  };
}
