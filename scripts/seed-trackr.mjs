// Seeds the shared Trackr cache (public.trackr_cache) in Supabase.
//
// The Trackr API allows 10 unauthenticated calls/day per IP, so run this from a
// machine/IP that hasn't hit that limit yet (it will silently skip anything the
// API returns empty — which is how the limit manifests).
//
// Usage:
//   SUPABASE_URL=https://your-ref.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/seed-trackr.mjs
//
// The service-role key is server-side only — never put it in the client bundle.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const supabase = createClient(url, key);

const REGION = "UK";
// Start with the default season only (9 combos ≈ the 10/day budget). Add more
// seasons on a different IP/after the limit resets if you need them.
const SEASONS = ["2027"];

const INDUSTRIES = {
  Finance: ["summer-internships", "spring-weeks", "off-cycle-internships", "industrial-placements"],
  Tech: ["summer-internships", "off-cycle-internships", "industrial-placements"],
  Law: ["vacation-schemes", "summer-internships"],
};

const BASE = "https://api.the-trackr.com/programmes";

function keyOf(industry, type, season) {
  return `${REGION}|${industry}|${type}|${season}`;
}

async function main() {
  let ok = 0;
  let skipped = 0;

  for (const season of SEASONS) {
    for (const [industry, types] of Object.entries(INDUSTRIES)) {
      for (const type of types) {
        const url = `${BASE}?region=${REGION}&industry=${industry}&season=${season}&type=${type}`;
        const res = await fetch(url);
        if (!res.ok) {
          console.log(`skip  ${industry}/${type}/${season}  (HTTP ${res.status})`);
          skipped++;
          continue;
        }
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
          console.log(`empty ${industry}/${type}/${season}  (rate-limited or no data)`);
          skipped++;
          continue;
        }

        const { error } = await supabase.from("trackr_cache").upsert({
          key: keyOf(industry, type, season),
          data,
          fetched_at: new Date().toISOString(),
        });

        if (error) {
          console.log(`FAIL  ${industry}/${type}/${season}  ${error.message}`);
          process.exitCode = 1;
        } else {
          console.log(`ok    ${industry}/${type}/${season}  ${data.length} programmes`);
          ok++;
        }
      }
    }
  }

  console.log(`\nDone: ${ok} cached, ${skipped} skipped.`);
}

main();
