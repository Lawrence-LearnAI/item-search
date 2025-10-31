export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const {
    image_url = null,
    condition,                 // "mint" or "postally used"
    markets = [],              // ["Delcampe","eBay",...]  — if empty, we’ll use defaults
    extra_sites = [],          // any custom sites
    keywords = [],             // ["Brandenburg Gate","Berlin"]
    languages = [],            // e.g. ["en","de"]
    price_max = null,
    include_archives = false
  } = req.body || {};

  if (!condition) return res.status(400).json({ error: "Missing required field: condition" });

  // 1) Default markets if the caller didn’t specify any
  const defaultMarkets = [
    "Delcampe",
    "eBay",
    "Philasearch",
    "HipPostcard",
    "Bidspirit",
    "StampAuctionNetwork",
    "akpool.de",
    "Ansichtskartenversand",
    "Meshok",
    "Yahoo Auctions JP",
    "Mercari JP"
  ];
  const chosen = (Array.isArray(markets) && markets.length > 0) ? markets : defaultMarkets;

  // 2) Build a search query from keywords + condition hint
  const qParts = [...(Array.isArray(keywords) ? keywords : [])];
  if (condition === "mint") qParts.push("mint");
  if (condition === "postally used") qParts.push("used", "postally used");
  const q = encodeURIComponent(qParts.join(" ").trim());

  // 3) URL builders. We only include a price filter where the site is known to support it reliably.
  const builders = {
    "Delcampe": () =>
      `https://www.delcampe.net/en_GB/collectables/search?search_mode=all&text=${q}`,
    "eBay": () => {
      const base = `https://www.ebay.com/sch/i.html?_nkw=${q}&_sop=10`;
      return price_max ? `${base}&_udhi=${encodeURIComponent(price_max)}` : base; // eBay max price
    },
    "HipPostcard": () =>
      `https://www.hippostcard.com/listings/search?q=${q}`,
    "Philasearch": () =>
      `https://www.philasearch.com/en/tree_ND-78/POSTCARDS.html?&searchString=${q}`,
    "StampAuctionNetwork": () =>
      `https://stampauctionnetwork.com/search.cfm?qs=${q}`,
    "Bidspirit": () =>
      `https://il.bidspirit.com/ui/catalog/advanced?words=${q}`,
    "akpool.de": () =>
      `https://www.akpool.de/suche/${q}`,
    "Ansichtskartenversand": () =>
      `https://www.ansichtskartenversand.com/ak/suche.php?suchtext=${q}`,
    "Meshok": () =>
      `https://meshok.net/?q=${q}`,
    "Yahoo Auctions JP": () =>
      `https://auctions.yahoo.co.jp/search/search?p=${q}`,
    "Mercari JP": () =>
      `https://www.mercari.com/jp/search/?keyword=${q}`
  };

  // 4) Assemble one clean, clickable link per market
  const hits = [];
  for (const m of chosen) {
    const fn = builders[m];
    if (fn) hits.push({ title: `Search on ${m}`, url: fn(), market: m });
  }

  // 5) Allow extra ad-hoc sites, with {q} placeholder
  for (const site of (Array.isArray(extra_sites) ? extra_sites : [])) {
    try {
      const host = site.replace(/^https?:\/\//, "");
      hits.push({
        title: `Search on ${host}`,
        url: site.includes("{q}") ? site.replace("{q}", q) : site,
        market: host
      });
    } catch {}
  }

  const notes = [
    `Query: ${decodeURIComponent(q)}`,
    languages?.length ? `Languages: ${languages.join(", ")}` : null,
    price_max ? `Price max: ${price_max}` : null,
    include_archives ? `Include archives: true` : null,
    image_url ? `Image url provided` : null,
    chosen?.length ? `Markets: ${chosen.join(", ")}` : null
  ].filter(Boolean).join(" | ");

  return res.status(200).json({ hits, notes });
}
