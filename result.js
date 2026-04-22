// GET 파라미터 받아오기
const urlParams = new URLSearchParams(window.location.search);
const keywords = [];
for (let i = 1; i <= 3; i++) {
  const keyword = urlParams.get(`keyword${i}`);
  if (keyword) {
    keywords.push(keyword);
  }
}
const pageType = urlParams.get("type"); // 'concert', 'thepresent25' 등 여부 확인

// 전역 변수 설정
let player;
let isApiLoaded = false;
let currentPlaylist = [];
let isPlaying = false;
let currentPlayingId = null;
let progressInterval;
let syncedLyricsLines = [];
let activeLyricIndex = -1;

// YouTube API 스크립트 로드
const tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// API 준비 완료 콜백
window.onYouTubeIframeAPIReady = function () {
  isApiLoaded = true;
  player = new YT.Player("player", {
    height: "0",
    width: "0",
    playerVars: {
      autoplay: 0,
      controls: 0,
      showinfo: 0,
      modestbranding: 1,
      loop: 0,
      fs: 0,
      cc_load_policy: 0,
      iv_load_policy: 3,
      autohide: 0,
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
    },
  });
};

function onPlayerReady(event) {
  event.target.setPlaybackQuality("small");
  // 초기 볼륨 설정 및 UI 업데이트
  const initialVolume = player.getVolume();
  updateVolumeUI(initialVolume);
}

// 볼륨 조절 관련 함수
function updateVolumeUI(volume) {
  const volumeBar = document.getElementById("volumeSliderBar");
  const volumeIcon = document.getElementById("volumeIcon");
  
  if (volumeBar) {
    volumeBar.style.width = volume + "%";
  }
  
  if (volumeIcon) {
    if (volume === 0) {
      volumeIcon.className = "fa-solid fa-volume-xmark";
    } else if (volume < 50) {
      volumeIcon.className = "fa-solid fa-volume-low";
    } else {
      volumeIcon.className = "fa-solid fa-volume-high";
    }
  }
}

// 볼륨 조절 로직 (드래그 및 클릭)
const volumeContainer = document.getElementById("volumeSliderContainer");
let isDraggingVolume = false;

function handleVolumeAction(e) {
  if (!player || !player.setVolume) return;
  
  const rect = volumeContainer.getBoundingClientRect();
  const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
  let x = clientX - rect.left;
  const width = rect.width;
  
  // 범위 제한 (0 ~ 100%)
  x = Math.max(0, Math.min(x, width));
  const newVolume = Math.round((x / width) * 100);
  
  player.setVolume(newVolume);
  updateVolumeUI(newVolume);
}

volumeContainer.addEventListener("mousedown", (e) => {
  isDraggingVolume = true;
  handleVolumeAction(e);
});

volumeContainer.addEventListener("touchstart", (e) => {
  isDraggingVolume = true;
  handleVolumeAction(e);
}, { passive: false });

window.addEventListener("mousemove", (e) => {
  if (isDraggingVolume) handleVolumeAction(e);
});

window.addEventListener("touchmove", (e) => {
  if (isDraggingVolume) {
    handleVolumeAction(e);
    e.preventDefault(); // 스크롤 방지
  }
}, { passive: false });

window.addEventListener("mouseup", () => {
  isDraggingVolume = false;
});

window.addEventListener("touchend", () => {
  isDraggingVolume = false;
});

function onPlayerStateChange(event) {
  const mainPlayBtn = document.getElementById("mainPlayBtn");
  
  if (event.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    if (player.getVideoData && player.getVideoData().video_id) {
      currentPlayingId = player.getVideoData().video_id;
      updatePlayerBarUI();
    }
    if (mainPlayBtn) mainPlayBtn.className = "fa-solid fa-pause";
    updatePlayButtons();
    startProgressTimer();
  } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
    isPlaying = false;
    if (mainPlayBtn) mainPlayBtn.className = "fa-solid fa-play";
    updatePlayButtons();
    stopProgressTimer();
  }
}

// 재생바 관련 함수
function startProgressTimer() {
  stopProgressTimer();
  progressInterval = setInterval(updateProgress, 1000);
}

function stopProgressTimer() {
  if (progressInterval) clearInterval(progressInterval);
}

function updateProgress() {
  if (player && player.getCurrentTime && player.getDuration) {
    const currentTime = player.getCurrentTime();
    const duration = player.getDuration();
    if (duration > 0) {
      const progressPercent = (currentTime / duration) * 100;
      document.getElementById("progressBar").style.width = progressPercent + "%";
    }
    updateActiveLyric(currentTime);
  }
}

// 재생바 클릭 시 탐색
document.getElementById("progressContainer").addEventListener("click", function(e) {
  if (player && player.getDuration) {
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const duration = player.getDuration();
    if (duration > 0) {
      const seekTo = (x / width) * duration;
      player.seekTo(seekTo, true);
      updateProgress();
    }
  }
});

