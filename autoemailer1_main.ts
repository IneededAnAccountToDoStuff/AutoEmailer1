// AutoEmailer1 — a browser-console script that drives the Outlook web client to
// send one email per recipient with their computed question assignments.

type Difficulty = 'basic' | 'intermediate' | 'hard';

// Number of problems at each difficulty. Any omitted field counts as 0.
type DifficultyCounts = { basic?: number; intermediate?: number; hard?: number };

// Inclusive, 1-indexed [first, last] problem-number range.
type ProblemRange = [number, number];

type DifficultyRangeMap = Record<Difficulty, ProblemRange | null>;

type GeneratorResult = {
  // Per-recipient lists of 1-indexed problem numbers.
  assignments: number[][];
  // Problem number -> its difficulty.
  difficulty: Record<number, Difficulty>;
  // Problem-number range per difficulty (null when that difficulty is empty).
  ranges: DifficultyRangeMap;
};

// Type the recipient address into the "To" field of the open compose window.
function set_address(address: string): void {
  [...document.querySelectorAll<HTMLElement>('div>[contenteditable="true"]')]
    .filter(
      (i) =>
        i.parentElement!.parentElement!.parentElement!.parentElement!.parentElement!.parentElement!
          .children[0].textContent === 'To',
    )[0]
    .focus();
  document.execCommand('insertText', false, address);
}

// Type the subject line into the compose window.
function setsubject(text: string): void {
  document
    .querySelector<HTMLInputElement>('input[placeholder="Add a subject"][aria-label="Subject"]')!
    .focus();
  document.execCommand('insertText', false, text);
}

// Type the message body into the compose window.
function set_body(body: string): void {
  document.querySelector<HTMLElement>('[contenteditable="true"][aria-multiline=true]')!.focus();
  document.execCommand('insertText', false, body);
}

// Open a fresh compose window and fill in body, subject, address, then send.
async function send_email(address: string, subject: string, body: string): Promise<void> {
  const newButton = [...document.querySelectorAll<HTMLElement>('.ribbon-menu-text')].filter(
    (a) => a.firstChild!.textContent === 'New',
  )[0];
  (newButton.parentElement!.previousElementSibling as HTMLElement).click();
  await new Promise((r) => setTimeout(r, 3000));
  set_body(body);
  await new Promise((r) => setTimeout(r, 2000));
  setsubject(subject);
  await new Promise((r) => setTimeout(r, 2000));
  set_address(address);
  await new Promise((r) => setTimeout(r, 2000));
  document
    .querySelector<HTMLButtonElement>('button[aria-label="Send"][title="Send (Ctrl+Enter)"]')!
    .click();
}

// Given difficulty counts, return the inclusive, 1-indexed problem-number range
// for each difficulty (or null when that difficulty has no problems). Problems
// are numbered in order: basic first, then intermediate, then hard.
function difficultyRanges({
  basic = 0,
  intermediate = 0,
  hard = 0,
}: DifficultyCounts = {}): DifficultyRangeMap {
  let next = 1;
  const take = (n: number): ProblemRange | null => {
    if (n <= 0) return null;
    const range: ProblemRange = [next, next + n - 1];
    next += n;
    return range;
  };
  return {
    basic: take(basic),
    intermediate: take(intermediate),
    hard: take(hard),
  };
}

// Build a one-line difficulty legend from ranges, e.g.
// "Difficulty — Basic: Q1-Q3, Intermediate: Q4-Q7, Hard: Q8-Q9".
function formatLegend(ranges: DifficultyRangeMap): string {
  const labels: Record<Difficulty, string> = {
    basic: 'Basic',
    intermediate: 'Intermediate',
    hard: 'Hard',
  };
  const parts: string[] = [];
  for (const key of ['basic', 'intermediate', 'hard'] as const) {
    const range = ranges[key];
    if (!range) continue;
    const [lo, hi] = range;
    parts.push(`${labels[key]}: ${lo === hi ? `Q${lo}` : `Q${lo}-Q${hi}`}`);
  }
  return parts.length ? `Difficulty — ${parts.join(', ')}` : 'Difficulty — (none)';
}

