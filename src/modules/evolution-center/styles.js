export default `
  .ppbui-evolution-mode {
    display:grid;
    grid-template-columns:repeat(3,minmax(0,1fr));
    gap:2px;
    min-width:0;
    width:100%;
  }

  .ppbui-evolution-mode > .ppbui-evolution-mode__button {
    width:100%;
    min-width:0;
    min-height:32px !important;
    height:auto;
    padding:4px 6px !important;
    line-height:1.1 !important;
    white-space:normal;
  }

  @layer pokeidle-glass {
    .npc-evolution-window .ppbui-evolution-mode > .ppbui-evolution-mode__button[aria-pressed="true"] {
      border-color:var(--ppbui-selected) !important;
      background:var(--ppbui-bg-3) !important;
      color:var(--ppbui-text) !important;
    }

    .npc-evolution-window .ppbui-evolution-mode > .ppbui-evolution-mode__button:focus-visible {
      outline:var(--ppbui-focus-width) solid var(--ppbui-focus) !important;
      outline-offset:var(--ppbui-pixel-unit) !important;
    }
  }
`;
