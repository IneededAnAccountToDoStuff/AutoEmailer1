# AutoEmailer1

An e-mailing program. It computes question assignments (splitting problems into
basic, intermediate, and hard tiers and spreading each problem across several
recipients) and drives the Outlook web client from the browser console to email
each recipient their assignment.

The source lives in `autoemailer1_main.ts` (TypeScript). Pure logic —
`generator`, `shuffle`, `difficultyRanges`, `formatLegend` — is exported and
unit-tested; the DOM automation talks to the live Outlook web UI.

## Requirements

[Bun](https://bun.sh) (used as the package manager, test runner, and bundler).

```sh
bun install
```

## Scripts

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `bun test`          | Run the unit tests                    |
| `bun run typecheck` | Type-check with `tsc --noEmit`        |
| `bun run lint`      | Lint with ESLint + typescript-eslint  |
| `bun run format`    | Format with Prettier                  |
| `bun run build`     | Bundle to `dist/autoemailer1_main.js` |

## Usage

1. `bun run build` to produce `dist/autoemailer1_main.js`.
2. Open the Outlook web client, open the browser console, and paste the built
   file's contents.
3. Call `handler()` and answer the prompts for the number of basic,
   intermediate, and hard problems.

### Dry run

To preview what would be sent without opening a compose window or sending
anything, call:

```js
handler({ dryRun: true });
```

It still asks for the three counts, then prints each recipient's subject and
body to the console. Recommended before a real run.
