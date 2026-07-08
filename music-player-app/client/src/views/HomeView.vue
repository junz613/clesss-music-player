<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  ChevronDown,
  Heart,
  Home,
  ListMusic,
  LoaderCircle,
  Music2,
  Pause,
  Play,
  Search,
  Settings,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2
} from "lucide-vue-next";

import { fetchSongs, searchSongs, type Song } from "../api/songs";
import logoUrl from "../assets/clesss-logo.jpg";
import listLoopIconUrl from "../assets/player/play-mode-list-loop.png";
import randomIconUrl from "../assets/player/play-mode-random.png";
import singleLoopIconUrl from "../assets/player/play-mode-single-loop.png";
import { usePlayerStore } from "../stores/player";

const SONG_LIST_PAGE_SIZE = 500;
const PLAY_ALL_LIMIT = 500;

const player = usePlayerStore();
const songs = ref<Song[]>([]);
const keyword = ref("");
const loading = ref(false);
const errorMessage = ref("");
const showPlayerDetail = ref(false);
const showQueuePanel = ref(false);
const queuePanelRef = ref<HTMLElement | null>(null);
const queueToggleRef = ref<HTMLButtonElement | null>(null);
const audioRef = ref<HTMLAudioElement | null>(null);
const currentTime = ref(0);
const loadedDuration = ref(0);
const volume = ref(0.72);

const highlightedSongs = computed(() => songs.value.slice(0, 6));
const libraryCount = computed(() => songs.value.length);
const playbackDuration = computed(() => loadedDuration.value || player.currentSong?.duration || 0);
const progressPercent = computed(() => {
  if (!playbackDuration.value) {
    return 0;
  }

  return Math.min(100, Math.max(0, (currentTime.value / playbackDuration.value) * 100));
});
const progressStyle = computed(() => ({
  "--progress-left": `${progressPercent.value}%`
}));
const playbackTimeLabel = computed(
  () => `${formatDuration(currentTime.value)} / ${formatDuration(playbackDuration.value)}`
);
const playbackModeMeta = computed(() => {
  switch (player.playbackMode) {
    case "random":
      return {
        icon: randomIconUrl,
        label: "随机播放"
      };
    case "singleLoop":
      return {
        icon: singleLoopIconUrl,
        label: "单曲循环"
      };
    default:
      return {
        icon: listLoopIconUrl,
        label: "列表循环"
      };
  }
});
const volumeStyle = computed(() => ({
  "--volume-left": `${Math.round(volume.value * 100)}%`
}));

onMounted(() => {
  void loadSongs();
  document.addEventListener("pointerdown", handleDocumentPointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", handleDocumentPointerDown);
});

watch(
  () => player.currentSong?.id,
  () => {
    currentTime.value = 0;
    loadedDuration.value = player.currentSong?.duration || 0;

    if (player.currentSong && player.isPlaying) {
      void nextTick(() => playCurrentAudio());
    }
  }
);

watch(
  () => player.isPlaying,
  (isPlaying) => {
    if (isPlaying) {
      void playCurrentAudio();
      return;
    }

    audioRef.value?.pause();
  }
);

watch(volume, (nextVolume) => {
  if (audioRef.value) {
    audioRef.value.volume = nextVolume;
  }
});

// Search and initial loading are both backed by the server, keeping local filtering out of the UI layer.
async function loadSongs() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = keyword.value.trim()
      ? await searchSongs(keyword.value.trim(), SONG_LIST_PAGE_SIZE)
      : await fetchSongs(SONG_LIST_PAGE_SIZE);

    songs.value = result.data;
  } catch {
    errorMessage.value = "后端服务未连接";
  } finally {
    loading.value = false;
  }
}

function playSong(song: Song) {
  player.play(song, songs.value);
  void nextTick(() => playCurrentAudio());
}

function playAllSongs() {
  const queue = songs.value.slice(0, PLAY_ALL_LIMIT);
  const firstSong = player.playQueue(queue);

  if (!firstSong) {
    return;
  }

  showQueuePanel.value = true;
  void nextTick(() => playCurrentAudio());
}

