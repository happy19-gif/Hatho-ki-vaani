/**
 * Vercel serverless proxy for ElevenLabs text-to-speech.
 * Set ELEVENLABS_API_KEY in Vercel Environment Variables. Never put the key in app.js.
 * Add provider/IP rate limiting before a public production launch.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Speech service is not configured.' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  const voiceId = typeof body?.voiceId === 'string' ? body.voiceId.trim() : '';
  if (!text || text.length > 1200) return res.status(400).json({ error: 'Text is required and must be 1–1200 characters.' });
  if (!voiceId || voiceId.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(voiceId)) return res.status(400).json({ error: 'A valid voiceId is required.' });

  try {
    const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75, use_speaker_boost: true } })
    });
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      console.error('ElevenLabs upstream error:', upstream.status, detail.slice(0, 400));
      return res.status(502).json({ error: 'Speech provider request failed.' });
    }
    const audio = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'private, max-age=0, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(audio);
  } catch (error) {
    console.error('Speech proxy failed:', error);
    return res.status(502).json({ error: 'Speech service is temporarily unavailable.' });
  }
};
