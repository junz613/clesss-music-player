import axios from "axios";

export type Song = {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  duration: number | null;
  folder: string;
  fileName: string;
  sourceType: string;
  createdAt: string;
  updatedAt: string;
  playUrl: string;
};

export type SongListResponse = {
  data: Song[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const api = axios.create({
  baseURL: "/api",
  timeout: 10000
});

// Keep API calls in one small wrapper so components do not depend on axios details.
export async function fetchSongs(pageSize = 30) {
  const response = await api.get<SongListResponse>("/songs", {
    params: { pageSize }
  });

  return response.data;
}

export async function searchSongs(keyword: string, pageSize = 30) {
  const response = await api.get<SongListResponse>("/songs/search", {
    params: { keyword, pageSize }
  });

  return response.data;
}
