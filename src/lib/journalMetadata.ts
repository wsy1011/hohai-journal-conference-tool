export type JournalMetadata = { issn: string; eissn: string; publisher: string };
let cache: Record<string, JournalMetadata> | null = null;
function norm(value: string) { return value.replace(/[^0-9xX]/g, "").toUpperCase(); }
export async function fetchJournalMetadata(issn: string): Promise<JournalMetadata | null> {
  if (!issn || issn === "/") return null;
  if (!cache) {
    const response = await fetch(`${import.meta.env.BASE_URL}data/journal-metadata.json`);
    if (!response.ok) return null;
    cache = await response.json() as Record<string, JournalMetadata>;
  }
  return cache[`issn:${norm(issn)}`] || null;
}