// Distribute problems across N recipients so each problem is assigned to s
// consecutive recipients (wrapping around). Problems are numbered 1..Q where
// Q is the total of the basic/intermediate/hard counts.
//
// `counts` is a { basic, intermediate, hard } object; a plain number is also
// accepted and treated as that many basic problems.
function generator(
  counts: DifficultyCounts | number = { basic: 3, intermediate: 4, hard: 2 },
  N: number = 5,
  s: number = 3,
): GeneratorResult {
  const resolved: DifficultyCounts =
    typeof counts === 'number' ? { basic: counts, intermediate: 0, hard: 0 } : counts;
  const { basic = 0, intermediate = 0, hard = 0 } = resolved;
  const Q = basic + intermediate + hard;

  const assignments: number[][] = Array(N)
    .fill(0)
    .map(() => []);
  for (let q = 0; q < Q; q++) {
    for (let c = q; c < q + s; c++) {
      assignments[c % N].push(q + 1);
    }
  }

  const ranges = difficultyRanges({ basic, intermediate, hard });
  const difficulty: Record<number, Difficulty> = {};
  for (const label of ['basic', 'intermediate', 'hard'] as const) {
    const range = ranges[label];
    if (!range) continue;
    for (let q = range[0]; q <= range[1]; q++) {
      difficulty[q] = label;
    }
  }

  return { assignments, difficulty, ranges };
}

// Fisher-Yates in-place shuffle.
function shuffle<T>(d: T[]): T[] {
  for (let i = d.length; i > 1;) {
    const j = (Math.random() * i--) | 0;
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

const SUBJECT = 'Question Assignments Calculation';

// A single email the run would send.
type PlannedEmail = { address: string; problems: number[]; subject: string; body: string };

// Pure: build the full list of emails for the given counts and recipients,
// without touching the DOM. Both the real send and the dry run operate on this.
function planEmails(
  counts: DifficultyCounts | number,
  addresses: string[],
  s: number = 3,
): PlannedEmail[] {
  const { assignments, ranges } = generator(counts, addresses.length, s);
  const legend = formatLegend(ranges);
  return assignments.map((problems, i) => {
    const address = addresses[i];
    const content = problems.map((r) => 'Q' + r).join(',');
    return {
      address,
      problems,
      subject: SUBJECT,
      body: `Computed Assignments: ${content}\n${legend}\nBelieved Address: ${address}`,
    };
  });
}

// Prompt for a non-negative integer count of `label` problems. Returns the
// number, or null if the user cancels or enters something invalid.
function promptCount(label: string, fallback: number): number | null {
  const raw = prompt(`# ${label} problems`, String(fallback));
  if (raw === null) return null;
  const n = +raw;
  if (raw === '' || isNaN(n) || n < 0) {
    alert(`Invalid ${label} count`);
    return null;
  }
  return n;
}

// Run the emailer. Pass `{ dryRun: true }` to print the computed plan to the
// console without opening any compose window or sending anything.
async function handler({ dryRun = false }: { dryRun?: boolean } = {}): Promise<void> {
  const addrstr =
    'wdbensler@mines.edu,dshin@mines.edu,matthew_cool@mines.edu,aiden_ferris@mines.edu,lorin_dawson@mines.edu';
  const addresses = addrstr.split(',');
  addresses.sort();

  const basic = promptCount('basic', 3);
  if (basic === null) return;
  const intermediate = promptCount('intermediate', 4);
  if (intermediate === null) return;
  const hard = promptCount('hard', 2);
  if (hard === null) return;

  if (basic + intermediate + hard === 0) {
    alert('No problems requested');
    return;
  }

  const emails = planEmails({ basic, intermediate, hard }, addresses);

  if (dryRun) {
    console.log(`[AutoEmailer1] Dry run — ${emails.length} email(s) would be sent (nothing sent):`);
    for (const { address, subject, body } of emails) {
      console.log(`\nTo: ${address}\nSubject: ${subject}\n${body}`);
    }
    return;
  }

  for (const { address, subject, body } of emails) {
    await send_email(address, subject, body);
    await new Promise((r) => setTimeout(r, 3000));
  }
}

// Expose the entry points on the global scope so the built bundle
// (`bun run build` -> dist/autoemailer1_main.js) can be pasted into the browser
// console and driven with `handler()`.
Object.assign(globalThis, {
  handler,
  send_email,
  generator,
  shuffle,
  difficultyRanges,
  formatLegend,
  planEmails,
});

// Export the pure logic for unit testing and reuse.
export { generator, shuffle, difficultyRanges, formatLegend, planEmails };
