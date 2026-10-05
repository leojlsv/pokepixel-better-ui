export default `
@layer pokeidle-glass {
  .pokeidle-map-action-bar[data-ppbui-hunt-controls] {
    top:auto !important;
    right:auto !important;
    bottom:max(18px,env(safe-area-inset-bottom)) !important;
    left:50% !important;
    width:max-content !important;
    min-width:0 !important;
    max-width:calc(100vw - 32px) !important;
    height:auto !important;
    min-height:0 !important;
    margin:0 !important;
    padding:0 !important;
    gap:0 !important;
    border:0 !important;
    border-radius:0 !important;
    background:transparent !important;
    background-image:none !important;
    box-shadow:none !important;
    transform:translateX(-50%) !important;
    pointer-events:none !important;
  }

  .pokeidle-map-action-bar[data-ppbui-hunt-controls] > [data-ppbui-hunt-capture] {
    display:none !important;
  }

  .pokeidle-map-action-bar[data-ppbui-hunt-controls] > [data-ppbui-hunt-revive] {
    flex:0 0 auto !important;
    pointer-events:auto !important;
  }

  .pokeidle-map-action-bar[data-ppbui-hunt-controls] > [data-ppbui-hunt-revive][hidden] {
    display:none !important;
  }

  [data-ppbui-group="city"] > .ppbui-menu-popup > [data-ppbui-hunt-return] {
    grid-column:1 / -1 !important;
    display:flex !important;
    width:100% !important;
    min-width:0 !important;
    min-height:var(--ppbui-control-height) !important;
    height:auto !important;
    padding:5px var(--ppbui-control-padding-x) !important;
    align-items:center !important;
    justify-content:center !important;
    text-align:center !important;
    white-space:normal !important;
    overflow-wrap:anywhere;
  }

  [data-ppbui-group="city"] > .ppbui-menu-popup > [data-ppbui-hunt-return][data-ppbui-menu-context-visible="false"] {
    display:none !important;
  }

  [data-ppbui-group="city"] > button[data-ppbui-hunt-return-trigger] {
    position:relative !important;
  }

  .ppbui-hunt-return-badge {
    position:absolute;
    top:2px;
    right:2px;
    display:inline-flex;
    box-sizing:border-box;
    align-items:center;
    min-height:14px;
    padding:1px 4px;
    border:var(--ppbui-separator-width) solid var(--ppbui-border-strong);
    border-radius:4px;
    background:var(--ppbui-bg-0);
    color:var(--ppbui-text-muted);
    font:500 var(--ppbui-font-size-meta)/1.2 var(--ppbui-font-body);
    white-space:nowrap;
    pointer-events:none;
  }

  .ppbui-hunt-return-badge[hidden] {
    display:none !important;
  }

  @media (pointer:coarse) {
    [data-ppbui-group="city"] > .ppbui-menu-popup > [data-ppbui-hunt-return] {
      min-height:40px !important;
    }
  }
}
`;
