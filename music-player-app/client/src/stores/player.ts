import { defineStore } from "pinia";

import type { Song } from "../api/songs";

export type PlaybackMode = "listLoop" | "singleLoop" | "random";

const MAX_QUEUE_SIZE = 500;

export const usePlayerStore = defineStore("player", {
  state: () => ({
    currentSong: null as Song | null,
    queue: [] as Song[],
    isPlaying: false,
    playbackMode: "listLoop" as PlaybackMode
  }),
  actions: {
    // The visible list becomes the queue from the clicked song onward, matching the local demo playback rule.
    play(song: Song, queue: Song[]) {
      this.currentSong = song;
      this.queue = this.createQueueFromSong(song, queue);
      this.isPlaying = true;
    },
    playQueue(queue: Song[]) {
      const nextQueue = queue.slice(0, MAX_QUEUE_SIZE);

      if (!nextQueue.length) {
        return null;
      }

      this.currentSong = nextQueue[0];
      this.queue = nextQueue;
      this.isPlaying = true;
      return this.currentSong;
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

      if (this.playbackMode === "singleLoop" && this.currentSong) {
        this.isPlaying = true;
        return this.currentSong;
      }

      if (this.playbackMode === "random") {
        const nextSong = this.pickRandomSong();

        if (nextSong) {
          this.currentSong = nextSong;
          this.isPlaying = true;
          return this.currentSong;
        }
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

      if (this.playbackMode === "singleLoop" && this.currentSong) {
        this.isPlaying = true;
        return this.currentSong;
      }

      if (this.playbackMode === "random") {
        const previousSong = this.pickRandomSong();

        if (previousSong) {
          this.currentSong = previousSong;
          this.isPlaying = true;
          return this.currentSong;
        }
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
    },
    cyclePlaybackMode() {
      const modeOrder: PlaybackMode[] = ["listLoop", "singleLoop", "random"];
      const currentIndex = modeOrder.indexOf(this.playbackMode);

      this.playbackMode = modeOrder[(currentIndex + 1) % modeOrder.length];
    },
    clearQueue() {
      this.queue = this.currentSong ? [this.currentSong] : [];
    },
    createQueueFromSong(song: Song, queue: Song[]) {
      const startIndex = queue.findIndex((queueSong) => queueSong.id === song.id);

      if (startIndex < 0) {
        return [song];
      }

      return queue.slice(startIndex, startIndex + MAX_QUEUE_SIZE);
    },
    pickRandomSong() {
      if (!this.queue.length) {
        return null;
      }

      if (this.queue.length === 1) {
        return this.queue[0];
      }

      const currentIndex = this.findCurrentIndex();
      let randomIndex = currentIndex;

      while (randomIndex === currentIndex) {
        randomIndex = Math.floor(Math.random() * this.queue.length);
      }

      return this.queue[randomIndex];
    }
  }
});
