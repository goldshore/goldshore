const ALLOWED_ORIGINS = new Set([
  "https://goldshore.org",
  "https://www.goldshore.org",
  "https://goldshore-org.pages.dev",
  "http://localhost:8788",
]);

const BASE_CORS_HEADERS = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
};

function resolveAllowedOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return null;
  }

  return ALLOWED_ORIGINS.has(origin) ? origin : null;
}

function createCorsHeaders(request) {
  const headers = new Headers(BASE_CORS_HEADERS);
  headers.append("Vary", "Origin");
  const allowedOrigin = resolveAllowedOrigin(request);

  if (allowedOrigin) {
    headers.set("Access-Control-Allow-Origin", allowedOrigin);
  }

  return headers;
}

function jsonResponse(request, body, init = {}) {
  const headers = new Headers(init.headers || {});
  const corsHeaders = createCorsHeaders(request);

  for (const [key, value] of corsHeaders.entries()) {
    headers.set(key, value);
  }

  headers.set("content-type", "application/json");

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

const CODING_PURPOSE = "coding";
const DEFAULT_PURPOSE = "chat";
const MODEL_BY_PURPOSE = {
  [CODING_PURPOSE]: "gpt-5-codex",
  [DEFAULT_PURPOSE]: "gpt-5",
};

function resolvePurpose(value) {
  if (typeof value !== "string") {
    return DEFAULT_PURPOSE;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === CODING_PURPOSE ? CODING_PURPOSE : DEFAULT_PURPOSE;
}

async function handlePost(request, env) {
  if (!env.OPENAI_API_KEY) {
    return jsonResponse(request, { error: "Missing OpenAI API key." }, { status: 500 });
  }

  if (!env.GPT_PROXY_SECRET) {
    return jsonResponse(request, { error: "Missing GPT proxy secret." }, { status: 500 });
  }

  const providedSecret = request.headers.get("x-api-key");
  if (providedSecret !== env.GPT_PROXY_SECRET) {
    return jsonResponse(request, { error: "Unauthorized." }, { status: 401 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return jsonResponse(request, { error: "Invalid JSON body." }, { status: 400 });
  }

  const {
    messages,
    prompt,
    model,
    purpose: rawPurpose = DEFAULT_PURPOSE,
    temperature,
    ...rest
  } = payload || {};

  if (!Array.isArray(messages) && typeof prompt !== "string") {
    return jsonResponse(request, {
      error: "Request body must include either a 'messages' array or a 'prompt' string.",
    }, { status: 400 });
  }

  const purpose = resolvePurpose(rawPurpose);

  const chatMessages = Array.isArray(messages)
    ? messages
    : [
        {
          role: "user",
          content: prompt,
        },
      ];

  const selectedModel = model || MODEL_BY_PURPOSE[purpose] || MODEL_BY_PURPOSE[DEFAULT_PURPOSE];

  const openAIOptions = { ...rest };

  if (typeof temperature === "number" && !Number.isNaN(temperature)) {
    openAIOptions.temperature = temperature;
  } else if (!("temperature" in openAIOptions)) {
    openAIOptions.temperature = purpose === CODING_PURPOSE ? 0.2 : 0.7;
  }

  const requestBody = {
    model: selectedModel,
    messages: chatMessages,
    ...openAIOptions,
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      return jsonResponse(request, {
        error: "Unexpected response from OpenAI API.",
        details: responseText,
      }, { status: 502 });
    }

    if (!response.ok) {
      return jsonResponse(request, {
        error: "OpenAI API request failed.",
        details: data,
      }, { status: response.status });
    }

    return jsonResponse(request, data, { status: response.status });
  } catch (error) {
    return jsonResponse(request, {
      error: "Failed to contact OpenAI API.",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 502 });
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: createCorsHeaders(request),
      });
    }

    if (request.method !== "POST") {
      return jsonResponse(request, { error: "Method not allowed." }, { status: 405 });
    }

    return handlePost(request, env);
  },
};
