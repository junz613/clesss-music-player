import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { parseFile } from "music-metadata";

import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

const SUPPORTED_AUDIO_EXTENSIONS = new Set([".mp3"]);
// 扫描 MUSIC_ROOT 时跳过项目、依赖和隐藏目录，避免把工程文件当作媒体库遍历。
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

export type UpsertSongFileResult = {
  songId: string;
  created: boolean;
  restored: boolean;
};

type SongMetadata = {
  title: string;
  artist: string | null;
  album: string | null;
  duration: number | null;
};

// 扫描本地音乐库，并把当前磁盘状态同步到 MySQL。
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

      // fileKey 来源于相对路径，文件重扫时可以稳定匹配同一首本地歌曲。
      const existingSong = await prisma.song.findUnique({
        where: { fileKey: fileRecord.fileKey },
        select: { id: true, isDeleted: true }
      });

      if (existingSong) {
        if (existingSong.isDeleted) {
          continue;
        }

        // 文件仍存在时只刷新未删除记录，管理员软删除的歌曲不被扫描自动恢复。
        await prisma.song.update({
          where: { id: existingSong.id },
          data: {
            ...fileRecord,
            isDeleted: false
          }
        });

        result.updated += 1;
      } else {
        // 新发现的本地音频直接入库。
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
    // 不物理删除文件；磁盘上消失的歌曲只做软删除，方便排查和恢复。
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

export async function upsertSongFile(filePath: string, musicRoot = env.musicRoot): Promise<UpsertSongFileResult> {
  const resolvedMusicRoot = path.resolve(musicRoot);
  const resolvedFilePath = path.resolve(filePath);
  const fileRecord = await buildSongRecord(resolvedMusicRoot, resolvedFilePath);
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

    return {
      songId: existingSong.id,
      created: false,
      restored: existingSong.isDeleted
    };
  }

  const song = await prisma.song.create({
    data: fileRecord,
    select: {
      id: true
    }
  });

  return {
    songId: song.id,
    created: true,
    restored: false
  };
}

// 递归发现音频文件，保持排序稳定，便于扫描结果可预测。
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

// 把一个文件路径转换成数据库需要的歌曲记录字段。
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

// 优先使用 MP3 内嵌元信息，解析失败时回退到文件名。
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

// 文件名里常见的日期和序号前缀不适合作为展示标题，扫描时做轻量清理。
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

// 数据库里的相对路径统一用 /，避免 Windows 路径分隔符影响排序和哈希。
function normalizeRelativePath(value: string) {
  return value.split(path.sep).join("/");
}
