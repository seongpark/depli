document.addEventListener("DOMContentLoaded", () => {
  const keywords = document.querySelectorAll(".keyword");
  const limitModalElement = document.getElementById('limitModal');
  let limitModal;

  if (limitModalElement) {
    limitModal = new bootstrap.Modal(limitModalElement);
  }

  keywords.forEach((keyword) => {
    keyword.addEventListener("click", () => {
      const selectedButtons = document.querySelectorAll(".keyword.selected");
      
      // 콘서트 버튼들 (id가 concert_로 시작하는 것들)
      const isConcertButton = keyword.id.startsWith("concert_");

      if (!keyword.classList.contains("selected")) {
        // 새로 선택하려는 경우
        if (selectedButtons.length >= 3) {
          if (limitModal) limitModal.show();
          return;
        }

        // 콘서트 버튼을 선택하면 다른 모든 선택 해제 (콘서트는 하나만 선택 가능)
        if (isConcertButton) {
          selectedButtons.forEach(btn => btn.classList.remove("selected"));
        } else {
          // 일반 키워드 선택 시 이미 선택된 콘서트가 있으면 해제
          selectedButtons.forEach(btn => {
            if (btn.id.startsWith("concert_")) btn.classList.remove("selected");
          });
        }
      }
      
      keyword.classList.toggle("selected");
    });
  });

  // 키워드 및 콘서트 처리
  const createBtn = document.getElementById("createPlaylist");
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      const selectedButtons = document.querySelectorAll(".keyword.selected");

      if (selectedButtons.length === 0) {
        alert("최소 1개의 키워드 또는 콘서트를 선택해야 합니다.");
        return;
      }

      // 선택된 항목 중 콘서트가 있는지 확인
      const selectedConcert = Array.from(selectedButtons).find(btn => btn.id.startsWith("concert_"));

      if (selectedConcert) {
        // 콘서트 타입 추출 (id에서 concert_ 뒷부분만 가져옴)
        const concertType = selectedConcert.id.replace("concert_", "");
        window.location.href = `result.html?type=${concertType}`;
      } else {
        // 일반 키워드 처리
        const selectedIds = [];
        selectedButtons.forEach((button, index) => {
          selectedIds.push(`keyword${index + 1}=${button.id}`);
        });
        const queryString = selectedIds.join("&");
        window.location.href = `result.html?${queryString}`;
      }
    });
  }
});
