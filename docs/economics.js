/* Escenarios de gestión, no previsiones de ventas ni cálculo fiscal personal. */
(function (root) {
  'use strict';
  const bounds = {
    days: [1, 31], hours: [1, 12], utilization: [0, 100], rate: [1, 200],
    materials: [0, 20000], markup: [0, 100], fixed: [0, 20000],
    reta: [0, 2000], contingency: [0, 30], months: [1, 12],
    taxReserve: [0, 60], incomeGoal: [0, 10000]
  };
  const scenarios = [
    { id: 'arranque', name: 'Arranque', description: 'Agenda aún irregular; sirve para ver el riesgo de pocos encargos.', days: 20, hours: 8, utilization: 40, rate: 32, materials: 450, markup: 15, fixed: 850, reta: 310, contingency: 3, months: 11, taxReserve: 20, incomeGoal: 2000 },
    { id: 'base', name: 'Agenda estable', description: 'Hipótesis de trabajo: 60 % del tiempo del equipo se factura.', days: 20, hours: 8, utilization: 60, rate: 38, materials: 800, markup: 15, fixed: 850, reta: 460, contingency: 3, months: 11, taxReserve: 20, incomeGoal: 2000 },
    { id: 'solido', name: 'Bien organizados', description: 'Más encargos repetidos, bloques de trabajo y precio medio alto.', days: 20, hours: 8, utilization: 70, rate: 42, materials: 1100, markup: 15, fixed: 950, reta: 520, contingency: 3, months: 11, taxReserve: 20, incomeGoal: 2000 },
    { id: 'exigente', name: 'Techo exigente del modelo', description: '80 % facturable a 45 €/hora-persona; requiere demanda, experiencia y poca dispersión.', days: 20, hours: 8, utilization: 80, rate: 45, materials: 1500, markup: 15, fixed: 1100, reta: 550, contingency: 3, months: 11, taxReserve: 20, incomeGoal: 2000 }
  ];
  function calculate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return { valid: false, errors: ['input'] };
    const errors = [];
    for (const [name, range] of Object.entries(bounds)) {
      if (typeof input[name] !== 'number' || !Number.isFinite(input[name]) || input[name] < range[0] || input[name] > range[1]) errors.push(name);
    }
    if (errors.length) return { valid: false, errors };
    const people = 2;
    const capacity = people * input.days * input.hours;
    const billable = capacity * input.utilization / 100;
    const labor = billable * input.rate;
    const materialsBilled = input.materials * (1 + input.markup / 100);
    const materialsMargin = materialsBilled - input.materials;
    const revenue = labor + materialsBilled;
    const contingency = labor * input.contingency / 100;
    const retaTeam = input.reta * people;
    const monthlyBeforeIRPF = revenue - input.materials - input.fixed - retaTeam - contingency;
    // Fixed overhead and both RETA payments continue for all 12 months.
    const annualRevenue = revenue * input.months;
    const annualBeforeIRPF = (labor + materialsMargin - contingency) * input.months - (input.fixed + retaTeam) * 12;
    const annualTaxProvision = Math.max(0, annualBeforeIRPF) * input.taxReserve / 100;
    const perPersonBeforeIRPF = annualBeforeIRPF / (people * 12);
    const perPersonAfterProvision = (annualBeforeIRPF - annualTaxProvision) / (people * 12);
    const contributionPerBillableHour = input.rate * (1 - input.contingency / 100);
    const fixedPerActiveMonth = (input.fixed + retaTeam) * 12 / input.months;
    const breakEvenHours = Math.max(0, (fixedPerActiveMonth - materialsMargin) / contributionPerBillableHour);
    const annualTargetBeforeIRPF = input.incomeGoal * people * 12 / (1 - input.taxReserve / 100);
    const neededLabor = (annualTargetBeforeIRPF + (input.fixed + retaTeam) * 12) / input.months - materialsMargin;
    const requiredRate = billable > 0 ? Math.max(0, neededLabor / (billable * (1 - input.contingency / 100))) : null;
    const requiredUtilization = Math.max(0, neededLabor / (contributionPerBillableHour * capacity) * 100);
    return { valid: true, people, capacity, billable, nonBillable: capacity - billable, labor, materialsBilled, materialsMargin, revenue, contingency, retaTeam, monthlyBeforeIRPF, annualRevenue, annualBeforeIRPF, annualTaxProvision, perPersonBeforeIRPF, perPersonAfterProvision, breakEvenHours, requiredRate, requiredUtilization };
  }
  const api = { calculate, scenarios, bounds };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LYLEconomics = api;
})(typeof window !== 'undefined' ? window : globalThis);
