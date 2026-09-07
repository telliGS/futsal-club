import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { adaptTimboMatch, type INormalizedMatch } from "./timbo.adapter.js";
import type { ITimboMatch } from "../lib/timbo.js";

function raw(over: Partial<ITimboMatch> = {}): ITimboMatch {
  return {
    id: 123,
    round: 1,
    date_iso: "2026-08-30T20:30:00",
    time_iso: null,
    date: null,
    field: { name: "Cancha 1" },
    positions: [],
    ...over,
  } as unknown as ITimboMatch;
}

describe("adaptTimboMatch — resolveDateTime", () => {
  it("usa date_iso con hora real tal cual", () => {
    const n = adaptTimboMatch(raw(), "C13", { rival: "Rival FC", isHome: true }, null);
    assert.equal(n.dateTime, "2026-08-30T20:30:00");
  });

  it("redime la hora de time_iso cuando date_iso llega 00:00", () => {
    const n = adaptTimboMatch(
      raw({ date_iso: "2026-08-30T00:00:00", time_iso: "1970-01-01T20:30:00" }),
      "C13",
      { rival: "Rival FC", isHome: true },
      null
    );
    assert.equal(n.dateTime, "2026-08-30T20:30:00-03:00");
  });

  it("usa la hora del campo date como último recurso", () => {
    const n = adaptTimboMatch(
      raw({
        date_iso: "2026-08-30T00:00:00",
        time_iso: "1970-01-01T00:00:00",
        date: "dom. 30/08/26 - 20:30 hs",
      }),
      "C13",
      { rival: "Rival FC", isHome: true },
      null
    );
    assert.equal(n.dateTime, "2026-08-30T20:30:00-03:00");
  });

  it("time_iso con 00:00 y sin date → sin horario", () => {
    const n = adaptTimboMatch(
      raw({ date_iso: "2026-08-30T00:00:00", time_iso: "1970-01-01T00:00:00", date: null }),
      "C13",
      { rival: "Rival FC", isHome: true },
      null
    );
    assert.equal(n.dateTime, null);
  });

  it("sin date_iso → sin horario", () => {
    const n = adaptTimboMatch(raw({ date_iso: null }), "C13", { rival: "Rival FC", isHome: true }, null);
    assert.equal(n.dateTime, null);
  });

  it("no mezcla hora de time_iso con fecha de date_iso distinto día", () => {
    const n = adaptTimboMatch(
      raw({ date_iso: "2026-08-30T00:00:00", time_iso: "1970-01-02T09:15:00" }),
      "C13",
      { rival: "Rival FC", isHome: true },
      null
    );
    assert.equal(n.dateTime, "2026-08-30T09:15:00-03:00");
  });
});

describe("adaptTimboMatch — resto de campos", () => {
  it("completa venue, rival, flags y resultado", () => {
    const n = adaptTimboMatch(
      raw({ field: null }),
      "C13",
      { rival: "Rival FC", isHome: false },
      { clubGoals: 2, rivalGoals: 1 }
    );
    assert.deepEqual(n, {
      timboId: 123,
      dateTime: "2026-08-30T20:30:00",
      venue: "Por confirmar",
      rival: "Rival FC",
      isHome: false,
      category: "C13",
      clubGoals: 2,
      rivalGoals: 1,
    } satisfies INormalizedMatch);
  });
});