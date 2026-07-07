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

export function presentSong(song: SongForResponse) {
  return {
    ...song,
    playUrl: `/api/songs/${song.id}/stream`
  };
}

export function presentSongs(songs: SongForResponse[]) {
  return songs.map(presentSong);
}
