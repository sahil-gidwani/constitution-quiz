# Constitution Quiz Showdown

A game-show quiz on the Constitution of Ghana and the nation around it. It is a sibling of the Agri Quiz Showdown:
the code structure and every feature are the same (solo and 2 to 5 players, board and quick-fire formats, optional power-ups,
streaks, speed bonus, teams, share image, your own rounds by JSON import, installable PWA that works offline).
Only the questions and the look and feel are different: an oxblood-and-black chamber, gold rules, ballot-paper cards,
Playfair Display and Figtree type, and the red, gold and green of the flag with the black star.

## Run it

```
npm install
npm run dev        # develop
npm run build      # production build in dist/ (also writes dist/sw.js for offline use)
npm run preview    # try the build
npm test           # data and logic tests
```

Deploy `dist/` to any static host. It uses relative paths, so a sub-folder works too.

## Rounds

| # | Round | Topics | Questions |
|---|---|---|---|
| 1 | Constitution & Heritage | 5 | 25 |
| 2 | Flags, Anthem & Oaths | 5 | 25 |
| 3 | Forests, Parliament & Arms | 5 | 25 |
| 4 | Chiefs, Climate & Courts | 5 | 25 |
| 5 | Minds & Quotes | 5 | 21 |
| 6 | Numbers & Leaders | 5 | 25 |
| 7 | State, Forces & Campus | 5 | 25 |
| 8 | Health, Honours & Screen | 5 | 24 |
| 9 | Institutions & Wildlife | 5 | 25 |
| 10 | Firsts, Finance & Europe | 4 | 17 |
| 11 | Amending the Constitution | 5 | 25 |

Total: 262 questions. A few topics in the source had fewer than five questions, so their columns are shorter.

## Where the questions came from

Rounds 1 to 5 and 8 to 10 come from the `Rounds/*.json` files, rounds 6 and 7 from the highlighted answer keys in the `Doc_Questions/*.docx` files,
and round 11 (Amending the Constitution) from the amendment question set. Audio, video, gif and the old app code were not used.
Images are in `public/assets/images/` and referenced by file name in `src/data/rounds.json`.

Edits made while moving the questions across:
- Answer key corrected to the Ghana Medical Association for "established on 4 January 1958".
- Answer key for "the oldest University in Ghana" changed from Accra College of Education to University of Ghana, Legon.
- Typos fixed: "Ramsar", "en entrenched".
- Round 11: two stems tidied so they read as sentences ("Of those who voted at the referendum, the bill passes only if:").
- Questions whose options refer to other options ("a and b", "a,b,c", "all the above", "All true", "Both a and b are true") are never shuffled, so the letters still make sense.

## Editing questions

Edit `src/data/rounds.json`: `rounds[] > categories[] > questions[]` with `id`, `points` (10 to 50), `type`, `question`, `options`, `answer`, `image`.
Players can also import their own rounds from the Rounds screen (see the template in the app).

## Storage and offline

Progress is saved in the browser under the key `constitution-quiz:v1`, separate from the Agri game, so both can be installed on one device.
The service worker cache is named `constitution-quiz-<hash>`.
