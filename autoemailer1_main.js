'use strict';

// AutoEmailer1 — a browser-console script that drives the Outlook web client to
// send one email per recipient with their computed question assignments.

// Type the recipient address into the "To" field of the open compose window.
function set_address(address) {
  [...document.querySelectorAll('div>[contenteditable="true"]')]
    .filter(
      (i) =>
        i.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement
          .children[0].textContent == 'To',
    )[0]
    .focus();
  document.execCommand('insertText', false, address);
}

// Type the subject line into the compose window.
function setsubject(text) {
  document.querySelector('input[placeholder="Add a subject"][aria-label="Subject"]').focus();
  document.execCommand('insertText', false, text);
}

// Type the message body into the compose window.
function set_body(body) {
  document.querySelector('[contenteditable="true"][aria-multiline=true]').focus();
  document.execCommand('insertText', false, body);
}

// Open a fresh compose window and fill in body, subject, address, then send.
async function send_email(address, subject, body) {
  [...document.querySelectorAll('.ribbon-menu-text')]
    .filter((a) => a.firstChild.textContent === 'New')[0]
    .parentElement.previousElementSibling.click();
  await new Promise((r) => setTimeout(r, 3000));
  set_body(body);
  await new Promise((r) => setTimeout(r, 2000));
  setsubject(subject);
  await new Promise((r) => setTimeout(r, 2000));
  set_address(address);
  await new Promise((r) => setTimeout(r, 2000));
  document.querySelector('button[aria-label="Send"][title="Send (Ctrl+Enter)"]').click();
}

// Given difficulty counts, return the inclusive, 1-indexed problem-number range
// for each difficulty (or null when that difficulty has no problems). Problems
// are numbered in order: basic first, then intermediate, then hard.
function difficultyRanges({ basic = 0, intermediate = 0, hard = 0 } = {}) {
  let next = 1;
  const take = (n) => {
    if (n <= 0) return null;
    const range = [next, next + n - 1];
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
function formatLegend(ranges) {
  const labels = { basic: 'Basic', intermediate: 'Intermediate', hard: 'Hard' };
  const parts = [];
  for (const key of ['basic', 'intermediate', 'hard']) {
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
//
// Returns:
//   assignments — array of N arrays of 1-indexed problem numbers, one per recipient
//   difficulty  — map of problem number -> 'basic' | 'intermediate' | 'hard'
//   ranges      — inclusive problem-number range per difficulty (see difficultyRanges)
function generator(counts = { basic: 3, intermediate: 4, hard: 2 }, N = 5, s = 3) {
  if (typeof counts === 'number') {
    counts = { basic: counts, intermediate: 0, hard: 0 };
  }
  const { basic = 0, intermediate = 0, hard = 0 } = counts;
  const Q = basic + intermediate + hard;

  const assignments = Array(N)
    .fill(0)
    .map(() => []);
  for (let q = 0; q < Q; q++) {
    for (let c = q; c < q + s; c++) {
      assignments[c % N].push(q + 1);
    }
  }

  const ranges = difficultyRanges({ basic, intermediate, hard });
  const difficulty = {};
  for (const [label, range] of Object.entries(ranges)) {
    if (!range) continue;
    for (let q = range[0]; q <= range[1]; q++) {
      difficulty[q] = label;
    }
  }

  return { assignments, difficulty, ranges };
}

// Fisher-Yates in-place shuffle.
function shuffle(d) {
  for (let i = d.length; i > 1;) {
    let j = (Math.random() * i--) | 0;
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// Prompt for a non-negative integer count of `label` problems. Returns the
// number, or null if the user cancels or enters something invalid.
function promptCount(label, fallback) {
  const raw = prompt(`# ${label} problems`, fallback);
  if (raw === null) return null;
  const n = +raw;
  if (raw === '' || isNaN(n) || n < 0) {
    alert(`Invalid ${label} count`);
    return null;
  }
  return n;
}

async function handler() {
  let addrstr =
    'wdbensler@mines.edu,dshin@mines.edu,matthew_cool@mines.edu,aiden_ferris@mines.edu,lorin_dawson@mines.edu';
  let addresses = addrstr.split(',');
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

  const { assignments, ranges } = generator({ basic, intermediate, hard }, addresses.length);
  const legend = formatLegend(ranges);

  for (let i = 0; i < assignments.length; i++) {
    const addr = addresses[i];
    const content = assignments[i].map((r) => 'Q' + r).join(',');
    await send_email(
      addr,
      `Question Assignments Calculation`,
      `Computed Assignments: ${content}\n${legend}\nBelieved Address: ${addr}`,
    );
    await new Promise((r) => setTimeout(r, 3000));
  }
}

// Export the pure logic for unit testing. Guarded so the file still runs as a
// plain browser-console script, where `module` is undefined.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generator, shuffle, difficultyRanges, formatLegend };
}
