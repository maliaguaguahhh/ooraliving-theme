// Run: node --test ops/holiday-look.test.mjs
// Loads assets/holiday-look.js the way a browser would (a plain script), without a DOM,
// and checks the pure helpers it exposes on window.HolidayLook.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../assets/holiday-look.js', import.meta.url), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox);
const H = sandbox.window.HolidayLook;

test('choiceKey turns an admin choice into a code key', () => {
  assert.equal(H.choiceKey('Price tag'), 'price-tag');
  assert.equal(H.choiceKey('None'), 'none');
  assert.equal(H.choiceKey(''), 'none');
  assert.equal(H.choiceKey(undefined), 'none');
});

test('formatMoney follows the shop money format', () => {
  assert.equal(H.formatMoney(1500, '${{amount}}'), '$15.00');
  assert.equal(H.formatMoney(123456, '${{amount}}'), '$1,234.56');
  assert.equal(H.formatMoney(1500, '{{amount_no_decimals}} kr'), '15 kr');
  assert.equal(H.formatMoney(123456, '€{{amount_with_comma_separator}}'), '€1.234,56');
});

test('priceText swaps the number inside a rendered price and keeps the rest', () => {
  assert.equal(H.priceText('$44.99 USD', 5999), '$59.99 USD');
  assert.equal(H.priceText('$1,044.99', 105999), '$1,059.99');
  assert.equal(H.priceText('€44,99 EUR', 5999), '€59,99 EUR');
  assert.equal(H.priceText('¥4,500', 599900), '¥5,999');
  assert.equal(H.priceText('¥4500', 599900), '¥5999');
});

test('rollCents eases from the old price to the new one', () => {
  assert.equal(H.rollCents(5999, 4499, 0), 5999);
  assert.equal(H.rollCents(5999, 4499, 1), 4499);
  const middle = H.rollCents(5999, 4499, 0.5);
  assert.ok(middle < 5249, 'ease-out should be past halfway at t=0.5');
  assert.ok(middle > 4499);
});

test('savedMessage multiplies by quantity and fills [amount]', () => {
  assert.equal(H.savedMessage('You saved [amount]', 1500, 2, '${{amount}}'), 'You saved $30.00');
  assert.equal(H.savedMessage('', 1500, 1, '${{amount}}'), '');
  assert.equal(H.savedMessage('You saved [amount]', 0, 1, '${{amount}}'), '');
});

test('ringLeaves lays leaves evenly around a circle, tangent plus a tilt', () => {
  const leaves = H.ringLeaves({ cx: 0, cy: 0, r: 10, count: 4, tilt: 0 });
  assert.equal(leaves.length, 4);
  const rounded = (n) => Math.round(n) + 0; // + 0 turns -0 into 0
  // Array.from builds the array in this realm; arrays made inside the vm have another prototype.
  assert.deepEqual(Array.from(leaves, (l) => [rounded(l.x), rounded(l.y)]), [[10, 0], [0, 10], [-10, 0], [0, -10]]);
  assert.equal(Math.round(leaves[0].angle), 90);
});
