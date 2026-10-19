import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Config } from '../config/env';
import { ApiError, untilAborted } from '../lib/errors';
import { AdmissionControl } from '../lib/limiter';

type ActiveRequest = {
  controller: AbortController;
  releaseSlot: () => void;
  timeout: ReturnType<typeof setTimeout>;
  onDisconnect: () => void;
  onResponseClose: () => void;
  reply: FastifyReply;
  startedAt: number;
};

/** Owns each request's slot, deadline and cancellation signal. Stores no user content. */
export function registerRequestLifecycle(
  app: FastifyInstance,
  config: Config,
  authenticate: (request: FastifyRequest) => Promise<void>,
) {
  const limits = new AdmissionControl(config.MAX_CONCURRENT_REQUESTS, config.REQUESTS_PER_MINUTE);
  const requests = new WeakMap<FastifyRequest, ActiveRequest>();
  const running = new Set<AbortController>();

  function finishRequest(request: FastifyRequest) {
    const active = requests.get(request);
    if (!active) return;

    active.releaseSlot();
    clearTimeout(active.timeout);
    running.delete(active.controller);
    request.raw.removeListener('aborted', active.onDisconnect);
    request.raw.socket?.removeListener('close', active.onDisconnect);
    active.reply.raw.removeListener('close', active.onResponseClose);
    requests.delete(request);
  }

  async function beginRequest(request: FastifyRequest, reply: FastifyReply) {
    const releaseSlot = limits.acquire();
    const controller = new AbortController();

    const onDisconnect = () => {
      controller.abort(new ApiError(499, 'CANCELLED', 'The request was cancelled.'));
      finishRequest(request);
    };
    const onResponseClose = () => {
      if (!reply.raw.writableEnded) onDisconnect();
    };
    const timeout = setTimeout(() => {
      const error = new ApiError(
        504,
        'REQUEST_TIMEOUT',
        'The request exceeded its time limit.',
        true,
      );
      controller.abort(error);
      // The awaiting handler sends the response; the timer only cancels work.
      // A disconnected socket may never reach onResponse, so release its slot here too.
      finishRequest(request);
    }, config.REQUEST_TIMEOUT_MS);

    requests.set(request, {
      controller,
      releaseSlot,
      timeout,
      onDisconnect,
      onResponseClose,
      reply,
      startedAt: performance.now(),
    });
    running.add(controller);
    request.raw.once('aborted', onDisconnect);
    request.raw.socket?.once('close', onDisconnect);
    reply.raw.once('close', onResponseClose);
  }

  function getRequestSignal(request: FastifyRequest): AbortSignal {
    const active = requests.get(request);
    if (!active) throw new ApiError(499, 'CANCELLED', 'The request is no longer active.');
    return active.controller.signal;
  }

  async function requireUser(request: FastifyRequest) {
    const signal = getRequestSignal(request);
    await untilAborted(authenticate(request), signal);
  }

  app.addHook('onResponse', async (request) => {
    const active = requests.get(request);
    if (!active) return;
    finishRequest(request);
    app.log.info(
      { requestId: request.id, durationMs: Math.round(performance.now() - active.startedAt) },
      'request finished',
    );
  });

  app.addHook('preClose', async () => {
    for (const controller of running) {
      controller.abort(new ApiError(503, 'BUSY', 'The service is restarting.', true));
    }
  });

  return { beginRequest, requireUser, getRequestSignal };
}
