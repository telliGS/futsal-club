import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { filtrarJugadores } from "./panel-filters";
import type { IPlayer } from "./panel-types";

function player(name: string, status: string, estadoCuota: IPlayer["estadoCuota"]): IPlayer {
  const [firstName, lastName] = name.split(" ");
  return {
    id: name,
    firstName,
    lastName,
    document: String(name.length * 11111),
    status: status as IPlayer["status"],
    estadoCuota,
    estadoGym: "PENDIENTE",
    payments: [],
    role: "JUGADOR",
  } as IPlayer;
}

const alDia = { deudor: false, alDia: true, pendiente: false, puedeJugar: true, mesesDebe: 0 };
const pendiente = { deudor: false, alDia: false, pendiente: true, puedeJugar: true, mesesDebe: 0 };
const deudor = { deudor: true, alDia: false, pendiente: false, puedeJugar: false, mesesDebe: 2 };

const A = player("Ana Gomez", "ACTIVO", alDia);
const B = player("Bruno Perez", "ACTIVO", pendiente);
const C = player("Carla Diaz", "ACTIVO", deudor);
const D = player("Diego Ruiz", "INACTIVO", deudor);
const plantel = [A, B, C, D];

describe("filtrarJugadores", () => {
  it("filtro todos devuelve el plantel completo", () => {
    const { jugadoresFiltrados } = filtrarJugadores(plantel, { filtroEstado: "todos" });
    assert.equal(jugadoresFiltrados.length, 4);
  });

  it("filtro al_dia", () => {
    const { jugadoresFiltrados } = filtrarJugadores(plantel, { filtroEstado: "al_dia" });
    assert.deepEqual(jugadoresFiltrados.map((p) => p.id), ["Ana Gomez"]);
  });

  it("filtro pendiente", () => {
    const { jugadoresFiltrados } = filtrarJugadores(plantel, { filtroEstado: "pendiente" });
    assert.deepEqual(jugadoresFiltrados.map((p) => p.id), ["Bruno Perez"]);
  });

  it("filtro deudor incluye inactivos con deuda", () => {
    const { jugadoresFiltrados } = filtrarJugadores(plantel, { filtroEstado: "deudor" });
    assert.deepEqual(jugadoresFiltrados.map((p) => p.id), ["Carla Diaz", "Diego Ruiz"]);
  });

  it("filtro inactivo", () => {
    const { jugadoresFiltrados } = filtrarJugadores(plantel, { filtroEstado: "inactivo" });
    assert.deepEqual(jugadoresFiltrados.map((p) => p.id), ["Diego Ruiz"]);
  });

  it("busqueda por nombre y por DNI dentro del filtro aplicado", () => {
    const porNombre = filtrarJugadores(plantel, { filtroEstado: "todos", busqueda: "carla" });
    assert.deepEqual(porNombre.jugadoresBusqueda.map((p) => p.id), ["Carla Diaz"]);

    const sinBusqueda = filtrarJugadores(plantel, { filtroEstado: "todos", busqueda: " " });
    assert.equal(sinBusqueda.jugadoresBusqueda.length, 4);

    const porDni = filtrarJugadores(plantel, { filtroEstado: "deudor", busqueda: A.document });
    assert.equal(porDni.jugadoresBusqueda.length, 0);
  });
});