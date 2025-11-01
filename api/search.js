// /api/search.js
// Minimal Vercel serverless function that returns one clean search link per market.
// Defaults: searches all supported markets, condition defaults to "mint".

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const {
      image_url = null,
      condition = "mint",          // default
      markets = [],                // if empty, we will use defaults below
      extra_sites = [],            // optional list of site templates, can contain {q}
      keywords = [],               // e.g., ["Brandenburg Gate","Berlin","Brandenburger Tor"]
      languages = ["en"],          // default English
      price_max = null,            // optional max price
      include_archives = false
    } = req.body || {};

    // 1) Default to all supported markets when none provided
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
    const chosen = Array.isArray(markets) && markets.length > 0 ? markets : defaultMarkets;

    // 2) Build a free text query from keywords and a tiny condition hint
    const qParts = Array.isArray(keywords) ? [...keywords] : [];
    if (condition === "mint") qParts.push("mint");
    if (condition === "postally used") qParts.push("used", "postally used");
    const qRaw = qParts.join(" ").trim();
    const q = encodeURIComponent(qRaw);

    // 3) Per-market link builders
    const builders = {
      Delcampe: () =>
        `https://www.delcampe.net/en_GB/collectables/search?search_mode=all&text=${q}`,
      eBay: () => {
        const base = `https://www.ebay.com/sch/i.html?_nkw=${q}&_sop=10`;
        return price_max ? `${base}&_udhi=${encodeURIComponent(price_max)}` : base;
      },
      Philasearch: () =>
        `https://www.philasearch.com/en/tree_ND-78/POSTCARDS.html?&searchString=${q}`,
      HipPostcard: () =>
        `https://www.hippostcard.com/listings/search?q=${q}`,
      Bidspirit: () =>
        `https://il.bidspirit.com/ui/catalog/advanced?words=${q}`,
      StampAuctionNetwork: () =>
        `https://stampauctionnetwork.com/search.cfm?qs=${q}`,
      "akpool.de": () =>
        `https://www.akpool.de/suche/${q}`,
      Ansichtskartenversand: () =>
        `https://www.ansichtskartenversand.com/ak/suche.php?suchtext=${q}`,
      Meshok: () =>
        `https://meshok.net/?q=${q}`,
      "Yahoo Auctions JP": () =>
        `https://auctions.yahoo.co.jp/search/search?p=${q}`,
      "Mercari JP": () =>
        `https://www.mercari.com/jp/search/?keyword=${q}`
    };

    // 4) Build hits
    const hits = [];
    for (const m of chosen) {
      const fn = builders[m];
      if (typeof fn === "function") {
        hits.push({ title: `Search on ${m}`, url: fn(), market: m });
      }
    }

    // 5) Allow adhoc extra sites. If they contain {q} we inject the encoded query.
    for (const site of Array.isArray(extra_sites) ? extra_sites : []) {
      try {
        const u = String(site || "");
        const host = u.replace(/^https?:\/\//, "");
        hits.push({
          title: `Search on ${host}`,
          url: u.includes("{q}") ? u.replace("{q}", q) : u,
          market: host
        });
      } catch {
        // ignore malformed
      }
    }

    // 6) Friendly note
    const notes = [
      qRaw ? `Query: ${qRaw}` : null,
      `Condition: ${condition}`,
      languages?.length ? `Languages: ${languages.join(", ")}` : null,
      price_max ? `Price max: ${price_max}` : null,
      include_archives ? `Include archives: true` : null,
      image_url ? `Image url provided` : null,
      chosen?.length ? `Markets: ${chosen.join(", ")}` : null
    ]
      .filter(Boolean)
      .join(" | ");

    return res.status(200).json({ hits, notes });
  } catch (err) {
    console.error("search handler error", err);
    return res.status(500).json({ error: "Server error" });
  }
}
