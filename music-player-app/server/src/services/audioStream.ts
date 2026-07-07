import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import type { Response } from "express";

const AUDIO_MIME_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".ogg": "audio/ogg"
};

// 没有显式 Range 结束位置时，默认最多返回 1MB，避免超大响应占用过多内存和带宽。
const DEFAULT_CHUNK_SIZE = 1024 * 1024;

type StreamAudioOptions = {
  filePath: string;
  rangeHeader?: string;
  response: Response;
};

export async function streamAudioFile({ filePath, rangeHeader, response }: StreamAudioOptions) {
  const stat = await fsPromises.stat(filePath).catch(() => null);

  // 数据库记录存在但本地文件被移动/删除时，返回清晰的 404。
  if (!stat?.isFile()) {
    response.status(404).json({ message: "Audio file not found" });
    return;
  }

  const fileSize = stat.size;
  const contentType = getAudioContentType(filePath);

  // 没有 Range 时返回完整文件，浏览器仍可直接播放。
  if (!rangeHeader) {
    response.writeHead(200, {
      "Accept-Ranges": "bytes",
      "Content-Length": fileSize,
      "Content-Type": contentType
    });
    fs.createReadStream(filePath).pipe(response);
    return;
  }

  const range = parseRange(rangeHeader, fileSize);

  // 无效 Range 必须返回 416，并告知可用文件总长度。
  if (!range) {
    response.writeHead(416, {
      "Content-Range": `bytes */${fileSize}`
    });
    response.end();
    return;
  }

  const { start, end } = range;
  const chunkSize = end - start + 1;

  response.writeHead(206, {
    "Accept-Ranges": "bytes",
    "Content-Length": chunkSize,
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Content-Type": contentType
  });
  fs.createReadStream(filePath, { start, end }).pipe(response);
}

// 支持 bytes=start-end、bytes=start- 和 bytes=-suffix 三种常见 Range 格式。
function parseRange(rangeHeader: string, fileSize: number) {
  const match = /^bytes=(\d*)-(\d*)$/u.exec(rangeHeader);

  if (!match) {
    return null;
  }

  const [, rawStart, rawEnd] = match;
  let start = rawStart ? Number(rawStart) : 0;
  let end = rawEnd ? Number(rawEnd) : Math.min(start + DEFAULT_CHUNK_SIZE - 1, fileSize - 1);

  if (!rawStart && rawEnd) {
    const suffixLength = Number(rawEnd);
    start = Math.max(fileSize - suffixLength, 0);
    end = fileSize - 1;
  }

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= fileSize) {
    return null;
  }

  return {
    start,
    end: Math.min(end, fileSize - 1)
  };
}

// 目前主要播放 mp3，保留常见类型映射方便以后扩展上传格式。
function getAudioContentType(filePath: string) {
  return AUDIO_MIME_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}
