'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { DIFFICULTY, calculateScore, randomNumber } = require('./gameLogic');

// ── DIFFICULTY constants ───────────────────────────────────────────────────────
test('DIFFICULTY has easy, medium, hard keys', () => {
  assert.ok('easy'   in DIFFICULTY);
  assert.ok('medium' in DIFFICULTY);
  assert.ok('hard'   in DIFFICULTY);
});

test('DIFFICULTY easy has 10 chances and base 1000', () => {
  assert.equal(DIFFICULTY.easy.chances, 10);
  assert.equal(DIFFICULTY.easy.base,    1000);
});

test('DIFFICULTY medium has 5 chances and base 2000', () => {
  assert.equal(DIFFICULTY.medium.chances, 5);
  assert.equal(DIFFICULTY.medium.base,    2000);
});

test('DIFFICULTY hard has 3 chances and base 3000', () => {
  assert.equal(DIFFICULTY.hard.chances, 3);
  assert.equal(DIFFICULTY.hard.base,    3000);
});

// ── randomNumber ───────────────────────────────────────────────────────────────
test('randomNumber returns an integer', () => {
  for (let i = 0; i < 100; i++) {
    assert.ok(Number.isInteger(randomNumber()));
  }
});

test('randomNumber always returns a value between 1 and 100', () => {
  for (let i = 0; i < 500; i++) {
    const n = randomNumber();
    assert.ok(n >= 1 && n <= 100, `Out of range: ${n}`);
  }
});

// ── calculateScore ─────────────────────────────────────────────────────────────
test('perfect easy game (0 wrong, 0s, 0 hints) returns base 1000', () => {
  assert.equal(calculateScore('easy', 0, 0, 0), 1000);
});

test('perfect medium game returns base 2000', () => {
  assert.equal(calculateScore('medium', 0, 0, 0), 2000);
});

test('perfect hard game returns base 3000', () => {
  assert.equal(calculateScore('hard', 0, 0, 0), 3000);
});

test('each wrong guess deducts floor(base/chances) from score', () => {
  // easy: base=1000, chances=10 → 100 pts per wrong guess
  assert.equal(calculateScore('easy', 1, 0, 0), 900);
  assert.equal(calculateScore('easy', 5, 0, 0), 500);
});

test('hint deducts 200 pts per hint used', () => {
  assert.equal(calculateScore('easy', 0, 0, 1), 800);
  assert.equal(calculateScore('easy', 0, 0, 2), 600);
});

test('score never drops below 50', () => {
  // Worst possible case: all wrong, maximum time, many hints
  const score = calculateScore('easy', 9, 9999, 20);
  assert.ok(score >= 50, `Score was ${score}, expected >= 50`);
});

test('score never drops below 50 on hard', () => {
  const score = calculateScore('hard', 2, 9999, 20);
  assert.ok(score >= 50, `Score was ${score}, expected >= 50`);
});

test('hard difficulty gives higher base score than easy', () => {
  const easy = calculateScore('easy', 0, 0, 0);
  const hard = calculateScore('hard', 0, 0, 0);
  assert.ok(hard > easy);
});

test('time penalty is capped at 30% of base', () => {
  // At huge time values the penalty should plateau
  const score1 = calculateScore('easy', 0, 10000, 0);
  const score2 = calculateScore('easy', 0, 99999, 0);
  assert.equal(score1, score2); // both hit the cap
});
