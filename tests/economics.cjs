'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { calculate, scenarios, bounds } = require('../docs/economics.js');

const fixture = Object.freeze({ days: 20, hours: 8, utilization: 50, rate: 25, materials: 1000, markup: 20, fixed: 500, reta: 300, contingency: 10, months: 10, taxReserve: 20, incomeGoal: 1000 });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} differs from ${expected}`);

test('Two people provide 320 person-hours; a joint four-hour job consumes eight', () => {
  const result = calculate(fixture);
  assert.equal(result.valid, true);
  assert.equal(result.people, 2);
  assert.equal(result.capacity, 320);
  assert.equal(result.billable, 160);
  assert.equal(result.nonBillable, 160);
  assert.equal(calculate({ ...fixture, people: 8 }).capacity, 320);
  assert.equal(calculate({ ...fixture, days: 1, hours: 4, utilization: 100 }).billable, 8);
});

test('Materials turnover is separated from its margin and neither is counted twice', () => {
  const result = calculate(fixture);
  assert.equal(result.labor, 4000);
  assert.equal(result.materialsBilled, 1200);
  assert.equal(result.materialsMargin, 200);
  assert.equal(result.revenue, 5200);
  assert.equal(result.monthlyBeforeIRPF, 2700);
  const atCost = calculate({ ...fixture, markup: 0 });
  assert.equal(atCost.revenue, 5000);
  assert.equal(atCost.monthlyBeforeIRPF, 2500);
});

test('Revenue is exclusive of VAT; a foreign VAT field cannot increase earnings', () => {
  assert.deepEqual(calculate({ ...fixture, iva: 21, vat: 21 }), calculate(fixture));
  assert.equal(calculate(fixture).revenue, 5200);
});

test('Annual model charges fixed costs and TWO RETA payments for all twelve months', () => {
  const result = calculate(fixture);
  assert.equal(result.retaTeam, 600);
  assert.equal(result.annualRevenue, 52000);
  assert.equal(result.annualBeforeIRPF, 24800);
  assert.notEqual(result.annualBeforeIRPF, result.monthlyBeforeIRPF * 10);
  near(result.perPersonBeforeIRPF, 1033.3333333333333);
  assert.equal(calculate({ ...fixture, months: 1 }).annualBeforeIRPF, -9400);
  assert.equal(calculate({ ...fixture, months: 12 }).annualBeforeIRPF, 32400);
});

test('A provision is reported separately and is not a calculation of final IRPF', () => {
  const result = calculate(fixture);
  assert.equal(result.annualTaxProvision, 4960);
  near(result.perPersonAfterProvision, 826.6666666666666);
  const noProvision = calculate({ ...fixture, taxReserve: 0 });
  assert.equal(noProvision.annualBeforeIRPF, result.annualBeforeIRPF);
  assert.equal(noProvision.annualTaxProvision, 0);
  assert.equal(noProvision.perPersonAfterProvision, noProvision.perPersonBeforeIRPF);
  for (const name of ['finalIRPF', 'netSalary', 'netIncomeAfterTax', 'taxDue']) assert.equal(Object.hasOwn(result, name), false);
});

test('No demand leaves losses and no income-tax provision, irrespective of active months', () => {
  for (const months of [1, 6, 11, 12]) {
    const result = calculate({ ...fixture, months, utilization: 0, materials: 0 });
    assert.equal(result.revenue, 0);
    assert.equal(result.annualBeforeIRPF, -13200);
    assert.equal(result.annualTaxProvision, 0);
    assert.equal(result.perPersonBeforeIRPF, -550);
    assert.equal(result.perPersonAfterProvision, -550);
    assert.equal(result.requiredRate, null);
    assert.ok(Number.isFinite(result.requiredUtilization));
  }
});

test('A zero-profit business reserves zero, and zero optional costs remain valid', () => {
  const result = calculate({ ...fixture, utilization: 0, materials: 0, fixed: 0, reta: 0, contingency: 0, taxReserve: 0, incomeGoal: 0 });
  assert.equal(result.valid, true);
  for (const name of ['revenue', 'annualRevenue', 'annualBeforeIRPF', 'annualTaxProvision', 'perPersonAfterProvision', 'breakEvenHours', 'requiredUtilization']) assert.equal(result[name], 0);
  assert.equal(result.requiredRate, null);
});

test('Rate inversion reaches the requested income AFTER the illustrative provision', () => {
  const result = calculate(fixture);
  const inverted = calculate({ ...fixture, rate: result.requiredRate });
  assert.equal(inverted.valid, true);
  near(inverted.perPersonAfterProvision, fixture.incomeGoal);
  const highGoal = { ...fixture, incomeGoal: 5000 };
  const high = calculate(highGoal);
  near(calculate({ ...highGoal, rate: high.requiredRate }).perPersonAfterProvision, 5000);
  assert.ok(high.requiredUtilization > 100, 'An impossible occupancy target must not be silently capped');
});

test('Occupancy inversion reaches the target where it is physically attainable', () => {
  const result = calculate(fixture);
  assert.ok(result.requiredUtilization <= 100);
  near(calculate({ ...fixture, utilization: result.requiredUtilization }).perPersonAfterProvision, fixture.incomeGoal);
  const unreserved = { ...fixture, taxReserve: 0 };
  near(calculate({ ...unreserved, rate: calculate(unreserved).requiredRate }).perPersonAfterProvision, fixture.incomeGoal);
});

test('Break-even covers twelve months of costs, not just an active-month budget', () => {
  const result = calculate(fixture);
  near(result.breakEvenHours, 1120 / 22.5);
  const even = calculate({ ...fixture, utilization: result.breakEvenHours / result.capacity * 100 });
  near(even.annualBeforeIRPF, 0);
  const zeroGoal = { ...fixture, incomeGoal: 0 };
  near(calculate({ ...zeroGoal, rate: calculate(zeroGoal).requiredRate }).annualBeforeIRPF, 0);
});

test('Material margin alone can cover overhead without manufacturing negative rates', () => {
  const input = { ...fixture, utilization: 0, materials: 1000, markup: 100, fixed: 100, reta: 0, contingency: 0, incomeGoal: 0 };
  const result = calculate(input);
  assert.equal(result.breakEvenHours, 0);
  assert.equal(result.requiredUtilization, 0);
  assert.equal(result.requiredRate, null);
  assert.ok(result.annualBeforeIRPF > 0);
  assert.equal(calculate({ ...input, utilization: 50 }).requiredRate, 0);
});

test('Reject negative, missing, non-finite, string and out-of-range numeric entries', () => {
  for (const [field, limits] of Object.entries(bounds)) {
    for (const invalid of [-1, NaN, Infinity, -Infinity, undefined, null, '10', limits[0] - 0.01, limits[1] + 0.01]) {
      const result = calculate({ ...fixture, [field]: invalid });
      assert.equal(result.valid, false, `${field}: ${String(invalid)}`);
      assert.ok(result.errors.includes(field));
    }
  }
  assert.equal(calculate({ ...fixture, days: 0 }).valid, false);
  assert.equal(calculate({ ...fixture, rate: 0 }).valid, false);
  assert.equal(calculate({ ...fixture, months: 0 }).valid, false);
});

test('All accepted boundary values yield finite numerical outputs', () => {
  for (const [field, limits] of Object.entries(bounds)) {
    for (const value of limits) {
      const result = calculate({ ...fixture, [field]: value });
      assert.equal(result.valid, true, `${field}: ${value}`);
      for (const [name, number] of Object.entries(result)) if (typeof number === 'number') assert.ok(Number.isFinite(number), name);
    }
  }
});

test('Each public preset is internally consistent and cannot imply a guaranteed take-home salary', () => {
  assert.equal(scenarios.length, 4);
  assert.equal(new Set(scenarios.map(s => s.id)).size, 4);
  for (const preset of scenarios) {
    const result = calculate(preset);
    assert.equal(result.valid, true);
    assert.equal(result.people, 2);
    assert.equal(result.capacity, 320);
    assert.ok(result.revenue > result.monthlyBeforeIRPF);
    assert.ok(result.perPersonBeforeIRPF > result.perPersonAfterProvision);
    assert.ok(result.perPersonAfterProvision < 5000);
    assert.ok(preset.months < 12);
  }
});

test('Calculation does not mutate input or preset data', () => {
  const before = JSON.stringify(scenarios);
  calculate(fixture);
  for (const preset of scenarios) calculate(preset);
  assert.equal(JSON.stringify(scenarios), before);
});

test('Missing or null input is rejected without throwing', () => {
  for (const input of [undefined, null, {}, false]) {
    let result;
    assert.doesNotThrow(() => { result = calculate(input); });
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  }
});

