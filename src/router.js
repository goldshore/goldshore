const normalizeOrigin = (rawOrigin, defaultProtocol) => {
  if (!rawOrigin) return null;

  const protocol = defaultProtocol
    ? defaultProtocol.endsWith(':')
      ? defaultProtocol
      : `${defaultProtocol}:`
    : 'https:';

  try {
    return new URL(rawOrigin);
  } catch (error) {
    return new URL(`${protocol}//${rawOrigin}`);
  }
};

const buildUpstreamRequest = (request, upstreamUrl) => {
  const url = new URL(request.url);
  const target = new URL(upstreamUrl);

  target.pathname = url.pathname;
  target.search = url.search;

  return new Request(target.toString(), request);
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const environment = (env.ENVIRONMENT || 'preview').toLowerCase();

    const productionOrigin = normalizeOrigin(env.PRODUCTION_ORIGIN, env.UPSTREAM_PROTOCOL);
    const previewOrigin = normalizeOrigin(env.PREVIEW_ORIGIN, env.UPSTREAM_PROTOCOL);

    const upstreamOrigin = environment === 'production'
      ? productionOrigin
      : previewOrigin || productionOrigin;

    if (!upstreamOrigin) {
      return fetch(request);
    }

    if (url.hostname === upstreamOrigin.hostname) {
      return fetch(request);
    }

    const upstreamRequest = buildUpstreamRequest(request, upstreamOrigin);
    const response = await fetch(upstreamRequest, {
      cf: {
        cacheTtl: env.CACHE_TTL ? Number(env.CACHE_TTL) : undefined,
        cacheEverything: true,
      },
    });

    const outgoing = new Response(response.body, response);

    if (outgoing.headers.has('Location')) {
      const location = new URL(outgoing.headers.get('Location'), upstreamOrigin);
      location.hostname = url.hostname;
      outgoing.headers.set('Location', location.toString());
    }

    return outgoing;
  },
};
