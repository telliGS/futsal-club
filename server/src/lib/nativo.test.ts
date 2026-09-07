import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ordenCategoria,
  tieneVinculoFormativo,
  categoriaNativa,
  pagaCuotaEnEquipo,
  categoriasPagoJugador,
  type IEquipoJugador,
} from "./nativo.js";

const C17 = { name: "C17", type: "FORMATIVA", category: "C17" } satisfies IEquipoJugador;
const C20 = { name: "C20", type: "FORMATIVA", category: "C20" } satisfies IEquipoJugador;
const PRIMERA = { name: "JH NEGRO", type: "PRIMERA" } satisfies IEquipoJugador;

describe("ordenCategoria", () => {
  it("extrae el número de la categoría", () => {
    assert.equal(ordenCategoria("C17"), 17);
    assert.equal(ordenCategoria("C13"), 13);
    assert.equal(ordenCategoria("c20"), 20);
  });
  it("categoría sin número va al final", () => {
    assert.equal(ordenCategoria(null), 999);
    assert.equal(ordenCategoria(""), 999);
    assert.equal(ordenCategoria(undefined), 999);
  });
});

describe("tieneVinculoFormativo", () => {
  it("true si juega en alguna formativa", () => {
    assert.equal(tieneVinculoFormativo(["FORMATIVA", "PRIMERA"]), true);
  });
  it("false si no tiene formativas", () => {
    assert.equal(tieneVinculoFormativo(["PRIMERA", "PRIMERA"]), false);
  });
});

describe("categoriaNativa", () => {
  it("elige la formativa de menor edad", () => {
    assert.equal(categoriaNativa([C20, C17])?.category, "C17");
    assert.equal(categoriaNativa([C17, C20, PRIMERA])?.category, "C17");
  });
  it("null sin vínculo formativo", () => {
    assert.equal(categoriaNativa([PRIMERA]), null);
  });
});

describe("pagaCuotaEnEquipo", () => {
  it("con vínculo formativo paga solo en su nativa menor", () => {
    assert.equal(pagaCuotaEnEquipo([C17, C20, PRIMERA], "FORMATIVA", "C17"), true);
    assert.equal(pagaCuotaEnEquipo([C17, C20, PRIMERA], "FORMATIVA", "C20"), false);
    assert.equal(pagaCuotaEnEquipo([C17, C20, PRIMERA], "PRIMERA", "JH NEGRO"), false);
  });
  it("sin vínculo formativo paga en el equipo actual", () => {
    assert.equal(pagaCuotaEnEquipo([PRIMERA], "PRIMERA", "JH NEGRO"), true);
  });
});

describe("categoriasPagoJugador", () => {
  it("devuelve la única categoría nativa", () => {
    assert.deepEqual(categoriasPagoJugador([C17, C20, PRIMERA]), ["C17"]);
  });
  it("vacío si no tiene vínculo formativo", () => {
    assert.deepEqual(categoriasPagoJugador([PRIMERA]), []);
  });
});