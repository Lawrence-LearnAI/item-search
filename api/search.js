export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const {
      image_url,
      condition,
      markets = [],
      extra_sites = [],
      keywords = [],
      languages = [],
      price_max = null,
      include_archives = false
    } = req.body || {};

    if (!condition) {
      return res.status(400).json({ error: "Missing required field: condition" });
    }
    if (!Array.isArray(markets)) {
      return res.status(400).json({ error: "Field 'markets' must be an array" });
    }

    const results = [
      {
        title: "Example item - Wandering Jew postcard, ca. 1908",
        url: "https://www.delcampe.net/en_GB/collectables/postcards/example",
        market: "Delcampe",
        price: 19.99,
        currency: "USD",
        date_listed: "2025-10-31",
        thumbnail: "https://example.com/thumb.jpg"
      }
    ];

    return res.status(200).json({
      hits: results,
      notes: `Searched ${markets.join(", ")} for a ${condition} item.`
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
