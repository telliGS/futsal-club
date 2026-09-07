import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calcularEstadoCuota, DIA_CORTE } from "./cuota.js";

function d(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

describe("calcularEstadoCuota", () => {
  it("al día cuando paga el mes en curso dentro del plazo", () => {
    const st = calcularEstadoCuota(
      [{ month: "2026-04", paid: true }],
      d(2026, 4, 5)
    );
    assert.deepEqual(st, {
      deudor: false,
      alDia: true,
      pendiente: false,
      puedeJugar: true,
      mesesDebe: 0,
    });
  });

  it("pendiente dentro del plazo sin pagar mes actual", () => {
    const st = calcularEstadoCuota([], d(2026, 4, 5));
    assert.equal(st.deudor, false);
    assert.equal(st.alDia, false);
    assert.equal(st.pendiente, true);
    assert.equal(st.puedeJugar, true);
    assert.equal(st.mesesDebe, 0);
  });

  it("deudor cuando vence el plazo sin pagar mes actual", () => {
    const st = calcularEstadoCuota([], d(2026, 4, 11));
    assert.equal(st.deudor, true);
    assert.equal(st.puedeJugar, false);
    assert.equal(st.pendiente, false);
    assert.equal(st.mesesDebe, 1);
  });

  it("mantiene deuda de meses anteriores aunque pague el actual", () => {
    const st = calcularEstadoCuota(
      [
        { month: "2026-02", paid: false },
        { month: "2026-04", paid: true },
      ],
      d(2026, 4, 5)
    );
    assert.equal(st.deudor, true);
    assert.equal(st.mesesDebe, 1);
    assert.equal(st.alDia, false);
  });

  it("no cuenta deudas del mes lunar que sí venció", () => {
    const st = calcularEstadoCuota(
      [
        { month: "2026-03", paid: false },
        { month: "2026-04", paid: false },
      ],
      d(2026, 4, 15)
    );
    assert.equal(st.mesesDebe, 2);
  });

  it("respeta deadline propio del jugador", () => {
    assert.equal(calcularEstadoCuota([], d(2026, 4, 10), { deadline: 10 }).deudor, false);
    assert.equal(calcularEstadoCuota([], d(2026, 4, 11), { deadline: 10 }).deudor, true);
    assert.equal(calcularEstadoCuota([], d(2026, 4, 20), { deadline: 25 }).pendiente, true);
  });

  it("fallback a DIA_CORTE con deadline inválido", () => {
    assert.equal(DIA_CORTE, 10);
    assert.equal(calcularEstadoCuota([], d(2026, 4, 15), { deadline: 0 }).deudor, true);
    assert.equal(calcularEstadoCuota([], d(2026, 4, 15), { deadline: 32 }).deudor, true);
  });

  it("jugador inactivo (congelarDesde) no acumula deuda durante su ausencia", () => {
    const st = calcularEstadoCuota(
      [{ month: "2026-03", paid: false }],
      d(2026, 4, 20),
      { congelarDesde: "2026-03" }
    );
    assert.equal(st.deudor, false);
    assert.equal(st.mesesDebe, 0);
    assert.equal(st.pendiente, true);
  });

  it("congelarDesde no borra deudas previas a la fecha", () => {
    const st = calcularEstadoCuota(
      [
        { month: "2026-02", paid: false },
        { month: "2026-03", paid: false },
      ],
      d(2026, 4, 20),
      { congelarDesde: "2026-04" }
    );
    assert.equal(st.deudor, true);
    assert.equal(st.mesesDebe, 2);
  });
});