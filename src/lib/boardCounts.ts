export function boardCountsFromLinks(
  links: { board_id?: string; mention_count?: number | null; boards?: { id?: string; name?: string } | null }[] | null | undefined,
): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const l of links ?? []) {
    const name = (l.boards?.name ?? "").trim();
    if (!name) continue;
    const add = Number(l.mention_count ?? 1);
    map.set(name, (map.get(name) ?? 0) + add);
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
