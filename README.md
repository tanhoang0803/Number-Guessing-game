# Number Guessing Game

A simple CLI-based number guessing game where the computer randomly selects a number between 1 and 100, and the player must guess it within a limited number of attempts.

## How to Play

1. Launch the game from the command line.
2. Read the welcome message and rules.
3. Select a difficulty level:
   | Difficulty | Chances |
   |------------|---------|
   | Easy       | 10      |
   | Medium     | 5       |
   | Hard       | 3       |
4. Enter your guesses one at a time.
5. After each wrong guess, you'll be told if the target number is **higher** or **lower** than your guess.
6. Win by guessing the correct number before you run out of chances!

## Sample Session

```
Welcome to the Number Guessing Game!
I'm thinking of a number between 1 and 100.

Please select the difficulty level:
1. Easy (10 chances)
2. Medium (5 chances)
3. Hard (3 chances)

Enter your choice: 2
Great! You have selected the Medium difficulty level.
Let's start the game!

Enter your guess: 50
Incorrect! The number is less than 50.
Enter your guess: 25
Incorrect! The number is greater than 25.
Enter your guess: 35
Incorrect! The number is less than 35.
Enter your guess: 30
Congratulations! You guessed the correct number in 4 attempts.
```

## Features

- **Difficulty levels** — Easy, Medium, and Hard control the number of allowed guesses.
- **Directional hints** — After each wrong guess the game tells you whether to guess higher or lower.
- **Input validation** — Non-numeric input and out-of-range guesses are handled gracefully.

## Optional / Bonus Features

- **Play again** — Option to start a new round without restarting the program.
- **Timer** — Measures how long it takes you to guess the number.
- **Hint system** — Extra clues (e.g., even/odd, narrowed range) if you're stuck.
- **High score tracking** — Remembers your best (fewest attempts) score per difficulty level.

## Requirements

- No external dependencies — uses only the standard library of the chosen language.
- Runs entirely in the terminal / command prompt.

## Getting Started

```bash
# Example for a Python implementation
python src/main.py

# Example for a Node.js implementation
node src/main.js
```
