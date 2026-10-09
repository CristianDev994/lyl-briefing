/* Presupuesto por superficie: la aportación aún debe cubrir gastos fijos, RETA, IRPF y reservas. */
(function (root) {
  'use strict';
  const bounds = {
    area: [0.01, 100000], rate: [0.01, 10000], supplements: [0, 100000],
    materials: [0, 100000], otherCosts: [0, 100000],
    luisHours: [0, 10000], linoHours: [0, 10000], target: [1, 200]
  };
  const defaults = {
    area: 100, rate: 10, supplements: 0, materials: 200, otherCosts: 50,
    luisHours: 16, linoHours: 16, target: 25
  };

  // Decimal fractions keep a price exactly on a cent from gaining an extra cent
  // through floating-point noise, while every real fraction of a cent rounds up.
  function fraction(value) {
    const [coefficient, exponent = '0'] = String(value).split('e');
    const [integer, decimals = ''] = coefficient.split('.');
    const places = decimals.length - Number(exponent);
    const numerator = BigInt(integer + decimals);
    return places >= 0
      ? [numerator, 10n ** BigInt(places)]
      : [numerator * 10n ** BigInt(-places), 1n];
  }
  function add(a, b) { return [a[0] * b[1] + b[0] * a[1], a[1] * b[1]]; }
  function multiply(a, b) { return [a[0] * b[0], a[1] * b[1]]; }
  function minimumQuote(input) {
    const hours = add(fraction(input.luisHours), fraction(input.linoHours));
    const costs = add(fraction(input.materials), fraction(input.otherCosts));
    const required = add(costs, multiply(hours, fraction(input.target)));
    const supplements = fraction(input.supplements);
    const net = [required[0] * supplements[1] - supplements[0] * required[1], required[1] * supplements[1]];
    if (net[0] <= 0n) return 0;
    const area = fraction(input.area);
    const numerator = net[0] * area[1] * 100n;
    const denominator = net[1] * area[0];
    return Number((numerator + denominator - 1n) / denominator) / 100;
  }

  function calculate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return { valid: false, errors: ['input'] };
    const errors = [];
    for (const [name, range] of Object.entries(bounds)) {
      if (typeof input[name] !== 'number' || !Number.isFinite(input[name]) || input[name] < range[0] || input[name] > range[1]) errors.push(name);
    }
    if (errors.length) return { valid: false, errors };
    const personHours = input.luisHours + input.linoHours;
    if (personHours <= 0) return { valid: false, errors: ['personHours'] };
    const surfaceRevenue = input.area * input.rate;
    const revenue = surfaceRevenue + input.supplements;
    const vat = revenue * 0.21;
    const totalWithVAT = revenue * 1.21;
    const costs = input.materials + input.otherCosts;
    const contribution = revenue - costs;
    const perHour = contribution / personHours;
    const minimumRevenue = costs + personHours * input.target;
    const minimumRate = Math.max(0, (minimumRevenue - input.supplements) / input.area);
    const quotedMinimumRate = minimumQuote(input);
    const shortfall = Math.max(0, minimumRevenue - revenue);
    return { valid: true, surfaceRevenue, revenue, vat, totalWithVAT, personHours, costs, contribution, perHour, minimumRevenue, minimumRate, quotedMinimumRate, shortfall };
  }
  const api = { bounds, defaults, calculate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LYLSurface = api;
})(typeof window !== 'undefined' ? window : globalThis);
