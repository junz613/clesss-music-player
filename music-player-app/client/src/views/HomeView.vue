<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  ChevronDown,
  Heart,
  Home,
  ListMusic,
  LoaderCircle,
  Mic2,
  Music2,
  Pause,
  Play,
  Search,
  Settings,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2
} from "lucide-vue-next";

import { fetchSongs, searchSongs, type Song } from "../api/songs";
import logoUrl from "../assets/clesss-logo.jpg";
import { usePlayerStore } from "../stores/player";

const player = usePlayerStore();
const songs = ref<Song[]>([]);
const keyword = ref("");
const loading = ref(false);
const errorMessage = ref("");
const showPlayerDetail = ref(false);

const highlightedSongs = computed(() => songs.value.slice(0, 6));
const libraryCount = computed(() => songs.value.length);

onMounted(() => {
  void loadSongs();
});

// Search and initial loading are both backed by the server, keeping local filtering out of the UI layer.
async function loadSongs() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const result = keyword.value.trim()
      ? await searchSongs(keyword.value.trim(), 36)
      : await fetchSongs(36);

    songs.value = result.data;
  } catch {
    errorMessage.value = "后端服务未连接";
  } finally {
    loading.value = false;
  }
}

function playSong(song: Song) {
  player.play(song, songs.value);
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

function formatDuration(duration: number | null) {
  if (!duration) {
    return "--:--";
  }

  const minutes = Math.floor(duration / 60);
  const seconds = String(duration % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
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
          <span>本地歌单</span>
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
          <button class="icon-button" type="button" title="刷新" @click="loadSongs">
            <LoaderCircle :class="{ spinning: loading }" :size="20" />
          </button>
        </div>

        <div v-if="errorMessage" class="empty-state">{{ errorMessage }}</div>
        <div v-else class="song-grid">
          <button v-for="song in songs" :key="song.id" class="song-card" type="button" @click="playSong(song)">
            <span class="song-card__cover">
              <Mic2 :size="28" />
            </span>
            <span class="song-card__body">
              <strong>{{ song.title }}</strong>
              <span>{{ song.artist || song.folder }}</span>
            </span>
            <span class="song-card__meta">{{ formatDuration(song.duration) }}</span>
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
        <button class="icon-button" type="button" title="随机播放">
          <Shuffle :size="20" />
        </button>
        <button class="icon-button" type="button" title="上一首">
          <SkipBack :size="22" />
        </button>
        <button class="play-button" type="button" title="播放/暂停" @click="player.togglePlaying">
          <Pause v-if="player.isPlaying" :size="28" fill="currentColor" />
          <Play v-else :size="28" fill="currentColor" />
        </button>
        <button class="icon-button" type="button" title="下一首">
          <SkipForward :size="22" />
        </button>
        <button class="icon-button" type="button" title="播放队列">
          <ListMusic :size="22" />
        </button>
      </div>

      <div class="volume-zone">
        <Volume2 :size="22" />
        <span class="volume-line"></span>
      </div>
    </footer>
  </div>
</template>
