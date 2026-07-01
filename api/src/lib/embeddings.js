export async function createEmbedding(text, config) {
  if (!config.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.openaiEmbeddingModel,
      input: text,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body?.error?.message || `OpenAI embeddings failed (${response.status})`);
  }

  return body.data[0].embedding;
}
