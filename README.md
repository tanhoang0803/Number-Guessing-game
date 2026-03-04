# Number Guessing Game

[![CI](https://github.com/tanhoang0803/Number-Guessing-game/actions/workflows/ci.yml/badge.svg)](https://github.com/tanhoang0803/Number-Guessing-game/actions/workflows/ci.yml)

A CLI + browser-playable number guessing game with a retro terminal UI and a persistent ranked leaderboard.

## Live Demo

**[https://number-guessing-game-8mhf.onrender.com](https://number-guessing-game-8mhf.onrender.com)**

> The free Render tier spins down after 15 min of inactivity — first load may take ~30 seconds to wake up.

---

## How to Play

1. Enter your name and choose a difficulty level.
2. Guess the secret number (1–100) before your chances run out.
3. After each wrong guess the game tells you whether to go **higher** or **lower**.
4. After 2 wrong guesses, a **range hint** appears; you can also reveal the number's **parity** (even/odd) for a −200 pt penalty.
5. Win to earn a score and appear on the leaderboard!

| Difficulty | Chances | Base Score |
|------------|---------|------------|
| Easy       | 10      | 1 000 pts  |
| Medium     | 5       | 2 000 pts  |
| Hard       | 3       | 3 000 pts  |

### Scoring formula
```
score = base
      − wrongGuesses × floor(base / chances)
      − min(seconds × 2, base × 0.3)
      − hintsUsed × 200
      (minimum 50 pts)
```

---

## Run Locally

```bash
git clone https://github.com/tanhoang0803/Number-Guessing-game.git
cd Number-Guessing-game
npm install

# Web version → http://localhost:3000
npm start

# CLI version
npm run cli
```

---

## Project Structure

```
Guessing_game/
├── render.yaml          # Render.com deployment config
├── server.js            # Express API + static file serving
├── src/
│   ├── gameLogic.js     # Shared scoring formula & constants
│   └── cli.js           # Terminal game (readline)
└── public/
    ├── index.html       # 3-screen UI + leaderboard overlay
    ├── style.css        # Retro CRT terminal theme
    └── game.js          # Frontend state machine
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/game/start` | Start a new game session |
| POST | `/api/game/guess` | Submit a guess |
| GET  | `/api/game/hint?gameId=` | Get parity hint (once per game) |
| GET  | `/api/scores?difficulty=` | Fetch top-20 leaderboard |
| POST | `/api/scores` | Submit final score |

---

## Deploy Your Own (Render.com)

1. Fork this repo.
2. Go to [render.com](https://render.com) → **New → Web Service**.
3. Connect your GitHub repo — Render auto-detects `render.yaml`.
4. Click **Deploy**. Done.
