import { Request, Response } from "express";
import { prisma } from "../config.js";

export const getTeams = async (_req: Request, res: Response) => {
  const teams = await prisma.team.findMany({
    include: { _count: { select: { players: true } } },
    orderBy: { name: "asc" },
  });
  res.json(teams);
};
