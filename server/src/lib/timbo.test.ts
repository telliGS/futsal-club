import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  weekendWindowArg,
  norm,
  involvesClub,
  clubInfoFromMatch,
  resultFromMatch,
  clubTeamForMatch,
  clubZoneByName,
  parseEditionCategories,
  parseActiveZones,
  CLUB_ZONES,
  type ITimboMatch,
  type ITimboPosition,
} from "./timbo.js";

function pos(teamName: string | null, idx: number): ITimboPosition {
  return idx === 0
    ? { roster: { team: { id: 10, name: teamName ?? undefined } } }
    : { roster: { team: { id: 20, name: teamName ?? undefined } } };
}

function match(teams: [string, string], goals?: number[]): ITimboMatch {
  return {
    id: 1,
    round: 3,
    date_iso: "2026-08-30T20:30:00",
    time_iso: null,
    date: null,
    field: { name: "Cancha 1" },
    positions: [pos(teams[0], 0), pos(teams[1], 1)],
    goals,
    closed: goals ? true : false,
    show_result: goals ? 1 : 0,
  };
}

describe("norm", () => {
  it("normaliza a mayúsculas sin tildes ni espacios extra", () => {
    assert.equal(norm("  JOSé HERNÁNDEZ A  "), "JOSE HERNANDEZ A");
    assert.equal(norm(null), "");
  });
});

describe("involvesClub", () => {
  it("reconoce partidos del club por prefijo", () => {
    assert.equal(involvesClub(match(["JOSE HERNANDEZ A", "RIVAL FC"], [1, 2])), true);
    assert.equal(involvesClub(match(["OTRO CLUB", "JOSE HERNANDEZ NEGRO"], [1, 2])), true);
    assert.equal(involvesClub(match(["OTRO CLUB A", "RIVAL FC"], [1, 2])), false);
  });
});

describe("clubInfoFromMatch", () => {
  it("el club en home → isHome true y rival la visita", () => {
    const info = clubInfoFromMatch(match(["JOSE HERNANDEZ A", "RIVAL FC"]));
    assert.deepEqual(info, { isHome: true, rival: "RIVAL FC" });
  });
  it("el club de visita → isHome false", () => {
    const info = clubInfoFromMatch(match(["RIVAL FC", "JOSE HERNANDEZ A"]));
    assert.deepEqual(info, { isHome: false, rival: "RIVAL FC" });
  });
  it("sin club → rival por confirmar", () => {
    const info = clubInfoFromMatch(match(["A", "B"]));
    assert.deepEqual(info, { isHome: false, rival: "Por confirmar" });
  });
});

describe("resultFromMatch", () => {
  it("resultado alineado con el índice del club", () => {
    const r = resultFromMatch(match(["RIVAL FC", "JOSE HERNANDEZ A"], [3, 1]));
    assert.deepEqual(r, { clubGoals: 1, rivalGoals: 3 });
  });
  it("null si el partido no está cerrado o no publica resultado", () => {
    const sinPublicar = match(["JOSE HERNANDEZ A", "RIVAL FC"], [1, 2]);
    sinPublicar.show_result = 0;
    assert.equal(resultFromMatch(sinPublicar), null);
    const abierto = match(["JOSE HERNANDEZ A", "RIVAL FC"], undefined);
    assert.equal(resultFromMatch(abierto), null);
  });
  it("null con goals incompletos", () => {
    const m = match(["JOSE HERNANDEZ A", "RIVAL FC"], [2]);
    assert.equal(resultFromMatch(m), null);
  });
});

describe("clubTeamForMatch", () => {
  const c13 = CLUB_ZONES.find((z) => z.timboCategoryName === "C13")!;
  const segunda = CLUB_ZONES.find((z) => z.timboCategoryName === "Segunda División")!;

  it("mapea por nombre del home en el clásico JH C vs JH NEGRO", () => {
    assert.equal(clubTeamForMatch(match(["JOSE HERNANDEZ C", "JOSE HERNANDEZ NEGRO"]), segunda), "JH C");
  });
  it("mapea cuando el club juega de visita", () => {
    assert.equal(clubTeamForMatch(match(["RIVAL FC", "JOSE HERNANDEZ A"]), c13), "C13");
  });
  it("null sin partido del club", () => {
    assert.equal(clubTeamForMatch(match(["OTRO CLUB A", "OTRO CLUB B"]), c13), null);
  });
});