// 상단 플레이어 바 UI 업데이트
function updatePlayerBarUI() {
  const currentSong = currentPlaylist.find(s => s.id === currentPlayingId);
  if (currentSong) {
    document.getElementById("playerBar").style.display = "flex";
    setRemakeButtonVisibility(false);
    document.getElementById("currentCover").src = currentSong.cover;
    document.getElementById("largeAlbumArt").src = currentSong.cover;
    document.getElementById("currentTitle").innerText = currentSong.title;
    document.getElementById("currentAlbum").innerText = `${currentSong.album} · ${currentSong.year}`;
    loadLyrics(currentPlayingId);
  }
}

async function loadLyrics(videoId) {
  const lyricsContainer = document.getElementById("lyricsContainer");
  if (!lyricsContainer) return;

  const currentSong = currentPlaylist.find(s => s.id === videoId);
  if (!currentSong) return;

  syncedLyricsLines = [];
  activeLyricIndex = -1;
  lyricsContainer.classList.remove("plain-lyrics");
  lyricsContainer.innerText = "가사를 불러오는 중...";

  try {
    // LRCLIB API 사용 (검색 쿼리: 노래 제목 + 아티스트)
    // 기본적으로 DAY6 노래이므로 "DAY6"를 추가하여 검색 정확도를 높임
    const query = encodeURIComponent(`${currentSong.title} DAY6`);
    const response = await fetch(`https://lrclib.net/api/search?q=${query}`);
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        const syncedLyrics = data[0].syncedLyrics;
        const plainLyrics = data[0].plainLyrics;

        if (syncedLyrics) {
          renderSyncedLyrics(syncedLyrics, lyricsContainer);
          updateActiveLyric(player && player.getCurrentTime ? player.getCurrentTime() : 0);
        } else if (plainLyrics) {
          renderPlainLyrics(plainLyrics, lyricsContainer);
        } else {
          lyricsContainer.innerText = "등록된 가사가 없습니다.";
        }
      } else {
        lyricsContainer.innerText = "등록된 가사가 없습니다.";
      }
    } else {
      lyricsContainer.innerText = "등록된 가사가 없습니다.";
    }
  } catch (error) {
    console.error("Lyrics API error:", error);
    lyricsContainer.innerText = "네트워크 오류로 가사를 불러오지 못했습니다.";
  }
}

function parseSyncedLyrics(syncedLyrics) {
  return syncedLyrics
    .split("\n")
    .map((line) => line.trim())
    .map((line) => {
      const match = line.match(/^\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)$/);
      if (!match) return null;

      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const fraction = match[3] ? Number(`0.${match[3]}`) : 0;

      return {
        time: (minutes * 60) + seconds + fraction,
        text: match[4].trim() || " ",
      };
    })
    .filter((line) => line && line.text);
}

function renderSyncedLyrics(syncedLyrics, lyricsContainer) {
  syncedLyricsLines = parseSyncedLyrics(syncedLyrics);
  activeLyricIndex = -1;
  lyricsContainer.classList.remove("plain-lyrics");

  if (syncedLyricsLines.length === 0) {
    lyricsContainer.innerText = "등록된 가사가 없습니다.";
    return;
  }

  lyricsContainer.innerHTML = "";

  syncedLyricsLines.forEach((line, index) => {
    const lineElement = document.createElement("div");
    lineElement.className = "lyric-line";
    lineElement.dataset.index = String(index);
    lineElement.textContent = line.text;
    lyricsContainer.appendChild(lineElement);
  });
}

function renderPlainLyrics(plainLyrics, lyricsContainer) {
  syncedLyricsLines = [];
  activeLyricIndex = -1;
  lyricsContainer.classList.add("plain-lyrics");
  lyricsContainer.innerHTML = "";

  plainLyrics
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line)
    .forEach((line) => {
      const lineElement = document.createElement("div");
      lineElement.className = "lyric-line";
      lineElement.textContent = line;
      lyricsContainer.appendChild(lineElement);
    });
}

