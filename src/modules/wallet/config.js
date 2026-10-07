export const walletConfig = Object.freeze({
  id:"wallet",
  storagePrefix:"ppbui:wallet-locations:v1:",
  selectors:{
    toolbar:".pokeidle-top-toolbar",
    team:".pokeidle-team-hud",
    nativeWallet:".pokeidle-team-hud__wallet",
    trainerHeader:".pokeidle-trainer-hud__header",
    trainerInfo:".pokeidle-trainer-hud__info",
    currencyIcon:".pokeidle-currency__icon",
    panel:"[data-ppbui-wallet-panel]",
    menuEditor:"[data-ppbui-menu-layout-editor]:not([hidden])",
  },
  events:{ changed:"ppbui:wallet-locations-change" },
});

const translations = {
  pt:{wallet:"Wallet",gold:"Dólares",diamonds:"Diamantes",unavailable:"Saldo indisponível"},
  en:{wallet:"Wallet",gold:"Dollars",diamonds:"Diamonds",unavailable:"Balance unavailable"},
  es:{wallet:"Wallet",gold:"Dólares",diamonds:"Diamantes",unavailable:"Saldo no disponible"},
  zh:{wallet:"钱包",gold:"美元",diamonds:"钻石",unavailable:"余额不可用"},
};
export function walletText(doc) {
  const locale = doc.defaultView?.PokeIdle?.Localization?.get?.() || doc.documentElement.lang || "en";
  return { ...(translations[String(locale).split(/[-_]/)[0]] || translations.en), locale };
}
