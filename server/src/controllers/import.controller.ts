import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config.js";
import { buildTemplateWorkbook, parseWorkbook, importFila, TEMPLATE_MAX_BYTES } from "../lib/import.js";
import { registrarAvisoSeguro } from "../lib/seguro.js";

export const getTemplate = async (req: Request, res: Response) => {
  const team = await prisma.team.findUnique({ where: { id: req.params.teamId } });
  if (!team) return res.status(404).json({ success: false, error: "Equipo no encontrado" });

  const wb = await buildTemplateWorkbook();
  const buffer = await wb.xlsx.writeBuffer();

  const safeName = team.name.replace(/[^a-z0-9_-]/gi, "-");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="plantilla-${safeName}.xlsx"`);
  res.send(Buffer.from(buffer));
};

export const importPlayers = async (req: Request, res: Response) => {
  const team = await prisma.team.findUnique({ where: { id: req.params.teamId } });
  if (!team) return res.status(404).json({ success: false, error: "Equipo no encontrado" });

  const schema = z.object({
    dataBase64: z.string().min(1),
    fileName: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: "Faltan datos del archivo" });

  const buf = Buffer.from(parsed.data.dataBase64, "base64");
  if (buf.length === 0) return res.status(400).json({ success: false, error: "El archivo está vacío" });
  if (buf.length > TEMPLATE_MAX_BYTES) {
    return res
      .status(400)
      .json({ success: false, error: `El archivo supera el máximo de 5 MB (son ${(buf.length / 1024 / 1024).toFixed(1)} MB)` });
  }

  let filas;
  try {
    const r = await parseWorkbook(buf);
    filas = r.filas;
  } catch {
    return res
      .status(400)
      .json({ success: false, error: "No se pudo leer el archivo. ¿Es un .xlsx generado desde la plantilla?" });
  }

  const errores: Array<{ fila: number; motivo: string }> = [];
  let creados = 0;
  let actualizados = 0;
  let vinculados = 0;

  for (const f of filas) {
    if (f.error) {
      errores.push({ fila: f.n, motivo: f.error });
      continue;
    }
    try {
      const antes = await prisma.player.findUnique({ where: { document: f.dni } });
      const resultado = await importFila(team.id, f);
      vinculados++;
      if (antes) actualizados++;
      else {
        creados++;
        if (resultado.status !== "INACTIVO") {
          await registrarAvisoSeguro({
            playerId: resultado.id,
            tipo: "ALTA",
            creadoPorId: req.user!.id,
            teamId: team.id,
          });
        }
      }
    } catch (e) {
      errores.push({ fila: f.n, motivo: (e as Error).message.slice(0, 120) });
    }
  }

  res.json({ creados, actualizados, vinculados, errores });
};
