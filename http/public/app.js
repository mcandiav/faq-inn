const apiBase = window.DFAQ_API_URL || '/api';

document.getElementById('api-url').textContent = apiBase;

async function checkApi() {
  const statusEl = document.getElementById('status');

  try {
    const response = await fetch(`${apiBase}/health`, {
      headers: { Accept: 'application/json' },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.status || `HTTP ${response.status}`);
    }

    statusEl.textContent = `API conectada (${data.service}, env: ${data.env})`;
    statusEl.classList.add('ok');
  } catch (error) {
    statusEl.textContent = `API no disponible: ${error.message}`;
    statusEl.classList.add('error');
  }
}

checkApi();
