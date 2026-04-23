document.addEventListener("DOMContentLoaded", () => {
  const keywords = document.querySelectorAll(".keyword");
  const limitModalElement = document.getElementById("limitModal");
  const iosInstallPrompt = document.getElementById("iosInstallPrompt");
  const iosInstallClose = document.getElementById("iosInstallClose");
  const iosInstallEyebrow = document.getElementById("iosInstallEyebrow");
  const iosInstallTitle = document.getElementById("iosInstallTitle");
  const iosInstallCopy = document.getElementById("iosInstallCopy");
  const iosInstallStep1 = document.getElementById("iosInstallStep1");
  const iosInstallStep2 = document.getElementById("iosInstallStep2");
  const iosInstallStep3 = document.getElementById("iosInstallStep3");
  const iosInstallFootnote = document.getElementById("iosInstallFootnote");
  let limitModal;

  const applyStandaloneClass = () => {
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    document.body.classList.toggle("standalone-pwa", isStandaloneMode);
  };

  const isIosDevice = () => {
    const userAgent = window.navigator.userAgent;
    const platform = window.navigator.platform;
    const maxTouchPoints = window.navigator.maxTouchPoints || 0;

    return (
      /iPhone|iPad|iPod/i.test(userAgent) ||
      (platform === "MacIntel" && maxTouchPoints > 1)
    );
  };

  const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  const isSafari = () => {
    const userAgent = window.navigator.userAgent;

    return /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS/i.test(userAgent);
  };

  const getDismissedState = () => {
    try {
      return window.sessionStorage.getItem("ios-install-prompt-dismissed");
    } catch (error) {
      return null;
    }
  };

  const setDismissedState = () => {
    try {
      window.sessionStorage.setItem("ios-install-prompt-dismissed", "true");
    } catch (error) {
      // Ignore storage failures and keep the prompt dismissible for this page view.
    }
  };

  const showIosInstallPrompt = () => {
    if (!iosInstallPrompt) return;

    const dismissed = getDismissedState();
    if (!isIosDevice() || isStandalone() || dismissed === "true") {
      return;
    }

    if (isSafari()) {
      if (iosInstallEyebrow) {
        iosInstallEyebrow.textContent = "더 편하게 사용할 수 있어요";
      }
      if (iosInstallTitle) {
        iosInstallTitle.textContent = "홈 화면에 데플리를 추가해 보세요";
      }
      if (iosInstallCopy) {
        iosInstallCopy.innerHTML =
          '앱처럼 홈 화면에 추가하여 사용할 수 있습니다.';
      }
      if (iosInstallStep1) {
        iosInstallStep1.textContent = "Safari 하단의 공유 버튼을 누르세요";
      }
      if (iosInstallStep2) {
        iosInstallStep2.innerHTML = "<strong>홈 화면에 추가</strong> 메뉴를 선택하세요";
      }
      if (iosInstallStep3) {
        iosInstallStep3.textContent = "모두 완료되었습니다.";
      }
      if (iosInstallFootnote) {
        iosInstallFootnote.textContent =
          "홈 화면에 추가하면 하단 바 가림 현상이 없어지고 훨씬 안정적입니다.";
      }
    } else {
      if (iosInstallEyebrow) {
        iosInstallEyebrow.textContent = "더 좋은 방법이 있어요";
      }
      if (iosInstallTitle) {
        iosInstallTitle.textContent = "Safari에서 홈 화면에 추가할 수 있습니다";
      }
      if (iosInstallCopy) {
        iosInstallCopy.innerHTML =
          "지금 사용 중인 브라우저에서는 홈 화면 추가가 원활하지 않을 수 있습니다. Safari 브라우저로 연 뒤 데플리를 홈 화면에 추가하면 훨씬 안정적으로 사용할 수 있습니다.";
      }
      if (iosInstallStep1) {
        iosInstallStep1.textContent = "지금 보고 계신 주소를 복사해 주세요";
      }
      if (iosInstallStep2) {
        iosInstallStep2.innerHTML =
          'Safari 브라우저를 열고 주소를 붙여넣어 접속하세요';
      }
      if (iosInstallStep3) {
        iosInstallStep3.textContent = "Safari 공유 메뉴에서 '홈 화면에 추가'를 누르면 끝!";
      }
      if (iosInstallFootnote) {
        iosInstallFootnote.textContent =
          "앱처럼 설치해서 사용하시면 훨씬 더 매끄러운 환경을 제공해 드립니다.";
      }
    }

    iosInstallPrompt.hidden = false;
    document.body.classList.add("has-ios-install-prompt");
  };

  const dismissIosInstallPrompt = () => {
    if (!iosInstallPrompt) return;

    iosInstallPrompt.hidden = true;
    document.body.classList.remove("has-ios-install-prompt");
    setDismissedState();
  };

  if (limitModalElement) {
    limitModal = new bootstrap.Modal(limitModalElement);
  }

  applyStandaloneClass();

  if (iosInstallClose) {
    iosInstallClose.addEventListener("click", dismissIosInstallPrompt);
  }

  showIosInstallPrompt();

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
          selectedButtons.forEach((btn) => btn.classList.remove("selected"));
        } else {
          // 일반 키워드 선택 시 이미 선택된 콘서트가 있으면 해제
          selectedButtons.forEach((btn) => {
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
      const selectedConcert = Array.from(selectedButtons).find((btn) =>
        btn.id.startsWith("concert_")
      );

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
