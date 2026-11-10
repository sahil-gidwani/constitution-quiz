import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../src/data/rounds.json', import.meta.url), 'utf8'));
const all = data.rounds.flatMap((r) => r.categories.flatMap((c) => c.questions.map((q) => ({ r, c, q }))));

test('bundled data has the expected shape', () => {
  assert.equal(data.rounds.length, 11);
  assert.equal(all.length, 262);
  for (const r of data.rounds) assert.ok(r.categories.length >= 4);
});
test('every category is a prefix of the 10..50 ladder (a few source topics have fewer than 5 questions)', () => {
  for (const r of data.rounds) for (const c of r.categories) {
    assert.deepEqual(c.questions.map((q) => q.points), [10, 20, 30, 40, 50].slice(0, c.questions.length), `${r.id}/${c.name}`);
  }
});
test('every answer is one of its options, options are unique, ids are unique', () => {
  const ids = new Set();
  for (const { q } of all) {
    assert.ok(q.options.includes(q.answer), q.question);
    assert.equal(new Set(q.options).size, q.options.length, `dupe options: ${q.question}`);
    assert.ok(q.options.length === 4 || q.options.length === 5, q.id);
    assert.ok(!ids.has(q.id)); ids.add(q.id);
  }
});
test('every topic name is used exactly once', () => {
  const names = data.rounds.flatMap((r) => r.categories.map((c) => c.name));
  assert.equal(new Set(names).size, names.length);
  assert.equal(names.length, 54);
});