function updateActiveLyric(currentTime) {
  const lyricsContainer = document.getElementById("lyricsContainer");
  if (!lyricsContainer || syncedLyricsLines.length === 0) return;

  let nextActiveIndex = -1;
  for (let i = 0; i < syncedLyricsLines.length; i++) {
    if (currentTime >= syncedLyricsLines[i].time) {
      nextActiveIndex = i;
    } else {
      break;
    }
  }

  if (nextActiveIndex === activeLyricIndex) return;

  const previousActive = lyricsContainer.querySelector(".lyric-line.active");
  if (previousActive) {
    previousActive.classList.remove("active");
  }

  activeLyricIndex = nextActiveIndex;

  if (activeLyricIndex < 0) return;

  const currentLine = lyricsContainer.querySelector(`[data-index="${activeLyricIndex}"]`);
  if (!currentLine) return;

  currentLine.classList.add("active");
  currentLine.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

function updatePlayButtons() {
  const allPlayButtons = document.querySelectorAll(".play");
  allPlayButtons.forEach(btn => {
    const videoId = btn.getAttribute("data-video-id");
    if (videoId === currentPlayingId && isPlaying) {
      btn.innerHTML = `<i class="fa-solid fa-pause"></i>`;
    } else {
      btn.innerHTML = `<i class="fa-solid fa-play"></i>`;
    }
  });
}

function setPlayerBarCoverVisibility(isVisible) {
  const currentCover = document.getElementById("currentCover");
  if (!currentCover) return;
  currentCover.style.display = isVisible ? "block" : "none";
}

function setRemakeButtonVisibility(isVisible) {
  const remakeButton = document.querySelector(".letsmake");
  if (!remakeButton) return;
  remakeButton.style.display = isVisible ? "" : "none";
}

// 플레이어 바 클릭 시 큰 앨범 아트 토글
document.getElementById("playerBar").addEventListener("click", function(e) {
  // 제어 버튼이나 재생바를 클릭한 경우에는 토글하지 않음
  if (e.target.closest(".player-controls") || e.target.closest(".progress-container")) return;
  
  const container = document.getElementById("albumArtContainer");
  if (container.classList.contains("show")) {
    container.classList.remove("show");
    setPlayerBarCoverVisibility(true);
    setTimeout(() => {
      if (!container.classList.contains("show")) {
        container.style.display = "none";
      }
    }, 300); // transition 시간과 동일하게 설정
  } else {
    container.style.display = "flex";
    setPlayerBarCoverVisibility(false);
    // display: flex가 적용된 직후에는 transition이 작동하지 않으므로 rAF 사용
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.classList.add("show");
      });
    });
  }
});

// 배열 랜덤 섞기 함수
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// 데이터 가져오기
async function fetchData() {
  const response = await fetch("song.json");
  return await response.json();
}

// 필터된 노래들 출력
async function displayFilteredSongs() {
  const songDetail = document.getElementById("songDetail");
  const similarDetail = document.getElementById("similarDetail");
  const songDetailAlert = document.getElementById("songDetailAlert");
  const songListContainer = document.getElementById("songList");
  const similarSongContainer = document.getElementById("similarSong");
  const h2Title = document.querySelector(".container h2.highlight");

  songDetailAlert.style.display = "none";
  songListContainer.innerHTML = "";
  similarSongContainer.innerHTML = "";

  const data = await fetchData();
  const allSongs = data.songs;

  // 콘서트 모드 체크
  const concertTypes = ["concert", "thepresent25", "foreveryoungfinale", "thepresent24", "welcometotheshow", "thedecade"];

  if (concertTypes.includes(pageType)) {
    // 제목 문구 변경
    if (h2Title) {
      h2Title.innerHTML = `콘서트의 감동을<br /><span style="color: #57c3c5">다시 한번</span> 돌아보기`;
    }

    // 콘서트 모드: 타입에 따라 다른 세트리스트 필드 선택
    let setlistStr = "";
    let concertLabel = "콘서트 세트리스트";

    if (pageType === "decade" || pageType === "concert") {
      setlistStr = data.concert_setlist;
      concertLabel = "The DECADE 세트리스트";
    } else if (pageType === "thepresent25") {
      setlistStr = data.concert_thepresent25;
      concertLabel = "The Present (2025) 세트리스트";
    } else if (pageType === "thedecade") {
      setlistStr = data.concert_thedecade;
      concertLabel = "The DECADE 세트리스트";
    } else if (pageType === "foreveryoungfinale") {
      setlistStr = data.concert_foreveryoungfinale;
      concertLabel = "FOREVER YOUNG FINALE 세트리스트";
    } else if (pageType === "thepresent24") {
      setlistStr = data.concert_thepresent24;
      concertLabel = "The Present (2024) 세트리스트";
    } else if (pageType === "welcometotheshow") {
      setlistStr = data.concert_welcometotheshow;
      concertLabel = "Welcome to the Show 세트리스트";
    }

    const setlist = setlistStr.split("\n").map(t => t.trim()).filter(t => t !== "");
    currentPlaylist = setlist.map(title => {
      return allSongs.find(s => s.title.toLowerCase() === title.toLowerCase());
    }).filter(s => s !== undefined);

    songDetail.innerHTML = `<i class="fa-solid fa-microphone-lines"></i> ${concertLabel}`;
    similarDetail.style.display = "none";

    currentPlaylist.forEach(song => {
      songListContainer.appendChild(createSongElement(song));
    });
  } else {
    // 일반 모드: 키워드 필터링
    const filteredSongs = shuffleArray(allSongs.filter((song) =>
      keywords.every((keyword) => song.keywords.includes(keyword))
    ));
    const filteredSimilar = shuffleArray(allSongs.filter((song) =>
      keywords.slice(1).some((keyword) => song.keywords.includes(keyword))
    ));

    const combined = [...filteredSongs, ...filteredSimilar];
    currentPlaylist = Array.from(new Set(combined.map(s => s.id)))
      .map(id => combined.find(s => s.id === id));

    if (filteredSongs.length > 0) {
      songDetail.style.display = "block";
      filteredSongs.forEach(song => songListContainer.appendChild(createSongElement(song)));
    } else {
      songDetail.style.display = "none";
      songDetailAlert.style.display = "block";
    }

    if (filteredSimilar.length > 0) {
      similarDetail.style.display = "block";
      filteredSimilar.forEach(song => similarSongContainer.appendChild(createSongElement(song)));
    } else {
      similarDetail.style.display = "none";
    }
  }

  // 곡 개수와 총 시간 계산
  const countSongs = document.getElementById("count");
  const countTime = document.getElementById("time");
  const value = currentPlaylist.length;
  countSongs.innerHTML = value;

  const time = value * 3;
  if (time > 60) {
    countTime.innerHTML = Math.round(time / 60) + "시간";
  } else {
    countTime.innerHTML = time + "분";
  }
}

