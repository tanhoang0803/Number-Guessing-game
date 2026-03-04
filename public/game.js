'use strict';

// ── DOM helpers ───────────────────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls)  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

// ── Clock ─────────────────────────────────────────────────────────────────────
setInterval(() => {
  $('clock').textContent = new Date().toLocaleTimeString();
}, 1000);
$('clock').textContent = new Date().toLocaleTimeString();

// ── Screen management ─────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

// ── GuessingGame state machine ────────────────────────────────────────────────
class GuessingGame {
  constructor() {
    this.gameId       = null;
    this.playerName   = '';
    this.difficulty   = 'easy';
    this.chances      = 10;
    this.attemptsLeft = 10;
    this.wrongCount   = 0;
    this.low          = 1;
    this.high         = 100;
    this.guessHistory = [];   // [{guess, result}]
    this.hintsShown   = 0;
    this.parityUsed   = false;
    this.timerSecs    = 0;
    this._timerHandle = null;
    this._scoreData   = null;  // stored after win for leaderboard submit
  }

  // ── Timer ───────────────────────────────────────────────────────────────────
  startTimer() {
    this.timerSecs = 0;
    clearInterval(this._timerHandle);
    this._timerHandle = setInterval(() => {
      this.timerSecs++;
      $('meta-timer').textContent = `⏱ ${this.timerSecs}s`;
    }, 1000);
  }
  stopTimer() { clearInterval(this._timerHandle); }

  // ── Start a new game ────────────────────────────────────────────────────────
  async start(playerName, difficulty) {
    this.playerName   = playerName || 'Anonymous';
    this.difficulty   = difficulty;
    this.low  = 1;
    this.high = 100;
    this.guessHistory = [];
    this.hintsShown   = 0;
    this.parityUsed   = false;
    this._scoreData   = null;
    $('guess-log').innerHTML = '';
    $('hint-area').classList.add('hidden');
    $('parity-btn').disabled = false;
    $('parity-btn').textContent = '💡 Reveal parity (−200 pts)';
    setFeedback('', '');

    try {
      const data = await api('/api/game/start', 'POST', { difficulty });
      this.gameId       = data.gameId;
      this.chances      = data.chances;
      this.attemptsLeft = data.chances;
      this.wrongCount   = 0;
    } catch (e) {
      alert('Failed to start game: ' + e.message);
      return;
    }

    // Render dots
    renderDots(this.chances, this.attemptsLeft);

    // Meta bar
    $('meta-diff').textContent = difficulty.toUpperCase();
    $('meta-timer').textContent = '⏱ 0s';
    updateScorePreview(this);

    this.startTimer();
    showScreen('game-screen');
    $('guess-input').value = '';
    $('guess-input').focus();
  }

  // ── Submit a guess ──────────────────────────────────────────────────────────
  async guess(raw) {
    const num = parseInt(raw, 10);
    if (isNaN(num) || num < 1 || num > 100) {
      setFeedback('Enter a whole number between 1 and 100.', 'error'); return;
    }
    if (this.guessHistory.some(h => h.guess === num)) {
      setFeedback(`You already guessed ${num}!`, 'error'); return;
    }

    $('guess-btn').disabled = true;

    let data;
    try {
      data = await api('/api/game/guess', 'POST', { gameId: this.gameId, guess: num });
    } catch (e) {
      setFeedback(e.message, 'error');
      $('guess-btn').disabled = false;
      return;
    }

    $('guess-btn').disabled = false;
    $('guess-input').value = '';
    $('guess-input').focus();

    if (data.result === 'win') {
      this.stopTimer();
      this.guessHistory.push({ guess: num, result: 'win' });
      addGuessTag(num, 'win');
      this._scoreData = data;
      await this.showResult(true, data);
      return;
    }

    if (data.result === 'lose') {
      this.stopTimer();
      this.guessHistory.push({ guess: num, result: 'lose' });
      addGuessTag(num, 'lose');
      await this.showResult(false, data);
      return;
    }

    // higher / lower
    this.attemptsLeft = data.attemptsLeft;
    this.wrongCount++;
    this.guessHistory.push({ guess: num, result: data.result });
    addGuessTag(num, data.result);

    if (data.result === 'higher') {
      this.low = Math.max(this.low, num + 1);
      setFeedback(`▲  Higher! The number is GREATER than ${num}.`, 'higher');
    } else {
      this.high = Math.min(this.high, num - 1);
      setFeedback(`▼  Lower! The number is LESS than ${num}.`, 'lower');
    }

    renderDots(this.chances, this.attemptsLeft);
    updateScorePreview(this);

    // Show hint area after 2 wrong guesses
    if (this.wrongCount >= 2) {
      $('range-hint').textContent = `Range hint: number is between ${this.low} and ${this.high}`;
      $('hint-area').classList.remove('hidden');
      if (this.parityUsed) {
        $('parity-btn').disabled = true;
        $('parity-btn').textContent = '💡 Parity already revealed';
      }
    }
  }

  // ── Parity hint ─────────────────────────────────────────────────────────────
  async revealParity() {
    if (this.parityUsed) return;
    try {
      const data = await api(`/api/game/hint?gameId=${this.gameId}`, 'GET');
      this.parityUsed = true;
      this.hintsShown++;
      $('parity-btn').disabled = true;
      $('parity-btn').textContent = `💡 Number is ${data.parity.toUpperCase()} (−200 pts applied)`;
      updateScorePreview(this);
    } catch (e) {
      alert(e.message);
    }
  }

