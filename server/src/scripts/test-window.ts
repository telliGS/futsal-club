import { weekendWindowArg } from "../lib/timbo.js";

// simula varias fechas para probar la regla
const casos = [
  "2026-08-07T12:00:00Z", // viernes
  "2026-08-09T12:00:00Z", // domingo
  "2026-08-10T12:00:00Z", // lunes (hoy)
  "2026-08-11T12:00:00Z", // martes
  "2026-08-13T12:00:00Z", // jueves
  "2026-08-06T12:00:00Z", // jueves anterior
];

for (const c of casos) {
  const w = weekendWindowArg(new Date(c));
  const s = w.start.toISOString().slice(0, 10);
  const e = w.end.toISOString().slice(0, 10);
  console.log(`${c.slice(0, 10)} (${new Date(c).toUTCString().slice(0, 3)}) -> finde ${s} al ${e}`);
}