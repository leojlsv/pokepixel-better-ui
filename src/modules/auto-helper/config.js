export const autoHelperConfig = {
  id: "auto-helper",
  selectors: {
    root: ".auto-helper-panel", body: ".pokeidle-panel__body", grid: ".auto-helper-grid",
    section: ":scope > .auto-helper-section", heading: ":scope > h3", notes: ":scope > .auto-helper-note", check: 'input[type="checkbox"]',
    select: "select", names: 'input[type="text"]', picker: ".auto-capsule-grid",
    quality: '.auto-sell-qualities input', qualityGrid: ".auto-sell-qualities", rarityGrid: ".auto-helper-rarity-grid",
    status: ":scope > .auto-helper-save-state", time: ".auto-sell-time", lock: ".auto-capture-lock",
  },
};
const copy = {
  pt: ["Auto Helper", "Organiza controles, recursos e salvamento do assistente nativo.", "Suporte", "Captura", "Destino dos Pokémon", "Salvo", "Alterações pendentes", "Salvando…", "Falha ao salvar", "Tentar novamente", "Atualizar recursos", "Ativado", "Desativado", "Indisponível", "Sem recurso compatível", "Selecionado", "Qualidade", "Manter", "Vender", "Extrair", "Selecione o destino de cada qualidade. As opções só se aplicam quando a função correspondente está ativada.", "Não disponível no inventário", "Recursos atualizados", "Falha ao atualizar recursos", "Carregando interface…"],
  en: ["Auto Helper", "Organizes native helper controls, resources and saving.", "Support", "Capture", "Pokémon destination", "Saved", "Unsaved changes", "Saving…", "Save failed", "Retry", "Refresh resources", "Enabled", "Disabled", "Unavailable", "No compatible resource", "Selected", "Quality", "Keep", "Sell", "Extract", "Choose one destination per quality. Options apply only while the corresponding function is enabled.", "Unavailable in inventory", "Resources updated", "Resource refresh failed", "Loading interface…"],
  es: ["Auto Helper", "Organiza controles, recursos y guardado del asistente nativo.", "Apoyo", "Captura", "Destino de Pokémon", "Guardado", "Cambios pendientes", "Guardando…", "Error al guardar", "Reintentar", "Actualizar recursos", "Activado", "Desactivado", "No disponible", "Sin recurso compatible", "Seleccionado", "Calidad", "Conservar", "Vender", "Extraer", "Elige un destino por calidad. Solo se aplica si la función correspondiente está activada.", "No disponible en el inventario", "Recursos actualizados", "Error al actualizar recursos", "Cargando interfaz…"],
  zh: ["Auto Helper", "整理原生助手的控件、资源和保存状态。", "支援", "捕捉", "宝可梦去向", "已保存", "未保存的更改", "保存中…", "保存失败", "重试", "刷新资源", "已启用", "已禁用", "不可用", "没有可用道具", "已选择", "品质", "保留", "出售", "提取", "为每种品质选择一个去向，仅在相应功能启用时生效。", "背包中不可用", "资源已更新", "资源刷新失败", "正在加载界面…"],
};
export function autoHelperText(doc = document) {
  const lang = doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "en";
  const keys = ["name", "description", "support", "capture", "destination", "saved", "pending", "saving", "error", "retry", "refresh", "enabled", "disabled", "unavailable", "empty", "selected", "quality", "keep", "sell", "extract", "destinationNote", "missing", "refreshed", "refreshError", "loading"];
  const extra = {
    pt: {function:"Função", resource:"Consumível", condition:"Condição", paused:"pausado", details:"Como funciona", ballFallback:"Normal", ballFallbackHint:"Fallback", ballMissing:"Sem estoque"},
    en: {function:"Function", resource:"Consumable", condition:"Condition", paused:"paused", details:"How it works", ballFallback:"Normal", ballFallbackHint:"Fallback", ballMissing:"Out of stock"},
    es: {function:"Función", resource:"Consumible", condition:"Condición", paused:"en pausa", details:"Cómo funciona", ballFallback:"Normal", ballFallbackHint:"Fallback", ballMissing:"Sin stock"},
    zh: {function:"功能", resource:"消耗品", condition:"条件", paused:"已暂停", details:"说明", ballFallback:"普通", ballFallbackHint:"回退", ballMissing:"无库存"},
  };
  return {...(extra[lang.split(/[-_]/)[0]] || extra.en), ...Object.fromEntries(keys.map((key, index) => [key, (copy[lang.split(/[-_]/)[0]] || copy.en)[index]]))};
}
