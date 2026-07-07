type SongForResponse = {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  duration: number | null;
  folder: string;
  fileName: string;
  sourceType: string;
  createdAt: Date;
  updatedAt: Date;
};

// 公开查询字段集中定义，防止接口误返回 filePath/fileKey 等后端私有信息。
export const publicSongSelect = {
  id: true,
  title: true,
  artist: true,
  album: true,
  duration: true,
  folder: true,
  fileName: true,
  sourceType: true,
  createdAt: true,
  updatedAt: true
} as const;

// playUrl 是由接口层派生出来的，不存库，方便将来切换成本地流或云端地址。
export function presentSong(song: SongForResponse) {
  return {
    ...song,
    playUrl: `/api/songs/${song.id}/stream`
  };
}

// 批量转换保持 controller 简洁。
export function presentSongs(songs: SongForResponse[]) {
  return songs.map(presentSong);
}
