// Read both exposed identities during account rehydration; disagreement is not
// permission to borrow the previous trainer's layout.
export function readMenuLayoutOwner(win) {
  try {
    const pi = win?.PokeIdle, auth = pi?.Auth;
    if (typeof auth?.isAuthenticated === "function" && !auth.isAuthenticated()) return { owner:"", ownerLabel:"" };
    const hasSummary = typeof auth?.getTrainerSummary === "function";
    const summary = hasSummary ? auth.getTrainerSummary() : null;
    const clean = value => typeof value === "string" || (typeof value === "number" && Number.isFinite(value)) ? String(value).trim() : "";
    const authId = clean(summary?.id), presenceId = clean(pi?.WorldPresence?.getSelfTrainerId?.());
    if (hasSummary && !authId) return { owner:"", ownerLabel:"" };
    if (authId && presenceId && authId !== presenceId) return { owner:"", ownerLabel:"" };
    const owner = authId || presenceId;
    if (!owner || owner.length > 160) return { owner:"", ownerLabel:"" };
    const label = clean(summary?.name || summary?.username || summary?.trainer_name).slice(0, 100);
    return { owner, ownerLabel:label || owner };
  } catch { return { owner:"", ownerLabel:"" }; }
}
