// GET 키워드 받아오기
const urlParams = new URLSearchParams(window.location.search);
const keywords = [];
for (let i = 1; i <= 3; i++) {
  const keyword = urlParams.get(`keyword${i}`);
  if (keyword) {
    keywords.push(keyword);
  }
}

// 배열 랜덤 섞기 함수
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// 노래 데이터 가져오기
async function fetchSongs() {
  const response = await fetch("song.json");
  const data = await response.json();
  return data.songs;
}

// 완전 일치 키워드로 필터링 + 랜덤 정렬
async function filterSongsByAllKeywords(keywords) {
  const songs = await fetchSongs();
  const filtered = songs.filter((song) =>
    keywords.every((keyword) => song.keywords.includes(keyword))
  );
  return shuffleArray(filtered);
}

// 일부 키워드(2,3번)로 필터링 + 랜덤 정렬
async function filterSongsByAnyKeyword2Or3(keywords) {
  const songs = await fetchSongs();
  const filtered = songs.filter((song) =>
    keywords.some((keyword) => song.keywords.includes(keyword))
  );
  return shuffleArray(filtered);
}

// 필터된 노래들 출력
async function displayFilteredSongs() {
  const songDetail = document.getElementById("songDetail");
  const similarDetail = document.getElementById("similarDetail");
  const songDetailAlert = document.getElementById("songDetailAlert");

  songDetailAlert.style.display = "none";

  const filteredSongs = await filterSongsByAllKeywords(keywords);
  const songListContainer = document.getElementById("songList");
  songListContainer.innerHTML = "";

  if (filteredSongs.length > 0) {
    songDetail.style.display = "block";

    filteredSongs.forEach((song) => {
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
          <button onclick="playVideoWithId('${song.id}', this)" class="play"><i class="fa-solid fa-play"></i></button>
        </div>
      `;
      songListContainer.appendChild(songDiv);
    });
  } else {
    songDetail.style.display = "none";
    songDetailAlert.style.display = "block";
  }

  const filteredSongsByAnyKeyword2Or3 = await filterSongsByAnyKeyword2Or3(
    keywords.slice(1)
  );
  const similarSongContainer = document.getElementById("similarSong");
  similarSongContainer.innerHTML = "";

  if (filteredSongsByAnyKeyword2Or3.length > 0) {
    similarDetail.style.display = "block";

    filteredSongsByAnyKeyword2Or3.forEach((song) => {
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
          <button onclick="playVideoWithId('${song.id}', this)" class="play"><i class="fa-solid fa-play"></i></button>
        </div>
      `;
      similarSongContainer.appendChild(songDiv);
    });
  } else {
    similarDetail.style.display = "none";
  }

  // 갯수와 시간 출력
  const countSongs = document.getElementById("count");
  const countTime = document.getElementById("time");
  const value = filteredSongs.length + filteredSongsByAnyKeyword2Or3.length;
  countSongs.innerHTML = value;

  const time = value * 3;
  if (time > 60) {
    countTime.innerHTML = Math.round(time / 60) + "시간";
  } else {
    countTime.innerHTML = time + "분";
  }
}

displayFilteredSongs();

// 유튜브 영상 재생
let player;
let currentPlayerId;

function refreshPage() {
  location.reload();
}

function playVideoWithId(videoId, button) {
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    window.location.href = "https://www.youtube.com/watch?v=" + videoId;
  } else {
    let isPlaying = false;
    var tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    function onPlayerReady(event) {
      event.target.setPlaybackQuality("small");
      player = event.target;
      button.innerHTML = `<i class="fa-solid fa-pause"></i>`;
      currentPlayerId = button.id;
      isPlaying = true;
    }

    function onPlayerStateChange(event) {
      isPlaying = event.data === YT.PlayerState.PLAYING;
    }

    window.onYouTubeIframeAPIReady = function () {
      player = new YT.Player("player", {
        height: "0",
        width: "0",
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          showinfo: 0,
          modestbranding: 1,
          loop: 1,
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

    if (!/iPhone|iPod/.test(navigator.userAgent)) {
      button.onclick = refreshPage;
    }
  }
}

// 플레이리스트 버튼 클릭 시 모달 표시
document.getElementById("makepli").addEventListener("click", function () {
  const modal = new bootstrap.Modal(document.getElementById("exportModal"));
  modal.show();
});

// 유튜브로 내보내기 핵심 로직
async function exportToYouTube(type) {
  const filteredSongs = await filterSongsByAllKeywords(keywords);
  let songsToExport = [];

  if (type === "all") {
    const filteredSongsByAnyKeyword2Or3 = await filterSongsByAnyKeyword2Or3(
      keywords.slice(1)
    );
    const allSongs = [...filteredSongs, ...filteredSongsByAnyKeyword2Or3];
    // 중복 제거
    songsToExport = Array.from(new Set(allSongs.map(s => s.id)))
      .map(id => allSongs.find(s => s.id === id));
  } else {
    songsToExport = filteredSongs;
  }

  if (songsToExport.length >= 1) {
    const chunkSize = 50;
    const songChunks = [];
    for (let i = 0; i < songsToExport.length; i += chunkSize) {
      songChunks.push(songsToExport.slice(i, i + chunkSize));
    }

    songChunks.forEach((chunk, index) => {
      const videoIds = chunk.map((song) => song.id).join(",");
      const playlistUrl = `https://www.youtube.com/watch_videos?video_ids=${videoIds}`;

      setTimeout(() => {
        window.open(playlistUrl, "_blank");
      }, index * 1000);
    });
  } else {
    alert("내보낼 노래가 없습니다!");
  }

  // 모달 닫기
  const modalElement = document.getElementById("exportModal");
  const modal = bootstrap.Modal.getInstance(modalElement);
  if (modal) {
    modal.hide();
  }
}

// 모달 버튼 이벤트 리스너
document.getElementById("exportAll").addEventListener("click", () => exportToYouTube("all"));
document.getElementById("exportExact").addEventListener("click", () => exportToYouTube("exact"));
