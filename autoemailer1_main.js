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

// Distribute Q problems across N recipients so each problem is assigned to s
// consecutive recipients (wrapping around). Returns an array of N arrays, each
// holding the 1-indexed problem numbers assigned to that recipient.
function generator(Q = 9, N = 5, s = 3) {
  let np = Array(N)
    .fill(0)
    .map(() => []);
  for (let q = 0; q < Q; q++) {
    for (let c = q; c < q + s; c++) {
      np[c % N].push(q + 1);
    }
  }
  return np;
}

// Fisher-Yates in-place shuffle.
function shuffle(d) {
  for (let i = d.length; i > 1;) {
    let j = (Math.random() * i--) | 0;
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

async function handler() {
  let addrstr =
    'wdbensler@mines.edu,dshin@mines.edu,matthew_cool@mines.edu,aiden_ferris@mines.edu,lorin_dawson@mines.edu';
  let addresses = addrstr.split(',');
  addresses.sort();

  let QValueS = prompt('#Problems', 9);
  if (QValueS === null || QValueS === '') {
    alert('Invalid Q count');
    return;
  }
  let QValue = +QValueS;
  if (isNaN(QValue)) {
    alert('Invalid Q value');
    return;
  }

  for (let [addr, content] of generator(QValue, addresses.length).map((a, i) => [
    addresses[i],
    a.map((r) => 'Q' + r).join(','),
  ])) {
    await send_email(
      addr,
      `Question Assignments Calculation`,
      `Computed Assignments: ${content}\nBelieved Address: ${addr}`,
    );
    await new Promise((r) => setTimeout(r, 3000));
  }
}

// Export the pure logic for unit testing. Guarded so the file still runs as a
// plain browser-console script, where `module` is undefined.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generator, shuffle };
}
