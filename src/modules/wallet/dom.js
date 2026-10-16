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
