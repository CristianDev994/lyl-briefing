'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { bounds, defaults, calculate } = require('../docs/surface.js');
const fixture = Object.freeze({ area: 100, rate: 10, supplements: 0, materials: 200, otherCosts: 50, luisHours: 16, linoHours: 16, target: 25 });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} differs from ${expected}`);

test('100 m² at €10 funds €750 for 32 person-hours; the target needs €10.50/m²', () => {
  assert.deepEqual(defaults, fixture);
  assert.deepEqual(calculate(fixture), {
    valid: true, surfaceRevenue: 1000, revenue: 1000, vat: 210, totalWithVAT: 1210,
    personHours: 32, costs: 250, contribution: 750, perHour: 23.4375,
    minimumRevenue: 1050, minimumRate: 10.5, quotedMinimumRate: 10.5, shortfall: 50
  });
});

test('Unequal workloads count each person once, not two copies of the larger shift', () => {
  const result = calculate({ ...fixture, luisHours: 12, linoHours: 8 });
  assert.equal(result.personHours, 20);
  assert.equal(result.perHour, 37.5);
  assert.equal(result.minimumRevenue, 750);
  assert.equal(result.quotedMinimumRate, 7.5);
  assert.equal(result.shortfall, 0);
});

test('Either owner can do a solo job without inventing hours for the other', () => {
  for (const hours of [{ luisHours: 10, linoHours: 0 }, { luisHours: 0, linoHours: 10 }]) {
    const result = calculate({ ...fixture, ...hours });
    assert.equal(result.personHours, 10);
    assert.equal(result.perHour, 75);
    assert.equal(result.minimumRevenue, 500);
  }
});

test('Materials are costs already covered by the quoted sale, not extra revenue', () => {
  const result = calculate({ ...fixture, materials: 400 });
  assert.equal(result.revenue, 1000);
  assert.equal(result.costs, 450);
  assert.equal(result.contribution, 550);
  assert.equal(result.minimumRevenue, 1250);
});

test('VAT is shown to the customer and does not inflate revenue or contribution', () => {
  const result = calculate({ ...fixture, supplements: 100 });
  assert.equal(result.surfaceRevenue, 1000);
  assert.equal(result.revenue, 1100);
  assert.equal(result.vat, 231);
  assert.equal(result.totalWithVAT, 1331);
  assert.equal(result.contribution, 850);
  assert.equal(result.quotedMinimumRate, 9.5);
  assert.deepEqual(calculate({ ...fixture, vat: 0 }), calculate(fixture));
});

test('Supplements covering the full target leave no additional required area charge', () => {
  for (const supplements of [1050, 1200]) {
    const result = calculate({ ...fixture, supplements });
    assert.equal(result.minimumRevenue, 1050);
    assert.equal(result.minimumRate, 0);
    assert.equal(result.quotedMinimumRate, 0);
    assert.equal(result.shortfall, 0);
  }
});

test('A losing job retains its negative contribution and reports the whole shortfall', () => {
  const result = calculate({ ...fixture, rate: 2 });
  assert.equal(result.revenue, 200);
  assert.equal(result.contribution, -50);
  assert.equal(result.perHour, -1.5625);
  assert.equal(result.shortfall, 850);
  for (const label of ['netProfit', 'netIncome', 'benefit', 'salary']) assert.equal(Object.hasOwn(result, label), false);
});

test('A job with neither owner spending time is invalid and returns no stale amounts', () => {
  assert.deepEqual(calculate({ ...fixture, luisHours: 0, linoHours: 0 }), { valid: false, errors: ['personHours'] });
});

test('Every input rejects omitted, nonnumeric, nonfinite and out-of-range values', () => {
  for (const [name, [min, max]] of Object.entries(bounds)) {
    for (const value of [undefined, null, '', String(fixture[name]), NaN, Infinity, -Infinity, min - 0.01, max + 0.01]) {
      assert.deepEqual(calculate({ ...fixture, [name]: value }), { valid: false, errors: [name] }, `${name}: ${String(value)}`);
    }
    assert.equal(calculate({ ...fixture, [name]: min }).valid, true, `${name} minimum`);
    assert.equal(calculate({ ...fixture, [name]: max }).valid, true, `${name} maximum`);
  }
  for (const input of [null, undefined, [], 1, 'data', false]) assert.deepEqual(calculate(input), { valid: false, errors: ['input'] });
});

test('Fractional cents always round upward; existing whole cents never gain one', () => {
  const base = { ...fixture, area: 1, rate: 1, materials: 0, otherCosts: 0, luisHours: 1, linoHours: 0, target: 1 };
  assert.equal(calculate({ ...base, materials: 9.051 }).quotedMinimumRate, 10.06);
  assert.equal(calculate({ ...base, materials: 9.050000001 }).quotedMinimumRate, 10.06);
  assert.equal(calculate({ ...base, materials: 9.049 }).quotedMinimumRate, 10.05);
  assert.equal(calculate({ ...base, materials: 9.05 }).quotedMinimumRate, 10.05);
  assert.equal(calculate({ ...base, area: 3 }).quotedMinimumRate, 0.34);
  assert.equal(calculate({ ...base, area: 100000, materials: 0.0000001 }).quotedMinimumRate, 0.01);
  const decimalHours = calculate({ ...base, luisHours: 0.1, linoHours: 0.2 });
  near(decimalHours.minimumRate, 0.3);
  assert.equal(decimalHours.quotedMinimumRate, 0.3);
});

test('The browser module exports the same public API without requiring Node', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../docs/surface.js'), 'utf8'), context);
  assert.deepEqual(Object.keys(context.window.LYLSurface).sort(), ['bounds', 'calculate', 'defaults']);
  assert.equal(context.window.LYLSurface.calculate(fixture).quotedMinimumRate, 10.5);
});

test('Calculations do not change the submitted quote or default values', () => {
  calculate(fixture);
  assert.deepEqual(defaults, fixture);
  assert.equal(fixture.materials, 200);
});
