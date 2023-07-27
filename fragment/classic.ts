export {};

declare global {
  interface Window {
    detail?: typeof detailClick;
  }
}

const detailClick = (id: string) => {
  const el = document.getElementById(`${id}-detail`)!;
  el.style.display = (el.style.display !== "block") ? "block" : "none";
}

window.detail = detailClick;
