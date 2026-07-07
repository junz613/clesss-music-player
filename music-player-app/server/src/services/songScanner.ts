import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { parseFile } from "music-metadata";

import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

const SUPPORTED_AUDIO_EXTENSIONS = new Set([".mp3"]);
const SKIPPED_DIRECTORIES = new Set([
  ".agents",
  ".codex",
  ".git",
  ".idea",
  ".vscode",
  "dist",
  "build",
  "node_modules",
  "music-player-app"
]);

type SongScanStats = {
  scanned: number;
  created: number;
  updated: number;
  restored: number;
  softDeleted: number;
  failed: number;
};

export type SongScanResult = SongScanStats & {
  musicRoot: string;
  failures: Array<{
    filePath: string;
    message: string;
  }>;
};

type SongMetadata = {
  title: string;
  artist: string | null;
  album: string | null;
  duration: number | null;
};

export async function scanLocalSongs(musicRoot = env.musicRoot): Promise<SongScanResult> {
  const resolvedMusicRoot = path.resolve(musicRoot);
  const rootStat = await fs.stat(resolvedMusicRoot).catch(() => null);

  if (!rootStat?.isDirectory()) {
    throw new Error(`Music root does not exist or is not a directory: ${resolvedMusicRoot}`);
  }

  const audioFiles = await discoverAudioFiles(resolvedMusicRoot);
  const scannedFileKeys: string[] = [];
  const result: SongScanResult = {
    musicRoot: resolvedMusicRoot,
    scanned: audioFiles.length,
    created: 0,
    updated: 0,
    restored: 0,
    softDeleted: 0,
    failed: 0,
    failures: []
  };

  for (const filePath of audioFiles) {
    try {
      const fileRecord = await buildSongRecord(resolvedMusicRoot, filePath);
      scannedFileKeys.push(fileRecord.fileKey);

      const existingSong = await prisma.song.findUnique({
        where: { fileKey: fileRecord.fileKey },
        select: { id: true, isDeleted: true }
      });

      if (existingSong) {
        await prisma.song.update({
          where: { id: existingSong.id },
          data: {
            ...fileRecord,
            isDeleted: false
          }
        });

        result.updated += 1;
        if (existingSong.isDeleted) {
          result.restored += 1;
        }
      } else {
        await prisma.song.create({
          data: fileRecord
        });
        result.created += 1;
      }
    } catch (error) {
      result.failed += 1;
      result.failures.push({
        filePath,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  if (scannedFileKeys.length > 0) {
    const deletedSongs = await prisma.song.updateMany({
      where: {
        sourceType: "local",
        isDeleted: false,
        fileKey: {
          notIn: scannedFileKeys
        }
      },
      data: {
        isDeleted: true
      }
    });

    result.softDeleted = deletedSongs.count;
  }

  return result;
}

async function discoverAudioFiles(musicRoot: string): Promise<string[]> {
  const audioFiles: string[] = [];

  async function walk(currentDirectory: string) {
    const entries = await fs.readdir(currentDirectory, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        if (shouldSkipDirectory(entry.name)) {
          continue;
        }

        await walk(entryPath);
        continue;
      }

      if (entry.isFile() && SUPPORTED_AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        audioFiles.push(entryPath);
      }
    }
  }

  await walk(musicRoot);
  return audioFiles.sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));
}

function shouldSkipDirectory(directoryName: string) {
  return directoryName.startsWith(".") || SKIPPED_DIRECTORIES.has(directoryName);
}

async function buildSongRecord(musicRoot: string, filePath: string) {
  const relativePath = normalizeRelativePath(path.relative(musicRoot, filePath));
  const fileName = path.basename(filePath);
  const folder = normalizeRelativePath(path.dirname(relativePath));
  const fileKey = crypto.createHash("sha256").update(relativePath.toLowerCase()).digest("hex");
  const metadata = await readSongMetadata(filePath, fileName);

  return {
    title: metadata.title,
    artist: metadata.artist,
    album: metadata.album,
    duration: metadata.duration,
    folder: folder === "." ? "" : folder,
    fileName,
    filePath,
    fileKey,
    sourceType: "local"
  };
}

async function readSongMetadata(filePath: string, fileName: string): Promise<SongMetadata> {
  const fallbackTitle = deriveTitleFromFileName(fileName);

  try {
    const metadata = await parseFile(filePath, { duration: true });

    return {
      title: normalizeText(metadata.common.title) ?? fallbackTitle,
      artist: normalizeText(metadata.common.artist),
      album: normalizeText(metadata.common.album),
      duration: metadata.format.duration ? Math.round(metadata.format.duration) : null
    };
  } catch {
    return {
      title: fallbackTitle,
      artist: null,
      album: null,
      duration: null
    };
  }
}

function deriveTitleFromFileName(fileName: string) {
  const extension = path.extname(fileName);

  return (
    fileName
      .slice(0, extension ? -extension.length : undefined)
      .replace(/^\d{4}[.\-]\d{1,2}[.\-]\d{1,2}\s*[-–—]?\s*/u, "")
      .replace(/^\d{1,3}[.、\-\s]+/u, "")
      .replace(/\s+/gu, " ")
      .trim() || fileName
  );
}

function normalizeText(value: string | undefined) {
  const normalizedValue = value?.replace(/\s+/gu, " ").trim();
  return normalizedValue || null;
}

function normalizeRelativePath(value: string) {
  return value.split(path.sep).join("/");
}
