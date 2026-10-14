import { professionsHudConfig as config } from "./config.js";

function sceneCandidates(doc) {
  const win = doc?.defaultView;
  const cached = win?.PokeIdle?.ReactiveWindows?.cached?.();
  const active = win?.SceneManager?._scene;
  return [active, ...(Array.isArray(cached) ? cached : [])]
    .filter((scene, index, list) => scene && list.indexOf(scene) === index);
}

export function findProfessionsWorkforce(doc = document) {
  const activeBody = doc.defaultView?.SceneManager?._scene?._panel?.body;
  const activeRoot = activeBody?.querySelector?.(config.selectors.root);
  if (activeRoot) return activeRoot;
  return [...doc.querySelectorAll(config.selectors.root)]
    .find(root => !root.closest("[hidden]")) || null;
}

export function professionKind(root) {
  if (!root) return "";
  const panel = root.closest(".prof-workforce");
  if (panel?.querySelector(".prof-work-stage.miner")) return "miner";
  if (panel?.querySelector(".prof-work-stage.farmer")) return "farmer";
  const mapKind = root.ownerDocument?.defaultView?.PokeIdle?.ProfessionWorkforceMaps?.mapKind?.();
  return mapKind === "miner" || mapKind === "farmer" ? mapKind : "";
}

export function findProfessionsScene(root) {
  if (!root) return null;
  return sceneCandidates(root.ownerDocument).find(scene =>
    typeof scene.reloadWorkforce === "function" && scene._panel?.body?.contains?.(root)
  ) || null;
}