describe("parseEditionCategories", () => {
  it("extrae id, nombre y rondas de la respuesta de TIMBO", () => {
    const cats = parseEditionCategories([
      { id: 178583342, name: "Segunda División", current_round: 9, round_count: 13, match_duration: 20 },
      { id: 475979060, name: "C15", current_round: 7, round_count: 23 },
    ]);
    assert.equal(cats.length, 2);
    assert.deepEqual(cats[0], { id: 178583342, name: "Segunda División", current_round: 9, round_count: 13 });
    assert.deepEqual(cats[1], { id: 475979060, name: "C15", current_round: 7, round_count: 23 });
  });
  it("descarta entradas inválidas y respuestas que no son array", () => {
    assert.deepEqual(parseEditionCategories(null), []);
    assert.deepEqual(parseEditionCategories({}), []);
    assert.deepEqual(parseEditionCategories([{ id: "x", name: 1 }, null, { id: 3, name: "C11" }]), [
      { id: 3, name: "C11", current_round: 1, round_count: 1 },
    ]);
  });
});

describe("parseActiveZones", () => {
  it("aplaniza zonas por categoría con su categoryZone", () => {
    const zones = parseActiveZones([
      {
        id: 178583342,
        name: "Segunda División",
        zones: [
          { id: 1447239283, name: "4tos de FINAL", count_matches: 2 },
          { id: 156900032, name: "4vos de Final Plata", count_matches: 2 },
        ],
      },
      { id: 1919724182, name: "C11", zones: [] },
      { id: 475979060, name: "C15" },
    ]);
    assert.equal(zones.length, 2);
    assert.deepEqual(zones[0], {
      id: 1447239283,
      name: "4tos de FINAL",
      categoryZone: 178583342,
      categoryName: "Segunda División",
      count_matches: 2,
    });
    assert.equal(zones[1].categoryZone, 178583342);
  });
  it("tolera respuestas no válidas", () => {
    assert.deepEqual(parseActiveZones("html"), []);
    assert.deepEqual(parseActiveZones([{ id: 1, zones: "x" }, null]), []);
  });
});

describe("clubZoneByName", () => {
  it("matchea por nombre normalizado (tildes incluidas)", () => {
    assert.equal(clubZoneByName("Segunda División")?.timboCategoryName, "Segunda División");
    assert.equal(clubZoneByName("SEGUNDA DIVISION")?.timboCategoryName, "Segunda División");
    assert.equal(clubZoneByName("C13")?.teams[0].clubTeamName, "C13");
  });
  it("null para categorías sin equipo del club", () => {
    assert.equal(clubZoneByName("Tercera División"), null);
    assert.equal(clubZoneByName("C9"), null);
    assert.equal(clubZoneByName(""), null);
  });
});

describe("weekendWindowArg", () => {
  const viernes = new Date(2026, 7, 28, 23, 0, 0); // vie 28/08/2026 23:00 ARG
  const martes = new Date(2026, 8, 1, 10, 0, 0); // mar 01/09/2026
  const lunes = new Date(2026, 7, 31, 12, 0, 0); // lun 31/08/2026

  it("viernes→lunes: ventana del finde en curso (límites en hora ARG)", () => {
    const w = weekendWindowArg(viernes);
    assert.equal(w.start.toISOString().slice(0, 10), "2026-08-28"); // vie 00:00 ARG = 03:00Z
    assert.equal(w.end.toISOString().slice(0, 10), "2026-09-01"); // lun 23:59 ARG = mar 02:59Z
  });
  it("el lunes pertenece al finde que termina", () => {
    const w = weekendWindowArg(lunes);
    assert.equal(w.start.toISOString().slice(0, 10), "2026-08-28");
    assert.equal(w.end.toISOString().slice(0, 10), "2026-09-01");
  });
  it("de martes a jueves la ventana apunta al próximo viernes", () => {
    const w = weekendWindowArg(martes);
    assert.equal(w.start.toISOString().slice(0, 10), "2026-09-04");
    assert.equal(w.end.toISOString().slice(0, 10), "2026-09-08");
  });
});