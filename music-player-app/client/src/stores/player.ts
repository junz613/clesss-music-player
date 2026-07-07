import { defineStore } from "pinia";

import type { Song } from "../api/songs";

export const usePlayerStore = defineStore("player", {
  state: () => ({
    currentSong: null as Song | null,
    queue: [] as Song[],
    isPlaying: false
  }),
  actions: {
    // The current queue is captured from the visible list, so next-step controls can switch within search results.
    play(song: Song, queue: Song[]) {
      this.currentSong = song;
      this.queue = queue;
      this.isPlaying = true;
    },
    togglePlaying() {
      if (!this.currentSong) {
        return;
      }

      this.isPlaying = !this.isPlaying;
    }
  }
});