function playQueuedSong(song: Song) {
  player.play(song, player.queue);
  void nextTick(() => playCurrentAudio());
}

// The full player mirrors the reference detail page and only opens after a song has been selected.
function openPlayerDetail() {
  if (player.currentSong) {
    showPlayerDetail.value = true;
  }
}

function closePlayerDetail() {
  showPlayerDetail.value = false;
}

function formatDuration(duration: number | null | undefined) {
  if (duration === null || duration === undefined || !Number.isFinite(duration)) {
    return "--:--";
  }

  const safeDuration = Math.max(0, Math.floor(duration));
  const minutes = String(Math.floor(safeDuration / 60)).padStart(2, "0");
  const seconds = String(safeDuration % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

async function playCurrentAudio() {
  const audio = audioRef.value;

  if (!audio || !player.currentSong) {
    return;
  }

  try {
    audio.volume = volume.value;
    await audio.play();
  } catch {
    player.isPlaying = false;
  }
}

function syncAudioDuration() {
  const duration = audioRef.value?.duration;

  if (duration && Number.isFinite(duration)) {
    loadedDuration.value = duration;
  }
}

function syncAudioProgress() {
  currentTime.value = audioRef.value?.currentTime || 0;
  syncAudioDuration();
}

function handleAudioEnded() {
  playNextSong();
}

function seekFromPointer(event: MouseEvent) {
  if (!player.currentSong || !playbackDuration.value) {
    return;
  }

  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  const nextTime = ratio * playbackDuration.value;

  currentTime.value = nextTime;

  if (audioRef.value) {
    audioRef.value.currentTime = nextTime;
  }
}

function playNextSong() {
  const previousSongId = player.currentSong?.id;
  const nextSong = player.playNext();

  if (!nextSong) {
    player.isPlaying = false;
    return;
  }

  restartAudioIfSameSong(previousSongId, nextSong.id);
  void nextTick(() => playCurrentAudio());
}

function playPreviousSong() {
  const previousSongId = player.currentSong?.id;
  const previousSong = player.playPrevious();

  if (!previousSong) {
    player.isPlaying = false;
    return;
  }

  restartAudioIfSameSong(previousSongId, previousSong.id);
  void nextTick(() => playCurrentAudio());
}

function restartAudioIfSameSong(previousSongId: string | undefined, nextSongId: string) {
  if (previousSongId !== nextSongId || !audioRef.value) {
    return;
  }

  audioRef.value.currentTime = 0;
  currentTime.value = 0;
}

function handleAudioCanPlay() {
  if (audioRef.value) {
    audioRef.value.volume = volume.value;
  }

  if (player.isPlaying) {
    void playCurrentAudio();
  }
}

function toggleQueuePanel() {
  showQueuePanel.value = !showQueuePanel.value;
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!showQueuePanel.value) {
    return;
  }

  const target = event.target as Node | null;

  if (!target) {
    return;
  }

  if (queuePanelRef.value?.contains(target) || queueToggleRef.value?.contains(target)) {
    return;
  }

  showQueuePanel.value = false;
}

function cyclePlaybackMode() {
  player.cyclePlaybackMode();
}

function handleVolumeInput(event: Event) {
  const target = event.target as HTMLInputElement;
  volume.value = Number(target.value);
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <img class="brand__logo" :src="logoUrl" alt="ClessS logo" />
        <span class="brand__name">ClessS</span>
      </div>

      <nav class="nav-list" aria-label="主导航">
        <button class="nav-item nav-item--active" type="button" title="首页">
          <Home :size="20" />
          <span>首页</span>
        </button>
        <button class="nav-item" type="button" title="歌曲库">
          <Music2 :size="20" />
          <span>歌曲库</span>
        </button>
        <button class="nav-item" type="button" title="收藏">
          <Heart :size="20" />
          <span>收藏</span>
        </button>
        <button class="nav-item" type="button" title="管理">
          <Settings :size="20" />
          <span>管理</span>
        </button>
      </nav>

      <section class="library-panel">
        <div class="panel-title">
          <span>本地单曲</span>
          <span>{{ libraryCount }}</span>
        </div>
        <div class="playlist-list">
          <button v-for="song in highlightedSongs" :key="song.id" class="playlist-item" type="button" @click="playSong(song)">
            <span class="playlist-cover">{{ song.title.slice(0, 1) }}</span>
            <span class="playlist-text">
              <span>{{ song.title }}</span>
              <small>{{ song.folder }}</small>
            </span>
          </button>
        </div>
      </section>
    </aside>

    <main class="main">
      <header class="topbar">
        <div class="search-box">
          <Search :size="22" />
          <input v-model="keyword" type="search" placeholder="搜索歌曲、文件夹或歌手" @keyup.enter="loadSongs" />
        </div>
        <button class="primary-action" type="button" @click="loadSongs">
          <Search :size="18" />
          <span>搜索</span>
        </button>
      </header>

      <section class="hero-band">
        <div>
          <p class="eyebrow">Local Library</p>
          <h1>ClessS 本地音乐库</h1>
          <p>{{ keyword ? `正在筛选「${keyword}」` : "从本地文件夹读取，准备接入完整播放器。" }}</p>
        </div>
        <div class="hero-stats">
          <span>{{ libraryCount }}</span>
          <small>当前列表</small>
        </div>
      </section>

      <section class="content-section">
        <div class="section-heading">
          <h2>{{ keyword ? "搜索结果" : "推荐歌曲" }}</h2>
          <div class="section-actions">
            <button class="play-all-button" type="button" :disabled="!songs.length" @click="playAllSongs">
              <Play :size="18" fill="currentColor" />
              <span>播放全部</span>
            </button>
            <button class="icon-button" type="button" title="刷新" @click="loadSongs">
              <LoaderCircle :class="{ spinning: loading }" :size="20" />
            </button>
          </div>
        </div>

        <div v-if="errorMessage" class="empty-state">{{ errorMessage }}</div>
        <div v-else class="song-list">
          <div class="song-list__head" aria-hidden="true">
            <span>#</span>
            <span>标题</span>
            <span>专辑</span>
            <span>喜欢</span>
            <span>时长</span>
          </div>

          <button
            v-for="(song, index) in songs"
            :key="song.id"
            class="song-row"
            :class="{ 'song-row--active': player.currentSong?.id === song.id }"
            type="button"
            @click="playSong(song)"
          >
            <span class="song-row__index">{{ String(index + 1).padStart(2, "0") }}</span>
            <span class="song-row__title">
              <span class="song-row__cover">
                <img :src="logoUrl" alt="" />
              </span>
              <span class="song-row__text">
                <strong>{{ song.title }}</strong>
                <span>{{ song.artist || song.folder }}</span>
              </span>
            </span>
            <span class="song-row__album">{{ song.album || song.folder }}</span>
            <span class="song-row__like">
              <Heart :size="20" />
            </span>
            <span class="song-row__duration">{{ formatDuration(song.duration) }}</span>
          </button>
        </div>
      </section>
    </main>

    <section v-if="showPlayerDetail && player.currentSong" class="player-detail" aria-label="播放详情页">
      <button class="detail-close" type="button" title="返回首页" @click="closePlayerDetail">
        <ChevronDown :size="24" />
      </button>

      <div class="detail-stage">
        <div class="record-stage">
          <div class="tonearm" aria-hidden="true">
            <span class="tonearm__pivot"></span>
            <span class="tonearm__bar"></span>
            <span class="tonearm__head"></span>
          </div>
          <div class="record">
            <div class="record__ring">
              <img :src="logoUrl" alt="" />
            </div>
          </div>
        </div>

        <div class="track-panel">
          <h1>{{ player.currentSong.title }}</h1>
          <p class="track-subtitle">{{ player.currentSong.fileName }}</p>
          <p class="track-meta">
            <span>专辑：{{ player.currentSong.album || "本地收藏" }}</span>
            <span>歌手：{{ player.currentSong.artist || "ClessS" }}</span>
            <span>来源：{{ player.currentSong.folder }}</span>
          </p>
          <div class="tab-list">
            <button class="tab tab--active" type="button">歌词</button>
            <button class="tab" type="button">百科</button>
            <button class="tab" type="button">相关推荐</button>
          </div>
          <div class="lyric-panel" aria-label="歌词区域"></div>
        </div>
      </div>
    </section>

    <footer class="player-bar">
      <button
        class="playback-progress"
        :disabled="!player.currentSong"
        :style="progressStyle"
        type="button"
        aria-label="播放进度"
        @click="seekFromPointer"
      >
        <span class="playback-progress__track">
          <span class="playback-progress__fill"></span>
        </span>
        <span class="playback-progress__thumb"></span>
        <span class="playback-progress__time">{{ playbackTimeLabel }}</span>
      </button>

      <section v-if="showQueuePanel" ref="queuePanelRef" class="queue-panel" aria-label="播放列表">
        <header class="queue-panel__header">
          <div>
            <strong>播放列表</strong>
            <span>{{ player.queue.length }}</span>
          </div>
          <button class="queue-panel__clear" type="button" title="清空播放列表" @click="player.clearQueue">
            <Trash2 :size="17" />
            <span>清空</span>
          </button>
        </header>

        <div class="queue-panel__hint">
          <span>荐</span>
          <p>当前列表会从所点击歌曲开始顺序播放</p>
        </div>

        <div v-if="player.queue.length" class="queue-list">
          <button
            v-for="song in player.queue"
            :key="song.id"
            class="queue-item"
            :class="{ 'queue-item--active': player.currentSong?.id === song.id }"
            type="button"
            @click="playQueuedSong(song)"
          >
            <span class="queue-item__cover">
              <img :src="logoUrl" alt="" />
            </span>
            <span class="queue-item__text">
              <strong>{{ song.title }}</strong>
              <small>{{ song.artist || song.folder }}</small>
            </span>
            <span class="queue-item__duration">{{ formatDuration(song.duration) }}</span>
          </button>
        </div>

        <div v-else class="queue-empty">暂无播放列表</div>
      </section>

      <button class="now-playing" type="button" :disabled="!player.currentSong" title="打开播放详情" @click="openPlayerDetail">
        <span class="disc">
          <img :src="logoUrl" alt="" />
        </span>
        <span>
          <strong>{{ player.currentSong?.title || "未选择歌曲" }}</strong>
          <small>{{ player.currentSong?.artist || player.currentSong?.folder || "ClessS" }}</small>
        </span>
      </button>

      <div class="player-controls">
        <button class="icon-button mode-button" type="button" :title="playbackModeMeta.label" @click="cyclePlaybackMode">
          <img :src="playbackModeMeta.icon" :alt="playbackModeMeta.label" />
        </button>
        <button class="icon-button" type="button" title="上一首" @click="playPreviousSong">
          <SkipBack :size="22" />
        </button>
        <button class="play-button" type="button" title="播放/暂停" @click="player.togglePlaying">
          <Pause v-if="player.isPlaying" :size="28" fill="currentColor" />
          <Play v-else :size="28" fill="currentColor" />
        </button>
        <button class="icon-button" type="button" title="下一首" @click="playNextSong">
          <SkipForward :size="22" />
        </button>
        <button
          ref="queueToggleRef"
          class="icon-button"
          :class="{ 'icon-button--active': showQueuePanel }"
          type="button"
          title="播放列表"
          @click="toggleQueuePanel"
        >
          <ListMusic :size="22" />
        </button>
      </div>

      <div class="volume-zone">
        <Volume2 :size="22" />
        <input
          class="volume-slider"
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="volume"
          :style="volumeStyle"
          aria-label="音量"
          @input="handleVolumeInput"
        />
      </div>

      <audio
        ref="audioRef"
        :src="player.currentSong?.playUrl"
        preload="metadata"
        @loadedmetadata="syncAudioDuration"
        @canplay="handleAudioCanPlay"
        @timeupdate="syncAudioProgress"
        @ended="handleAudioEnded"
      ></audio>
    </footer>
  </div>
</template>
