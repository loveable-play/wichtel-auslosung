# wichtel-auslosung

Secret Santa / Wichtel draw with **symmetric exclusions**, **no self-assignment** and an **unbiased cryptographic shuffle**. Zero dependencies, ~120 lines, works in browsers and Node.js ≥ 19.

The logic is extracted from the draw behind [Fina – Wichteln ohne Anmeldung](https://www.heyfina.de/wichteln), where groups draw names via a shared link, without accounts and without collecting email addresses.

```bash
npm install github:loveable-play/wichtel-auslosung
```

```js
import { draw, checkExclusion } from "wichtel-auslosung";

const people = ["Ana", "Ben", "Cem", "Dora"];
const exclusions = [["Ana", "Ben"]]; // couples, siblings … never draw each other

const result = draw(people, exclusions);
if (result.ok) {
  for (const [giver, receiver] of result.assignment) console.log(`${giver} → ${receiver}`);
} else {
  console.log(result.reason); // "too_few" | "unsatisfiable"
}

// Validate an exclusion before you save it (keeps the group drawable):
checkExclusion(people, exclusions, "Cem", "Dora"); // { ok: true, pair: ["Cem", "Dora"] }
```

## What it guarantees

| Property | How |
|---|---|
| Nobody draws themselves | every assignment is checked before it is returned |
| Exclusions work both ways | excluding `(a, b)` forbids `a → b` and `b → a` |
| No modulo bias | Fisher–Yates with rejection-sampled integers from `crypto.getRandomValues` |
| No endless loop | after `maxAttempts` (default 1000) it returns `{ ok: false, reason: "unsatisfiable" }` |
| Groups stay drawable | `checkExclusion` rejects a pair that would make the draw impossible, and caps exclusions per person at `n − 3` |
| Testable | pass your own `randomInt` for reproducible draws |

## API

- `draw(ids, exclusions?, { maxAttempts?, randomInt? })` → `{ ok: true, assignment: Map } | { ok: false, reason }`
- `checkExclusion(ids, existing, a, b, options?)` → `{ ok: true, pair } | { ok: false, reason: "same" | "unknown" | "duplicate" | "too_many" | "unsatisfiable" }`
- `maxExclusionsPerPerson(n)` → `max(1, n − 3)`
- `secureRandomInt(max)` → uniform integer in `[0, max)`

Ids can be strings or numbers and must be unique.

## Deutsch in Kürze

Auslosung fürs Wichteln: niemand zieht sich selbst, Ausschlüsse gelten in beide Richtungen (Paare, Geschwister), gemischt wird mit kryptografischem Zufall ohne Verzerrung, und unlösbare Konstellationen werden klar gemeldet statt endlos probiert. Wer nicht selbst programmieren will: Die fertige Auslosung per Link, ohne Konto und ohne E-Mail-Adressen, gibt es unter [heyfina.de/wichteln](https://www.heyfina.de/wichteln) – auch für [Schulklassen](https://www.heyfina.de/wichteln/schule) und die [Familie](https://www.heyfina.de/wichteln/familie), dazu [Druckvorlagen](https://www.heyfina.de/vorlagen) für die Ziehung auf Papier.

## License

MIT © Philipp Weigert

---

*Code und Dokumentation wurden mit Unterstützung von KI (Claude) erstellt.*
