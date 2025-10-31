export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const {
    image_url = null,
    condition,                 // "mint" or "postally used"
    markets = [],              // ["Delcampe","eBay",...]
    extra_sites = [],          // any custom sites
    keywords = [],             // ["Brandenburg Gate","Berlin"]
    languages = [],            // e.g. ["en","de"]
    price_max = null,
    include_archives = false
  } = req.body || {};

  if (!condition) return res.status(400).json({ error: "Missing required field: condition" });
  if (!Array.isArray(markets)) return res.status(400).json({ error: "Field 'markets' must be an array" });

  // Build query
  const qParts = [...keywords];
  if (condition === "mint") qParts.push("mint");
  if (condition === "postally used") qParts.push("used", "postally used");
  const q = encodeURIComponent(qParts.join(" ").trim());

  // Market URL builders (search links only - no scraping)
  const builders = {
    "Delcampe": () => `https://www.delcampe.net/en_GB/collectables/search?search_mode=all&text=${q}`,
    "eBay": () => `https://www.ebay.com/sch/i.html?_nkw=${q}&_sop=10`,
    "HipPostcard": () => `https://www.hippostcard.com/listings/search?q=${q}`,
    "Philasearch": () => `https://www.philasearch.com/en/tree_ND-78/POSTCARDS.html?&searchString=${q}`,
    "StampAuctionNetwork": () => `https://stampauctionnetwork.com/search.cfm?qs=${q}`,
    "Bidspirit": () => `https://il.bidspirit.com/ui/catalog/advanced?words=${q}`,
    "akpool.de": () => `https://www.akpool.de/suche/${q}`,
    "Ansichtskartenversand": () => `https://www.ansichtskartenversand.com/ak/suche.php?suchtext=${q}`,
    "Meshok": () => `https://meshok.net/?q=${q}`,
    "Yahoo Auctions JP": () => `https://auctions.yahoo.co.jp/search/search?p=${q}`,
    "Mercari JP": () => `https://www.mercari.com/jp/search/?keyword=${q}`
  };

  const hits = [];
  for (const m of markets) {
    const fn = builders[m];
    if (fn) hits.push({ title: `Search on ${m}`, url: fn(), market: m });
  }
  for (const site of extra_sites) {
    try {
      const host = site.replace(/^https?:\/\//, "");
      hits.push({ title: `Search on ${host}`, url: site.includes("{q}") ? site.replace("{q}", q) : site, market: host });
    } catch {}
  }

  const notes = [
    `Query: ${decodeURIComponent(q)}`,
    languages.length ? `Languages: ${languages.join(", ")}` : null,
    price_max ? `Price max: ${price_max}` : null,
    include_archives ? `Include archives: true` : null,
    image_url ? `Image url provided` : null
  ].filter(Boolean).join(" | ");

  return res.status(200).json({ hits, notes });
}
