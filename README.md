# Breathewell — Prompt Wars 6

A responsive, accessible clean-air companion for families and communities. Includes personalized routines, a daily checklist, indoor-air toolkit, an illustrative carbon calculator, city-based modeled air-quality lookup, and an optional GenAI assistant.

## Chosen vertical

Environmental health and sustainable urban living: helping families and communities navigate severe winter smog and everyday urban air pollution. The application connects practical exposure-reduction guidance with lower-emission routines and explains the distinct benefits of each.

## Approach and logic

1. Capture a city, daily commute distance, household budget, and whether the household includes sensitive people. No precise address is required.
2. Start with explicitly labeled illustrative conditions. On request, resolve the city using Open-Meteo and fetch modeled US AQI. Classify it using US AQI thresholds, keeping the data label and timestamp visible.
3. Offer actions across daily travel, indoor pollution source reduction, and community participation. Let users track completion locally and export a plan.
4. Tailor assistant responses using the current household profile and question. With a server-side OpenAI key, use the Responses API; otherwise return transparent, safety-aware local guidance. Urgent symptom keywords take a conservative local escalation path before any AI request.
5. Explain carbon savings with a visible formula, while describing exposure benefits qualitatively rather than inventing health outcomes.

## How the solution works

The browser loads a dependency-free HTML/CSS/JavaScript dashboard from a small Node.js server. Preferences and action completion stay in browser storage. Air-data refreshes call Open-Meteo directly; assistant questions go through `/api/chat`, so provider credentials never reach browser code. The server validates inputs, limits request size, uses provider timeouts, and falls back when AI is unavailable. The interface includes daily guidance, an indoor toolkit, an action checklist, a downloadable plan, and an interactive emissions calculator.

## Assumptions

- Users provide a city rather than an exact address; regional modeled conditions can differ from street-level pollution.
- US AQI is used consistently and is explicitly distinguished from India's AQI scale.
- The initial AQI of 186 is demonstration data, not a live observation.
- Daily commute distance means the full round trip. Carbon savings use an illustrative net saving of 0.17 kg CO2/km when replacing solo petrol-car travel with public transport; this is a scenario assumption rather than a universal emissions factor.
- General advice cannot replace local official alerts, clinical care, or assessment of household ventilation and appliance safety.
- Local browser storage is available for persistence; the app remains usable for the current visit when storage is unavailable.
- GenAI requires a supplied server-side API key and network access. Without these, local guidance remains available and is labeled accordingly.

## Evaluation focus areas

| Criterion | Implementation and evidence |
| --- | --- |
| Code quality | Separate server, UI, styling, and pure guidance/calculation logic; no build tool or runtime dependencies. |
| Security | Server-only secrets, input and body-size validation, path containment, response security headers, upstream timeouts, text-only response rendering. |
| Efficiency | Lightweight static assets, no framework bundle, no background polling, air data fetched only on request. |
| Testing | Automated AQI boundary, invalid input, calculation, safety, and personalization tests; HTTP smoke checks documented in `VERIFICATION.md`. |
| Accessibility | Semantic landmarks, skip navigation, labeled native controls, modal dialog, visible keyboard focus, text data labels, live assistant messages, responsive layouts. Browser and assistive-technology verification remains pending. |
| Problem alignment | Location/lifestyle context, low-emission commuting, indoor source reduction, community actions, and transparent explanations of impact. |

No evaluation-tier mapping was supplied, so the project does not invent which criteria are High, Medium, or Low Impact.

## Run

Requires Node.js 22+. No package installation required.

```powershell
npm start
```

Open http://localhost:3000. To enable GenAI, set a server-only key before starting:

```powershell
$env:OPENAI_API_KEY = 'your-key'
npm start
```

Optional `OPENAI_MODEL` (default `gpt-4.1-mini`) and `PORT`. `.env.example` documents settings; `.env` files are not loaded automatically. Without a key or when the provider fails, the app explicitly labels its deterministic local guidance. AI replies are single-turn and use current household context.

## Verify

```powershell
npm test
npm run check
```

Tests cover AQI boundaries, invalid values, emissions assumptions, safety routing, and preference-sensitive guidance. Manual acceptance: change city and budget, refresh air, toggle and reload actions, filter cards, use calculator sliders, download plan, and ask assistant questions. Check keyboard navigation, dialog focus, escape behavior, and mobile layout.

## Data, security, and limits

- Initial AQI 186 is illustrative, never presented as current. Refresh fetches modeled US AQI through Open-Meteo geocoding and CAMS air-quality APIs. Modeled data is not a neighborhood sensor reading or India's AQI scale. Failed refreshes retain the previous reading and label. Sources: https://open-meteo.com/en/docs/air-quality-api and https://open-meteo.com/en/docs/geocoding-api . Data attribution: Open-Meteo and Copernicus Atmosphere Monitoring Service (CAMS).
- Preferences and daily completion are stored on this browser only. No database or analytics. City is sent to Open-Meteo on refresh. Assistant requests send the current question and profile to this local server, and to OpenAI only when configured. Avoid sharing personal medical information.
- AI keys remain server-side; untrusted responses render as text. Request body limits, input validation, upstream timeouts, path containment, and security headers are included. The server binds to loopback by default. Add authentication and rate limiting before exposing an AI endpoint publicly.
- Carbon figures are illustrative net savings of 0.17 kg CO₂/km for replacing solo petrol-car travel with transit, not measured outcomes. The calculator states assumptions. Emissions savings do not quantify personal exposure or health outcomes.
- Guidance is general education, not diagnosis. Sources: https://www.airnow.gov/wildfires/when-smoke-is-in-the-air/ and https://www.epa.gov/wildfires/how-create-cleaner-air-room-home . Local official advisories and clinical care plans take priority.
- Accessibility: semantic regions, skip link, native controls and modal dialog, visible focus, text status labels, live assistant messages, reduced reliance on color, responsive layouts. Full assistive-technology/browser review is still recommended.

## Architecture

`server.mjs`: dependency-free static server and optional OpenAI Responses API adapter. `public/logic.js`: testable safety-aware fallback and calculator. `public/app.js`: UI and external air data. `public/style.css`: responsive design. `test/`: Node test runner coverage. No build step.
