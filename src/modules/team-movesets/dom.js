export const movesetBadgeLabel = marker => `M${Math.max(1, Number(marker) || 1)}`;

export function createMoveIcon(doc, move) {
  const image = doc.createElement("img");
  const map = doc.defaultView?.POKEIDLE_MOVE_ICON_MAP;
  const source = String(map?.[move.id] || move.id || "").trim();
  const direct = /^(?:data:|blob:|https?:|\/|\.\.?\/)/i.test(source) || source.includes("/");
  image.src = direct ? source : `img/moves/${encodeURIComponent(source)}.png`;
  image.alt = "";
  image.loading = "lazy";
  image.onerror = () => { image.hidden = true; };
  return image;
}
