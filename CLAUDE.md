# Guessing Game - Claude Instructions

## Project Overview
A CLI-based number guessing game where the computer picks a random number (1–100) and the user guesses it within a limited number of attempts based on difficulty.

## Core Requirements

### Game Flow
1. Display welcome message and rules on start.
2. Computer randomly selects a number between 1 and 100.
3. User selects difficulty level:
   - **Easy**: 10 chances
   - **Medium**: 5 chances
   - **Hard**: 3 chances
4. User enters guesses one at a time.
5. After each incorrect guess, tell the user if the number is **greater** or **less** than their guess.
6. Win: display congratulations + number of attempts used.
7. Lose: notify the user they've run out of chances and reveal the number.

### Optional Features (nice to have)
- **Multi-round**: Ask user to play again after each round.
- **Timer**: Track and display how long the user took to guess.
- **Hint system**: Provide clues (e.g., even/odd, range narrowing) if user is stuck.
- **High score tracking**: Record fewest attempts per difficulty level across sessions.

## Code Style
- Keep logic modular: separate concerns (random number gen, input handling, game loop, scoring).
- Validate all user input (non-numeric input, out-of-range guesses).
- Handle edge cases gracefully (invalid difficulty choice, repeated guesses).

## Language / Stack
- Language: determined per implementation (Python, JavaScript/Node, etc.)
- CLI only — no web UI or GUI needed.

## File Structure (suggested)
```
Guessing_game/
├── CLAUDE.md       # This file
├── README.md       # Project summary
└── src/
    └── main.<ext>  # Entry point
```
