# item-search

Minimal serverless API for Vercel.

- POST /api/search
- Content-Type: application/json

Example request:
{
  "image_url": "https://example.com/postcard.jpg",
  "condition": "mint",
  "markets": ["Delcampe", "eBay"]
}

Local test with curl:
curl -X POST https://YOUR_PROJECT_NAME.vercel.app/api/search   -H "Content-Type: application/json"   -d '{"condition":"mint","markets":["Delcampe"],"image_url":"https://example.com/postcard.jpg"}'