function createSongElement(song) {
  const songDiv = document.createElement("div");
  songDiv.classList.add("song-list", "mb-3");
  songDiv.innerHTML = `
    <div style="display: flex; align-items: center;">
      <img src="${song.cover}" alt="${song.title} 앨범 커버" class="album" />
      <div style="margin-left: 10px;">
        <span style="font-size: 18px;" class="bold">${song.title}</span>
        <br />
        <span style="font-size: 13px;">${song.album} · ${song.year}</span>
      </div>
    </div>
    <div style="margin-left: auto;">
      <button onclick="toggleVideo('${song.id}')" class="play" data-video-id="${song.id}"><i class="fa-solid fa-play"></i></button>
    </div>
  `;
  return songDiv;
}

displayFilteredSongs();

// 비디오 재생/일시정지 토글
function toggleVideo(videoId) {
  if (!isApiLoaded || !player) return;

  if (currentPlayingId === videoId) {
    if (isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  } else {
    currentPlayingId = videoId;
    player.loadVideoById(videoId);
    player.playVideo();
    updatePlayerBarUI();
  }
}

// 상단 플레이어 조작 버튼
document.getElementById("mainPlayBtn").addEventListener("click", function() {
  if (!player) return;
  if (isPlaying) {
    player.pauseVideo();
  } else {
    player.playVideo();
  }
});

document.getElementById("nextBtn").addEventListener("click", function() {
  if (player && player.nextVideo) player.nextVideo();
});

document.getElementById("prevBtn").addEventListener("click", function() {
  if (player && player.previousVideo) player.previousVideo();
});

document.getElementById("closePlayerBtn").addEventListener("click", function() {
  if (player) {
    player.stopVideo();
    document.getElementById("playerBar").style.display = "none";
    setRemakeButtonVisibility(true);
    const container = document.getElementById("albumArtContainer");
    container.classList.remove("show");
    container.style.display = "none";
    setPlayerBarCoverVisibility(true);
    currentPlayingId = null;
    updatePlayButtons();
  }
});

// 전체 재생 버튼
document.getElementById("playAllInternal").addEventListener("click", function() {
  if (!isApiLoaded || !player || currentPlaylist.length === 0) return;
  
  const videoIds = currentPlaylist.map(song => song.id);
  currentPlayingId = videoIds[0];
  player.loadPlaylist(videoIds);
  player.setShuffle(false);
  player.playVideo();
  updatePlayerBarUI();
});

// 유튜브로 내보내기 모달
document.getElementById("makepli").addEventListener("click", function () {
  const modal = new bootstrap.Modal(document.getElementById("exportModal"));
  modal.show();
});

async function exportToYouTube(type) {
  let songsToExport = [];
  if (type === "all" || pageType === "concert" || pageType === "thepresent25") {
    songsToExport = currentPlaylist;
  } else {
    const data = await fetchData();
    const exactMatch = data.songs.filter((song) =>
      keywords.every((keyword) => song.keywords.includes(keyword))
    );
    songsToExport = exactMatch;
  }

  if (songsToExport.length >= 1) {
    const videoIds = songsToExport.map((song) => song.id).join(",");
    window.open(`https://www.youtube.com/watch_videos?video_ids=${videoIds}`, "_blank");
  } else {
    alert("내보낼 노래가 없습니다!");
  }
}

document.getElementById("exportAll").addEventListener("click", () => exportToYouTube("all"));
document.getElementById("exportExact").addEventListener("click", () => exportToYouTube("exact"));
