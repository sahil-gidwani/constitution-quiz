import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

// Bundle src/lib/quiz.js (it imports rounds.json) into a temp ESM file with esbuild, then import it.
const root = fileURLToPath(new URL('..', import.meta.url));
const esbuild = process.env.ESBUILD || join(root, 'node_modules/.bin/esbuild');
const out = join(mkdtempSync(join(tmpdir(), 'quiz-')), 'quiz.mjs');
execFileSync(esbuild, [join(root, 'src/lib/quiz.js'), '--bundle', '--format=esm', '--platform=node', `--outfile=${out}`, '--define:import.meta.env={}', '--log-level=error']);
const Q = await import(pathToFileURL(out).href);

test('isCorrect ignores case, spacing, punctuation and accents', () => {
  const q = { answer: 'GH¢1.344 billion to GH¢1.788 billion' };
  assert.ok(Q.isCorrect(q, '  gh¢1.344 BILLION to gh¢1.788 billion '));
  assert.ok(Q.isCorrect({ answer: 'Vegetable Development Project "Yeredua"' }, 'vegetable development project yeredua'));
  assert.ok(Q.isCorrect({ answer: 'Café' }, 'cafe'));
  assert.ok(!Q.isCorrect({ answer: '70%' }, '7'));
  assert.ok(!Q.isCorrect({ answer: 'Cocoa' }, ''));
  assert.ok(Q.isCorrect({ answer: 'Accra', answers: ['Greater Accra'] }, 'greater accra'));
});
test('shuffle keeps the same options and leaves "all of the above" questions in order', () => {
  const q = { options: ['a', 'b', 'c', 'd'] };
  assert.deepEqual([...Q.shuffledOptions(q)].sort(), ['a', 'b', 'c', 'd']);
  for (const last of ['all of the above', 'a and c', 'Both a and b are true', 'a,b,c', 'a and b only', 'all the above', 'All true', 'None of the above.']) {
    const fixed = { options: ['x', 'y', 'z', last] };
    for (let i = 0; i < 20; i++) assert.deepEqual(Q.shuffledOptions(fixed), fixed.options, last);
  }
});
test('bundled rounds are all playable', () => {
  for (const r of Q.BUNDLED_ROUNDS) for (const c of r.categories) for (const q of c.questions) {
    assert.ok(Q.isCorrect(q, q.answer));
    assert.equal(q.options.filter((o) => Q.isCorrect(q, o)).length, 1, `exactly one correct option: ${q.question}`);
  }
});
test('import: legacy format (the old sample) converts', () => {
  const legacy = { Constitution: { questions: [{ points: 10, type: 'multiple-choice', question: 'Q?', options: ['a', 'b'], correct_option: 'a', image: null }] } };
  const [r] = Q.normalizeImport(legacy, 'old.json');
  assert.equal(r.categories[0].questions[0].answer, 'a');
  assert.equal(r.title, 'old');
});
test('import: new formats convert, and the template is itself valid', () => {
  assert.equal(Q.normalizeImport(Q.TEMPLATE).length, 1);
  assert.equal(Q.normalizeImport({ categories: [{ name: 'x', questions: Q.TEMPLATE.rounds[0].categories[0].questions }] }).length, 1);
});
test('import: rejects unplayable or malformed quizzes with a clear message', () => {
  const bad = (qs) => ({ rounds: [{ categories: [{ name: 'C', questions: qs }] }] });
  assert.throws(() => Q.normalizeImport(bad([{ points: 10, question: 'Q', options: ['a', 'b'], answer: 'zzz' }])), /not one of the options/);
  assert.throws(() => Q.normalizeImport(bad([{ points: 'x', question: 'Q', options: ['a', 'b'], answer: 'a' }])), /points/);
  assert.throws(() => Q.normalizeImport(bad([{ points: 10, question: 'Q', options: ['a'], answer: 'a' }])), /at least 2 options/);
  assert.throws(() => Q.normalizeImport(null), /not a quiz/);
  assert.throws(() => Q.normalizeImport({}), /no categories/);
});
