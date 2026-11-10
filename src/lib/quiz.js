import bundled from '../data/rounds.json';

export const SINGLE_SECONDS = 15;
export const MULTI_MAIN_SECONDS = 30;
export const MULTI_PLAYER_SECONDS = 10;

export const BUNDLED_ROUNDS = bundled.rounds;
export const APP_TITLE = bundled.title;

export const qKey = (catIdx, qIdx) => `${catIdx}:${qIdx}`;

/* ---------- answer checking ---------- */
const clean = (s) =>
  String(s ?? '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[“”"'’`]/g, '').replace(/[^\p{L}\p{N}%.]+/gu, ' ').trim();

export function isCorrect(question, input) {
  const given = clean(input);
  if (!given) return false;
  const accepted = [question.answer, ...(question.answers || [])];
  return accepted.some((a) => clean(a) === given);
}

export const isFillIn = (q) => q.type === 'fill-in' || !q.options || q.options.length < 2;

/* ---------- option shuffling (skip "all of the above" style questions) ---------- */
const ORDERED = /\b(all|none|both|neither)\s+of\s+(the\s+)?(above|these|them)\b|\b(all|none)\s+(of\s+)?the\s+above\b|^all\s+(are\s+)?true\b|^(both\s+)?[a-e](\s*(,|and|&)\s*[a-e])+(\s+(only|are\s+true))?\.?$/i;
export function shuffledOptions(q) {
  const opts = [...(q.options || [])];
  if (opts.some((o) => ORDERED.test(o))) return opts;
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}

/* ---------- media ---------- */
export function mediaFor(image) {
  if (!image || typeof image !== 'string') return null;
  const base = import.meta.env.BASE_URL || './';
  if (/^(data:|https?:)/.test(image)) return { kind: /\.(mp4|webm)(\?|$)/i.test(image) ? 'video' : 'image', src: image };
  if (/\.(mp4|webm)$/i.test(image)) return { kind: 'video', src: `${base}assets/videos/${image}` };
  if (image.length > 100 && !image.includes('.')) return { kind: 'image', src: `data:image/jpeg;base64,${image}` };
  return { kind: 'image', src: `${base}assets/images/${image}` };
}

/* ---------- import / validation ---------- */
// Accepts: (1) {rounds:[...]}  (2) a single round {categories:[...]}  (3) legacy {"Category": {questions:[{correct_option...}]}}
export function normalizeImport(data, fileName = 'Custom round') {
  if (!data || typeof data !== 'object') throw new Error('That file is not a quiz. It should be a JSON object.');
  let rounds;
  if (Array.isArray(data.rounds)) rounds = data.rounds;
  else if (Array.isArray(data.categories)) rounds = [data];
  else {
    const names = Object.keys(data);
    if (!names.length) throw new Error('This quiz file has no categories.');
    rounds = [{
      title: fileName.replace(/\.json$/i, ''),
      categories: names.map((name) => ({ name, questions: data[name]?.questions })),
    }];
  }
  if (!rounds.length) throw new Error('This quiz file has no rounds.');

  const stamp = Date.now().toString(36);
  return rounds.map((r, ri) => {
    const rid = `custom-${stamp}-${ri + 1}`;
    if (!Array.isArray(r.categories) || !r.categories.length) throw new Error(`Round ${ri + 1} has no categories.`);
    return {
      id: rid,
      custom: true,
      title: String(r.title || `Custom round ${ri + 1}`),
      tagline: String(r.tagline || 'Imported round'),
      icon: r.icon || 'Upload',
      categories: r.categories.map((c, ci) => {
        const name = String(c.name || `Category ${ci + 1}`);
        if (!Array.isArray(c.questions) || !c.questions.length) throw new Error(`"${name}" has no questions.`);
        return {
          id: `${rid}-c${ci + 1}`, name, short: String(c.short || name),
          questions: c.questions.map((q, qi) => {
            const where = `Question ${qi + 1} in "${name}"`;
            const text = q.question;
            if (typeof text !== 'string' || !text.trim()) throw new Error(`${where} is missing its question text.`);
            const points = Number(q.points);
            if (!Number.isFinite(points)) throw new Error(`${where} needs a numeric "points" value.`);
            const answer = q.answer ?? q.correct_option;
            if (typeof answer !== 'string' || !answer.trim()) throw new Error(`${where} is missing its "answer".`);
            const fill = /fill/i.test(String(q.type || ''));
            const options = Array.isArray(q.options) ? q.options.map(String) : [];
            if (!fill) {
              if (options.length < 2) throw new Error(`${where} needs at least 2 options.`);
              if (!options.some((o) => clean(o) === clean(answer)))
                throw new Error(`${where}: the answer "${answer}" is not one of the options, so nobody could score it.`);
            }
            return {
              id: `${rid}-c${ci + 1}-q${qi + 1}`, points,
              type: fill ? 'fill-in' : 'multiple-choice', question: text, options,
              answer, answers: Array.isArray(q.answers) ? q.answers.map(String) : [], image: q.image || null,
            };
          }),
        };
      }),
    };
  });
}

export const roundTotals = (round) => {
  let questions = 0, points = 0;
  round.categories.forEach((c) => c.questions.forEach((q) => { questions++; points += q.points; }));
  return { questions, points, categories: round.categories.length };
};

export const TEMPLATE = {
  rounds: [{
    title: 'My round', tagline: 'A short line about it',
    categories: [{ name: 'Example category', questions: [
      { points: 10, type: 'multiple-choice', question: 'Who is the Head of State of Ghana under the 1992 Constitution?', options: ['The President', 'The Speaker', 'The Chief Justice', 'The Chief of Defence Staff'], answer: 'The President', image: null },
      { points: 20, type: 'fill-in', question: 'In which year did Ghana\'s Fourth Republic begin?', answer: '1993', answers: ['1993'] },
    ] }],
  }],
};
