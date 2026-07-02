async function requestOpenAiStyleEmbedding(url, apiKey, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error?.message || data?.detail || data?.error || `Embeddings failed (${response.status})`;
    throw new Error(message);
  }

  if (Array.isArray(data?.data?.[0]?.embedding)) {
    return data.data[0].embedding;
  }

  throw new Error('Embedding response missing vector');
}

async function requestOllamaEmbedding(baseUrl, model, text) {
  const response = await fetch(`${baseUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: text }),
    signal: AbortSignal.timeout(90_000),
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error || `Ollama embeddings failed (${response.status})`;
    throw new Error(message);
  }

  if (!Array.isArray(data?.embedding)) {
    throw new Error('Ollama response missing embedding vector');
  }

  return data.embedding;
}

export async function createEmbedding(text, config, options = {}) {
  const inputType = options.inputType || 'passage';

  if (config.embeddingProvider === 'ollama') {
    return requestOllamaEmbedding(
      config.ollamaApiBase,
      config.ollamaEmbeddingModel,
      text
    );
  }

  if (config.embeddingProvider === 'nvidia') {
    if (!config.nvidiaApiKey) {
      throw new Error('NVIDIA_API_KEY is not configured');
    }

    const body = {
      model: config.nvidiaEmbeddingModel,
      input: text,
      encoding_format: 'float',
    };

    if (config.nvidiaUseInputType) {
      body.input_type = inputType;
    }

    return requestOpenAiStyleEmbedding(
      `${config.nvidiaApiBase}/embeddings`,
      config.nvidiaApiKey,
      body
    );
  }

  if (!config.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  return requestOpenAiStyleEmbedding(
    'https://api.openai.com/v1/embeddings',
    config.openaiApiKey,
    {
      model: config.openaiEmbeddingModel,
      input: text,
    }
  );
}
