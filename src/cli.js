'use strict';

const readline = require('readline');
const fs       = require('fs');
const path     = require('path');
const { DIFFICULTY, calculateScore, randomNumber } = require('./gameLogic');

// ── Paths ─────────────────────────────────────────────────────────────────────
const DATA_DIR    = path.join(__dirname, '..', 'data');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');

// ── Readline interface ────────────────────────────────────────────────────────
const rl = readline.createInterface({
  input:  process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

// ── Persistence ───────────────────────────────────────────────────────────────
function loadScores() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(SCORES_FILE)) return [];
    return JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveScore(entry) {
  const scores = loadScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  const top100 = scores.slice(0, 100);
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SCORES_FILE, JSON.stringify(top100, null, 2));
  return top100.findIndex(s =>
    s.playerName === entry.playerName && s.score === entry.score && s.date === entry.date
  ) + 1;
}

// ── Display helpers ───────────────────────────────────────────────────────────
function printBanner() {
  console.log('\n' + '═'.repeat(50));
  console.log('        NUMBER GUESSING GAME');
  console.log('═'.repeat(50));
  console.log('  I\'m thinking of a number between 1 and 100.');
  console.log('  Difficulty controls how many guesses you get.');
  console.log('  Hints appear after 2 wrong guesses.');
  console.log('  Score = base − attempt penalties − time penalty − hint penalties.');
  console.log('═'.repeat(50) + '\n');
}

function printHighScores(difficulty) {
  const scores = loadScores().filter(s => !difficulty || s.difficulty === difficulty);
  if (scores.length === 0) { console.log('  (No high scores yet)\n'); return; }
  console.log('\n  ── High Scores' + (difficulty ? ` [${difficulty}]` : '') + ' ──');
  scores.slice(0, 5).forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.playerName.padEnd(12)} ${String(s.score).padStart(5)} pts  (${s.difficulty}, ${s.attemptsUsed} guess${s.attemptsUsed === 1 ? '' : 'es'}, ${s.timeSeconds}s)`);
  });
  console.log();
}

// ── Difficulty selection ──────────────────────────────────────────────────────
async function selectDifficulty() {
  console.log('Select difficulty:');
  console.log('  1. Easy   (10 chances)');
  console.log('  2. Medium  (5 chances)');
  console.log('  3. Hard    (3 chances)\n');

  while (true) {
    const choice = (await ask('Enter choice [1/2/3]: ')).trim();
    if (choice === '1') return 'easy';
    if (choice === '2') return 'medium';
    if (choice === '3') return 'hard';
    console.log('  Invalid choice. Please enter 1, 2, or 3.');
  }
}

// ── Hint helpers ──────────────────────────────────────────────────────────────
function rangeHint(low, high) {
  return `  HINT ▶ Number is between ${low} and ${high}`;
}

function parityHint(number) {
  return `  HINT ▶ Number is ${number % 2 === 0 ? 'even' : 'odd'}`;
}

// ── Single game round ─────────────────────────────────────────────────────────
async function playRound(playerName) {
  const difficulty = await selectDifficulty();
  const { chances } = DIFFICULTY[difficulty];
  const target     = randomNumber();

  console.log(`\n  ✓ Difficulty: ${difficulty.toUpperCase()} — you have ${chances} chances.\n`);

  let attemptsLeft = chances;
  let wrongCount   = 0;
  let hintsUsed    = 0;
  let parityShown  = false;
  let low = 1, high = 100;
  const startTime  = Date.now();
  const guessLog   = [];

  while (attemptsLeft > 0) {
    console.log(`  Attempts left: ${attemptsLeft}`);

    // Offer hints after 2 wrong guesses
    if (wrongCount >= 2) {
      console.log(rangeHint(low, high));
      if (!parityShown) {
        const offerParity = (await ask('  Show parity hint? (costs 200 pts) [y/N]: ')).trim().toLowerCase();
        if (offerParity === 'y') {
          console.log(parityHint(target));
          hintsUsed++;
          parityShown = true;
        }
      }
    }

    const raw = (await ask('  Your guess: ')).trim();
    const guess = parseInt(raw, 10);

    if (isNaN(guess) || guess < 1 || guess > 100) {
      console.log('  ✗ Please enter a whole number between 1 and 100.\n');
      continue;
    }

    if (guessLog.includes(guess)) {
      console.log(`  ✗ You already guessed ${guess}!\n`);
      continue;
    }

    guessLog.push(guess);
    attemptsLeft--;

    if (guess === target) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const score   = calculateScore(difficulty, wrongCount, elapsed, hintsUsed);
      console.log(`\n  ★ Correct! You guessed it in ${wrongCount + 1} attempt${wrongCount + 1 === 1 ? '' : 's'} (${elapsed}s).`);
      console.log(`  Score: ${score} pts\n`);

      const rank = saveScore({
        playerName,
        score,
        difficulty,
        attemptsUsed: wrongCount + 1,
        timeSeconds:  elapsed,
        date:         new Date().toISOString(),
      });
      console.log(`  You are rank #${rank} on the all-time leaderboard!\n`);
      printHighScores(difficulty);
      return true;
    }

    if (guess < target) {
      high = Math.max(high, target); // keep real high
      low  = Math.max(low, guess + 1);
      console.log(`  ▲ Higher! The number is GREATER than ${guess}.\n`);
    } else {
      low  = Math.min(low, target);
      high = Math.min(high, guess - 1);
      console.log(`  ▼ Lower! The number is LESS than ${guess}.\n`);
    }

    wrongCount++;
  }

  // Out of attempts
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n  ✗ Out of chances! The number was ${target}. Better luck next time!\n`);
  return false;
}

// ── Main loop ─────────────────────────────────────────────────────────────────
async function main() {
  printBanner();

  const playerName = ((await ask('  Enter your name: ')).trim()) || 'Anonymous';
  console.log(`\n  Welcome, ${playerName}!\n`);

  let playing = true;
  while (playing) {
    await playRound(playerName);

    const again = (await ask('  Play again? [y/N]: ')).trim().toLowerCase();
    playing = (again === 'y');
    if (playing) console.log('\n' + '─'.repeat(50) + '\n');
  }

  console.log('\n  Thanks for playing! Goodbye.\n');
  rl.close();
}

main().catch(err => {
  console.error(err);
  rl.close();
  process.exit(1);
});
