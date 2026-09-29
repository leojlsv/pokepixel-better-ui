export default `
/*
 * The native Poké Hub already owns drag/collapse behavior. Better UI only
 * removes those two controls from grid flow so they share the navigation rail
 * instead of consuming a dedicated row.
 */
@layer pokeidle-glass {
  .pokeidle-top-toolbar.pokeidle-pokehub.pokeidle-island[data-ppbui-menu-bar] {
    padding:3px 32px !important;
    border-radius:var(--ppbui-window-radius) !important;
  }

  .pokeidle-top-toolbar[data-ppbui-menu-bar] > :is(.pokeidle-top-toolbar__btn,.pokeidle-top-toolbar__group),
  .pokeidle-top-toolbar[data-ppbui-menu-bar] > .pokeidle-top-toolbar__group > .pokeidle-top-toolbar__btn {
    border-radius:var(--ppbui-control-radius) !important;
  }

  .pokeidle-top-toolbar[data-ppbui-menu-bar] > .pokeidle-top-toolbar__group {
    position:relative !important;
  }

  .pokeidle-top-toolbar[data-ppbui-menu-bar] > .pokeidle-top-toolbar__group > .ppbui-menu-popup {
    position:absolute !important;
    left:50% !important;
    right:auto !important;
    top:auto !important;
    bottom:100% !important;
    z-index:2147483646 !important;
    display:grid !important;
    box-sizing:border-box !important;
    width:min(282px,calc(100vw - 16px)) !important;
    min-width:0 !important;
    grid-template-columns:repeat(3,minmax(0,1fr)) !important;
    gap:6px !important;
    padding:8px !important;
    border:var(--ppbui-line-width) solid var(--ppbui-line) !important;
    max-height:calc(100dvh - 96px) !important;
    overflow-x:hidden !important;
    overflow-y:auto !important;
    overscroll-behavior:contain !important;
    transform:translateX(-50%) !important;
    border-radius:var(--ppbui-window-radius) !important;
    background:var(--ppbui-surface-window) !important;
    box-shadow:var(--ppbui-shadow-raised) !important;
    filter:none !important;
    opacity:0 !important;
    visibility:hidden !important;
    pointer-events:none !important;
    transition:none !important;
  }

  .pokeidle-top-toolbar[data-ppbui-menu-bar] > .pokeidle-top-toolbar__group:is(:hover,:focus-within,.is-open) > .ppbui-menu-popup {
    opacity:1 !important;
    visibility:visible !important;
    pointer-events:auto !important;
  }

  .pokeidle-top-toolbar[data-ppbui-menu-bar] > .pokeidle-top-toolbar__group > .ppbui-menu-popup::before,
  .pokeidle-top-toolbar[data-ppbui-menu-bar] > .pokeidle-top-toolbar__group > .ppbui-menu-popup::after {
    content:none !important;
    display:none !important;
  }

  .pokeidle-top-toolbar[data-ppbui-menu-bar] > .pokeidle-top-toolbar__group > .ppbui-menu-popup > .pokeidle-top-toolbar__dropdown-btn {
    position:relative !important;
    display:flex !important;
    box-sizing:border-box !important;
    width:100% !important;
    min-width:0 !important;
    min-height:64px !important;
    flex-direction:column !important;
    align-items:center !important;
    justify-content:center !important;
    gap:3px !important;
    padding:5px !important;
    border:var(--ppbui-separator-width) solid transparent !important;
    border-radius:var(--ppbui-control-radius) !important;
    background:var(--ppbui-surface-interactive) !important;
    color:var(--ppbui-text) !important;
    box-shadow:none !important;
    filter:none !important;
    font:700 var(--ppbui-font-size-meta)/1.1 var(--ppbui-font-body) !important;
    text-align:center !important;
    text-shadow:none !important;
    white-space:normal !important;
    transform:none !important;
  }

  .pokeidle-top-toolbar[data-ppbui-menu-bar] > .pokeidle-top-toolbar__group > .ppbui-menu-popup > .pokeidle-top-toolbar__dropdown-btn[hidden] {
    display:none !important;
  }

  .pokeidle-top-toolbar[data-ppbui-menu-bar] > .pokeidle-top-toolbar__group > .ppbui-menu-popup > .pokeidle-top-toolbar__dropdown-btn:is(:hover,:focus-visible) {
    border-color:var(--ppbui-line) !important;
    background:var(--ppbui-bg-3) !important;
    outline:var(--ppbui-border-width) solid var(--ppbui-focus) !important;
    outline-offset:-1px !important;
  }

  .pokeidle-top-toolbar[data-ppbui-menu-bar] > .pokeidle-top-toolbar__group > .ppbui-menu-popup > .pokeidle-top-toolbar__dropdown-btn > :is(.pokeidle-top-toolbar__icon,.pokeidle-menu-vector-icon) {
    width:31px !important;
    height:31px !important;
    flex:0 0 31px !important;
    margin:0 !important;
    object-fit:contain !important;
    transform:none !important;
  }

  .pokeidle-top-toolbar.pokeidle-pokehub.pokeidle-island[data-ppbui-menu-bar] > :is(.pokeidle-pokehub__handle,.pokeidle-pokehub__toggle) {
    position:absolute !important;
    top:3px !important;
    bottom:auto !important;
    display:grid !important;
    width:24px !important;
    min-width:24px !important;
    height:56px !important;
    min-height:56px !important;
    grid-column:auto !important;
    place-items:center !important;
    margin:0 !important;
    padding:0 !important;
    border:0 !important;
    background:transparent !important;
    line-height:1 !important;
    transform:none !important;
  }

  .pokeidle-top-toolbar.pokeidle-pokehub.pokeidle-island[data-ppbui-menu-bar] > .pokeidle-pokehub__handle {
    left:4px !important;
  }

  .pokeidle-top-toolbar.pokeidle-pokehub.pokeidle-island[data-ppbui-menu-bar] > .pokeidle-pokehub__toggle {
    right:4px !important;
  }

  .pokeidle-top-toolbar.pokeidle-pokehub.pokeidle-island[data-ppbui-menu-bar].is-collapsed {
    min-height:38px !important;
  }

  .pokeidle-top-toolbar.pokeidle-pokehub.pokeidle-island[data-ppbui-menu-bar].is-collapsed > :is(.pokeidle-pokehub__handle,.pokeidle-pokehub__toggle) {
    height:32px !important;
    min-height:32px !important;
  }

}
`;
