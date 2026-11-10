// Custom board builder: combine categories from any rounds into one playable round.

export const MAX_BOARD_CATEGORIES = 8;

/**
 * rounds: all available rounds. picks: [{roundId, catId}] in the order the player chose.
 * Returns a self-contained round (deep copies, fresh ids) so it survives later changes to its sources.
 */
export function buildBoard(rounds, picks, title = '') {
  if (!picks.length) throw new Error('Pick at least one category.');
  if (picks.length > MAX_BOARD_CATEGORIES) throw new Error(`A board holds at most ${MAX_BOARD_CATEGORIES} categories.`);
  const id = `board-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
  const cats = picks.map((p, i) => {
    const round = rounds.find((r) => r.id === p.roundId);
    const cat = round?.categories.find((c) => c.id === p.catId);
    if (!cat) throw new Error('One of the picked categories no longer exists.');
    return {
      id: `${id}-c${i + 1}`, name: cat.name, short: cat.short || cat.name,
      questions: cat.questions.map((q, j) => ({ ...q, options: [...(q.options || [])], answers: [...(q.answers || [])], id: `${id}-c${i + 1}-q${j + 1}` })),
    };
  });
  const sources = new Set(picks.map((p) => p.roundId)).size;
  return {
    id, custom: true, built: true, icon: 'LayoutGrid',
    title: title.trim() || 'My board',
    tagline: `${cats.length} topic${cats.length > 1 ? 's' : ''} from ${sources} round${sources > 1 ? 's' : ''}`,
    categories: cats,
  };
}

/** n random distinct categories across all rounds. */
export function randomPicks(rounds, n, rand = Math.random) {
  const all = rounds.flatMap((r) => r.categories.map((c) => ({ roundId: r.id, catId: c.id })));
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
  return all.slice(0, Math.min(n, all.length));
}
