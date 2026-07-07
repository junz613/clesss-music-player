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
    },
    playNext() {
      if (!this.queue.length) {
        return null;
      }

      const currentIndex = this.findCurrentIndex();
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % this.queue.length : 0;

      this.currentSong = this.queue[nextIndex];
      this.isPlaying = true;
      return this.currentSong;
    },
    playPrevious() {
      if (!this.queue.length) {
        return null;
      }

      const currentIndex = this.findCurrentIndex();
      const previousIndex =
        currentIndex >= 0 ? (currentIndex - 1 + this.queue.length) % this.queue.length : 0;

      this.currentSong = this.queue[previousIndex];
      this.isPlaying = true;
      return this.currentSong;
    },
    findCurrentIndex() {
      if (!this.currentSong) {
        return -1;
      }

      return this.queue.findIndex((song) => song.id === this.currentSong?.id);
    }
  }
});
