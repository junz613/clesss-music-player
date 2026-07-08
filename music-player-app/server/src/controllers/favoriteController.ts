import type { NextFunction, Request, Response } from "express";
import type { Prisma } from "@prisma/client";

import { prisma } from "../lib/prisma.js";
import { presentSong, presentSongs, publicSongSelect } from "../services/songPresenter.js";

const LOCAL_USER_KEY = "local-user";
const MAX_FAVORITE_PAGE_SIZE = 500;

export async function listFavorites(request: Request, response: Response, next: NextFunction) {
  try {
    const page = readPositiveInteger(request.query.page, 1);
    const pageSize = Math.min(readPositiveInteger(request.query.pageSize, 50), MAX_FAVORITE_PAGE_SIZE);
    const where: Prisma.FavoriteWhereInput = {
      userKey: LOCAL_USER_KEY,
      song: {
        isDeleted: false
      }
    };

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where,
        select: {
          song: {
            select: publicSongSelect
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.favorite.count({ where })
    ]);

    response.json({
      data: presentSongs(favorites.map((favorite) => favorite.song)),
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

export async function addFavorite(request: Request, response: Response, next: NextFunction) {
  try {
    const song = await prisma.song.findFirst({
      where: {
        id: request.params.songId,
        isDeleted: false
      },
      select: publicSongSelect
    });

    if (!song) {
      response.status(404).json({ message: "Song not found" });
      return;
    }

    await prisma.favorite.upsert({
      where: {
        songId_userKey: {
          songId: song.id,
          userKey: LOCAL_USER_KEY
        }
      },
      update: {},
      create: {
        songId: song.id,
        userKey: LOCAL_USER_KEY
      }
    });

    response.json({
      data: presentSong(song)
    });
  } catch (error) {
    next(error);
  }
}

export async function removeFavorite(request: Request, response: Response, next: NextFunction) {
  try {
    await prisma.favorite.deleteMany({
      where: {
        songId: request.params.songId,
        userKey: LOCAL_USER_KEY
      }
    });

    response.status(204).send();
  } catch (error) {
    next(error);
  }
}

function readPositiveInteger(value: unknown, fallback: number) {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}