  // ── Show result screen ──────────────────────────────────────────────────────
  async showResult(won, data) {
    $('result-icon').textContent    = won ? '★' : '✗';
    $('res-time').textContent       = `${this.timerSecs}s`;
    $('res-attempts').textContent   = this.guessHistory.length;

    if (won) {
      typeIn($('result-message'), `You got it in ${data.attemptsUsed} guess${data.attemptsUsed === 1 ? '' : 'es'}!`);
      $('res-score').textContent = data.score;

      // Submit score
      let rank = '?';
      try {
        const sr = await api('/api/scores', 'POST', {
          playerName:   this.playerName,
          score:        data.score,
          difficulty:   data.difficulty,
          attemptsUsed: data.attemptsUsed,
          timeSeconds:  data.timeSeconds,
          gameId:       this.gameId,
        });
        rank = `#${sr.rank}`;
      } catch { /* score submit failed, non-critical */ }

      $('res-rank').textContent = rank;
    } else {
      typeIn($('result-message'), `Out of guesses! The number was ${data.answer}.`);
      $('res-score').textContent = '—';
      $('res-rank').textContent  = '—';
    }

    showScreen('result-screen');
  }
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function setFeedback(text, cls) {
  const f = $('feedback');
  f.textContent = text || '\u00a0';
  f.className   = 'feedback-line' + (cls ? ` ${cls}` : '');
}

function renderDots(total, left) {
  const container = $('attempt-dots');
  container.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const dot = el('div', 'dot');
    if (i >= left) dot.classList.add('used');
    container.appendChild(dot);
  }
}

function addGuessTag(num, result) {
  const tag = el('span', `guess-tag ${result === 'higher' ? 'higher' : result === 'lower' ? 'lower' : ''}`, `${num}`);
  $('guess-log').appendChild(tag);
}

function updateScorePreview(game) {
  const DIFFICULTY_BASE = { easy: 1000, medium: 2000, hard: 3000 };
  const DIFFICULTY_CHANCES = { easy: 10, medium: 5, hard: 3 };
  const base    = DIFFICULTY_BASE[game.difficulty]    || 1000;
  const chances = DIFFICULTY_CHANCES[game.difficulty] || 10;
  const penalty = game.wrongCount * Math.floor(base / chances);
  const hintPen = game.hintsShown * 200;
  const preview = Math.max(base - penalty - hintPen, 50);
  $('meta-score-preview').textContent = `~${preview} pts`;
}

function typeIn(el, text) {
  el.textContent = '';
  let i = 0;
  const iv = setInterval(() => {
    el.textContent += text[i++];
    if (i >= text.length) clearInterval(iv);
  }, 28);
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
async function loadLeaderboard(filter = '') {
  const url = '/api/scores' + (filter ? `?difficulty=${filter}` : '');
  try {
    const scores = await api(url, 'GET');
    const body   = $('lb-body');
    body.innerHTML = '';
    if (scores.length === 0) {
      $('lb-empty').classList.remove('hidden');
      $('lb-table').classList.add('hidden');
      return;
    }
    $('lb-empty').classList.add('hidden');
    $('lb-table').classList.remove('hidden');
    scores.forEach((s, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${esc(s.playerName)}</td>
        <td>${s.score}</td>
        <td>${s.difficulty}</td>
        <td>${s.attemptsUsed}</td>
        <td>${s.timeSeconds}s</td>
      `;
      body.appendChild(tr);
    });
  } catch { $('lb-empty').classList.remove('hidden'); }
}

function openLeaderboard(filter) {
  loadLeaderboard(filter);
  $('leaderboard-overlay').classList.remove('hidden');
}

function esc(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Fetch wrapper ─────────────────────────────────────────────────────────────
async function api(url, method = 'GET', body) {
  const opts = { method, headers: {} };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res  = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Server error');
  return data;
}

// ── Main bootstrap ────────────────────────────────────────────────────────────
const game = new GuessingGame();

// Difficulty selector
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    game.difficulty = btn.dataset.diff;
  });
});

// Start button
$('start-btn').addEventListener('click', () => {
  const name = $('player-name').value.trim() || 'Anonymous';
  game.start(name, game.difficulty);
});
$('player-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('start-btn').click();
});

// Guess button + enter key
$('guess-btn').addEventListener('click', () => {
  game.guess($('guess-input').value);
});
$('guess-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') game.guess($('guess-input').value);
});

// Parity hint
$('parity-btn').addEventListener('click', () => game.revealParity());

// Result screen buttons
$('play-again-btn').addEventListener('click',  () => game.start(game.playerName, game.difficulty));
$('change-diff-btn').addEventListener('click', () => showScreen('setup-screen'));
$('result-scores-btn').addEventListener('click', () => openLeaderboard(''));

// Leaderboard buttons
$('scores-btn').addEventListener('click',  () => openLeaderboard(''));
$('close-lb').addEventListener('click',    () => $('leaderboard-overlay').classList.add('hidden'));
document.querySelectorAll('.lb-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    loadLeaderboard(tab.dataset.filter);
  });
});

// Close overlay on backdrop click
$('leaderboard-overlay').addEventListener('click', e => {
  if (e.target === $('leaderboard-overlay')) $('leaderboard-overlay').classList.add('hidden');
});
