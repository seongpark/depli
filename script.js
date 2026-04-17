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
      
      if (!keyword.classList.contains("selected") && selectedButtons.length >= 3) {
        if (limitModal) limitModal.show();
        return;
      }
      
      keyword.classList.toggle("selected");
    });
  });

  // 키워드 처리
  const createBtn = document.getElementById("createPlaylist");
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      const selectedIds = [];
      const selectedButtons = document.querySelectorAll(".keyword.selected");

      if (selectedButtons.length === 0) {
        alert("최소 1개의 키워드를 선택해야 합니다.");
        return;
      }

      selectedButtons.forEach((button, index) => {
        selectedIds.push(`keyword${index + 1}=${button.id}`);
      });

      const queryString = selectedIds.join("&");
      window.location.href = `result.html?${queryString}`;
    });
  }
});
