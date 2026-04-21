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

// 모바일 기기 체크
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// 전역 변수 설정
let player;
let isApiLoaded = false;
let currentPlaylist = [];
let isPlaying = false;
let currentPlayingId = null;

// 모바일이면 전체 재생 버튼 숨기기
if (isMobile) {
  const playAllBtn = document.getElementById("playAllInternal");
  if (playAllBtn) playAllBtn.style.display = "none";
}

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
}

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
  } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
    isPlaying = false;
    if (mainPlayBtn) mainPlayBtn.className = "fa-solid fa-play";
    updatePlayButtons();
  }
}

// 상단 플레이어 바 UI 업데이트
function updatePlayerBarUI() {
  const currentSong = currentPlaylist.find(s => s.id === currentPlayingId);
  if (currentSong) {
    document.getElementById("playerBar").style.display = "flex";
    document.getElementById("currentCover").src = currentSong.cover;
    document.getElementById("currentTitle").innerText = currentSong.title;
    document.getElementById("currentAlbum").innerText = `${currentSong.album} · ${currentSong.year}`;
  }
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
