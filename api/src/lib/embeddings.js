async function requestEmbedding(url, apiKey, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error?.message || data?.detail || `Embeddings failed (${response.status})`;
    throw new Error(message);
  }

  return data.data[0].embedding;
}

export async function createEmbedding(text, config, options = {}) {
  const inputType = options.inputType || 'passage';

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

    return requestEmbedding(
      `${config.nvidiaApiBase}/embeddings`,
      config.nvidiaApiKey,
      body
    );
  }

  if (!config.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  return requestEmbedding(
    'https://api.openai.com/v1/embeddings',
    config.openaiApiKey,
    {
      model: config.openaiEmbeddingModel,
      input: text,
    }
  );
}
