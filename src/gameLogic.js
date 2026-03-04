'use strict';

const DIFFICULTY = {
  easy:   { chances: 10, base: 1000 },
  medium: { chances: 5,  base: 2000 },
  hard:   { chances: 3,  base: 3000 },
};

/**
 * Calculate final score for a won game.
 * @param {string} difficulty - 'easy' | 'medium' | 'hard'
 * @param {number} wrongAttempts - number of incorrect guesses
 * @param {number} timeSeconds  - elapsed time in seconds
 * @param {number} hintsUsed    - number of parity hints used
 * @returns {number} score >= 50
 */
function calculateScore(difficulty, wrongAttempts, timeSeconds, hintsUsed) {
  const { chances, base } = DIFFICULTY[difficulty];
  const attemptPenalty = wrongAttempts * Math.floor(base / chances);
  const timePenalty    = Math.min(timeSeconds * 2, Math.floor(base * 0.3));
  const hintPenalty    = hintsUsed * 200;
  return Math.max(base - attemptPenalty - timePenalty - hintPenalty, 50);
}

/**
 * Return a random integer between 1 and 100 inclusive.
 */
function randomNumber() {
  return Math.floor(Math.random() * 100) + 1;
}

module.exports = { DIFFICULTY, calculateScore, randomNumber };
