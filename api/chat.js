export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Use key from request header (user's own key) or fall back to env var
  const apiKey = req.headers['x-api-key'] || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(401).json({
      error: { type: 'auth_error', message: 'No Anthropic API key. Set ANTHROPIC_API_KEY in Vercel environment variables, or add your own key in Settings → Models.' }
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': req.headers['anthropic-version'] || '2023-06-01',
        'x-api-key': apiKey,
        ...(req.headers['anthropic-beta'] ? { 'anthropic-beta': req.headers['anthropic-beta'] } : {}),
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: { type: 'server_error', message: err.message } });
  }
}
