import fs from "node:fs/promises";
import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import type { Prisma } from "@prisma/client";

import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { presentSong, presentSongs, publicSongSelect } from "../services/songPresenter.js";
import { upsertSongFile } from "../services/songScanner.js";

const SUPPORTED_UPLOAD_EXTENSIONS = new Set([".mp3"]);
const MAX_ADMIN_PAGE_SIZE = 500;

export async function listAdminSongs(request: Request, response: Response, next: NextFunction) {
  try {
    const page = readPositiveInteger(request.query.page, 1);
    const pageSize = Math.min(readPositiveInteger(request.query.pageSize, 50), MAX_ADMIN_PAGE_SIZE);
    const keyword = typeof request.query.keyword === "string" ? request.query.keyword.trim() : "";
    const folder = typeof request.query.folder === "string" ? request.query.folder.trim() : "";
    const where: Prisma.SongWhereInput = {
      isDeleted: false,
      ...(folder ? { folder } : {}),
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

export async function uploadAdminSong(request: Request, response: Response, next: NextFunction) {
  let savedFilePath = "";

  try {
    const file = request.file;
    const folderName = normalizeFolderName(typeof request.body.folder === "string" ? request.body.folder : "");

    if (!folderName) {
      response.status(400).json({ message: "Folder is required" });
      return;
    }

    if (!file) {
      response.status(400).json({ message: "Audio file is required" });
      return;
    }

    const extension = path.extname(file.originalname).toLowerCase();

    if (!SUPPORTED_UPLOAD_EXTENSIONS.has(extension)) {
      response.status(400).json({ message: "Only .mp3 files are supported" });
      return;
    }

    const musicRoot = path.resolve(env.musicRoot);
    const targetDirectory = resolveInsideMusicRoot(musicRoot, folderName);
    const fileName = await createAvailableFileName(targetDirectory, file.originalname);

    await fs.mkdir(targetDirectory, { recursive: true });
    savedFilePath = path.join(targetDirectory, fileName);
    await fs.writeFile(savedFilePath, file.buffer);

    const result = await upsertSongFile(savedFilePath, musicRoot);
    const song = await prisma.song.findUnique({
      where: { id: result.songId },
      select: publicSongSelect
    });

    if (!song) {
      response.status(500).json({ message: "Uploaded song could not be loaded" });
      return;
    }

    response.status(201).json({
      data: presentSong(song),
      meta: {
        created: result.created,
        restored: result.restored,
        folder: folderName
      }
    });
  } catch (error) {
    if (savedFilePath) {
      await fs.unlink(savedFilePath).catch(() => undefined);
    }

    next(error);
  }
}

export async function deleteAdminSong(request: Request, response: Response, next: NextFunction) {
  try {
    const result = await prisma.song.updateMany({
      where: {
        id: request.params.id,
        isDeleted: false
      },
      data: {
        isDeleted: true
      }
    });

    if (!result.count) {
      response.status(404).json({ message: "Song not found" });
      return;
    }

    response.status(204).send();
  } catch (error) {
    next(error);
  }
}

function normalizeFolderName(value: string) {
  return value
    .replace(/[\\/]+/gu, "-")
    .replace(/[<>:"|?*\u0000-\u001f]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function resolveInsideMusicRoot(musicRoot: string, folderName: string) {
  const targetDirectory = path.resolve(musicRoot, folderName);

  if (targetDirectory !== musicRoot && targetDirectory.startsWith(`${musicRoot}${path.sep}`)) {
    return targetDirectory;
  }

  throw new Error("Upload folder must stay inside music root");
}

async function createAvailableFileName(targetDirectory: string, originalName: string) {
  const extension = path.extname(originalName).toLowerCase();
  const baseName = normalizeFileBaseName(path.basename(originalName, path.extname(originalName)));
  let candidate = `${baseName}${extension}`;
  let index = 1;

  while (await fileExists(path.join(targetDirectory, candidate))) {
    candidate = `${baseName}-${index}${extension}`;
    index += 1;
  }

  return candidate;
}

function normalizeFileBaseName(value: string) {
  return (
    value
      .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, "")
      .replace(/\s+/gu, " ")
      .trim() || `song-${Date.now()}`
  );
}

async function fileExists(filePath: string) {
  return fs
    .access(filePath)
    .then(() => true)
    .catch(() => false);
}

function readPositiveInteger(value: unknown, fallback: number) {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}
