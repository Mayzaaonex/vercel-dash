const { perplexitySearch } = require('./perplexity.js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { text, mode = 'concise', focus = 'internet' } = req.query || {};

  if (!text) {
    return res.status(200).json({
      name: 'Perplexity AI Proxy',
      usage: '/api/perplexity-proxy?text=halo&mode=concise&focus=internet'
    });
  }

  try {
    const result = await perplexitySearch(text, { mode, focus });
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};