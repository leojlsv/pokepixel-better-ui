export default `
.npc-shop__buy-grid.ppbui-shop-list { display:block!important; overflow-x:auto; }
.npc-shop-window .ppbui-shop-list > .npc-shop__buy-card { min-width:490px; height:auto; min-height:0!important; grid-template-columns:46px minmax(120px,1fr) minmax(260px,1.5fr)!important; grid-template-rows:auto; align-items:center; margin-bottom:7px!important; }
.ppbui-shop-list > .npc-shop__buy-card .npc-shop__item-info { grid-column:2; grid-row:1; }
.ppbui-shop-list > .npc-shop__buy-card .npc-shop__purchase-options { grid-column:3; grid-row:1; align-self:center; }
.ppbui-shop-list > .npc-shop__buy-card .npc-shop__custom-purchase { grid-template-columns:auto 58px minmax(0,1fr) auto; align-items:center; }
.ppbui-shop-list > .npc-shop__buy-card .npc-shop__custom-button { grid-column:auto; }
.ppbui-shop-group-header { justify-content:flex-start; letter-spacing:normal; }
.ppbui-shop-group-header > button { flex:1; text-align:left; }
.ppbui-shop-group-header > input { accent-color:var(--ui-gold); }
.ppbui-shop-group-body[hidden] { display:none!important; }
.ppbui-shop-selection { display:block; min-width:0; min-height:0; margin:0; white-space:normal; overflow-wrap:anywhere; }
`;
