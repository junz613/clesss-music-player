import type { Request, Response, NextFunction } from "express";
import type { Prisma } from "@prisma/client";

import { prisma } from "../lib/prisma.js";
import { streamAudioFile } from "../services/audioStream.js";
import { presentSongs, publicSongSelect } from "../services/songPresenter.js";

// 列表接口面向播放器首页，默认分页避免一次返回几千首歌。
export async function listSongs(request: Request, response: Response, next: NextFunction) {
  try {
    const page = readPositiveInteger(request.query.page, 1);
    const pageSize = Math.min(readPositiveInteger(request.query.pageSize, 50), 100);
    const folder = typeof request.query.folder === "string" ? request.query.folder.trim() : "";
    const where: Prisma.SongWhereInput = {
      isDeleted: false,
      ...(folder ? { folder } : {})
    };

    // 列表数据和总数并行查询，前端可以直接渲染分页信息。
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

// 搜索阶段先做数据库模糊匹配，覆盖标题、文件名、文件夹和元信息字段。
export async function searchSongs(request: Request, response: Response, next: NextFunction) {
  try {
    const page = readPositiveInteger(request.query.page, 1);
    const pageSize = Math.min(readPositiveInteger(request.query.pageSize, 50), 100);
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

    // keyword 为空时返回全部歌曲，便于前端清空搜索框后复用同一接口。
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

// 播放接口只通过歌曲 id 查真实路径，避免前端接触本地磁盘路径。
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

    // Range 头原样交给音频流服务处理，保证浏览器拖动进度条可用。
    await streamAudioFile({
      filePath: song.filePath,
      rangeHeader: request.headers.range,
      response
    });
  } catch (error) {
    next(error);
  }
}

// 查询参数来自 URL，统一转换成安全的正整数。
function readPositiveInteger(value: unknown, fallback: number) {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}
