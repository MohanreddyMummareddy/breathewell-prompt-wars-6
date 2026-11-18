# Security and privacy notes

API credentials belong in `.env` locally and sensitive server environment variables in Vercel. `.env` is ignored by Git and deployment uploads. Never paste a key into an issue, screenshot, or browser field.

## Implemented boundaries

- The assistant endpoint validates methods, JSON content type, byte-count body size, profile fields, questions, and browser Origin.
- A bounded per-instance rate limiter returns HTTP 429 and Retry-After. Provider calls use a deadline and fixed Google API host.
- Gemini receives a question and allowlisted city/lifestyle data, not coordinates, PIN codes, arbitrary browser state, or storage contents.
- Typed provider diagnostics are safe application messages. Arbitrary exception text and raw provider responses are not returned or logged.
- Generated and user-provided text render using `textContent`, never executable HTML.
- Public file serving is rooted in `public/` with path-containment checks. Vercel serves only that directory and declared API handlers.
- CSP, nosniff, and referrer policy are kept consistent between Vercel and local delivery by an automated test.

## Deployment responsibilities and limits

For high-volume public use, configure distributed Vercel Firewall limits and Google project quotas/budget alerts. The in-memory limiter resets on cold starts and is not global abuse protection. Same-origin checks protect browser-originated cross-site requests but are not authentication; non-browser clients can still call the public API subject to limits.

No clinical records are needed. Users should avoid putting personal medical details into questions. Questions may be processed by Google under the operator's account terms. PIN-directory and Open-Meteo use are disclosed in the UI and README. Local completion data can be removed through browser site-data controls.

Report vulnerabilities privately to the repository owner through GitHub rather than posting credentials or sensitive user data in a public issue. No security audit or medical certification is claimed.
