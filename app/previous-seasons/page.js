import PreviousSeasonsClient from "./PreviousSeasonsClient";

export default async function PreviousSeasonPage() {
  let initialSummaries = [];
  let initialLoadInfo = { source: null, count: 0 };

  try {
    const res = await fetch('/api/season-summaries', { cache: 'no-store' });
    const payload = await res.json();
    if (res.ok && payload && Array.isArray(payload.data)) {
      initialSummaries = payload.data;
      initialLoadInfo = { source: 'server-api', count: initialSummaries.length };
    } else {
      initialLoadInfo = { source: 'server-api-error', count: 0 };
      console.debug('[PreviousSeasons:page] server api returned error:', payload?.error || 'unknown');
    }
  } catch (e) {
    console.debug('[PreviousSeasons:page] fetch failed:', e?.message || e);
    initialLoadInfo = { source: 'fetch-failed', count: 0 };
  }

  return <PreviousSeasonsClient initialSummaries={initialSummaries} initialLoadInfo={initialLoadInfo} />;
}

