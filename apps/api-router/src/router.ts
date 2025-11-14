import type { ExportedHandler } from '@cloudflare/workers-types';

type Env = {
  APP_NAME: string;
  PRODUCTION_ASSETS?: string;
  PREVIEW_ASSETS?: string;
  DEV_ASSETS?: string;
  PRODUCTION_ADMIN_ASSETS?: string;
  PREVIEW_ADMIN_ASSETS?: string;
  DEV_ADMIN_ASSETS?: string;
  PRODUCTION_API_ORIGIN?: string;
  PREVIEW_API_ORIGIN?: string;
  DEV_API_ORIGIN?: string;
};

type Stage = 'production' | 'preview' | 'dev';
type TargetKind = 'site' | 'admin' | 'api';

type Target = {
  kind: TargetKind;
  stage: Stage;
  origin: string;
  stripPathPrefix: string | null;
};

const DEFAULT_ORIGINS: Record<TargetKind, Record<Stage, string>> = {
  site: {
    production: 'https://goldshore-org.pages.dev',
    preview: 'https://goldshore-org-preview.pages.dev',
    dev: 'https://goldshore-org-dev.pages.dev',
  },
  admin: {
    production: 'https://goldshore-admin.pages.dev',
    preview: 'https://goldshore-admin.pages.dev',
    dev: 'https://goldshore-admin.pages.dev',
  },
  api: {
    production: 'https://api.goldshore.org',
    preview: 'https://api.goldshore.org',
    dev: 'https://api.goldshore.org',
  },
};

const stageFromHost = (host: string): Stage => {
  if (host.startsWith('preview.')) return 'preview';
  if (host.startsWith('dev.')) return 'dev';
  return 'production';
};

const getEnvOrigin = (env: Env, kind: TargetKind, stage: Stage): string => {
  const keys: Record<TargetKind, Record<Stage, keyof Env>> = {
    site: {
      production: 'PRODUCTION_ASSETS',
      preview: 'PREVIEW_ASSETS',
      dev: 'DEV_ASSETS',
    },
    admin: {
      production: 'PRODUCTION_ADMIN_ASSETS',
      preview: 'PREVIEW_ADMIN_ASSETS',
      dev: 'DEV_ADMIN_ASSETS',
    },
    api: {
      production: 'PRODUCTION_API_ORIGIN',
      preview: 'PREVIEW_API_ORIGIN',
      dev: 'DEV_API_ORIGIN',
    },
  } as const;

  const key = keys[kind][stage];
  const value = env[key];
  if (value && value.trim().length > 0) return value;
  return DEFAULT_ORIGINS[kind][stage];
};

const resolveTarget = (url: URL, env: Env): Target => {
  const host = url.hostname.toLowerCase();
  const [subdomain] = host.split('.');
  const stage = stageFromHost(host);

  const isApiSubdomain = subdomain === 'api';
  const isApiPath = !isApiSubdomain && (url.pathname === '/api' || url.pathname.startsWith('/api/'));
  if (isApiSubdomain || isApiPath) {
    return {
      kind: 'api',
      stage,
      origin: getEnvOrigin(env, 'api', stage),
      stripPathPrefix: isApiPath ? '/api' : null,
    };
  }

  const isAdminSubdomain = subdomain === 'admin';
  const isAdminPath = !isAdminSubdomain && url.pathname.startsWith('/admin');
  if (isAdminSubdomain || isAdminPath) {
    return {
      kind: 'admin',
      stage,
      origin: getEnvOrigin(env, 'admin', stage),
      stripPathPrefix: isAdminPath ? '/admin' : null,
    };
  }

  return {
    kind: 'site',
    stage,
    origin: getEnvOrigin(env, 'site', stage),
    stripPathPrefix: null,
  };
};

