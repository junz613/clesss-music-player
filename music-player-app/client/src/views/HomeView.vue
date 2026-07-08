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

import {
  addFavoriteSong,
  fetchFavoriteSongs,
  fetchSongs,
  removeFavoriteSong,
  searchSongs,
  type Song,
  type SongListParams
} from "../api/songs";
import logoUrl from "../assets/clesss-logo.jpg";
import listLoopIconUrl from "../assets/player/play-mode-list-loop.png";
import randomIconUrl from "../assets/player/play-mode-random.png";
import singleLoopIconUrl from "../assets/player/play-mode-single-loop.png";
import tonearmUrl from "../assets/player/tonearm.png";
import { usePlayerStore } from "../stores/player";

type ViewMode = "home" | "search" | "library" | "folder" | "favorites";

const REQUEST_PAGE_SIZE = 500;
const PLAY_ALL_LIMIT = 500;

const player = usePlayerStore();
const allSongs = ref<Song[]>([]);
const favoriteSongs = ref<Song[]>([]);
const songs = ref<Song[]>([]);
const keyword = ref("");
const viewMode = ref<ViewMode>("home");
const selectedFolder = ref("");
const favoriteIds = ref<Set<string>>(new Set());
const favoritesLoaded = ref(false);
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

const highlightedSongs = computed(() => allSongs.value.slice(0, 6));
const folderGroups = computed(() => {
  const groups = new Map<string, Song[]>();

  for (const song of allSongs.value) {
    const folderSongs = groups.get(song.folder) || [];
    folderSongs.push(song);
    groups.set(song.folder, folderSongs);
  }

  return [...groups.entries()]
    .map(([name, folderSongs]) => ({
      name,
      count: folderSongs.length,
      songs: folderSongs
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"));
});
const libraryCount = computed(() => allSongs.value.length);
const heroCount = computed(() => {
  if (viewMode.value === "library") {
    return folderGroups.value.length;
  }

  if (viewMode.value === "favorites") {
    return favoriteSongs.value.length;
  }

  return songs.value.length;
});
const heroCountLabel = computed(() => {
  if (viewMode.value === "library") {
    return "分类";
  }

  if (viewMode.value === "favorites") {
    return "已收藏";
  }

  return "当前列表";
});
const viewTitle = computed(() => {
  if (viewMode.value === "search") {
    return "搜索结果";
  }

  if (viewMode.value === "favorites") {
    return "我的收藏";
  }

  if (viewMode.value === "library") {
    return "歌曲库";
  }

  if (viewMode.value === "folder") {
    return selectedFolder.value;
  }

  return "推荐歌曲";
});
const heroTitle = computed(() => {
  if (viewMode.value === "favorites") {
    return "ClessS 收藏";
  }

  if (viewMode.value === "folder") {
    return selectedFolder.value;
  }

  if (viewMode.value === "library") {
    return "ClessS 歌曲库";
  }

  return "ClessS 本地音乐库";
});
const heroDescription = computed(() => {
  if (viewMode.value === "search") {
    return `正在筛选「${keyword.value.trim()}」`;
  }

  if (viewMode.value === "favorites") {
    return `${favoriteSongs.value.length} 首已收藏单曲`;
  }

  if (viewMode.value === "library") {
    return "按本地文件夹查看各时期歌曲。";
  }

  if (viewMode.value === "folder") {
    return `${songs.value.length} 首本地单曲`;
  }

  return "从本地文件夹读取，准备接入完整播放器。";
});
const emptyStateText = computed(() => {
  if (viewMode.value === "favorites") {
    return "暂无收藏歌曲";
  }

  if (viewMode.value === "search") {
    return "没有找到匹配歌曲";
  }

  if (viewMode.value === "folder") {
    return "这个分类下暂无歌曲";
  }

  return "暂无歌曲";
});
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
  void showHome();
  void loadFavorites();
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

async function showHome(forceReload = false) {
  keyword.value = "";
  selectedFolder.value = "";
  viewMode.value = "home";
  await loadAllSongs(forceReload);
  songs.value = allSongs.value;
}

async function showLibrary(forceReload = false) {
  keyword.value = "";
  selectedFolder.value = "";
  viewMode.value = "library";
  await loadAllSongs(forceReload);
  songs.value = [];
}

async function showFavorites(forceReload = false) {
  keyword.value = "";
  selectedFolder.value = "";
  viewMode.value = "favorites";
  await loadFavorites(forceReload);
  songs.value = favoriteSongs.value;
}

async function openFolder(folder: string) {
  selectedFolder.value = folder;
  viewMode.value = "folder";
  await loadAllSongs();
  songs.value = allSongs.value.filter((song) => song.folder === folder);
}

async function refreshCurrentView() {
  if (viewMode.value === "search") {
    await runSearch();
    return;
  }

  if (viewMode.value === "library") {
    await showLibrary(true);
    return;
  }

  if (viewMode.value === "favorites") {
    await showFavorites(true);
    return;
  }

  if (viewMode.value === "folder") {
    const folder = selectedFolder.value;
    await loadAllSongs(true);
    await openFolder(folder);
    return;
  }

  await showHome(true);
}

async function runSearch() {
  const nextKeyword = keyword.value.trim();

  if (!nextKeyword) {
    await showHome();
    return;
  }

  loading.value = true;
  errorMessage.value = "";
  selectedFolder.value = "";
  viewMode.value = "search";

  try {
    songs.value = await loadSongPages({ keyword: nextKeyword });
  } catch {
    errorMessage.value = "后端服务未连接";
  } finally {
    loading.value = false;
  }
}

async function loadAllSongs(forceReload = false) {
  if (allSongs.value.length && !forceReload) {
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    allSongs.value = await loadSongPages();
  } catch {
    errorMessage.value = "后端服务未连接";
  } finally {
    loading.value = false;
  }
}

async function loadFavorites(forceReload = false) {
  if (favoritesLoaded.value && !forceReload) {
    return;
  }

  const shouldSurfaceError = viewMode.value === "favorites";

  if (shouldSurfaceError) {
    loading.value = true;
    errorMessage.value = "";
  }

  try {
    favoriteSongs.value = await loadFavoritePages();
    favoriteIds.value = new Set(favoriteSongs.value.map((song) => song.id));
    favoritesLoaded.value = true;
  } catch {
    if (shouldSurfaceError) {
      errorMessage.value = "收藏列表加载失败";
    }
  } finally {
    if (shouldSurfaceError) {
      loading.value = false;
    }
  }
}

async function loadSongPages(options: { keyword?: string; folder?: string } = {}) {
  const loadedSongs: Song[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const requestParams: SongListParams = {
      page,
      pageSize: REQUEST_PAGE_SIZE,
      ...(options.folder ? { folder: options.folder } : {})
    };
    const result = options.keyword
      ? await searchSongs(options.keyword, requestParams)
      : await fetchSongs(requestParams);

    loadedSongs.push(...result.data);
    totalPages = result.pagination.totalPages || 1;
    page += 1;
  } while (page <= totalPages);

  return loadedSongs;
}

async function loadFavoritePages() {
  const loadedSongs: Song[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const result = await fetchFavoriteSongs({
      page,
      pageSize: REQUEST_PAGE_SIZE
    });

    loadedSongs.push(...result.data);
    totalPages = result.pagination.totalPages || 1;
    page += 1;
  } while (page <= totalPages);

  return loadedSongs;
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

function isFavorite(songId: string) {
  return favoriteIds.value.has(songId);
}

async function toggleFavorite(song: Song) {
  const wasFavorite = isFavorite(song.id);
  const previousIds = new Set(favoriteIds.value);
  const previousFavoriteSongs = favoriteSongs.value;
  const nextIds = new Set(favoriteIds.value);

  if (wasFavorite) {
    nextIds.delete(song.id);
    favoriteSongs.value = favoriteSongs.value.filter((favoriteSong) => favoriteSong.id !== song.id);
  } else {
    nextIds.add(song.id);
    favoriteSongs.value = [song, ...favoriteSongs.value.filter((favoriteSong) => favoriteSong.id !== song.id)];
  }

  favoriteIds.value = nextIds;
  syncFavoriteViewSongs();

  try {
    if (wasFavorite) {
      await removeFavoriteSong(song.id);
      return;
    }

    await addFavoriteSong(song.id);
  } catch {
    favoriteIds.value = previousIds;
    favoriteSongs.value = previousFavoriteSongs;
    syncFavoriteViewSongs();
    errorMessage.value = "收藏操作失败，请稍后再试";
  }
}

function toggleCurrentFavorite() {
  if (player.currentSong) {
    void toggleFavorite(player.currentSong);
  }
}

function syncFavoriteViewSongs() {
  if (viewMode.value === "favorites") {
    songs.value = favoriteSongs.value;
  }
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
        <button class="nav-item" :class="{ 'nav-item--active': viewMode === 'home' }" type="button" title="首页" @click="showHome()">
          <Home :size="20" />
          <span>首页</span>
        </button>
        <button
          class="nav-item"
          :class="{ 'nav-item--active': viewMode === 'library' || viewMode === 'folder' }"
          type="button"
          title="歌曲库"
          @click="showLibrary()"
        >
          <Music2 :size="20" />
          <span>歌曲库</span>
        </button>
        <button class="nav-item" :class="{ 'nav-item--active': viewMode === 'favorites' }" type="button" title="收藏" @click="showFavorites()">
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
          <input v-model="keyword" type="search" placeholder="搜索歌曲、文件夹或歌手" @keyup.enter="runSearch" />
        </div>
        <button class="primary-action" type="button" @click="runSearch">
          <Search :size="18" />
          <span>搜索</span>
        </button>
      </header>

      <section class="hero-band">
        <div>
          <p class="eyebrow">Local Library</p>
          <h1>{{ heroTitle }}</h1>
          <p>{{ heroDescription }}</p>
        </div>
        <div class="hero-stats">
          <span>{{ heroCount }}</span>
          <small>{{ heroCountLabel }}</small>
        </div>
      </section>

      <section class="content-section">
        <div class="section-heading">
          <h2>{{ viewTitle }}</h2>
          <div class="section-actions">
            <button
              v-if="viewMode !== 'library'"
              class="play-all-button"
              type="button"
              :disabled="!songs.length"
              title="最多加入 500 首"
              @click="playAllSongs"
            >
              <Play :size="18" fill="currentColor" />
              <span>播放全部</span>
            </button>
            <button class="icon-button" type="button" title="刷新" @click="refreshCurrentView">
              <LoaderCircle :class="{ spinning: loading }" :size="20" />
            </button>
          </div>
        </div>

        <div v-if="errorMessage" class="empty-state">{{ errorMessage }}</div>
        <div v-else-if="viewMode === 'library'" class="folder-grid">
          <button v-for="folder in folderGroups" :key="folder.name" class="folder-card" type="button" @click="openFolder(folder.name)">
            <span class="folder-card__cover">
              <Music2 :size="28" />
            </span>
            <span class="folder-card__body">
              <strong>{{ folder.name }}</strong>
              <small>{{ folder.count }} 首歌曲</small>
            </span>
          </button>
        </div>
        <div v-else-if="!songs.length" class="empty-state">{{ emptyStateText }}</div>
        <div v-else class="song-list">
          <div class="song-list__head" aria-hidden="true">
            <span>#</span>
            <span>标题</span>
            <span>专辑</span>
            <span>喜欢</span>
            <span>时长</span>
          </div>

          <div
            v-for="(song, index) in songs"
            :key="song.id"
            class="song-row"
            :class="{ 'song-row--active': player.currentSong?.id === song.id }"
            role="button"
            tabindex="0"
            @click="playSong(song)"
            @keydown.enter.self="playSong(song)"
            @keydown.space.self.prevent="playSong(song)"
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
            <button
              class="song-row__like"
              :class="{ 'song-row__like--active': isFavorite(song.id) }"
              type="button"
              :title="isFavorite(song.id) ? '取消收藏' : '收藏'"
              @click.stop="toggleFavorite(song)"
            >
              <Heart :size="20" :fill="isFavorite(song.id) ? 'currentColor' : 'none'" />
            </button>
            <span class="song-row__duration">{{ formatDuration(song.duration) }}</span>
          </div>
        </div>
      </section>
    </main>

    <section v-if="showPlayerDetail && player.currentSong" class="player-detail" aria-label="播放详情页">
      <button class="detail-close" type="button" title="返回首页" @click="closePlayerDetail">
        <ChevronDown :size="24" />
      </button>

      <div class="detail-stage">
        <div class="record-stage" :class="{ 'record-stage--playing': player.isPlaying }">
          <div class="tonearm" aria-hidden="true">
            <img class="tonearm__image" :src="tonearmUrl" alt="" />
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
          <p>当前播放列表最多保留 500 首</p>
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

      <div class="player-tools">
        <button
          class="icon-button"
          :class="{ 'icon-button--active': player.currentSong && isFavorite(player.currentSong.id) }"
          type="button"
          :disabled="!player.currentSong"
          :title="player.currentSong && isFavorite(player.currentSong.id) ? '取消收藏当前歌曲' : '收藏当前歌曲'"
          @click="toggleCurrentFavorite"
        >
          <Heart
            :size="22"
            :fill="player.currentSong && isFavorite(player.currentSong.id) ? 'currentColor' : 'none'"
          />
        </button>

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
