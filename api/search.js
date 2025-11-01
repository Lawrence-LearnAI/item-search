// /api/search.js
// Returns a mix of exact listings (eBay via RSS) and precise search links for other markets.
// Designed for Vercel serverless. No external packages required.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const {
      image_url = null,
      condition = "mint",
      markets = [],
      extra_sites = [],
      keywords = [],
      languages = ["en"],
      price_max = null,
      include_archives = false,
      max_results = 10,          // NEW: limit results
      use_rss = true             // NEW: use eBay RSS for exact items
    } = req.body || {};

    // Default to all supported markets
    const defaultMarkets = [
      "eBay",
      "Delcampe",
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

    // Build normalized query from keywords + a small condition hint
    const qParts = Array.isArray(keywords) ? [...keywords] : [];
    if (condition === "mint") qParts.push("mint");
    if (condition === "postally used") qParts.push("used", "postally used");
    const qRaw = qParts.join(" ").trim();
    const q = encodeURIComponent(qRaw);

    // ---------- helpers ----------
    const push = (arr, item) => { if (item) arr.push(item); };
    const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
    const limit = clamp(Number(max_results) || 10, 1, 50);

    // Try to parse currency + price from strings like "US $19.95", "EUR 12,50", "GBP 7.99"
    const extractPrice = (text = "") => {
      // Normalize commas in numbers (12,50 -> 12.50)
      const norm = String(text).replace(/(\d),(\d)/g, "$1.$2");
      const m = norm.match(/\b(USD|US|EUR|GBP|CAD|AUD|CHF|JPY|ILS|NIS)\s*\$?\s*([\d.]+)\b/i)
            || norm.match(/\$\s*([\d.]+)\b/);
      if (!m) return null;
      // If m has currency code in group 1 and number in group 2
      if (m.length >= 3 && isNaN(m[1])) {
        return { currency: m[1].toUpperCase().replace("US","USD"), price: Number(m[2]) };
      }
      // Fallback: just a number with a $
      return { currency: "USD", price: Number(m[1]) };
    };

    // Build per-market search URL (for markets without exact feeds)
    const searchBuilders = {
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

    // ---------- eBay RSS (EXACT items) ----------
    const fetchEbayRssItems = async () => {
      if (!use_rss) return [];
      try {
        let rssUrl = `https://www.ebay.com/sch/i.html?_nkw=${q}&_sop=10&_rss=1`;
        if (price_max) rssUrl += `&_udhi=${encodeURIComponent(price_max)}`;

        const resp = await fetch(rssUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!resp.ok) return [];

        const xml = await resp.text();

        // Split crude XML without external packages
        const items = xml.split("<item>").slice(1).map(x => x.split("</item>")[0]).slice(0, limit);

        const toText = (s) => s.replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1").replace(/<[^>]+>/g, "").trim();
        const getTag = (block, tag) => {
          const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
          return m ? toText(m[1]) : "";
        };

        const hits = [];
        for (const block of items) {
          const title = getTag(block, "title");
          const link  = getTag(block, "link");
          const desc  = getTag(block, "description");
          if (!title || !link) continue;

          const p = extractPrice(desc) || extractPrice(title);
          if (price_max && p?.price && p.price > Number(price_max)) {
            continue;
          }

          push(hits, {
            title,
            url: link,
            market: "eBay",
            ...(p || {})
          });
          if (hits.length >= limit) break;
        }
        return hits;
      } catch {
        return [];
      }
    };

    // ---------- Build response ----------
    const hits = [];

    // 1) Exact items from eBay RSS first (if eBay is among chosen)
    if (chosen.includes("eBay")) {
      const ebayHits = await fetchEbayRssItems();
      for (const h of ebayHits) push(hits, h);
    }

    // 2) Add search links (one per chosen market, except eBay if we already got exact items)
    for (const m of chosen) {
      if (m === "eBay") {
        // If we got zero eBay exact items, still add the search link as fallback
        if (!hits.some(h => h.market === "eBay")) {
          const fn = searchBuilders[m];
          if (fn) push(hits, { title: `Search on ${m}`, url: fn(), market: m, type: "search" });
        }
        continue;
      }
      const fn = searchBuilders[m];
      if (typeof fn === "function") {
        push(hits, { title: `Search on ${m}`, url: fn(), market: m, type: "search" });
      }
    }

    // 3) Extra ad-hoc sites (supports {q})
    for (const site of Array.isArray(extra_sites) ? extra_sites : []) {
      try {
        const u = String(site || "");
        const host = u.replace(/^https?:\/\//, "");
        push(hits, {
          title: `Search on ${host}`,
          url: u.includes("{q}") ? u.replace("{q}", q) : u,
          market: host,
          type: "search"
        });
      } catch { /* ignore */ }
    }

    // If truly nothing to show, say it clearly
    if (!hits || hits.length === 0) {
      return res.status(200).json({
        hits: [],
        message: "No matching items are currently available for purchase."
      });
    }

    // Trim to max_results: keep exact items first, then search links
    const exact = hits.filter(h => h.type !== "search");
    const searches = hits.filter(h => h.type === "search");
    const trimmed = [...exact, ...searches].slice(0, limit);

    const notes = [
      qRaw ? `Query: ${qRaw}` : null,
      `Condition: ${condition}`,
      languages?.length ? `Languages: ${languages.join(", ")}` : null,
      price_max ? `Price max: ${price_max}` : null,
      include_archives ? `Include archives: true` : null,
      image_url ? `Image url provided` : null,
      `Markets: ${chosen.join(", ")}`
    ].filter(Boolean).join(" | ");

    return res.status(200).json({
      hits: trimmed,
      notes
    });

  } catch (err) {
    console.error("search handler error", err);
    return res.status(500).json({ error: "Server error" });
  }
}