const buildCorsHeaders = (origin: string): Headers => {
const pickOrigin = (host: string, env: Env): string => {
  if (host.startsWith('preview.')) {
    return env.PREVIEW_ASSETS ?? 'https://goldshore-org-preview.pages.dev';
  }

  if (host.startsWith('dev.')) {
    return env.DEV_ASSETS ?? 'https://goldshore-org-dev.pages.dev';
  }

  return env.PRODUCTION_ASSETS ?? 'https://goldshore-org.pages.dev';
};

const buildCorsHeaders = (origin: string | null): Headers => {
  const headers = new Headers();
  if (origin) {
    headers.set('access-control-allow-origin', origin);
  }
  headers.set('access-control-allow-methods', 'GET,HEAD,POST,OPTIONS');
  headers.set('access-control-allow-headers', 'accept,content-type');
  headers.set('access-control-max-age', '86400');
  headers.set('vary', 'origin');
  return headers;
};

const cachePolicy = (pathname: string, kind: TargetKind): string => {
  if (kind === 'api') {
    return 'private, no-store, max-age=0';
  }

  return /\.(?:js|css|png|jpg|jpeg|webp|avif|svg|woff2?)$/i.test(pathname)
    ? 'public, max-age=31536000, immutable'
    : 'public, s-maxage=600, stale-while-revalidate=86400';
const isAllowedOrigin = (origin: URL): boolean => {
  if (origin.hostname === 'goldshore.org' || origin.hostname === 'localhost') {
    return true;
  }

  if (origin.hostname.endsWith('.goldshore.org')) {
    return true;
  }

  if (origin.hostname === 'goldshore-org.pages.dev' || origin.hostname.endsWith('.goldshore-org.pages.dev')) {
    return true;
  }

  return false;
};

const resolveCorsOrigin = (req: Request): string | null => {
  const headerOrigin = req.headers.get('origin');
  if (!headerOrigin || headerOrigin === 'null') {
    return null;
  }

  try {
    const parsedOrigin = new URL(headerOrigin);
    return isAllowedOrigin(parsedOrigin) ? parsedOrigin.origin : null;
  } catch {
    return null;
  }
};

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const target = resolveTarget(url, env);

    const corsOrigin = request.headers.get('origin') ?? `${url.protocol}//${url.host}`;
    const corsHeaders = target.kind === 'api' ? null : buildCorsHeaders(corsOrigin);

    if (request.method === 'OPTIONS' && corsHeaders) {
      const cors = new Headers(corsHeaders);

    const corsOrigin = resolveCorsOrigin(req);

    const fallbackOrigin = `${url.protocol}//${url.host}`;
    const requestOrigin = getCorsOrigin(req, fallbackOrigin);

    if (req.method === 'OPTIONS') {
      const cors = buildCorsHeaders(corsOrigin);
      cors.set('content-length', '0');
      return new Response(null, { status: 204, headers: cors });
    }

    const upstream = new URL(request.url.replace(url.origin, target.origin));
    if (target.stripPathPrefix) {
      const prefix = target.stripPathPrefix;
      if (upstream.pathname === prefix) {
        upstream.pathname = '/';
      } else if (upstream.pathname.startsWith(`${prefix}/`)) {
        upstream.pathname = upstream.pathname.slice(prefix.length) || '/';
      }
    }
    const origin = pickOrigin(url.hostname, env);
    const upstream = new URL(request.url.replace(url.origin, origin));

    const headers = new Headers(request.headers);
    headers.delete('host');

    const init: RequestInit = {
      method: request.method,
      headers,
      redirect: 'follow',
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    };

    const response = await fetch(upstream.toString(), init);

    const outgoing = new Headers(response.headers);
    outgoing.set('x-served-by', env.APP_NAME);
    outgoing.set('cache-control', cachePolicy(url.pathname, target.kind));

    if (corsHeaders) {
      corsHeaders.forEach((value, key) => outgoing.set(key, value));
    }

    const responseHeaders = new Headers(proxiedResponse.headers);
    responseHeaders.set('x-served-by', env.APP_NAME);
    const cors = buildCorsHeaders(corsOrigin);
    cors.forEach((value, key) => responseHeaders.set(key, value));

    const outgoing = new Headers(response.headers);
    outgoing.set('x-served-by', env.APP_NAME);
    outgoing.set('cache-control', cachePolicy(url.pathname));
    cors.forEach((value, key) => outgoing.set(key, value));

    return new Response(response.body, {
      status: response.status,
      headers: outgoing,
    });
  },
} satisfies ExportedHandler<Env>;
