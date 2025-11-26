# Leaderboards & High Scores Specification

## Overview

This document outlines the leaderboard system for games on lukelarue.com. Leaderboards track player performance on specific, standardized game configurations to enable fair competition.

## Tracked Game Modes

### Minesweeper

Four official game modes are tracked for leaderboard purposes:

| Mode         | Width | Height | Mines | Notes                      |
|--------------|-------|--------|-------|----------------------------|
| Beginner     | 8     | 8      | 10    | Classic beginner board     |
| Intermediate | 16    | 16     | 40    | Classic intermediate board |
| Hard         | 30    | 16     | 99    | Classic expert board       |
| Extreme      | 30    | 22     | 200   | Extended challenge mode    |

Only games played with these exact configurations are eligible for leaderboard ranking.

### Lo Siento

*Coming soon* - High scores and leaderboards for Lo Siento will be added in a future update.

---

## Data Model

### Firestore Collections

#### `minesweeperLeaderboards`

Top-level collection containing one document per tracked game mode.

**Document ID format:** `{width}x{height}x{mines}` (e.g., `8x8x10`, `16x16x40`)

**Document fields:**
- `mode_name`: string (e.g., "Beginner", "Intermediate")
- `board_width`: number
- `board_height`: number
- `num_mines`: number
- `updated_at`: timestamp

#### `minesweeperLeaderboards/{modeId}/entries`

Subcollection containing individual fastest time entries.

**Document ID:** Sanitized user_id (one entry per user per mode)

**Document fields:**
- `user_id`: string - User identifier
- `user_name`: string | null - Display name (if available)
- `time_ms`: number - Completion time in milliseconds
- `moves_count`: number - Total moves made
- `completed_at`: timestamp - When the game was completed

**Indexes required:**
- `time_ms` ascending (for fastest time queries)

#### `minesweeperLeaderboards/{modeId}/winStats`

Subcollection containing per-user win statistics for each mode.

**Document ID:** Sanitized user_id (one entry per user per mode)

**Document fields:**
- `user_id`: string - User identifier
- `user_name`: string | null - Display name (if available)
- `wins`: number - Total wins
- `losses`: number - Total losses (includes losses and aborts)
- `played`: number - Total games played
- `updated_at`: timestamp - Last update time

**Indexes required:**
- `wins` descending (for most wins queries)

---

## API Endpoints

### GET `/api/minesweeper/leaderboard`

Retrieve leaderboard entries for a specific game mode.

**Query Parameters:**
- `mode`: string (required) - One of: `beginner`, `intermediate`, `hard`, `extreme`
- `limit`: number (optional, default: 10, max: 100) - Number of entries to return

**Response:**
```json
{
  "mode": "beginner",
  "board_width": 8,
  "board_height": 8,
  "num_mines": 10,
  "entries": [
    {
      "rank": 1,
      "user_id": "user@example.com",
      "user_name": "Player One",
      "time_ms": 15234,
      "moves_count": 45,
      "completed_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### GET `/api/minesweeper/leaderboard/wins`

Retrieve win stats leaderboard for a specific game mode, sorted by most wins.

**Query Parameters:**
- `mode`: string (required) - One of: `beginner`, `intermediate`, `hard`, `extreme`
- `limit`: number (optional, default: 10, max: 100) - Number of entries to return

**Response:**
```json
{
  "mode": "beginner",
  "mode_name": "Beginner",
  "board_width": 8,
  "board_height": 8,
  "num_mines": 10,
  "entries": [
    {
      "rank": 1,
      "user_id": "user@example.com",
      "user_name": "Player One",
      "wins": 42,
      "losses": 15,
      "played": 57,
      "win_pct": 0.737
    }
  ]
}
```

**Note:** `losses` includes both actual losses (hitting mines) and aborts. Win percentage is calculated as `wins / played`.

---

## Leaderboard Entry Logic

### Fastest Times Recording

A fastest time entry is recorded when:
1. A game is won (status = "won")
2. The game configuration matches a tracked mode exactly
3. The game has a valid `result_time_ms` (time from first reveal to win)
4. The time is better than the user's previous best (or first entry)

### Win Stats Recording

Win stats are updated when:
1. A game is completed (won, lost, or abandoned)
2. The game configuration matches a tracked mode exactly
3. Aborts count as losses for win percentage calculation

### Duplicate Handling

- Only the player's best time per mode is kept on the fastest times leaderboard
- Win stats are aggregated per user per mode (cumulative wins/losses/played)

### Data Integrity

- Entries are created atomically with game completion
- Server timestamps are used for `completed_at`
- Client-side timing is verified against server move timestamps

---

## UI Components

### Profile Section - Leaderboards Tab

Located in the Profile section of the main lobby, accessible via the profile tile.

**Layout:**
1. Toggle between "Minesweeper" and "Lo Siento" (tile-style, matching game selector)
2. Toggle between "Wins" and "Fastest Times" tabs (Wins selected by default)
3. For each game, show the four tracked modes in a 2x2 grid
4. Each mode card displays (based on selected tab):
   - **Wins tab:** Top 5 players by wins, showing wins count, games played, and win %
   - **Fastest Times tab:** Top 5 players by completion time
   - User's entries are highlighted in green if present

### Minesweeper New Game Overlay

**Preset Mode Buttons:**
Four quick-select buttons for tracked modes:
- Beginner (8×8, 10 mines)
- Intermediate (16×16, 40 mines)
- Hard (30×16, 99 mines)
- Extreme (30×22, 200 mines)

**Tracked Mode Indicator:**
When a tracked configuration is selected (via preset or manual entry):
- Display a trophy icon
- Show text: "Tracked for leaderboards"

---

## Implementation Phases

### Phase 1 (Current)
- [x] Define tracked game modes
- [x] Create spec document
- [ ] Add Firestore collections and indexes
- [ ] Implement backend leaderboard recording on win
- [ ] Add GET leaderboard endpoint

### Phase 2
- [ ] Profile section leaderboard display
- [ ] Personal best tracking
- [ ] Preset mode buttons in minesweeper UI
- [ ] Trophy indicator for tracked modes

### Phase 3
- [ ] Lo Siento leaderboard integration
- [ ] Advanced stats (win streaks, daily challenges)
- [ ] Leaderboard notifications

---

## Security Considerations

- Leaderboard writes are server-side only (no client writes)
- User identity verified via existing auth flow
- Rate limiting on leaderboard queries
- No exposure of internal game IDs to clients
