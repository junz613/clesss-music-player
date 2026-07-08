import type { Request, Response, NextFunction } from "express";
import type { Prisma } from "@prisma/client";

import { prisma } from "../lib/prisma.js";
import { streamAudioFile } from "../services/audioStream.js";
import { presentSongs, publicSongSelect } from "../services/songPresenter.js";

const MAX_PLAYLIST_PAGE_SIZE = 500;

export async function listSongs(request: Request, response: Response, next: NextFunction) {
  try {
    const page = readPositiveInteger(request.query.page, 1);
    const pageSize = Math.min(readPositiveInteger(request.query.pageSize, 50), MAX_PLAYLIST_PAGE_SIZE);
    const folder = typeof request.query.folder === "string" ? request.query.folder.trim() : "";
    const where: Prisma.SongWhereInput = {
      isDeleted: false,
      ...(folder ? { folder } : {})
    };

    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where,
        select: publicSongSelect,
        orderBy: [{ folder: "asc" }, { fileName: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.song.count({ where })
    ]);

    response.json({
      data: presentSongs(songs),
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

export async function searchSongs(request: Request, response: Response, next: NextFunction) {
  try {
    const page = readPositiveInteger(request.query.page, 1);
    const pageSize = Math.min(readPositiveInteger(request.query.pageSize, 50), MAX_PLAYLIST_PAGE_SIZE);
    const keyword = typeof request.query.keyword === "string" ? request.query.keyword.trim() : "";
    const where: Prisma.SongWhereInput = {
      isDeleted: false,
      ...(keyword
        ? {
            OR: [
              { title: { contains: keyword } },
              { fileName: { contains: keyword } },
              { folder: { contains: keyword } },
              { artist: { contains: keyword } },
              { album: { contains: keyword } }
            ]
          }
        : {})
    };

    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where,
        select: publicSongSelect,
        orderBy: [{ folder: "asc" }, { fileName: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.song.count({ where })
    ]);

    response.json({
      data: presentSongs(songs),
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

export async function streamSong(request: Request, response: Response, next: NextFunction) {
  try {
    const song = await prisma.song.findFirst({
      where: {
        id: request.params.id,
        isDeleted: false,
        sourceType: "local"
      },
      select: {
        filePath: true
      }
    });

    if (!song) {
      response.status(404).json({ message: "Song not found" });
      return;
    }

    await streamAudioFile({
      filePath: song.filePath,
      rangeHeader: request.headers.range,
      response
    });
  } catch (error) {
    next(error);
  }
}

function readPositiveInteger(value: unknown, fallback: number) {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}
