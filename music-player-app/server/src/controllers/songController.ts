import type { Request, Response, NextFunction } from "express";

import { prisma } from "../lib/prisma.js";

export async function listSongs(request: Request, response: Response, next: NextFunction) {
  try {
    const page = readPositiveInteger(request.query.page, 1);
    const pageSize = Math.min(readPositiveInteger(request.query.pageSize, 50), 100);
    const folder = typeof request.query.folder === "string" ? request.query.folder.trim() : "";
    const where = {
      isDeleted: false,
      ...(folder ? { folder } : {})
    };

    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where,
        select: {
          id: true,
          title: true,
          artist: true,
          album: true,
          duration: true,
          folder: true,
          fileName: true,
          playUrl: true,
          sourceType: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: [{ folder: "asc" }, { fileName: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.song.count({ where })
    ]);

    response.json({
      data: songs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    next(error);
  }
}

function readPositiveInteger(value: unknown, fallback: number) {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}
