'use strict';

const express = require('express');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');
const { DIFFICULTY, calculateScore, randomNumber } = require('./src/gameLogic');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Persistence ───────────────────────────────────────────────────────────────
const DATA_DIR    = path.join(__dirname, 'data');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadScores() {
  ensureDataDir();
  if (!fs.existsSync(SCORES_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8')); }
  catch { return []; }
}

function persistScores(scores) {
  ensureDataDir();
  fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2));
}

// ── In-memory game sessions ───────────────────────────────────────────────────
// Map<gameId, session>
const sessions = new Map();

function makeSession(difficulty) {
  return {
    number:       randomNumber(),
    difficulty,
    chances:      DIFFICULTY[difficulty].chances,
    attemptsLeft: DIFFICULTY[difficulty].chances,
    startTime:    Date.now(),
    hintsUsed:    0,
    parityUsed:   false,
    guessed:      new Set(),
    over:         false,
  };
}

// ── API: Start game ───────────────────────────────────────────────────────────
app.post('/api/game/start', (req, res) => {
  const difficulty = (req.body.difficulty || '').toLowerCase();
  if (!DIFFICULTY[difficulty]) {
    return res.status(400).json({ error: 'Invalid difficulty. Use easy, medium, or hard.' });
  }

  const gameId  = crypto.randomUUID();
  const session = makeSession(difficulty);
  sessions.set(gameId, session);

  // Clean up old sessions (> 1 hour) to prevent memory leaks
  const cutoff = Date.now() - 3_600_000;
  for (const [id, s] of sessions) {
    if (s.startTime < cutoff) sessions.delete(id);
  }

  res.json({ gameId, chances: session.chances, difficulty });
});

// ── API: Submit guess ─────────────────────────────────────────────────────────
app.post('/api/game/guess', (req, res) => {
  const { gameId, guess } = req.body;
  const session = sessions.get(gameId);
  if (!session) return res.status(404).json({ error: 'Game not found.' });
  if (session.over) return res.status(400).json({ error: 'Game is already over.' });

  const num = parseInt(guess, 10);
  if (isNaN(num) || num < 1 || num > 100) {
    return res.status(400).json({ error: 'Guess must be a number between 1 and 100.' });
  }
  if (session.guessed.has(num)) {
    return res.status(400).json({ error: `You already guessed ${num}.` });
  }

  session.guessed.add(num);
  session.attemptsLeft--;

  if (num === session.number) {
    session.over = true;
    const timeSeconds   = Math.round((Date.now() - session.startTime) / 1000);
    const wrongAttempts = session.guessed.size - 1;
    const score         = calculateScore(session.difficulty, wrongAttempts, timeSeconds, session.hintsUsed);
    return res.json({
      result:       'win',
      score,
      attemptsUsed: session.guessed.size,
      timeSeconds,
      hintsUsed:    session.hintsUsed,
      difficulty:   session.difficulty,
    });
  }

  if (session.attemptsLeft === 0) {
    session.over = true;
    return res.json({
      result:  'lose',
      answer:  session.number,
      attemptsLeft: 0,
    });
  }

  res.json({
    result:       num < session.number ? 'higher' : 'lower',
    attemptsLeft: session.attemptsLeft,
  });
});

// ── API: Get hint (parity) ────────────────────────────────────────────────────
app.get('/api/game/hint', (req, res) => {
  const { gameId } = req.query;
  const session = sessions.get(gameId);
  if (!session) return res.status(404).json({ error: 'Game not found.' });
  if (session.over)       return res.status(400).json({ error: 'Game is over.' });
  if (session.parityUsed) return res.status(400).json({ error: 'Parity hint already used.' });

  session.parityUsed = true;
  session.hintsUsed++;
  res.json({ parity: session.number % 2 === 0 ? 'even' : 'odd' });
});

// ── API: Get scores ───────────────────────────────────────────────────────────
app.get('/api/scores', (req, res) => {
  const { difficulty } = req.query;
  let scores = loadScores();
  if (difficulty) scores = scores.filter(s => s.difficulty === difficulty.toLowerCase());
  res.json(scores.slice(0, 20));
});

// ── API: Submit score ─────────────────────────────────────────────────────────
app.post('/api/scores', (req, res) => {
  const { playerName, score, difficulty, attemptsUsed, timeSeconds, gameId } = req.body;

  // Validate the game session exists and is a won game
  const session = sessions.get(gameId);
  if (!session || !session.over) {
    return res.status(400).json({ error: 'Invalid or incomplete game session.' });
  }

  if (!playerName || typeof playerName !== 'string') {
    return res.status(400).json({ error: 'playerName is required.' });
  }

  const entry = {
    playerName: playerName.trim().slice(0, 20),
    score:      Number(score),
    difficulty,
    attemptsUsed: Number(attemptsUsed),
    timeSeconds:  Number(timeSeconds),
    date:         new Date().toISOString(),
  };

  const scores = loadScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  const top100 = scores.slice(0, 100);
  persistScores(top100);

  const rank = top100.findIndex(
    s => s.playerName === entry.playerName && s.score === entry.score && s.date === entry.date
  ) + 1;

  // Remove session so score can't be submitted twice
  sessions.delete(gameId);

  res.json({ rank, entry });
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Guessing Game server running at http://localhost:${PORT}`);
});
