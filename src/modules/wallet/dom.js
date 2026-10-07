import { walletConfig as config } from "./config.js";

const balance = value => {
  if (typeof value !== "number" && !(typeof value === "string" && value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};
const identity = value => typeof value === "string" ? value.trim()
  : typeof value === "number" && Number.isFinite(value) ? String(value) : "";

export function readWalletAuthority(doc, owner) {
  const hud = doc.defaultView?.PokeIdle?.PersistentHud?._teamHud;
  const wallet = hud?._walletEl, team = hud?.el;
  if (!owner || identity(hud?._trainer?.id) !== owner || !team?.isConnected ||
      !team.matches(config.selectors.team) || !wallet?.isConnected || !wallet.matches(config.selectors.nativeWallet)) return null;
  return { gold:balance(hud._trainer.gold), diamonds:balance(hud._trainer.diamonds),
    team, wallet, header:team.querySelector(config.selectors.trainerHeader),
    info:team.querySelector(config.selectors.trainerInfo),
    diamondIcon:hud._walletDiamondItem?.querySelector(config.selectors.currencyIcon) || null };
}

export function walletIcon(doc) {
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [key,value] of Object.entries({viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"1.7","stroke-linecap":"round","stroke-linejoin":"round","aria-hidden":"true"})) svg.setAttribute(key,value);
  svg.setAttribute("class","pokeidle-top-toolbar__icon ppbui-wallet-icon");
  const path = doc.createElementNS(svg.namespaceURI,"path");
  path.setAttribute("d","M4 6V4h14v3M4 6h16v15H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm16 6h-6v5h6M16 14.5h.1");
  svg.append(path);
  return svg;
}
