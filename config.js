/* ==========================================================================
   GPT 9.0LM — API config
   ==========================================================================
   Currently wired to Pollinations.ai — a free, no-signup, no-API-key image
   generation service. Good for launching today with zero cost.

   When you're ready to move to a paid API (once people start paying):
   1. Set IMAGE_PROVIDER to "custom" below.
   2. Fill in API_ENDPOINT / API_KEY.
   3. Open script.js -> callImageAPI() and point the "custom" branch at
      your provider's actual request/response format (tell Claude which
      provider you picked and it'll wire the exact fields for you).

   ⚠️ GitHub Pages is a STATIC host — there's no server to hide a secret.
   Any key you put in this file is visible to anyone who views source.
   That's irrelevant for Pollinations (no key needed), but once you add a
   paid API_KEY here, put a small proxy in front of it (Cloudflare Worker /
   Vercel function) instead of calling the paid provider directly.
   ========================================================================== */

const PIXELFORGE_CONFIG = {
  // Shown in the greeting ("What are we forging, ___?") and the sidebar
  // footer. Leave blank to fall back to "there".
  DISPLAY_NAME: "david",

  // "pollinations" (free, default) or "custom" (your own/paid API)
  IMAGE_PROVIDER: "pollinations",

  // Only used when IMAGE_PROVIDER === "custom"
  API_ENDPOINT: "https://your-backend.example.com/generate",
  API_KEY: "",

  // Free plan daily generation cap shown in the UI (cosmetic only —
  // not real rate limiting, since there's no backend to enforce it).
  FREE_DAILY_LIMIT: 3,
};