import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calcularEstadoGym } from "./gym.js";

function d(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

describe("calcularEstadoGym", () => {
  it("pagado el mes en curso", () => {
    const st = calcularEstadoGym([{ month: "2026-05", paid: true }], d(2026, 5, 3));
    assert.deepEqual(st, { pagado: true, pendiente: false, deudor: false, diasParaPagar: 0 });
  });

  it("pendiente dentro del plazo sin pagar", () => {
    const st = calcularEstadoGym([], d(2026, 5, 5));
    assert.deepEqual(st, { pagado: false, pendiente: true, deudor: false, diasParaPagar: 5 });
  });

  it("vencido después del deadline sin pagar", () => {
    const st = calcularEstadoGym([], d(2026, 5, 11));
    assert.deepEqual(st, { pagado: false, pendiente: false, deudor: true, diasParaPagar: 0 });
  });

  it("usa el deadline como límite y hace fallback si es inválido", () => {
    assert.equal(calcularEstadoGym([], d(2026, 5, 20), 25).pendiente, true);
    assert.equal(calcularEstadoGym([], d(2026, 5, 15), 0).deudor, true);
    assert.equal(calcularEstadoGym([], d(2026, 5, 15), 50).deudor, true);
  });
});