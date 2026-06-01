/* ============================================================
   48-ic-funil-vendas.js · Funil de Vendas (CRM Kanban + Lista)
   1ª aba do Inteligência Comercial · #mapeamentoScreen
   ----------------------------------------------------------------
   F1 Esqueleto · F2 Interação · F3 Inteligência · F4 Polish
============================================================ */
(function(){
  'use strict';

  /* ── Constantes ── */
  const ETAPAS = [
    {id:'prospec', nome:'Prospecção',  cor:'#ff8fa8', prob:10, sla:3},
    {id:'qualif',  nome:'Qualificação', cor:'#ff6b8a', prob:30, sla:3},
    {id:'apres',   nome:'Apresentação', cor:'#e94f74', prob:50, sla:5},
    {id:'negoc',   nome:'Negociação',  cor:'#d63960', prob:70, sla:7},
    {id:'propos',  nome:'Proposta',    cor:'#b82550', prob:80, sla:5},
    {id:'fecham',  nome:'Fechamento',  cor:'#9a1740', prob:95, sla:3},
    {id:'pos',     nome:'Pós-Venda',   cor:'#7a0d30', prob:100, sla:30}
  ];
  const ORIGENS_PADRAO = ['Instagram','Indicação','Lead','Indicação de Lead','Carteira','Indicação de Carteira','Conhecido'];
  const FB_NODE = 'funil_vendas';

  /* ── Estado ── */
  let _leads = [];                 // [{id, nome, empresa, valor, prob, etapa(0..6), treinamento, origem, consultor, prazo, temp(q/m/f), wpp, email, notas, criadoEm, atividade:[]}]
  let _historico = [];             // [{leadId, nome, txt, quando, autor, tipo}]
  let _filtroEtapa = null;
  let _filtros = { cons:'', trein:'', turma:'', per:'', perDe:'', perAte:'', origem:'', busca:'', temp:'' };
  let _modoLista = false;
  let _maxCards = 5;
  let _booted = false;
  let _origensCustom = [];         // origens adicionadas pelo admin
  let _zerado = false;             // true = usuário fez reset, não auto-importa

  /* ── Helpers ── */
  const $  = (s,c)=>(c||document).querySelector(s);
  const $$ = (s,c)=>[...(c||document).querySelectorAll(s)];
  const esc = s => (s==null?'':(s+'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])));
  const moeda = v => (v==null||isNaN(+v))?'—':'R$ '+(+v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const moedaCurta = v => { if(v==null||isNaN(+v)) return '—'; v=+v; if(v>=1e6) return 'R$ '+(v/1e6).toFixed(1).replace('.',',')+'M'; if(v>=1e3) return 'R$ '+(v/1e3).toFixed(1).replace('.',',')+'k'; return 'R$ '+v.toFixed(0); };
  const _id = ()=> 'l'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const _toast = m => window._showToast ? window._showToast(m) : console.log('[FV]', m);
  const _hoje = () => { const d=new Date(); return d.toISOString().slice(0,10); };
  const _diasAteHoje = iso => { if(!iso) return null; const d=new Date(iso), h=new Date(); h.setHours(0,0,0,0); d.setHours(0,0,0,0); return Math.round((d-h)/86400000); };
  const _difDias = iso => { if(!iso) return null; const d=new Date(iso), n=new Date(); return Math.floor((n-d)/86400000); };
  const _inic = nome => (nome||'?').split(/\s+/).map(p=>p[0]).slice(0,2).join('').toUpperCase();

  function _papel(){
    const u = window._currentUser || window.APP_USER || {};
    return (u.papel || u.role || 'admin').toLowerCase();
  }
  const _ehAdmin = ()=> ['admin','master','gestor'].includes(_papel());

  /* ── CSS (injeta uma vez) ── */
  function _injectCss(){
    if(document.getElementById('fvCss')) return;
    const css = `
:root{ --fv-p1:#ff8fa8;--fv-p2:#ff6b8a;--fv-p3:#e94f74;--fv-p4:#d63960;--fv-p5:#b82550;--fv-p6:#9a1740;--fv-p7:#7a0d30; }
.fv-app{ font-family:'DM Sans','Inter',sans-serif; color:var(--txt); }
.fv-hero{ background:linear-gradient(135deg, rgba(212,165,116,0.12), rgba(212,165,116,0.02)); border:1px solid var(--border); border-radius:16px; padding:18px 24px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; gap:16px; }
.fv-hero-l{ display:flex; align-items:center; gap:14px; }
.fv-hero-icon{ font-size:28px; background:rgba(212,165,116,0.14); padding:10px 14px; border-radius:12px; border:1px solid rgba(212,165,116,0.28); }
.fv-hero-titulo{ font-size:20px; font-weight:700; letter-spacing:-0.02em; margin:0; }
.fv-hero-sub{ font-size:12px; color:var(--txt-2); margin-top:3px; }
.fv-hero-r{ display:flex; align-items:center; gap:12px; }
.fv-hero-perm{ background:rgba(52,211,153,0.1); border:1px solid rgba(52,211,153,0.3); color:#34d399; padding:5px 11px; border-radius:18px; font-size:11px; font-weight:600; }
.fv-btn{ background:rgba(212,165,116,0.1); border:1px solid rgba(212,165,116,0.3); color:var(--accent); padding:8px 14px; border-radius:8px; font-size:12px; font-weight:500; cursor:pointer; font-family:inherit; transition:all 0.15s; display:inline-flex; align-items:center; gap:6px; }
.fv-btn:hover{ background:rgba(212,165,116,0.18); }
.fv-btn-primary{ background:var(--accent); color:var(--bg); border-color:var(--accent); }
.fv-btn-primary:hover{ background:var(--accent-2,#f0c896); }
.fv-btn:disabled, .fv-btn-primary:disabled{ background:var(--bg-3,#1c2128) !important; color:var(--txt-3,#6b7280) !important; border-color:var(--border) !important; cursor:not-allowed; opacity:0.65; }
.fv-btn:disabled:hover, .fv-btn-primary:disabled:hover{ background:var(--bg-3,#1c2128) !important; }

.fv-alertas{ background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.25); border-radius:10px; padding:10px 14px; margin-bottom:14px; display:flex; align-items:center; gap:14px; font-size:12px; }
.fv-alertas-icon{ color:#ef4444; font-size:16px; }
.fv-alertas-txt{ flex:1; }
.fv-alertas-txt b{ color:#ef4444; }

.fv-kpis{ display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin-bottom:12px; }
.fv-kpi{ background:var(--bg-2,#161b22); border:1px solid var(--border); border-radius:10px; padding:11px 14px; }
.fv-kpi-l{ font-size:10px; color:var(--txt-2); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:4px; font-weight:500; }
.fv-kpi-v{ font-size:19px; font-weight:700; letter-spacing:-0.02em; font-variant-numeric:tabular-nums; line-height:1.1; }
.fv-kpi.accent .fv-kpi-v{ color:var(--accent); }
.fv-kpi.green  .fv-kpi-v{ color:#34d399; }
.fv-kpi.blue   .fv-kpi-v{ color:#3b82f6; }
.fv-kpi.amber  .fv-kpi-v{ color:#f59e0b; }
.fv-kpi.red    .fv-kpi-v{ color:#ef4444; }
.fv-kpi.purple .fv-kpi-v{ color:#a855f7; }
.fv-kpi.cyan   .fv-kpi-v{ color:#06b6d4; }

.fv-filtros{ background:var(--bg-2,#161b22); border:1px solid var(--border); border-radius:10px; padding:10px 13px; margin-bottom:14px; display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.fv-filtros-label{ font-size:10px; text-transform:uppercase; color:var(--txt-3,#6b7280); letter-spacing:0.06em; font-weight:600; }
.fv-filtros-divider{ width:1px; height:22px; background:var(--border); margin:0 4px; }
.fv-finput{ background:var(--bg-3,#1c2128); border:1px solid var(--border); color:var(--txt); padding:6px 10px; border-radius:6px; font-size:12px; font-family:inherit; }
.fv-finput:focus{ outline:none; border-color:var(--accent); }
.fv-fchip{ background:var(--bg-3,#1c2128); border:1px solid var(--border); color:var(--txt); padding:6px 11px; border-radius:6px; font-size:12px; cursor:pointer; font-family:inherit; transition:all 0.15s; }
.fv-fchip:hover{ border-color:rgba(255,255,255,0.18); }
.fv-fchip.active{ background:rgba(212,165,116,0.15); border-color:var(--accent); color:var(--accent); }

.fv-main{ display:grid; grid-template-columns:280px 1fr; gap:14px; align-items:start; }
.fv-side{ position:sticky; top:20px; display:flex; flex-direction:column; gap:14px; }
.fv-funil{ background:var(--bg-2,#161b22); border:1px solid var(--border); border-radius:12px; padding:14px; }
.fv-funil-h{ font-size:11px; text-transform:uppercase; color:var(--txt-2); font-weight:600; letter-spacing:0.06em; }
.fv-funil-sub{ font-size:10px; color:var(--txt-3,#6b7280); margin:2px 0 10px; }
/* Funil pirâmide (variante 3: gradiente + sombra) */
.fv-funil-pir{ display:flex; flex-direction:column; align-items:center; gap:2px; padding:6px 0; }
.fv-fe{ position:relative; height:36px; color:#fff; font-weight:700; display:grid; grid-template-columns:1fr auto; align-items:center; padding:0 12px; gap:6px; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.32); transition:transform 0.15s, filter 0.15s; border-radius:6px; }
.fv-fe:hover{ filter:brightness(1.1); transform:translateY(-1px); }
.fv-fe.active{ outline:2px solid #fff; outline-offset:2px; z-index:1; }
.fv-fe-l{ font-size:9px; text-transform:uppercase; letter-spacing:0.04em; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.fv-fe-r{ display:flex; align-items:center; gap:4px; }
.fv-fe-c{ font-size:9px; opacity:0.85; font-weight:600; }
.fv-fe-badge{ background:rgba(255,255,255,0.28); color:#fff; padding:1px 7px; border-radius:8px; font-size:9px; font-weight:700; display:inline-flex; align-items:center; gap:3px; font-variant-numeric:tabular-nums; }
.fv-fe-badge b{ font-size:11px; font-weight:800; }
.fv-funil-meta{ margin-top:12px; padding-top:12px; border-top:1px solid var(--border); display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.fv-fm{ font-size:10px; color:var(--txt-3,#6b7280); text-align:center; }
.fv-fm b{ font-size:14px; font-weight:700; color:var(--accent); display:block; margin-top:2px; font-variant-numeric:tabular-nums; }

.fv-hist{ background:var(--bg-2,#161b22); border:1px solid var(--border); border-radius:12px; padding:14px; }
.fv-hist-h{ font-size:11px; text-transform:uppercase; color:var(--txt-2); font-weight:600; letter-spacing:0.06em; margin-bottom:10px; }
.fv-hist-item{ display:flex; gap:8px; padding:6px 0; border-bottom:1px dashed var(--border); font-size:10px; }
.fv-hist-item:last-child{ border-bottom:none; }
.fv-hist-dot{ width:6px; height:6px; border-radius:50%; background:var(--accent); margin-top:5px; flex-shrink:0; }
.fv-hist-c{ flex:1; }
.fv-hist-cn{ color:var(--txt); font-weight:600; }
.fv-hist-cd{ color:var(--txt-3,#6b7280); margin-top:1px; }
.fv-hist-t{ color:var(--txt-3,#6b7280); font-size:9px; white-space:nowrap; }

.fv-op{ background:var(--bg-2,#161b22); border:1px solid var(--border); border-radius:14px; padding:14px; position:relative; }
.fv-op-h{ display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; padding:0 2px; flex-wrap:wrap; gap:8px; }
.fv-op-tit{ font-size:13px; font-weight:600; color:var(--txt-2); text-transform:uppercase; letter-spacing:0.06em; }
.fv-op-actions{ display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.fv-op-instr{ font-size:10px; color:var(--txt-3,#6b7280); font-style:italic; }
.fv-vtoggle{ display:inline-flex; background:var(--bg-3,#1c2128); border:1px solid var(--border); border-radius:8px; padding:3px; gap:2px; }
.fv-vbtn{ background:transparent; border:none; color:var(--txt-2); padding:5px 12px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; font-family:inherit; }
.fv-vbtn:hover{ color:var(--txt); }
.fv-vbtn.active{ background:var(--accent); color:var(--bg); }

/* KANBAN */
.fv-kanban{ display:flex; gap:10px; overflow-x:auto; padding-bottom:6px; }
.fv-kanban::-webkit-scrollbar{ height:6px; }
.fv-kanban::-webkit-scrollbar-thumb{ background:rgba(255,255,255,0.14); border-radius:3px; }
.fv-col{ background:var(--bg,#0d1117); border:1px solid var(--border); border-radius:10px; padding:10px; display:flex; flex-direction:column; gap:8px; max-height:calc(var(--fv-max,5) * 92px + 100px); overflow-y:auto; min-width:0; flex:1; }
.fv-col::-webkit-scrollbar{ width:4px; }
.fv-col::-webkit-scrollbar-thumb{ background:rgba(255,255,255,0.14); border-radius:2px; }
.fv-col.dragover{ background:rgba(212,165,116,0.06); border-color:var(--accent); }
.fv-col-h{ display:flex; justify-content:space-between; align-items:center; padding:4px 2px 8px; border-bottom:2px solid var(--col-cor,var(--accent)); position:sticky; top:0; background:var(--bg,#0d1117); z-index:1; }
.fv-col-tit{ font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--col-cor,var(--accent)); }
.fv-col-qtd{ font-size:10px; background:var(--bg-3,#1c2128); padding:2px 7px; border-radius:8px; color:var(--txt-2); font-variant-numeric:tabular-nums; font-weight:600; }
.fv-col-soma{ font-size:9px; color:var(--txt-3,#6b7280); margin-top:-2px; padding:0 2px; font-variant-numeric:tabular-nums; }
.fv-col-soma b{ color:var(--accent); }
.fv-col-add{ background:transparent; border:1px dashed rgba(255,255,255,0.14); color:var(--txt-3,#6b7280); padding:4px; border-radius:6px; font-size:10px; cursor:pointer; font-family:inherit; margin-top:2px; font-weight:600; transition:all 0.15s; }
.fv-col-add:hover{ color:var(--accent); border-color:var(--accent); }
.fv-card{ background:var(--bg-3,#1c2128); border:1px solid var(--border); border-left:3px solid var(--col-cor,var(--accent)); border-radius:8px; padding:8px 10px; cursor:grab; transition:all 0.15s; position:relative; font-size:11px; }
.fv-card:hover{ transform:translateY(-1px); border-color:rgba(255,255,255,0.14); box-shadow:0 4px 12px rgba(0,0,0,0.3); }
.fv-card:active{ cursor:grabbing; }
.fv-card.dragging{ opacity:0.5; }
.fv-card.hot{ box-shadow:0 0 0 1px rgba(239,68,68,0.4); }
.fv-card.cold{ opacity:0.7; }
.fv-card-temp{ position:absolute; top:7px; right:8px; font-size:11px; }
.fv-card-nome{ font-weight:600; font-size:11px; padding-right:18px; line-height:1.2; margin-bottom:2px; }
.fv-card-emp{ font-size:10px; color:var(--txt-2); margin-bottom:5px; }
.fv-card-val{ font-size:11px; font-weight:700; color:var(--accent); font-variant-numeric:tabular-nums; display:flex; align-items:center; justify-content:space-between; }
.fv-card-prob{ font-size:9px; color:#34d399; background:rgba(52,211,153,0.1); padding:1px 5px; border-radius:3px; font-weight:600; }
.fv-card-prob.m{ color:#f59e0b; background:rgba(245,158,11,0.1); }
.fv-card-prob.l{ color:#ef4444; background:rgba(239,68,68,0.1); }
.fv-card-row{ display:flex; gap:4px; margin-top:5px; flex-wrap:wrap; }
.fv-card-tag{ background:rgba(255,255,255,0.06); padding:1px 6px; border-radius:3px; font-size:9px; color:var(--txt-2); }
.fv-card-tag.tr{ background:rgba(212,165,116,0.12); color:var(--accent); }
.fv-card-tag.or{ background:rgba(59,130,246,0.12); color:#3b82f6; }
.fv-card-foot{ display:flex; justify-content:space-between; align-items:center; margin-top:6px; padding-top:6px; border-top:1px dashed var(--border); }
.fv-card-cons{ font-size:9px; color:var(--txt-3,#6b7280); display:flex; align-items:center; gap:4px; }
.fv-av{ width:16px; height:16px; border-radius:50%; background:var(--accent); display:inline-flex; align-items:center; justify-content:center; font-size:8px; font-weight:700; color:var(--bg); }
.fv-card-prazo{ font-size:9px; color:#f59e0b; font-weight:600; }
.fv-card-prazo.ok{ color:#34d399; } .fv-card-prazo.atr{ color:#ef4444; }
.fv-card-act{ font-size:9px; color:var(--txt-3,#6b7280); margin-top:3px; }
.fv-col-mais{ position:sticky; bottom:0; background:linear-gradient(to top, var(--bg,#0d1117) 60%, transparent); text-align:center; font-size:10px; color:var(--accent); padding:8px 4px 4px; font-weight:700; letter-spacing:0.04em; cursor:pointer; margin:0 -10px -10px; }
.fv-col-mais:hover{ color:var(--accent-2,#f0c896); }

/* LISTA */
.fv-op.modo-lista .fv-kanban{ display:none; }
.fv-op:not(.modo-lista) .fv-lista-wrap{ display:none; }
.fv-lista-wrap{ max-height:var(--fv-op-h, 800px); overflow-y:auto; border:1px solid var(--border); border-radius:10px; }
.fv-lista-wrap::-webkit-scrollbar{ width:6px; }
.fv-lista-wrap::-webkit-scrollbar-thumb{ background:rgba(255,255,255,0.14); border-radius:3px; }
.fv-lista-bar{ align-items:center; justify-content:space-between; padding:8px 12px; background:rgba(212,165,116,0.08); border-bottom:1px solid var(--border); font-size:11px; position:sticky; top:0; z-index:3; display:none; }
.fv-lista-bar.show{ display:flex; }
.fv-lista-info{ color:var(--accent); font-weight:600; }
.fv-lista-info b{ color:var(--txt); }
.fv-lista-clear{ background:transparent; border:1px solid var(--accent); color:var(--accent); padding:3px 9px; border-radius:4px; font-size:10px; font-weight:700; cursor:pointer; font-family:inherit; text-transform:uppercase; letter-spacing:0.05em; }
.fv-lista-clear:hover{ background:var(--accent); color:var(--bg); }
.fv-lista-tbl{ width:100%; border-collapse:separate; border-spacing:0; font-size:11px; }
.fv-lista-tbl thead th{ background:var(--bg-3,#1c2128); color:var(--txt-2); font-size:9px; text-transform:uppercase; letter-spacing:0.06em; font-weight:600; padding:9px 10px; text-align:left; border-bottom:1px solid var(--border); position:sticky; top:0; z-index:2; cursor:pointer; user-select:none; white-space:nowrap; }
.fv-lista-tbl thead th:hover{ color:var(--accent); }
.fv-lista-tbl tbody td{ padding:8px 10px; border-bottom:1px solid var(--border); vertical-align:middle; }
.fv-lista-tbl tbody tr{ cursor:pointer; transition:background 0.1s; }
.fv-lista-tbl tbody tr:hover{ background:rgba(212,165,116,0.04); }
.fv-lista-tbl tbody tr.hot td:first-child{ box-shadow:inset 3px 0 0 #ef4444; }
.fv-lista-tbl tbody tr.cold td{ opacity:0.75; }
.fv-lt-nome{ font-weight:600; color:var(--txt); }
.fv-lt-emp{ font-size:10px; color:var(--txt-3,#6b7280); margin-top:1px; }
.fv-lt-val{ font-weight:700; color:var(--accent); font-variant-numeric:tabular-nums; white-space:nowrap; }
.fv-lt-stage{ padding:2px 8px; border-radius:4px; color:white; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; white-space:nowrap; }
.fv-lt-prob{ display:inline-block; font-size:10px; font-weight:700; padding:1px 6px; border-radius:3px; color:#34d399; background:rgba(52,211,153,0.1); }
.fv-lt-prob.m{ color:#f59e0b; background:rgba(245,158,11,0.1); }
.fv-lt-prob.l{ color:#ef4444; background:rgba(239,68,68,0.1); }
.fv-lt-tag{ background:rgba(212,165,116,0.12); color:var(--accent); padding:1px 6px; border-radius:3px; font-size:9px; font-weight:600; }
.fv-lt-tag.or{ background:rgba(59,130,246,0.12); color:#3b82f6; }
.fv-lt-prazo{ font-size:10px; font-weight:600; white-space:nowrap; }
.fv-lt-prazo.ok{ color:#34d399; } .fv-lt-prazo.a{ color:#f59e0b; } .fv-lt-prazo.atr{ color:#ef4444; }

/* MODAIS */
.fv-overlay{ position:fixed; inset:0; background:rgba(0,0,0,0.55); backdrop-filter:blur(4px); z-index:300; display:none; align-items:center; justify-content:center; padding:24px; }
.fv-overlay.show{ display:flex; }
.fv-modal{ background:var(--bg-2,#161b22); border:1px solid var(--border); border-radius:14px; max-width:95vw; max-height:90vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.6); }
.fv-modal-h{ padding:14px 22px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; }
.fv-modal-tit{ font-size:16px; font-weight:700; display:flex; align-items:center; gap:10px; }
.fv-close{ background:transparent; border:none; color:var(--txt-2); font-size:18px; cursor:pointer; padding:4px 8px; border-radius:6px; }
.fv-close:hover{ background:var(--bg-3,#1c2128); color:var(--txt); }
.fv-modal-b{ padding:18px 22px; overflow-y:auto; flex:1; }
.fv-modal-f{ padding:12px 22px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; background:var(--bg-3,#1c2128); }

/* Detalhe */
.fv-det{ width:600px; }
.fv-det-head{ display:flex; justify-content:space-between; align-items:start; padding-bottom:10px; border-bottom:1px solid var(--border); margin-bottom:12px; }
.fv-det-nome{ font-size:17px; font-weight:700; }
.fv-det-emp{ font-size:11px; color:var(--txt-2); margin-top:2px; }
.fv-det-stage{ color:white; padding:4px 12px; border-radius:6px; font-size:10px; font-weight:700; text-transform:uppercase; }
.fv-det-grid{ display:grid; grid-template-columns:1fr 1fr; gap:10px 16px; margin-bottom:14px; }
.fv-det-f{ font-size:12px; }
.fv-det-fl{ color:var(--txt-3,#6b7280); font-size:9px; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:3px; font-weight:600; }
.fv-det-fv{ color:var(--txt); font-weight:600; }
.fv-det-fv.accent{ color:var(--accent); }
.fv-det-tabs{ display:flex; gap:6px; border-bottom:1px solid var(--border); margin-bottom:10px; }
.fv-det-tab{ padding:6px 12px; font-size:10px; color:var(--txt-3,#6b7280); cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-1px; text-transform:uppercase; font-weight:600; }
.fv-det-tab.active{ color:var(--accent); border-color:var(--accent); }
.fv-det-actions{ display:flex; gap:6px; margin-top:14px; padding-top:12px; border-top:1px solid var(--border); flex-wrap:wrap; }

/* Novo */
.fv-novo{ width:640px; }
.fv-novo-section{ font-size:10px; text-transform:uppercase; color:var(--txt-3,#6b7280); letter-spacing:0.06em; font-weight:700; margin:8px 0 10px; padding-bottom:6px; border-bottom:1px dashed var(--border); }
.fv-novo-grid{ display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
.fv-novo-grid.c1{ grid-template-columns:1fr; }
.fv-novo-grid.c3{ grid-template-columns:1fr 1fr 1fr; }
.fv-novo-field{ display:flex; flex-direction:column; gap:5px; }
.fv-novo-l{ font-size:10px; color:var(--txt-2); text-transform:uppercase; letter-spacing:0.06em; font-weight:600; }
.fv-novo-l.req::after{ content:' *'; color:#ef4444; }
.fv-novo-i, .fv-novo-s, .fv-novo-ta{ background:var(--bg-3,#1c2128); border:1px solid var(--border); color:var(--txt); padding:8px 10px; border-radius:6px; font-size:12px; font-family:inherit; }
.fv-novo-i:focus, .fv-novo-s:focus, .fv-novo-ta:focus{ outline:none; border-color:var(--accent); }
.fv-novo-ta{ resize:vertical; min-height:60px; }
.fv-novo-temp{ display:flex; gap:6px; }
.fv-novo-t{ flex:1; background:var(--bg-3,#1c2128); border:1px solid var(--border); color:var(--txt-2); padding:8px; border-radius:6px; cursor:pointer; font-size:11px; font-weight:600; text-align:center; font-family:inherit; }
.fv-novo-t.s-q{ background:rgba(239,68,68,0.15); border-color:#ef4444; color:#ef4444; }
.fv-novo-t.s-m{ background:rgba(245,158,11,0.15); border-color:#f59e0b; color:#f59e0b; }
.fv-novo-t.s-f{ background:rgba(59,130,246,0.15); border-color:#3b82f6; color:#3b82f6; }
.fv-novo-or-out{ display:none; margin-top:6px; }
.fv-novo-or-out.show{ display:block; }

/* Configurar */
.fv-cfg{ width:760px; }
.fv-cfg-body{ display:grid; grid-template-columns:200px 1fr; flex:1; overflow:hidden; min-height:480px; }
.fv-cfg-nav{ background:var(--bg-3,#1c2128); padding:12px 0; overflow-y:auto; }
.fv-cfg-nav-i{ display:flex; align-items:center; gap:10px; padding:9px 18px; font-size:12px; color:var(--txt-2); cursor:pointer; border-left:3px solid transparent; font-weight:500; }
.fv-cfg-nav-i:hover{ background:rgba(255,255,255,0.03); color:var(--txt); }
.fv-cfg-nav-i.active{ background:rgba(212,165,116,0.08); color:var(--accent); border-left-color:var(--accent); font-weight:700; }
.fv-cfg-content{ padding:18px 22px; overflow-y:auto; }
.fv-cfg-pane{ display:none; }
.fv-cfg-pane.active{ display:block; }
.fv-cfg-st{ font-size:14px; font-weight:700; margin-bottom:4px; }
.fv-cfg-ss{ font-size:11px; color:var(--txt-3,#6b7280); margin-bottom:14px; }
.fv-cfg-pill{ background:var(--bg-3,#1c2128); border:1px solid var(--border); color:var(--txt); padding:5px 10px; border-radius:14px; font-size:11px; display:inline-flex; align-items:center; gap:6px; margin:0 6px 6px 0; }
.fv-cfg-pill-del{ color:#ef4444; cursor:pointer; opacity:0.7; }
.fv-cfg-pill-del:hover{ opacity:1; }
.fv-cfg-pill-add{ background:rgba(212,165,116,0.08); border:1px dashed rgba(212,165,116,0.4); color:var(--accent); cursor:pointer; }
.fv-cfg-etapa{ display:grid; grid-template-columns:24px 1fr 80px 60px 28px; gap:10px; align-items:center; padding:10px 12px; background:var(--bg-3,#1c2128); border:1px solid var(--border); border-radius:8px; margin-bottom:8px; }
.fv-cfg-toggle{ display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:var(--bg-3,#1c2128); border:1px solid var(--border); border-radius:8px; margin-bottom:8px; }
.fv-switch{ position:relative; width:36px; height:20px; background:var(--bg); border:1px solid var(--border); border-radius:12px; cursor:pointer; transition:all 0.2s; }
.fv-switch::after{ content:''; position:absolute; top:2px; left:2px; width:14px; height:14px; background:var(--txt-2); border-radius:50%; transition:all 0.2s; }
.fv-switch.on{ background:var(--accent); border-color:var(--accent); }
.fv-switch.on::after{ left:18px; background:var(--bg); }

/* Período Personalizado */
.fv-per{ width:340px; padding:18px; }
.fv-per-tabs{ display:grid; grid-template-columns:repeat(4,1fr); gap:0; background:var(--bg-3,#1c2128); border-radius:8px; padding:3px; margin-bottom:14px; }
.fv-per-tab{ background:transparent; border:none; color:var(--txt-2); padding:7px 6px; border-radius:6px; font-size:11px; font-weight:700; text-transform:uppercase; cursor:pointer; font-family:inherit; }
.fv-per-tab.active{ background:var(--accent); color:var(--bg); }
.fv-per-nav{ display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; padding:0 4px; }
.fv-per-arr{ background:var(--bg-3,#1c2128); border:1px solid var(--border); color:var(--txt); width:28px; height:28px; border-radius:6px; cursor:pointer; font-size:14px; font-family:inherit; }
.fv-per-arr:hover{ border-color:var(--accent); color:var(--accent); }
.fv-per-tit{ font-size:18px; font-weight:700; color:var(--txt); font-variant-numeric:tabular-nums; }
.fv-per-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:14px; }
.fv-per-cel{ background:var(--bg-3,#1c2128); border:1px solid var(--border); color:var(--txt); padding:12px 0; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; text-transform:uppercase; }
.fv-per-cel:hover{ border-color:rgba(255,255,255,0.18); }
.fv-per-cel.sel{ background:rgba(212,165,116,0.15); border-color:var(--accent); color:var(--accent); outline:2px solid var(--accent); }

@media (max-width: 1100px){ .fv-main{ grid-template-columns:1fr; } .fv-side{ position:static; } .fv-kpis{ grid-template-columns:repeat(2,1fr); } }
    `;
    const st = document.createElement('style');
    st.id = 'fvCss'; st.textContent = css;
    document.head.appendChild(st);
  }

  /* ── F1 · Shell HTML ── */
  function _buildShell(){
    const root = document.getElementById('funilVendasRoot');
    if(!root) return;
    root.innerHTML = `
      <div class="fv-app">
        <div class="fv-hero">
          <div class="fv-hero-l">
            <div class="fv-hero-icon">🎯</div>
            <div>
              <h2 class="fv-hero-titulo">Funil de Vendas</h2>
              <div class="fv-hero-sub">Jornada do cliente, da prospecção ao pós-venda</div>
            </div>
          </div>
          <div class="fv-hero-r">
            <div class="fv-hero-perm">● <span id="fvPermTxt">Você: Admin</span></div>
            <button class="fv-btn fv-btn-primary" id="fvBtnConfig">⚙️ Configurar</button>
          </div>
        </div>

        <div class="fv-alertas" id="fvAlertas" style="display:none;">
          <span class="fv-alertas-icon">⚠️</span>
          <span class="fv-alertas-txt" id="fvAlertasTxt">—</span>
        </div>

        <div class="fv-kpis" id="fvKpis1"></div>
        <div class="fv-kpis" id="fvKpis2" style="margin-top:10px;"></div>

        <div class="fv-filtros">
          <span class="fv-filtros-label">FILTROS</span>
          <select class="fv-finput" id="fvFCons"><option value="">👥 Todos consultores</option></select>
          <select class="fv-finput" id="fvFTrein"><option value="">🎓 Todos treinamentos</option></select>
          <select class="fv-finput" id="fvFTurma"><option value="">📚 Todas turmas</option></select>
          <select class="fv-finput" id="fvFPer">
            <option value="">📅 Este mês</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="trim">Trimestre</option>
            <option value="__perso__">Personalizado…</option>
          </select>
          <select class="fv-finput" id="fvFOrigem">
            <option value="">📡 Todas origens</option>
            ${ORIGENS_PADRAO.map(o=>`<option>${esc(o)}</option>`).join('')}
            <option value="__outro__">Outro…</option>
          </select>
          <input type="text" class="fv-finput" id="fvFOrigOutro" placeholder="✏ Origem…" style="min-width:130px;display:none;border-color:var(--accent);">
          <input type="text" class="fv-finput" id="fvFBusca" placeholder="🔍 Buscar cliente..." style="min-width:160px;">
          <div class="fv-filtros-divider"></div>
          <button class="fv-fchip" data-temp="q">🔥 Quentes</button>
          <button class="fv-fchip" data-temp="m">🌤 Mornos</button>
          <button class="fv-fchip" data-temp="f">❄ Frios</button>
        </div>

        <div class="fv-main">
          <aside class="fv-side">
            <div class="fv-funil">
              <div class="fv-funil-h">📊 Funil de Conversão</div>
              <div class="fv-funil-sub">Clique pra filtrar a lista</div>
              <div id="fvFunilEtapas"></div>
              <div class="fv-funil-meta">
                <div class="fv-fm">Taxa Geral<b id="fvTaxa">—</b></div>
                <div class="fv-fm">Receita<b id="fvReceita" style="color:#34d399;">—</b></div>
              </div>
            </div>
            <div class="fv-hist">
              <div class="fv-hist-h">🕐 Movimentações</div>
              <div id="fvHistList"></div>
            </div>
          </aside>

          <section class="fv-op modo-fit" id="fvOp">
            <div class="fv-op-h">
              <div class="fv-op-tit">📋 Operação · <span id="fvModoLabel">Kanban</span></div>
              <div class="fv-op-actions">
                <div class="fv-op-instr" id="fvInstr">💡 Arraste cards · Clique p/ detalhar</div>
                <button class="fv-btn fv-btn-primary" id="fvBtnNovo">+ Novo</button>
                <div class="fv-vtoggle">
                  <button class="fv-vbtn active" data-view="kanban">▦ Kanban</button>
                  <button class="fv-vbtn" data-view="lista">≡ Lista</button>
                </div>
              </div>
            </div>
            <div class="fv-kanban" id="fvKanban"></div>
            <div class="fv-lista-wrap" id="fvListaWrap">
              <div class="fv-lista-bar" id="fvListaBar">
                <div class="fv-lista-info">📊 Filtrado: <b id="fvListaNome">—</b> · <span id="fvListaQtd">0</span> leads</div>
                <button class="fv-lista-clear" id="fvListaClear">✕ Limpar filtro</button>
              </div>
              <table class="fv-lista-tbl">
                <thead><tr>
                  <th style="width:24px;"></th><th>Cliente</th><th>Valor</th><th>Prob.</th>
                  <th>Etapa</th><th>Treinam.</th><th>Origem</th><th>Consultor</th>
                  <th>Prazo</th><th>Última atividade</th>
                </tr></thead>
                <tbody id="fvListaTbody"></tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  /* ── F1 · Persistência Firebase ── */
  function _fbPath(){
    /* Funil é global (abrange todas as turmas + avulsas), igual ao dashboard IC */
    return FB_NODE + '/global';
  }
  async function _carregar(){
    try{
      if(window._fbGet){
        const d = await window._fbGet(_fbPath());
        _leads = Array.isArray(d && d.leads) ? d.leads : (d && d.leads ? Object.values(d.leads) : []);
        _historico = Array.isArray(d && d.historico) ? d.historico : (d && d.historico ? Object.values(d.historico) : []);
        _origensCustom = Array.isArray(d && d.origensCustom) ? d.origensCustom : [];
        _zerado = !!(d && d.zerado);
      }
    }catch(e){ console.warn('[FV] carregar', e); }
    /* Só auto-importa se está vazio E nunca foi zerado */
    if(!_leads.length && !_zerado) await _importarDoPipeline(true);
  }
  function _salvar(){
    try{
      if(window._fbSave) window._fbSave(_fbPath(), { leads:_leads, historico:_historico.slice(0,200), origensCustom:_origensCustom, zerado:_zerado });
    }catch(e){ console.warn('[FV] salvar', e); }
  }

  /* Zera tudo — leads, histórico, origens custom. Mantém flag pra não auto-importar de novo. */
  function _zerarTudo(){
    _leads = [];
    _historico = [{leadId:null, nome:'Funil zerado', txt:'Reset manual — começou do zero', quando:new Date().toISOString(), autor:_papel(), tipo:'lost'}];
    _zerado = true;
    _salvar();
    if(_booted) _render();
    _toast('Funil zerado · começando do zero');
    console.log('[FV] Funil resetado · 0 leads · auto-import desativado');
  }

  /* Mapeia o status do Pipeline → etapa do funil */
  function _statusParaEtapa(status){
    const s = (status||'').toString().toLowerCase().trim();
    if(s === 'pago') return 6;
    if(s.includes('fech'))  return 5;
    if(s.includes('propos')) return 4;
    if(s.includes('negoc')) return 3;
    if(s.includes('apres') || s === 'demo') return 2;
    if(s.includes('qualif')) return 1;
    if(s.includes('prospec') || s.includes('novo') || s === 'lead') return 0;
    if(s === 'aberto' || s === '' || s === 'em aberto') return 3; // default → Negociação
    return 3;
  }
  function _tempPorStatus(status, etapa){
    if(etapa === 6) return 'f'; // pago = frio (já vendeu)
    if(etapa >= 4) return 'q';   // proposta/fechamento = quente
    if(etapa === 0) return 'f';  // prospecção = frio
    return 'm';
  }

  /* ═══════════════════════════════════════════════════════════════
     Importa AUTOMATICAMENTE uma venda criada/editada no Pipeline
     Comercial pro Funil de Vendas. Chamada por npSalvarVenda do
     11-pipeline-comercial.js após cada save bem-sucedido.

     Dedupe por _pipelineVendaId — se já existe lead vinculado a
     essa venda, ATUALIZA (mantém id do funil); senão CRIA novo.
     ═══════════════════════════════════════════════════════════════ */
  window._fvAdicionarLeadDePipeline = function(venda, vendaId){
    if(!venda) return;
    if(!_booted){
      /* Funil ainda não foi aberto pelo gestor nessa sessão.
         Carrega o doc do Firebase pra preservar leads existentes
         antes de adicionar. */
      return _carregar().then(function(){ _adicionarLeadInterno(venda, vendaId); });
    }
    _adicionarLeadInterno(venda, vendaId);
  };

  function _adicionarLeadInterno(venda, vendaId){
    if(!vendaId) vendaId = venda.vendaId || venda.id || ('v_' + Date.now());
    var statusV = String(venda.status || 'aberto').toLowerCase();

    /* Cancelada: se já existe lead, marca como perdido; senão ignora */
    if(statusV === 'cancelado' || statusV === 'cancelada'){
      var idxC = _leads.findIndex(function(l){ return l._pipelineVendaId === vendaId; });
      if(idxC >= 0){
        _leads[idxC].etapa = -1;  /* sinal de perdido (não está no kanban) */
        _historico.unshift({leadId:_leads[idxC].id, nome:_leads[idxC].nome, txt:'Venda cancelada no Pipeline → lead perdido', quando:new Date().toISOString(), autor:_papel(), tipo:'lost'});
        _salvar(); if(_booted) _render();
      }
      return;
    }

    var etapa = _statusParaEtapa(statusV);
    var temp = _tempPorStatus(statusV, etapa);
    var idx = _leads.findIndex(function(l){ return l._pipelineVendaId === vendaId; });

    if(idx >= 0){
      /* Atualiza lead existente — preserva o id do funil */
      var existente = _leads[idx];
      var mudouEtapa = existente.etapa !== etapa;
      existente.nome = venda.clienteNome || venda.cliente || existente.nome;
      existente.valor = +(venda.valor) || existente.valor;
      existente.consultor = venda.consultorNome || venda.consultor || existente.consultor;
      existente.treinamento = venda.produto || venda.treinamento || existente.treinamento;
      existente.origem = venda.origemManual || venda.origem || existente.origem;
      existente.notas = venda.obs || existente.notas;
      existente.etapa = etapa;
      existente.temp = temp;
      existente.prob = ETAPAS[etapa] ? ETAPAS[etapa].prob : existente.prob;
      existente.atividade = existente.atividade || [];
      if(mudouEtapa){
        existente.atividade.unshift({quando:_hoje(), txt:'Status atualizado via Pipeline → '+(ETAPAS[etapa] ? ETAPAS[etapa].nome : statusV)});
        _historico.unshift({leadId:existente.id, nome:existente.nome, txt:'Sync do Pipeline · '+(ETAPAS[etapa] ? ETAPAS[etapa].nome : statusV), quando:new Date().toISOString(), autor:_papel(), tipo:'sync'});
      }
    } else {
      /* Cria novo lead */
      var novo = {
        id: _id(),
        _pipelineVendaId: vendaId,
        _src: 'pipeline',
        nome: venda.clienteNome || venda.cliente || 'Sem nome',
        empresa: '',
        valor: +(venda.valor) || 0,
        prob: ETAPAS[etapa] ? ETAPAS[etapa].prob : 30,
        etapa: etapa,
        treinamento: venda.produto || venda.treinamento || '',
        origem: venda.origemManual || venda.origem || 'Pipeline',
        consultor: venda.consultorNome || venda.consultor || '',
        prazo: '',
        temp: temp,
        wpp: '',
        email: '',
        notas: venda.obs || '',
        criadoEm: _hoje(),
        atividade: [{quando:_hoje(), txt:'Importado do Pipeline · ' + (ETAPAS[etapa] ? ETAPAS[etapa].nome : statusV)}]
      };
      _leads.push(novo);
      _historico.unshift({leadId:novo.id, nome:novo.nome, txt:'Novo lead via Pipeline em '+(ETAPAS[etapa] ? ETAPAS[etapa].nome : statusV), quando:new Date().toISOString(), autor:_papel(), tipo:'nova'});
    }
    _salvar();
    if(_booted) _render();
  }

  /* ─────────────────────────────────────────────────────────────
     Escaneia candidatos sem importar — retorna array com:
     { origemKey, origemNome, origemTipo:'turma'|'avulsa', duplicado, lead:{...} }
  ───────────────────────────────────────────────────────────── */
  async function _escanearCandidatos(){
    const out = [];
    const chaveExiste = (n,tr,v) => _leads.some(l => ((l.nome||'').trim().toLowerCase()+'|'+((l.treinamento||'').toLowerCase())+'|'+(+l.valor||0)) === ((n||'').trim().toLowerCase()+'|'+((tr||'').toLowerCase())+'|'+(+v||0)));
    if(!window._fbGet) return out;

    /* 1) Turmas */
    const fbTurmas = await window._fbGet('turmas').catch(()=>({}));
    Object.keys(fbTurmas||{}).forEach(tid => {
      const t = fbTurmas[tid]; if(!t) return;
      const codTurma = t.codigo || t.nome || tid;
      let clientes = t.clientes;
      if(clientes && !Array.isArray(clientes) && typeof clientes === 'object') clientes = Object.values(clientes).filter(Boolean);
      clientes = clientes || [];
      clientes.forEach(c => {
        if(!c || !c.cliente) return;
        const subs = (Array.isArray(c.treinamentos) && c.treinamentos.length)
          ? c.treinamentos.map(s => ({ cod:s.cod||c.treinamento, valor:s.valor!=null?s.valor:c.valor, status:s.status||c.status }))
          : [{ cod:c.treinamento, valor:c.valor, status:c.status }];
        subs.forEach(sub => {
          const cod = (sub.cod||'').toString().toUpperCase().trim();
          const val = +(sub.valor||0);
          if(!cod) return;
          const etapa = _statusParaEtapa(sub.status);
          out.push({
            origemKey: 'turma:'+tid,
            origemNome: '📚 '+codTurma,
            origemTipo: 'turma',
            duplicado: chaveExiste(c.cliente, cod, val),
            statusOrig: sub.status || '—',
            lead: {
              nome: c.cliente,
              empresa: c.empresa || '',
              valor: val,
              prob: etapa === 6 ? 100 : ETAPAS[etapa].prob,
              etapa,
              treinamento: cod,
              origem: c.origem || 'Carteira',
              consultor: (c.consultor || '').toString().trim().toUpperCase() || codTurma,
              prazo: c.followup || c.proximo || '',
              temp: _tempPorStatus(sub.status, etapa),
              wpp: c.whatsapp || c.telefone || c.tel || '',
              email: c.email || '',
              notas: c.obs || c.observacao || '',
              criadoEm: c.dataEntrada || c.criadoEm || _hoje(),
              turmaId: tid,
              turmaCod: codTurma,
            }
          });
        });
      });
    });

    /* 2) Avulsas */
    const ps = await window._fbGet('pipelineSales').catch(()=>({}));
    Object.keys(ps||{}).forEach(ymKey => {
      const bucket = ps[ymKey]; if(!bucket || typeof bucket !== 'object') return;
      Object.values(bucket).forEach(v => {
        if(!v) return;
        const nome = v.cliente || v.nome; if(!nome) return;
        const cod = (v.produto || v.treinamento || '').toString().toUpperCase().trim();
        const val = +(v.valor||0);
        const etapa = _statusParaEtapa(v.status);
        out.push({
          origemKey: 'avulsas',
          origemNome: '💰 Vendas Avulsas (Pipeline)',
          origemTipo: 'avulsa',
          duplicado: chaveExiste(nome, cod, val),
          statusOrig: v.status || '—',
          lead: {
            nome,
            empresa: v.empresa || '',
            valor: val,
            prob: etapa === 6 ? 100 : ETAPAS[etapa].prob,
            etapa,
            treinamento: cod,
            origem: v.origem || 'Lead',
            consultor: (v.consultorNome || v.consultor || '').toString().trim().toUpperCase(),
            prazo: v.followup || '',
            temp: _tempPorStatus(v.status, etapa),
            wpp: v.whatsapp || v.telefone || '',
            email: v.email || '',
            notas: v.observacao || v.obs || '',
            criadoEm: v.data || v.criadoEm || _hoje(),
            turmaId: null,
            vendaId: v.id || null,
          }
        });
      });
    });

    return out;
  }

  /* ─────────────────────────────────────────────────────────────
     Modal de importação — variante 5 (facetas + lista plana)
     Busca cobre: Nome · Empresa · Treinamento · Turma
  ───────────────────────────────────────────────────────────── */
  async function _abrirModalImportar(){
    _toast('Escaneando Pipeline…');
    const candidatos = await _escanearCandidatos();
    if(!candidatos.length){ _toast('Nenhum candidato encontrado no Pipeline.'); return; }
    candidatos.forEach((c,i) => c._idx = i);

    /* Facetas disponíveis */
    const turmasNome = c => c.origemNome.replace(/^[\p{Emoji}\s📚💰]+/u, '').trim();
    const fTurmas = [...new Set(candidatos.map(turmasNome))].sort();
    const fTreins = [...new Set(candidatos.map(c => c.lead.treinamento).filter(Boolean))].sort();
    const fEtapas = ETAPAS.map((e,i) => ({i, nome:e.nome, cor:e.cor}));

    /* Estado: facetas selecionadas (vazio = todas) + busca + quick + seleção individual */
    const stateF = {
      turmas: new Set(),
      treins: new Set(),
      etapas: new Set(),
      busca: '',
      quick: 'all',
      ocultarDup: false
    };
    /* Seleção individual de leads (idx do candidato → boolean) */
    const sel = new Map();
    candidatos.forEach((c,i) => sel.set(i, !c.duplicado));

    const html = `<div class="fv-overlay show" id="fvImpOv">
      <div class="fv-modal" style="width:980px;">
        <div class="fv-modal-h">
          <div class="fv-modal-tit">📥 Importar do Pipeline <span style="font-size:11px;color:var(--txt-3,#6b7280);font-weight:500;">· ${candidatos.length} candidatos</span></div>
          <button class="fv-close" data-close>✕</button>
        </div>
        <div class="fv-modal-b" style="padding:14px 18px;">

          <div class="fv-imp-bar">
            <span class="fv-imp-l">RÁPIDOS</span>
            <button class="fv-imp-chip active" data-quick="all">Tudo</button>
            <button class="fv-imp-chip" data-quick="pagos">Só pagos</button>
            <button class="fv-imp-chip" data-quick="negoc">Só em negociação</button>
            <button class="fv-imp-chip" data-quick="novos">Só novos (não duplicar)</button>
            <div class="fv-imp-busca-wrap">
              <input class="fv-imp-busca" id="fvImpBusca" placeholder="🔍 Nome, empresa, treinamento, turma...">
              <button class="fv-imp-busca-x" id="fvImpBuscaX" style="display:none;">✕</button>
            </div>
          </div>

          <div class="fv-imp-layout">
            <aside class="fv-imp-facets">
              <div class="fv-imp-facets-actions">
                <button class="fv-btn" id="fvImpSelF">✓ Selecionar</button>
                <button class="fv-btn fv-btn-danger" id="fvImpLimparF">✕ Limpar</button>
              </div>
              <div class="fv-imp-fg" data-fgrp="turmas">
                <div class="fv-imp-fh" data-toggle="turmas"><span class="fv-imp-fchev">▼</span> 📚 TURMA <span class="fv-imp-ftot">(${fTurmas.length})</span></div>
                <div class="fv-imp-fbody">
                  <label class="fv-imp-fall" data-fall="turmas"><input type="checkbox"><span class="fv-imp-fall-t">Todas turmas</span><span class="fv-imp-fall-c"><span data-fall-on>0</span>/${fTurmas.length}</span></label>
                  <div id="fvImpFTurmas">${fTurmas.map(t => `<label class="fv-imp-fopt" data-ft="turmas" data-fv="${esc(t)}"><input type="checkbox"><span class="fv-imp-fopt-c">${esc(t)}</span><span class="fv-imp-fopt-q" data-fcnt>0</span></label>`).join('')}</div>
                </div>
              </div>
              <div class="fv-imp-fg" data-fgrp="treins">
                <div class="fv-imp-fh" data-toggle="treins"><span class="fv-imp-fchev">▼</span> 🎓 TREINAMENTO <span class="fv-imp-ftot">(${fTreins.length})</span></div>
                <div class="fv-imp-fbody">
                  <label class="fv-imp-fall" data-fall="treins"><input type="checkbox"><span class="fv-imp-fall-t">Todos treinamentos</span><span class="fv-imp-fall-c"><span data-fall-on>0</span>/${fTreins.length}</span></label>
                  <div id="fvImpFTreins">${fTreins.map(t => `<label class="fv-imp-fopt" data-ft="treins" data-fv="${esc(t)}"><input type="checkbox"><span class="fv-imp-fopt-c">${esc(t)}</span><span class="fv-imp-fopt-q" data-fcnt>0</span></label>`).join('')}</div>
                </div>
              </div>
              <div class="fv-imp-fg" data-fgrp="etapas">
                <div class="fv-imp-fh" data-toggle="etapas"><span class="fv-imp-fchev">▼</span> 🎯 ETAPA <span class="fv-imp-ftot">(${fEtapas.length})</span></div>
                <div class="fv-imp-fbody">
                  <label class="fv-imp-fall" data-fall="etapas"><input type="checkbox"><span class="fv-imp-fall-t">Todas etapas</span><span class="fv-imp-fall-c"><span data-fall-on>0</span>/${fEtapas.length}</span></label>
                  <div id="fvImpFEtapas">${fEtapas.map(e => `<label class="fv-imp-fopt" data-ft="etapas" data-fv="${e.i}"><input type="checkbox"><span class="fv-imp-fopt-c"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${e.cor};margin-right:5px;"></span>${e.nome}</span><span class="fv-imp-fopt-q" data-fcnt>0</span></label>`).join('')}</div>
                </div>
              </div>
            </aside>

            <section class="fv-imp-list-wrap">
              <div class="fv-imp-list-bar">
                <div id="fvImpVisivel" style="font-size:11px;color:var(--txt-2);">— resultados</div>
                <label style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--txt-3,#6b7280);cursor:pointer;"><input type="checkbox" id="fvImpOcultarDup" style="accent-color:var(--accent);"> Ocultar já importados</label>
                <button class="fv-imp-bact" id="fvImpMarcarTodos">✓ Marcar visíveis</button>
                <button class="fv-imp-bact" id="fvImpDesmarcarTodos">✕ Desmarcar visíveis</button>
              </div>
              <div class="fv-imp-list" id="fvImpList"></div>
            </section>
          </div>

        </div>
        <div class="fv-modal-f">
          <div style="font-size:11px;color:var(--txt-2);"><b id="fvImpSel" style="color:var(--accent);">0 selecionados</b> de <span id="fvImpTotal">${candidatos.length}</span> · Total <b id="fvImpTot" style="color:var(--accent);">R$ 0</b></div>
          <div style="display:flex;gap:6px;">
            <button class="fv-btn" data-close>Cancelar</button>
            <button class="fv-btn fv-btn-primary" id="fvImpConfirm">📥 Importar selecionados</button>
          </div>
        </div>
      </div>
    </div>`;
    const wrap = document.createElement('div'); wrap.innerHTML = html; document.body.appendChild(wrap.firstElementChild);
    const ov = $('#fvImpOv');

    /* CSS específico (1ª vez) */
    if(!document.getElementById('fvImpCss')){
      const st = document.createElement('style'); st.id='fvImpCss';
      st.textContent = `
.fv-imp-bar{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; padding:10px 14px; background:var(--bg-3,#1c2128); border-radius:10px; margin-bottom:12px; }
.fv-imp-l{ font-size:10px; text-transform:uppercase; color:var(--txt-3,#6b7280); letter-spacing:0.06em; font-weight:600; }
.fv-imp-chip{ background:var(--bg,#0d1117); border:1px solid var(--border); color:var(--txt-2); padding:5px 11px; border-radius:5px; font-size:11px; cursor:pointer; font-family:inherit; }
.fv-imp-chip.active{ background:rgba(212,165,116,0.15); border-color:var(--accent); color:var(--accent); }
.fv-imp-busca-wrap{ position:relative; flex:1; max-width:320px; margin-left:auto; }
.fv-imp-busca{ width:100%; background:var(--bg,#0d1117); border:1px solid var(--border); color:var(--txt); padding:6px 32px 6px 10px; border-radius:6px; font-size:11px; font-family:inherit; box-sizing:border-box; }
.fv-imp-busca:focus{ outline:none; border-color:var(--accent); }
.fv-imp-busca-x{ position:absolute; right:5px; top:50%; transform:translateY(-50%); background:rgba(255,255,255,0.08); border:none; color:var(--txt-2); padding:2px 7px; border-radius:4px; font-size:10px; cursor:pointer; font-family:inherit; }
.fv-imp-busca-x:hover{ background:rgba(255,255,255,0.16); color:var(--txt); }

.fv-imp-layout{ display:grid; grid-template-columns:220px 1fr; gap:14px; }
.fv-imp-facets{ background:var(--bg-3,#1c2128); border:1px solid var(--border); border-radius:10px; padding:12px; max-height:520px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; }
.fv-imp-facets::-webkit-scrollbar{ width:5px; }
.fv-imp-facets::-webkit-scrollbar-thumb{ background:rgba(255,255,255,0.14); border-radius:3px; }
.fv-imp-facets-actions{ display:grid; grid-template-columns:1fr 1fr; gap:6px; padding-bottom:10px; border-bottom:1px solid var(--border); position:sticky; top:-12px; background:var(--bg-3,#1c2128); margin:-12px -4px 0; padding:8px 4px 10px; z-index:2; }
.fv-imp-facets-actions .fv-btn{ padding:7px 8px; font-size:11px; font-weight:600; }
.fv-btn-danger{ background:rgba(239,68,68,0.06); border-color:rgba(239,68,68,0.25); color:#ef4444; }
.fv-btn-danger:hover{ background:rgba(239,68,68,0.12); }
.fv-imp-fg{ display:flex; flex-direction:column; gap:1px; padding-bottom:10px; border-bottom:1px solid var(--border); }
.fv-imp-fg:last-of-type{ border-bottom:none; padding-bottom:0; }
.fv-imp-fh{ font-size:10px; text-transform:uppercase; color:var(--txt-2); letter-spacing:0.06em; font-weight:700; margin-bottom:6px; padding:4px; cursor:pointer; user-select:none; display:flex; align-items:center; gap:5px; border-radius:4px; }
.fv-imp-fh:hover{ background:rgba(255,255,255,0.03); color:var(--txt); }
.fv-imp-fchev{ font-size:11px; color:var(--txt-3,#6b7280); transition:transform 0.2s; display:inline-block; }
.fv-imp-ftot{ color:var(--txt-3,#6b7280); margin-left:auto; font-weight:600; }
.fv-imp-fg.fg-closed .fv-imp-fchev{ transform:rotate(-90deg); }
.fv-imp-fg.fg-closed .fv-imp-fbody{ display:none; }
.fv-imp-fall{ display:flex; align-items:center; gap:6px; padding:5px 6px; background:rgba(212,165,116,0.05); border:1px solid rgba(212,165,116,0.18); border-radius:4px; cursor:pointer; margin-bottom:4px; font-size:10px; transition:all 0.15s; }
.fv-imp-fall:hover{ background:rgba(212,165,116,0.08); border-color:rgba(212,165,116,0.28); }
.fv-imp-fall input[type=checkbox]{ accent-color:var(--accent); width:12px; height:12px; cursor:pointer; }
.fv-imp-fall-t{ color:var(--accent); font-weight:600; flex:1; }
.fv-imp-fall-c{ font-size:9px; color:var(--accent); font-variant-numeric:tabular-nums; }
.fv-imp-fopt{ display:flex; align-items:center; gap:6px; padding:4px 6px; border-radius:4px; cursor:pointer; font-size:11px; transition:background 0.1s; }
.fv-imp-fopt:hover{ background:rgba(255,255,255,0.04); }
.fv-imp-fopt input[type=checkbox]{ accent-color:var(--accent); width:13px; height:13px; cursor:pointer; flex-shrink:0; }
.fv-imp-fopt-c{ flex:1; color:var(--txt); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.fv-imp-fopt-q{ font-size:10px; color:var(--txt-3,#6b7280); background:var(--bg,#0d1117); padding:1px 7px; border-radius:7px; font-weight:600; font-variant-numeric:tabular-nums; min-width:24px; text-align:center; }
.fv-imp-fopt.fopt-zero{ opacity:0.4; cursor:not-allowed; }
.fv-imp-fopt.fopt-zero .fv-imp-fopt-q{ color:var(--txt-3,#6b7280); }
.fv-imp-fopt.fopt-active{ background:rgba(212,165,116,0.08); }
.fv-imp-fopt.fopt-active .fv-imp-fopt-c{ color:var(--accent); font-weight:600; }

.fv-imp-list-wrap{ display:flex; flex-direction:column; max-height:520px; }
.fv-imp-list-bar{ display:flex; gap:10px; align-items:center; padding:8px 12px; background:var(--bg-3,#1c2128); border:1px solid var(--border); border-radius:8px 8px 0 0; border-bottom:none; }
.fv-imp-bact{ background:transparent; border:1px solid var(--border); color:var(--txt-2); padding:4px 9px; border-radius:5px; font-size:10px; cursor:pointer; font-family:inherit; }
.fv-imp-bact:hover{ border-color:var(--accent); color:var(--accent); }
.fv-imp-list{ flex:1; overflow-y:auto; background:var(--bg-3,#1c2128); border:1px solid var(--border); border-radius:0 0 8px 8px; padding:8px; display:flex; flex-direction:column; gap:4px; }
.fv-imp-list::-webkit-scrollbar{ width:5px; }
.fv-imp-list::-webkit-scrollbar-thumb{ background:rgba(255,255,255,0.14); border-radius:3px; }
.fv-imp-vazio{ text-align:center; padding:40px 20px; color:var(--txt-3,#6b7280); font-size:12px; }
.fv-imp-item{ display:grid; grid-template-columns:24px 1fr 100px 70px 60px 80px; gap:8px; align-items:center; padding:7px 10px; background:var(--bg,#0d1117); border-radius:6px; font-size:11px; cursor:pointer; transition:all 0.1s; border:1px solid transparent; }
.fv-imp-item:hover{ border-color:var(--border); background:rgba(255,255,255,0.02); }
.fv-imp-item.dup{ opacity:0.5; cursor:not-allowed; background:rgba(245,158,11,0.04); }
.fv-imp-item input[type=checkbox]{ accent-color:var(--accent); width:14px; height:14px; cursor:pointer; }
.fv-imp-item input:disabled{ cursor:not-allowed; }
.fv-imp-i-n{ font-weight:600; font-size:11px; line-height:1.2; }
.fv-imp-i-e{ font-size:9px; color:var(--txt-3,#6b7280); margin-top:1px; line-height:1.2; }
.fv-imp-stage{ color:#fff; padding:2px 7px; border-radius:4px; font-size:9px; font-weight:700; text-transform:uppercase; text-align:center; }
.fv-imp-trein{ background:rgba(212,165,116,0.12); color:var(--accent); padding:2px 6px; border-radius:4px; font-size:9px; font-weight:700; text-align:center; }
.fv-imp-loc{ background:rgba(59,130,246,0.12); color:#3b82f6; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:600; text-align:center; }
.fv-imp-val{ font-size:11px; font-weight:700; color:var(--accent); font-variant-numeric:tabular-nums; text-align:right; }
.fv-imp-item mark{ background:rgba(212,165,116,0.4); color:#fff; padding:0 2px; border-radius:2px; font-weight:700; }
      `;
      document.head.appendChild(st);
    }

    /* Helpers */
    function highlightHtml(text){
      const t = text || '';
      const q = (stateF.busca || '').trim();
      if(!q) return esc(t);
      const re = new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi');
      return esc(t).replace(re, '<mark>$1</mark>');
    }
    function passaQuick(c){
      if(stateF.quick === 'pagos') return c.lead.etapa === 6;
      if(stateF.quick === 'negoc') return c.lead.etapa < 6;
      if(stateF.quick === 'novos') return !c.duplicado;
      return true;
    }
    function passaBusca(c){
      const q = stateF.busca.toLowerCase().trim();
      if(!q) return true;
      return (c.lead.nome||'').toLowerCase().includes(q)
        || (c.lead.empresa||'').toLowerCase().includes(q)
        || (c.lead.treinamento||'').toLowerCase().includes(q)
        || turmasNome(c).toLowerCase().includes(q);
    }
    function passaFacetas(c, exclude){
      const tName = turmasNome(c);
      if(exclude !== 'turmas' && stateF.turmas.size && !stateF.turmas.has(tName)) return false;
      if(exclude !== 'treins' && stateF.treins.size && !stateF.treins.has(c.lead.treinamento)) return false;
      if(exclude !== 'etapas' && stateF.etapas.size && !stateF.etapas.has(String(c.lead.etapa))) return false;
      return true;
    }
    function ocultoDup(c){ return stateF.ocultarDup && c.duplicado; }
    function filtrados(exclude){
      return candidatos.filter(c => passaQuick(c) && passaBusca(c) && !ocultoDup(c) && passaFacetas(c, exclude));
    }
    function visiveis(){ return filtrados(null); }

    function renderFacets(){
      /* Atualiza contagens — cada faceta usa filtrados EXCLUINDO seu próprio grupo */
      const cTurmas = {}, cTreins = {}, cEtapas = {};
      filtrados('turmas').forEach(c => { const t = turmasNome(c); cTurmas[t] = (cTurmas[t]||0)+1; });
      filtrados('treins').forEach(c => { cTreins[c.lead.treinamento] = (cTreins[c.lead.treinamento]||0)+1; });
      filtrados('etapas').forEach(c => { cEtapas[c.lead.etapa] = (cEtapas[c.lead.etapa]||0)+1; });
      ov.querySelectorAll('.fv-imp-fopt').forEach(o => {
        const f = o.dataset.ft, v = o.dataset.fv;
        let n = 0;
        if(f === 'turmas') n = cTurmas[v] || 0;
        else if(f === 'treins') n = cTreins[v] || 0;
        else if(f === 'etapas') n = cEtapas[+v] || 0;
        o.querySelector('[data-fcnt]').textContent = n;
        o.classList.toggle('fopt-zero', n === 0);
        const set = stateF[f];
        const checked = set.has(f === 'etapas' ? String(v) : v);
        o.querySelector('input').checked = checked;
        o.classList.toggle('fopt-active', checked);
      });
      /* Atualiza linhas "Todos / Todas" (tri-state checkbox + contador) */
      ov.querySelectorAll('.fv-imp-fall').forEach(row => {
        const f = row.dataset.fall;
        const opts = ov.querySelectorAll('.fv-imp-fopt[data-ft="'+f+'"]:not(.fopt-zero)');
        const total = opts.length;
        const set = stateF[f];
        let marcados = 0;
        opts.forEach(o => {
          const v = f === 'etapas' ? String(o.dataset.fv) : o.dataset.fv;
          if(set.has(v)) marcados++;
        });
        const cb = row.querySelector('input');
        cb.checked = total > 0 && marcados === total;
        cb.indeterminate = marcados > 0 && marcados < total;
        row.querySelector('[data-fall-on]').textContent = marcados;
        const cnt = row.querySelector('.fv-imp-fall-c');
        if(cnt) cnt.innerHTML = '<span data-fall-on>'+marcados+'</span>/'+total;
      });
    }
    function renderList(){
      const arr = visiveis();
      const el = $('#fvImpList', ov);
      $('#fvImpVisivel', ov).innerHTML = arr.length
        ? `<b style="color:var(--accent);">${arr.length}</b> resultado${arr.length>1?'s':''}${stateF.busca?(' para "<b>'+esc(stateF.busca)+'</b>"'):''}`
        : 'Nenhum resultado';
      if(!arr.length){ el.innerHTML = '<div class="fv-imp-vazio">🔍 Nenhum candidato encontrado · ajuste os filtros</div>'; updateTotais(); return; }
      el.innerHTML = arr.map(c => {
        const et = ETAPAS[c.lead.etapa];
        const chk = sel.get(c._idx) ? 'checked' : '';
        const cls = c.duplicado ? 'fv-imp-item dup' : 'fv-imp-item';
        const dis = c.duplicado ? 'disabled' : '';
        const turmaTag = turmasNome(c);
        return `<label class="${cls}">
          <input type="checkbox" data-cand="${c._idx}" ${chk} ${dis}>
          <div>
            <div class="fv-imp-i-n">${highlightHtml(c.lead.nome)}${c.duplicado?' <span style="color:#f59e0b;font-size:9px;">(já importado)</span>':''}</div>
            <div class="fv-imp-i-e">${highlightHtml(c.lead.empresa||'—')}${c.statusOrig?(' · status: '+esc(c.statusOrig)):''}</div>
          </div>
          <span class="fv-imp-stage" style="background:${et.cor};">${et.nome}</span>
          <span class="fv-imp-trein">${highlightHtml(c.lead.treinamento)}</span>
          <span class="fv-imp-loc">${highlightHtml(turmaTag)}</span>
          <span class="fv-imp-val">${moedaCurta(c.lead.valor)}</span>
        </label>`;
      }).join('');
      el.querySelectorAll('input[data-cand]').forEach(cb => cb.addEventListener('change', () => {
        sel.set(+cb.dataset.cand, cb.checked); updateTotais();
      }));
      updateTotais();
    }
    function updateTotais(){
      let n = 0, total = 0;
      sel.forEach((v, i) => { if(v && !candidatos[i].duplicado){ n++; total += +(candidatos[i].lead.valor)||0; } });
      $('#fvImpSel', ov).textContent = n + ' selecionado' + (n===1?'':'s');
      $('#fvImpTot', ov).textContent = moedaCurta(total);
      /* Habilita/desabilita botão de importar conforme seleção */
      const btn = $('#fvImpConfirm', ov);
      if(btn){
        btn.disabled = (n === 0);
        btn.textContent = n === 0 ? '📥 Selecione ao menos 1 lead' : `📥 Importar ${n} lead${n>1?'s':''}`;
      }
    }
    function rerender(){ renderFacets(); renderList(); }

    /* Eventos */
    const close = () => ov.remove();
    ov.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    ov.addEventListener('click', e => { if(e.target === ov) close(); });

    /* Facetas: clique no opt */
    ov.querySelectorAll('.fv-imp-fopt').forEach(o => o.addEventListener('click', e => {
      e.preventDefault();
      if(o.classList.contains('fopt-zero')) return;
      const f = o.dataset.ft, v = f === 'etapas' ? String(o.dataset.fv) : o.dataset.fv;
      const set = stateF[f];
      if(set.has(v)) set.delete(v); else set.add(v);
      rerender();
    }));

    /* Facetas: chevron / colapsar grupo */
    ov.querySelectorAll('.fv-imp-fh[data-toggle]').forEach(h => h.addEventListener('click', () => {
      const grp = h.parentElement; /* .fv-imp-fg */
      grp.classList.toggle('fg-closed');
    }));

    /* Facetas: linha "Todos / Todas" — selecionar/desmarcar tudo do grupo */
    ov.querySelectorAll('.fv-imp-fall').forEach(row => row.addEventListener('click', e => {
      e.preventDefault();
      const f = row.dataset.fall;
      const set = stateF[f];
      /* Pega TODAS as opções DISPONÍVEIS (não-zero) desse grupo */
      const opts = [...ov.querySelectorAll('.fv-imp-fopt[data-ft="'+f+'"]:not(.fopt-zero)')];
      const valsDisponiveis = opts.map(o => f === 'etapas' ? String(o.dataset.fv) : o.dataset.fv);
      const todasMarcadas = valsDisponiveis.length > 0 && valsDisponiveis.every(v => set.has(v));
      if(todasMarcadas){ valsDisponiveis.forEach(v => set.delete(v)); }
      else { valsDisponiveis.forEach(v => set.add(v)); }
      rerender();
    }));

    /* Limpar facetas */
    /* Selecionar TODAS as facetas disponíveis (todos os 3 grupos) */
    ov.querySelector('#fvImpSelF').addEventListener('click', () => {
      ['turmas','treins','etapas'].forEach(f => {
        const opts = ov.querySelectorAll('.fv-imp-fopt[data-ft="'+f+'"]:not(.fopt-zero)');
        opts.forEach(o => {
          const v = f === 'etapas' ? String(o.dataset.fv) : o.dataset.fv;
          stateF[f].add(v);
        });
      });
      rerender();
    });

    ov.querySelector('#fvImpLimparF').addEventListener('click', () => {
      stateF.turmas.clear(); stateF.treins.clear(); stateF.etapas.clear();
      rerender();
    });

    /* Chips rápidos */
    ov.querySelectorAll('.fv-imp-chip[data-quick]').forEach(b => b.addEventListener('click', () => {
      ov.querySelectorAll('.fv-imp-chip[data-quick]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      stateF.quick = b.dataset.quick;
      /* Re-marca seleção conforme quick (só visíveis) */
      candidatos.forEach((c,i) => {
        if(c.duplicado){ sel.set(i, false); return; }
        if(stateF.quick === 'pagos') sel.set(i, c.lead.etapa === 6);
        else if(stateF.quick === 'negoc') sel.set(i, c.lead.etapa < 6);
        else sel.set(i, true);
      });
      rerender();
    }));

    /* Busca */
    const busca = $('#fvImpBusca', ov);
    const buscaX = $('#fvImpBuscaX', ov);
    busca.addEventListener('input', () => {
      stateF.busca = busca.value;
      buscaX.style.display = stateF.busca ? 'block' : 'none';
      rerender();
    });
    buscaX.addEventListener('click', () => { busca.value = ''; stateF.busca = ''; buscaX.style.display='none'; rerender(); busca.focus(); });

    /* Ocultar duplicados */
    ov.querySelector('#fvImpOcultarDup').addEventListener('change', e => { stateF.ocultarDup = e.target.checked; renderList(); });

    /* Marcar/desmarcar visíveis */
    ov.querySelector('#fvImpMarcarTodos').addEventListener('click', () => {
      visiveis().forEach(c => { if(!c.duplicado) sel.set(c._idx, true); });
      renderList();
    });
    ov.querySelector('#fvImpDesmarcarTodos').addEventListener('click', () => {
      visiveis().forEach(c => sel.set(c._idx, false));
      renderList();
    });

    /* Confirmar */
    ov.querySelector('#fvImpConfirm').addEventListener('click', () => {
      let novos = 0;
      sel.forEach((v, i) => {
        if(!v) return;
        const c = candidatos[i];
        if(c.duplicado) return;
        _leads.push({ id: _id(), atividade: [{quando:_hoje(), txt:'Importado · '+turmasNome(c)}], ...c.lead });
        novos++;
      });
      if(!novos){ _toast('Nenhum lead selecionado.'); return; }
      _historico.unshift({leadId:null, nome:novos+' lead'+(novos>1?'s':''), txt:'Importação seletiva', quando:new Date().toISOString(), autor:_papel(), tipo:'import'});
      _zerado = false;
      _salvar();
      close();
      _render();
      _toast(`${novos} lead${novos>1?'s':''} importado${novos>1?'s':''}`);
    });

    /* Render inicial */
    rerender();
  }

  /* Importa direto de:
     1. turmas/* → varre TODAS as turmas e seus clientes (qualquer status)
     2. pipelineSales → vendas avulsas (todos os meses)
     Mesma fonte usada pelo _mapCarregar em 30-sync-ferramentas.js. */
  async function _importarDoPipeline(silent){
    let novos = 0;
    const chaveExiste = (n,tr,v) => _leads.some(l => ((l.nome||'').trim().toLowerCase()+'|'+((l.treinamento||'').toLowerCase())+'|'+(+l.valor||0)) === ((n||'').trim().toLowerCase()+'|'+((tr||'').toLowerCase())+'|'+(+v||0)));

    try{
      if(!window._fbGet){
        if(!silent) _toast('Firebase não disponível.');
        console.warn('[FV] window._fbGet ausente');
        return 0;
      }

      /* ── 1) Clientes de TODAS as turmas (turmas/{id}.clientes) ── */
      const fbTurmas = await window._fbGet('turmas').catch(()=>({}));
      const turmas = fbTurmas || {};
      console.log('[FV] Importando: turmas encontradas =', Object.keys(turmas).length);

      Object.keys(turmas).forEach(tid => {
        const t = turmas[tid];
        if(!t) return;
        const codTurma = t.codigo || t.nome || tid;
        let clientes = t.clientes;
        if(clientes && !Array.isArray(clientes) && typeof clientes === 'object') clientes = Object.values(clientes).filter(Boolean);
        clientes = clientes || [];
        clientes.forEach(c => {
          if(!c || !c.cliente) return;
          const subs = (Array.isArray(c.treinamentos) && c.treinamentos.length)
            ? c.treinamentos.map(s => ({ cod: s.cod || c.treinamento, valor: s.valor != null ? s.valor : c.valor, status: s.status || c.status }))
            : [{ cod: c.treinamento, valor: c.valor, status: c.status }];
          subs.forEach(sub => {
            const cod = (sub.cod||'').toString().toUpperCase().trim();
            const val = +(sub.valor||0);
            if(!cod || chaveExiste(c.cliente, cod, val)) return;
            const etapa = _statusParaEtapa(sub.status);
            _leads.push({
              id: _id(),
              nome: c.cliente,
              empresa: c.empresa || '',
              valor: val,
              prob: etapa === 6 ? 100 : ETAPAS[etapa].prob,
              etapa,
              treinamento: cod,
              origem: c.origem || 'Carteira',
              consultor: (c.consultor || '').toString().trim().toUpperCase() || codTurma,
              prazo: c.followup || c.proximo || '',
              temp: _tempPorStatus(sub.status, etapa),
              wpp: c.whatsapp || c.telefone || c.tel || '',
              email: c.email || '',
              notas: c.obs || c.observacao || '',
              criadoEm: c.dataEntrada || c.criadoEm || _hoje(),
              turmaId: tid,
              turmaCod: codTurma,
              atividade: [{quando:_hoje(), txt:'Importado da turma '+codTurma}]
            });
            novos++;
          });
        });
      });

      /* ── 2) Vendas avulsas (pipelineSales) ── */
      const ps = await window._fbGet('pipelineSales').catch(()=>({}));
      console.log('[FV] Importando: meses de avulsas =', Object.keys(ps||{}).length);
      if(ps && typeof ps === 'object'){
        Object.keys(ps).forEach(ymKey => {
          const bucket = ps[ymKey];
          if(!bucket || typeof bucket !== 'object') return;
          Object.values(bucket).forEach(v => {
            if(!v) return;
            const nome = v.cliente || v.nome;
            if(!nome) return;
            const cod = (v.produto || v.treinamento || '').toString().toUpperCase().trim();
            const val = +(v.valor||0);
            if(chaveExiste(nome, cod, val)) return;
            const etapa = _statusParaEtapa(v.status);
            _leads.push({
              id: _id(),
              nome,
              empresa: v.empresa || '',
              valor: val,
              prob: etapa === 6 ? 100 : ETAPAS[etapa].prob,
              etapa,
              treinamento: cod,
              origem: v.origem || 'Lead',
              consultor: (v.consultorNome || v.consultor || '').toString().trim().toUpperCase(),
              prazo: v.followup || '',
              temp: _tempPorStatus(v.status, etapa),
              wpp: v.whatsapp || v.telefone || '',
              email: v.email || '',
              notas: v.observacao || v.obs || '',
              criadoEm: v.data || v.criadoEm || _hoje(),
              turmaId: null,
              vendaId: v.id || null,
              atividade: [{quando: v.data || _hoje(), txt:'Importado do Pipeline (avulsa)'}]
            });
            novos++;
          });
        });
      }

      console.log('[FV] Importação concluída: novos =', novos, '· total leads =', _leads.length);
    }catch(e){ console.warn('[FV] importar do Pipeline', e); }

    if(novos > 0){
      _historico.unshift({leadId:null, nome:novos+' lead'+(novos>1?'s':''), txt:'Importado do Pipeline + Turma', quando:new Date().toISOString(), autor:'Sistema', tipo:'import'});
      _salvar();
    }
    if(!silent) _toast(novos ? `${novos} leads importados do Pipeline` : 'Pipeline já está sincronizado');
    return novos;
  }

  /* ── F1/F3 · Render ── */
  function _filtrar(arr){
    return arr.filter(l => {
      if(_filtroEtapa != null && l.etapa !== _filtroEtapa) return false;
      if(_filtros.cons   && l.consultor !== _filtros.cons) return false;
      if(_filtros.trein  && l.treinamento !== _filtros.trein) return false;
      if(_filtros.origem){
        if(_filtros.origem === '__outro__'){ /* texto livre */ }
        else if(l.origem !== _filtros.origem) return false;
      }
      if(_filtros.busca){
        const q = _filtros.busca.toLowerCase();
        if(!((l.nome||'').toLowerCase().includes(q) || (l.empresa||'').toLowerCase().includes(q))) return false;
      }
      if(_filtros.temp && l.temp !== _filtros.temp) return false;
      if(_filtros.per === '7' || _filtros.per === '30'){
        const dias = _difDias(l.criadoEm);
        if(dias != null && dias > +_filtros.per) return false;
      }
      return true;
    });
  }

  function _statsEtapas(arr){
    const c = ETAPAS.map(_=>({qtd:0, soma:0}));
    arr.forEach(l => { if(c[l.etapa]){ c[l.etapa].qtd++; c[l.etapa].soma += +(l.valor||0); } });
    return c;
  }

  function _calcKpis(arr){
    const stats = _statsEtapas(arr);
    const total = arr.length;
    const vendidos = stats[6].qtd;
    const emNeg = total - vendidos;
    const taxaConv = total ? (vendidos / total * 100) : 0;
    const ticket = vendidos ? stats[6].soma / vendidos : 0;
    const atrasos = arr.filter(l => { const d=_diasAteHoje(l.prazo); return d != null && d < 0 && l.etapa !== 6; }).length;
    const pipeline = arr.reduce((s,l)=>s+ +(l.valor||0)*((l.prob||0)/100), 0);
    const ciclos = arr.filter(l => l.etapa === 6 && l.criadoEm).map(l => _difDias(l.criadoEm)).filter(d => d>=0);
    const cicloMed = ciclos.length ? Math.round(ciclos.reduce((a,b)=>a+b,0)/ciclos.length) : 0;
    const noShow = total ? Math.round(arr.filter(l => l.temp==='f').length / total * 100) : 0;
    return { emNeg, vendidos, taxaConv, ticket, atrasos, pipeline, cicloMed, noShow, stats };
  }

  function _renderKpis(arr){
    const k = _calcKpis(arr);
    const r1 = [
      ['Em Negociação','accent', k.emNeg],
      ['Vendidos','green', k.vendidos],
      ['Conversão Geral','blue', k.taxaConv.toFixed(1).replace('.',',')+'%'],
      ['Ticket Médio','amber', moedaCurta(k.ticket)],
      ['Follow-up Atraso','red', k.atrasos]
    ];
    const r2 = [
      ['Pipeline Ponderado','accent', moedaCurta(k.pipeline)],
      ['Ciclo Médio','purple', k.cicloMed + 'd'],
      ['Temperatura Fria','cyan', k.noShow + '%'],
      ['Total Ativo','green', arr.length],
      ['Origens Distintas','accent', new Set(arr.map(l=>l.origem)).size]
    ];
    const mk = (it,cls)=>it.map(([l,c,v])=>`<div class="fv-kpi ${c}"><div class="fv-kpi-l">${l}</div><div class="fv-kpi-v">${v}</div></div>`).join('');
    $('#fvKpis1').innerHTML = mk(r1);
    $('#fvKpis2').innerHTML = mk(r2);

    // Alertas
    const alertas = [];
    if(k.atrasos > 0) alertas.push(`<b>${k.atrasos} follow-up${k.atrasos>1?'s':''} em atraso</b>`);
    const parados = arr.filter(l => { if(l.etapa===6) return false; const ult=l.atividade && l.atividade[l.atividade.length-1]; return ult && _difDias(ult.quando) > 14; }).length;
    if(parados > 0) alertas.push(`<b>${parados} card${parados>1?'s':''} parado${parados>1?'s':''} há +14 dias</b>`);
    const bar = $('#fvAlertas'); const txt = $('#fvAlertasTxt');
    if(alertas.length){ bar.style.display='flex'; txt.innerHTML = alertas.join(' · '); } else { bar.style.display='none'; }
  }

  function _renderFunilSide(arr){
    const stats = _statsEtapas(arr);
    const wrap = $('#fvFunilEtapas'); if(!wrap) return;
    /* Todas as etapas com a mesma largura */
    const widths = [100, 100, 100, 100, 100, 100, 100];
    /* Gradiente: cor base → tom mais escuro (15% darker) */
    const darken = (hex) => {
      const n = parseInt(hex.slice(1), 16);
      const r = Math.max(0, ((n>>16)&255) - 24);
      const g = Math.max(0, ((n>>8)&255)  - 24);
      const b = Math.max(0, (n&255)        - 24);
      return '#' + ((1<<24) | (r<<16) | (g<<8) | b).toString(16).slice(1);
    };
    wrap.className = 'fv-funil-pir';
    wrap.innerHTML = ETAPAS.map((et, i) => {
      const conv = i === 0 ? '100%' : stats[i-1].qtd ? Math.round(stats[i].qtd/stats[i-1].qtd*100)+'%' : '—';
      const qtd = stats[i].qtd;
      const label = qtd === 1 ? 'lead' : 'leads';
      const grad = `linear-gradient(180deg, ${et.cor}, ${darken(et.cor)})`;
      return `<div class="fv-fe ${_filtroEtapa===i?'active':''}" data-et="${i}" style="width:${widths[i]}%;background:${grad};" title="${qtd} ${label} em ${et.nome}">
        <span class="fv-fe-l">${et.nome}</span>
        <span class="fv-fe-r">${i>0?`<span class="fv-fe-c">${conv}</span>`:''}<span class="fv-fe-badge"><b>${qtd}</b> ${label}</span></span>
      </div>`;
    }).join('');
    wrap.querySelectorAll('.fv-fe').forEach(e => {
      e.addEventListener('click', () => {
        const idx = +e.dataset.et;
        _filtroEtapa = (_filtroEtapa === idx) ? null : idx;
        if(_filtroEtapa != null){ _setModo('lista'); }
        _render();
      });
    });
    const total = arr.length, vendidos = stats[6].qtd;
    $('#fvTaxa').textContent = total ? (vendidos/total*100).toFixed(1).replace('.',',')+'%' : '—';
    $('#fvReceita').textContent = moedaCurta(stats[6].soma);
  }

  function _renderHistorico(){
    const wrap = $('#fvHistList'); if(!wrap) return;
    const top = _historico.slice(0, 8);
    if(!top.length){ wrap.innerHTML = '<div style="font-size:10px;color:var(--txt-3,#6b7280);text-align:center;padding:8px;">Sem movimentações ainda.</div>'; return; }
    const corPorTipo = {move:'#d4a574', sale:'#34d399', nova:'#3b82f6', lost:'#ef4444', import:'#f59e0b'};
    wrap.innerHTML = top.map(h => {
      const d = h.quando ? _difDias(h.quando) : null;
      const tempo = d==null?'—' : d<1?'hoje' : d<2?'ontem' : d+'d';
      return `<div class="fv-hist-item">
        <div class="fv-hist-dot" style="background:${corPorTipo[h.tipo]||'#d4a574'};"></div>
        <div class="fv-hist-c"><div class="fv-hist-cn">${esc(h.nome||'')}</div><div class="fv-hist-cd">${esc(h.txt||'')}${h.autor?(' · por '+esc(h.autor)):''}</div></div>
        <div class="fv-hist-t">${tempo}</div>
      </div>`;
    }).join('');
  }

  function _cardHtml(l, etCor){
    const probCls = l.prob>=70?'':(l.prob>=40?'m':'l');
    const tempIcon = l.temp==='q'?'🔥':(l.temp==='m'?'🌤':(l.temp==='f'?'❄':''));
    const cardCls = (l.temp==='q'?'hot':(l.temp==='f'?'cold':''));
    let prazoTxt = '—', prazoCls = '';
    const dias = _diasAteHoje(l.prazo);
    if(l.prazo){
      if(dias < 0){ prazoTxt = dias+'d ⚠'; prazoCls='atr'; }
      else if(dias === 0){ prazoTxt='Hoje'; prazoCls='ok'; }
      else if(dias === 1){ prazoTxt='Amanhã'; prazoCls='ok'; }
      else { prazoTxt = dias+' dias'; }
    }
    const ult = l.atividade && l.atividade[l.atividade.length-1];
    const ultTxt = ult ? `${_difDias(ult.quando)}d atrás` : '—';
    return `<div class="fv-card ${cardCls}" draggable="true" data-id="${l.id}" style="--col-cor:${etCor};">
      ${tempIcon?`<span class="fv-card-temp">${tempIcon}</span>`:''}
      <div class="fv-card-nome">${esc(l.nome)}</div>
      ${l.empresa?`<div class="fv-card-emp">${esc(l.empresa)}</div>`:''}
      <div class="fv-card-val">${moedaCurta(l.valor)} <span class="fv-card-prob ${probCls}">${l.prob||0}%</span></div>
      <div class="fv-card-row">
        ${l.treinamento?`<span class="fv-card-tag tr">${esc(l.treinamento)}</span>`:''}
        ${l.origem?`<span class="fv-card-tag or">${esc(l.origem)}</span>`:''}
      </div>
      <div class="fv-card-foot">
        <div class="fv-card-cons"><span class="fv-av">${_inic(l.consultor)}</span>${esc((l.consultor||'').split(' ')[0])}</div>
        <div class="fv-card-prazo ${prazoCls}">${prazoTxt}</div>
      </div>
      <div class="fv-card-act">Última: ${ultTxt}</div>
    </div>`;
  }

  function _renderKanban(arr){
    const wrap = $('#fvKanban'); if(!wrap) return;
    wrap.innerHTML = ETAPAS.map((et, i) => {
      const leadsEt = arr.filter(l => l.etapa === i);
      const soma = leadsEt.reduce((s,l)=>s+ +(l.valor||0),0);
      const cards = leadsEt.map(l => _cardHtml(l, et.cor)).join('');
      const mais = leadsEt.length > _maxCards ? `<div class="fv-col-mais">↓ Ver mais ${leadsEt.length - _maxCards} lead${leadsEt.length - _maxCards>1?'s':''}</div>` : '';
      return `<div class="fv-col" data-et="${i}" style="--col-cor:${et.cor};">
        <div class="fv-col-h"><span class="fv-col-tit">${et.nome}</span><span class="fv-col-qtd">${leadsEt.length}</span></div>
        <div class="fv-col-soma">💰 <b>${moedaCurta(soma)}</b></div>
        <button class="fv-col-add" data-et="${i}">+ Adicionar lead em ${et.nome}</button>
        ${cards}
        ${mais}
      </div>`;
    }).join('');
    _attachKanbanEvents();
  }

  function _renderLista(arr){
    const tbody = $('#fvListaTbody'); if(!tbody) return;
    if(!arr.length){ tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:30px;color:var(--txt-3,#6b7280);">Nenhum lead encontrado.</td></tr>`; return; }
    const ord = arr.slice().sort((a,b)=>{
      const pa = a.temp==='q'?0:a.temp==='m'?1:a.temp==='f'?2:3;
      const pb = b.temp==='q'?0:b.temp==='m'?1:b.temp==='f'?2:3;
      if(pa!==pb) return pa-pb;
      return (b.prob||0) - (a.prob||0);
    });
    tbody.innerHTML = ord.map(l => {
      const et = ETAPAS[l.etapa] || ETAPAS[0];
      const probCls = l.prob>=70?'':(l.prob>=40?'m':'l');
      const tempIcon = l.temp==='q'?'🔥':(l.temp==='m'?'🌤':(l.temp==='f'?'❄':l.etapa===6?'✓':''));
      const cls = l.temp==='q'?'hot':(l.temp==='f'?'cold':'');
      let prazoTxt = '—', prazoCls = '';
      const dias = _diasAteHoje(l.prazo);
      if(l.prazo){
        if(dias < 0){ prazoTxt = dias+'d ⚠'; prazoCls='atr'; }
        else if(dias === 0){ prazoTxt='Hoje'; prazoCls='ok'; }
        else if(dias === 1){ prazoTxt='Amanhã'; prazoCls='ok'; }
        else { prazoTxt = dias+' dias'; prazoCls='a'; }
      }
      const ult = l.atividade && l.atividade[l.atividade.length-1];
      const ultTxt = ult ? _difDias(ult.quando)+'d atrás' : '—';
      return `<tr class="${cls}" data-id="${l.id}">
        <td style="font-size:12px;text-align:center;">${tempIcon}</td>
        <td><div class="fv-lt-nome">${esc(l.nome)}</div>${l.empresa?`<div class="fv-lt-emp">${esc(l.empresa)}</div>`:''}</td>
        <td class="fv-lt-val">${moedaCurta(l.valor)}</td>
        <td><span class="fv-lt-prob ${probCls}">${l.prob||0}%</span></td>
        <td><span class="fv-lt-stage" style="background:${et.cor};">${et.nome}</span></td>
        <td>${l.treinamento?`<span class="fv-lt-tag">${esc(l.treinamento)}</span>`:'—'}</td>
        <td>${l.origem?`<span class="fv-lt-tag or">${esc(l.origem)}</span>`:'—'}</td>
        <td><span style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--txt-2);"><span class="fv-av">${_inic(l.consultor)}</span>${esc((l.consultor||'').split(' ')[0])}</span></td>
        <td><span class="fv-lt-prazo ${prazoCls}">${prazoTxt}</span></td>
        <td style="font-size:10px;color:var(--txt-3,#6b7280);">${ultTxt}</td>
      </tr>`;
    }).join('');
    // click linha → detalhe
    tbody.querySelectorAll('tr[data-id]').forEach(tr => tr.addEventListener('click', () => _abrirDetalhe(tr.dataset.id)));
    // barra de filtro
    const bar = $('#fvListaBar');
    if(_filtroEtapa != null){
      $('#fvListaNome').textContent = ETAPAS[_filtroEtapa].nome;
      $('#fvListaQtd').textContent = arr.length;
      bar.classList.add('show');
    } else { bar.classList.remove('show'); }
  }

  function _popularSelectsConsultoresEtc(){
    const md = window._mapDados || {};
    const setOpts = (sel, arr) => {
      if(!sel) return;
      const v = sel.value;
      const head = sel.options[0] ? sel.options[0].outerHTML : '';
      sel.innerHTML = head + arr.map(x => `<option>${esc(x)}</option>`).join('');
      sel.value = v;
    };

    /* ── CONSULTORES ──
       Une 4 fontes pra cobrir TODOS os consultores do aplicativo:
         1. Leads do próprio funil
         2. allConsultors (consultores do dashboard de turmas)
         3. _npConsultores (consultores do Pipeline Comercial)
         4. Consultores de clientes em turmas do _mapDados (turmas criadas)
       Deduplicação case-insensitive + ordem alfabética. */
    const consSet = new Map();
    const addCons = (nome) => {
      if(!nome) return;
      const n = String(nome).trim();
      if(!n) return;
      const k = n.toUpperCase();
      if(!consSet.has(k)) consSet.set(k, n);
    };
    _leads.forEach(l => addCons(l.consultor));
    if(Array.isArray(window.allConsultors)) window.allConsultors.forEach(addCons);
    if(Array.isArray(window._npConsultores)) window._npConsultores.forEach(addCons);
    /* Varre clientes de todas as turmas do _mapDados pra coletar consultores */
    (md.turmas || []).forEach(t => {
      const cls = t.clientes || [];
      const arr = Array.isArray(cls) ? cls : (typeof cls === 'object' ? Object.values(cls).filter(Boolean) : []);
      arr.forEach(c => { if(c && c.consultor) addCons(c.consultor); });
    });
    /* Também busca em usuários do Firebase (perfil consultor) */
    if(window._npUsuarios){
      Object.values(window._npUsuarios).forEach(u => {
        if(u && u.perfil === 'consultor' && u.nome) addCons(u.nome);
      });
    }
    const consultores = Array.from(consSet.values()).sort((a,b) => a.localeCompare(b, 'pt-BR'));
    setOpts($('#fvFCons'), consultores);

    /* ── TREINAMENTOS ──
       Une leads + allTreinamentos + APP_CONST.TREINAMENTOS pra mostrar
       todos os treinamentos do catálogo, mesmo os sem lead ainda. */
    const treinSet = new Map();
    const addTrein = (nome) => {
      if(!nome) return;
      const n = String(nome).trim();
      if(!n) return;
      const k = n.toUpperCase();
      if(!treinSet.has(k)) treinSet.set(k, n);
    };
    _leads.forEach(l => addTrein(l.treinamento));
    if(Array.isArray(window.allTreinamentos)) window.allTreinamentos.forEach(addTrein);
    if(window.APP_CONST && Array.isArray(window.APP_CONST.TREINAMENTOS)){
      window.APP_CONST.TREINAMENTOS.forEach(addTrein);
    }
    const treinamentos = Array.from(treinSet.values()).sort((a,b) => a.localeCompare(b, 'pt-BR'));
    setOpts($('#fvFTrein'), treinamentos);

    /* ── TURMAS ── (já vinha de _mapDados.turmas — mantém) */
    const turmas = (md.turmas||[]).map(t => t.nome || t.titulo || t.id).filter(Boolean);
    setOpts($('#fvFTurma'), turmas);
  }

  function _render(){
    const arr = _filtrar(_leads);
    _renderKpis(arr);
    _renderFunilSide(arr);
    _renderHistorico();
    _renderKanban(arr);
    _renderLista(arr);
    _popularSelectsConsultoresEtc();
  }

  /* ── F2 · Drag & drop ── */
  let _dragId = null;
  function _attachKanbanEvents(){
    $$('.fv-card').forEach(c => {
      c.addEventListener('dragstart', e => { _dragId = c.dataset.id; c.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; });
      c.addEventListener('dragend', () => { c.classList.remove('dragging'); _dragId = null; });
      c.addEventListener('click', e => {
        if(e.target.closest('button')) return;
        _abrirDetalhe(c.dataset.id);
      });
    });
    $$('.fv-col').forEach(col => {
      col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('dragover'); });
      col.addEventListener('dragleave', () => col.classList.remove('dragover'));
      col.addEventListener('drop', e => {
        e.preventDefault(); col.classList.remove('dragover');
        if(!_dragId) return;
        const novoEt = +col.dataset.et;
        const l = _leads.find(x => x.id === _dragId);
        if(!l || l.etapa === novoEt) return;
        const antigo = ETAPAS[l.etapa]?.nome;
        const novo = ETAPAS[novoEt]?.nome;
        l.etapa = novoEt;
        l.prob = ETAPAS[novoEt].prob;
        l.atividade = l.atividade || [];
        l.atividade.push({quando:_hoje(), txt:`Movido ${antigo} → ${novo}`});
        _historico.unshift({leadId:l.id, nome:l.nome, txt:`${antigo} → ${novo}`, quando:new Date().toISOString(), autor:_papel(), tipo: novoEt===6?'sale':'move'});
        _salvar(); _render();
        _toast(`${l.nome} → ${novo}`);
      });
    });
    $$('.fv-col-add').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); _abrirNovoLead(+b.dataset.et); }));
  }

  /* ── F2 · Modal Detalhe ── */
  function _abrirDetalhe(id){
    const l = _leads.find(x => x.id === id); if(!l) return;
    const et = ETAPAS[l.etapa];
    const dias = _diasAteHoje(l.prazo);
    const prazoStatus = !l.prazo ? '—' : dias<0 ? `Atrasado ${dias}d ⚠` : dias===0?'Hoje':dias+' dias';
    const histLead = (l.atividade||[]).slice().reverse();
    const html = `<div class="fv-overlay show" id="fvDetOv">
      <div class="fv-modal fv-det">
        <div class="fv-modal-h">
          <div>
            <div class="fv-det-nome">${esc(l.nome)}</div>
            <div class="fv-det-emp">${esc(l.empresa||'—')}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="fv-det-stage" style="background:${et.cor};">${et.nome}</div>
            <button class="fv-close" data-close>✕</button>
          </div>
        </div>
        <div class="fv-modal-b">
          <div class="fv-det-grid">
            <div class="fv-det-f"><div class="fv-det-fl">Valor</div><div class="fv-det-fv accent">${moeda(l.valor)}</div></div>
            <div class="fv-det-f"><div class="fv-det-fl">Probabilidade</div><div class="fv-det-fv">${l.prob||0}% ${l.temp==='q'?'(Quente 🔥)':l.temp==='m'?'(Morno 🌤)':l.temp==='f'?'(Frio ❄)':''}</div></div>
            <div class="fv-det-f"><div class="fv-det-fl">Treinamento</div><div class="fv-det-fv">${esc(l.treinamento||'—')}</div></div>
            <div class="fv-det-f"><div class="fv-det-fl">Origem</div><div class="fv-det-fv">${esc(l.origem||'—')}</div></div>
            <div class="fv-det-f"><div class="fv-det-fl">Consultor</div><div class="fv-det-fv">${esc(l.consultor||'—')}</div></div>
            <div class="fv-det-f"><div class="fv-det-fl">Próximo follow-up</div><div class="fv-det-fv" style="color:${dias<0?'#ef4444':'inherit'};">${prazoStatus}</div></div>
            <div class="fv-det-f"><div class="fv-det-fl">WhatsApp</div><div class="fv-det-fv">${esc(l.wpp||'—')}</div></div>
            <div class="fv-det-f"><div class="fv-det-fl">E-mail</div><div class="fv-det-fv">${esc(l.email||'—')}</div></div>
          </div>
          <div class="fv-det-tabs"><div class="fv-det-tab active">Histórico</div><div class="fv-det-tab">Notas</div></div>
          <div style="display:flex;flex-direction:column;gap:8px;font-size:11px;">
            ${histLead.length ? histLead.map(a=>`<div style="display:flex;gap:8px;"><div style="width:6px;height:6px;border-radius:50%;background:var(--accent);margin-top:5px;flex-shrink:0;"></div><div style="flex:1;color:var(--txt-2);">${esc(a.txt)}</div><div style="color:var(--txt-3,#6b7280);font-size:9px;">${a.quando}</div></div>`).join('') : '<div style="color:var(--txt-3,#6b7280);text-align:center;padding:10px;">Sem histórico</div>'}
          </div>
          <div class="fv-det-actions">
            ${l.wpp?`<a class="fv-btn" href="https://wa.me/${l.wpp.replace(/\\D/g,'')}" target="_blank">📱 WhatsApp</a>`:''}
            ${l.email?`<a class="fv-btn" href="mailto:${l.email}">✉ E-mail</a>`:''}
            <button class="fv-btn" data-mover>→ Mover etapa</button>
            ${_ehAdmin()?`<button class="fv-btn" style="color:#ef4444;border-color:rgba(239,68,68,0.3);" data-excluir>🗑 Excluir lead</button>`:''}
          </div>
        </div>
      </div>
    </div>`;
    const wrap = document.createElement('div'); wrap.innerHTML = html; document.body.appendChild(wrap.firstElementChild);
    const ov = $('#fvDetOv');
    const close = () => ov.remove();
    ov.querySelector('[data-close]').addEventListener('click', close);
    ov.addEventListener('click', e => { if(e.target === ov) close(); });
    ov.querySelector('[data-mover]')?.addEventListener('click', () => {
      const novo = prompt('Nova etapa (0=Prospecção, 1=Qualificação, 2=Apresentação, 3=Negociação, 4=Proposta, 5=Fechamento, 6=Pós-Venda):', l.etapa);
      const n = parseInt(novo, 10);
      if(!isNaN(n) && n>=0 && n<=6 && n!==l.etapa){
        const antigo = ETAPAS[l.etapa].nome;
        l.etapa = n; l.prob = ETAPAS[n].prob;
        l.atividade.push({quando:_hoje(), txt:`Movido ${antigo} → ${ETAPAS[n].nome}`});
        _historico.unshift({leadId:l.id, nome:l.nome, txt:`${antigo} → ${ETAPAS[n].nome}`, quando:new Date().toISOString(), autor:_papel(), tipo:n===6?'sale':'move'});
        _salvar(); close(); _render();
      }
    });
    ov.querySelector('[data-excluir]')?.addEventListener('click', () => {
      if(!confirm(`Excluir lead "${l.nome}"? Isso não pode ser desfeito.`)) return;
      _leads = _leads.filter(x => x.id !== l.id);
      _historico.unshift({leadId:l.id, nome:l.nome, txt:'Lead excluído', quando:new Date().toISOString(), autor:_papel(), tipo:'lost'});
      _salvar(); close(); _render();
    });
  }

  /* ── F2 · Modal Novo Lead ── */
  function _abrirNovoLead(etapaInicial){
    /* Fonte: window.allTreinamentos (vem de appConfig/treinamentos · 17 itens canônicos)
       Fallback: _PRODUTOS_PROPOSTA (16 hardcoded) caso allTreinamentos não tenha carregado */
    const trainings = (Array.isArray(window.allTreinamentos) && window.allTreinamentos.length)
      ? window.allTreinamentos.slice().sort((a,b) => a.localeCompare(b,'pt-BR'))
      : (window._PRODUTOS_PROPOSTA && Object.keys(window._PRODUTOS_PROPOSTA))
        || ['IF','MASTER COACHING','CEOP','FGPC','BHP','FCIS','ML5','TAV','MAESTRIA','CIS_GLOBAL','CIS'];

    /* CONSULTORES — agrega múltiplas fontes pra cobrir TODOS do app */
    const consSet = new Map();
    const addCons = (n) => {
      if(!n) return;
      const s = String(n).trim(); if(!s) return;
      const k = s.toUpperCase();
      if(!consSet.has(k)) consSet.set(k, s);
    };
    _leads.forEach(l => addCons(l.consultor));
    if(Array.isArray(window.allConsultors)) window.allConsultors.forEach(addCons);
    if(Array.isArray(window._npConsultores)) window._npConsultores.forEach(addCons);
    if(window._npUsuarios){
      Object.values(window._npUsuarios).forEach(u => {
        if(u && u.perfil === 'consultor' && u.nome) addCons(u.nome);
      });
    }
    const consultores = Array.from(consSet.values()).sort((a,b) => a.localeCompare(b, 'pt-BR'));

    const allOrigens = [...ORIGENS_PADRAO, ..._origensCustom];
    const html = `<div class="fv-overlay show" id="fvNovoOv">
      <div class="fv-modal fv-novo">
        <div class="fv-modal-h">
          <div class="fv-modal-tit">✨ Novo Lead</div>
          <button class="fv-close" data-close>✕</button>
        </div>
        <div class="fv-modal-b">
          <div class="fv-novo-section">📌 Dados básicos</div>
          <div class="fv-novo-grid">
            <div class="fv-novo-field"><span class="fv-novo-l req">Nome do cliente</span><input class="fv-novo-i" data-k="nome" placeholder="Ex: João Pedro Silva"></div>
            <div class="fv-novo-field"><span class="fv-novo-l">Empresa</span><input class="fv-novo-i" data-k="empresa" placeholder="Ex: Construtora Norte"></div>
          </div>
          <div class="fv-novo-grid">
            <div class="fv-novo-field"><span class="fv-novo-l">WhatsApp</span><input class="fv-novo-i" data-k="wpp" placeholder="+55 91 9XXXX-XXXX"></div>
            <div class="fv-novo-field"><span class="fv-novo-l">E-mail</span><input class="fv-novo-i" data-k="email" type="email" placeholder="cliente@email.com"></div>
          </div>
          <div class="fv-novo-section">💰 Negócio</div>
          <div class="fv-novo-grid c3">
            <div class="fv-novo-field"><span class="fv-novo-l req">Treinamento</span><select class="fv-novo-s" data-k="treinamento"><option value="">Selecione…</option>${trainings.map(t=>`<option>${esc(t)}</option>`).join('')}</select></div>
            <div class="fv-novo-field"><span class="fv-novo-l req">Valor estimado</span><input class="fv-novo-i" data-k="valor" type="number" step="0.01" placeholder="0,00"></div>
            <div class="fv-novo-field"><span class="fv-novo-l">Probabilidade</span><input class="fv-novo-i" data-k="prob" type="number" min="0" max="100" value="${ETAPAS[etapaInicial||0].prob}"></div>
          </div>
          <div class="fv-novo-grid">
            <div class="fv-novo-field"><span class="fv-novo-l req">Etapa inicial</span><select class="fv-novo-s" data-k="etapa">${ETAPAS.map((e,i)=>`<option value="${i}" ${i===(etapaInicial||0)?'selected':''}>${e.nome}</option>`).join('')}</select></div>
            <div class="fv-novo-field"><span class="fv-novo-l req">Consultor</span><select class="fv-novo-s" data-k="consultor">${consultores.length?consultores.map(c=>`<option>${esc(c)}</option>`).join(''):'<option>Eu</option>'}</select></div>
          </div>
          <div class="fv-novo-section">📡 Origem & follow-up</div>
          <div class="fv-novo-grid">
            <div class="fv-novo-field">
              <span class="fv-novo-l req">Origem</span>
              <select class="fv-novo-s" data-k="origem" id="fvNovoOrig">
                <option value="">Selecione…</option>
                ${allOrigens.map(o=>`<option>${esc(o)}</option>`).join('')}
                <option value="__outro__">Outro…</option>
              </select>
              <input type="text" class="fv-novo-i fv-novo-or-out" id="fvNovoOrigOut" placeholder="Digite a origem...">
            </div>
            <div class="fv-novo-field"><span class="fv-novo-l">Próximo follow-up</span><input class="fv-novo-i" data-k="prazo" type="date"></div>
          </div>
          <div class="fv-novo-grid c1">
            <div class="fv-novo-field"><span class="fv-novo-l">Temperatura</span>
              <div class="fv-novo-temp">
                <button type="button" class="fv-novo-t" data-temp="q">🔥 Quente</button>
                <button type="button" class="fv-novo-t" data-temp="m">🌤 Morno</button>
                <button type="button" class="fv-novo-t" data-temp="f">❄ Frio</button>
              </div>
            </div>
          </div>
          <div class="fv-novo-section">📝 Observações</div>
          <div class="fv-novo-grid c1">
            <div class="fv-novo-field"><span class="fv-novo-l">Notas iniciais</span><textarea class="fv-novo-ta" data-k="notas" placeholder="Contexto, dor do cliente..."></textarea></div>
          </div>
        </div>
        <div class="fv-modal-f">
          <div style="font-size:10px;color:var(--txt-3,#6b7280);">💡 Você pode mover esse card depois.</div>
          <div style="display:flex;gap:6px;">
            <button class="fv-btn" data-close>Cancelar</button>
            <button class="fv-btn fv-btn-primary" data-criar>+ Criar lead</button>
          </div>
        </div>
      </div>
    </div>`;
    const wrap = document.createElement('div'); wrap.innerHTML = html; document.body.appendChild(wrap.firstElementChild);
    const ov = $('#fvNovoOv');
    const close = () => ov.remove();
    let tempSel = '';
    ov.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    ov.addEventListener('click', e => { if(e.target === ov) close(); });
    ov.querySelectorAll('.fv-novo-t').forEach(b => b.addEventListener('click', () => {
      ov.querySelectorAll('.fv-novo-t').forEach(x => x.classList.remove('s-q','s-m','s-f'));
      tempSel = b.dataset.temp; b.classList.add('s-'+tempSel);
    }));
    const origSel = $('#fvNovoOrig', ov), origOut = $('#fvNovoOrigOut', ov);
    origSel.addEventListener('change', () => {
      if(origSel.value === '__outro__'){ origOut.classList.add('show'); origOut.focus(); }
      else { origOut.classList.remove('show'); origOut.value=''; }
    });
    ov.querySelector('[data-criar]').addEventListener('click', () => {
      const get = k => ov.querySelector(`[data-k="${k}"]`)?.value || '';
      const nome = get('nome').trim();
      const trein = get('treinamento');
      const valor = parseFloat(get('valor'));
      if(!nome){ _toast('Preencha o nome do cliente'); return; }
      if(!trein){ _toast('Selecione o treinamento'); return; }
      if(isNaN(valor) || valor<=0){ _toast('Informe um valor válido'); return; }
      let origem = get('origem');
      if(origem === '__outro__') origem = origOut.value.trim() || 'Outro';
      const novo = {
        id: _id(),
        nome,
        empresa: get('empresa'),
        valor,
        prob: parseInt(get('prob'),10) || 0,
        etapa: parseInt(get('etapa'),10) || 0,
        treinamento: trein,
        origem,
        consultor: get('consultor'),
        prazo: get('prazo'),
        temp: tempSel,
        wpp: get('wpp'),
        email: get('email'),
        notas: get('notas'),
        criadoEm: _hoje(),
        atividade: [{quando:_hoje(), txt:'Lead criado'}]
      };
      _leads.push(novo);
      _historico.unshift({leadId:novo.id, nome:novo.nome, txt:`Novo lead em ${ETAPAS[novo.etapa].nome}`, quando:new Date().toISOString(), autor:_papel(), tipo:'nova'});
      _salvar(); close(); _render();
      _toast('Lead criado: '+nome);
    });
  }

  /* ── F2/F4 · Modal Configurar ── */
  function _abrirConfig(){
    const html = `<div class="fv-overlay show" id="fvCfgOv">
      <div class="fv-modal fv-cfg">
        <div class="fv-modal-h"><div class="fv-modal-tit">⚙️ Configurar Funil de Vendas</div><button class="fv-close" data-close>✕</button></div>
        <div class="fv-cfg-body">
          <div class="fv-cfg-nav">
            <div class="fv-cfg-nav-i active" data-p="etapas">🎯 Etapas do funil</div>
            <div class="fv-cfg-nav-i" data-p="origens">📡 Origens de leads</div>
            <div class="fv-cfg-nav-i" data-p="alertas">⚠️ Alertas e SLA</div>
            <div class="fv-cfg-nav-i" data-p="perm">🔐 Permissões</div>
            <div class="fv-cfg-nav-i" data-p="impexp">📥 Importar / Exportar</div>
            <div class="fv-cfg-nav-i" data-p="audit">📋 Auditoria</div>
          </div>
          <div class="fv-cfg-content">
            <div class="fv-cfg-pane active" data-p="etapas">
              <div class="fv-cfg-st">Etapas do funil</div>
              <div class="fv-cfg-ss">Probabilidade padrão e SLA por etapa (somente leitura nesta versão — uma edição futura permite renomear / reordenar).</div>
              ${ETAPAS.map(e=>`<div class="fv-cfg-etapa"><div style="text-align:center;color:var(--txt-3,#6b7280);">⋮</div><div style="display:flex;gap:8px;align-items:center;"><span style="width:14px;height:14px;border-radius:50%;background:${e.cor};display:inline-block;"></span><b>${e.nome}</b></div><div>${e.prob}%</div><div>${e.sla}d</div><div></div></div>`).join('')}
            </div>
            <div class="fv-cfg-pane" data-p="origens">
              <div class="fv-cfg-st">Origens de leads</div>
              <div class="fv-cfg-ss">Lista usada no filtro e no cadastro. Clique no ✕ para remover. Adicione novas com o botão.</div>
              <div id="fvCfgOrigens">${[...ORIGENS_PADRAO, ..._origensCustom].map(o=>`<span class="fv-cfg-pill">${esc(o)} ${_origensCustom.includes(o)?`<span class="fv-cfg-pill-del" data-or="${esc(o)}">✕</span>`:''}</span>`).join('')}<span class="fv-cfg-pill fv-cfg-pill-add" id="fvCfgAddOrigem">+ Adicionar</span></div>
            </div>
            <div class="fv-cfg-pane" data-p="alertas">
              <div class="fv-cfg-st">Alertas e SLA</div>
              <div class="fv-cfg-ss">Quando um card dispara alerta automático.</div>
              <div class="fv-cfg-toggle"><div><div style="font-size:12px;font-weight:600;">Follow-up atrasado</div><div style="font-size:10px;color:var(--txt-3,#6b7280);">Sinaliza quando passa do prazo</div></div><div class="fv-switch on"></div></div>
              <div class="fv-cfg-toggle"><div><div style="font-size:12px;font-weight:600;">Card parado +14 dias</div><div style="font-size:10px;color:var(--txt-3,#6b7280);">Sem movimentação</div></div><div class="fv-switch on"></div></div>
              <div class="fv-cfg-toggle"><div><div style="font-size:12px;font-weight:600;">Temperatura automática</div><div style="font-size:10px;color:var(--txt-3,#6b7280);">Quente/Morno/Frio por atividade + prob</div></div><div class="fv-switch"></div></div>
            </div>
            <div class="fv-cfg-pane" data-p="perm">
              <div class="fv-cfg-st">Permissões por papel</div>
              <div class="fv-cfg-ss">Seu papel atual: <b style="color:var(--accent);">${_papel()}</b></div>
              <table style="width:100%;font-size:11px;border-collapse:separate;border-spacing:0;">
                <thead><tr><th style="text-align:left;color:var(--txt-2);padding:8px 6px;border-bottom:1px solid var(--border);">Ação</th><th style="color:var(--txt-2);padding:8px 6px;border-bottom:1px solid var(--border);">Admin</th><th style="color:var(--txt-2);padding:8px 6px;border-bottom:1px solid var(--border);">Gestor</th><th style="color:var(--txt-2);padding:8px 6px;border-bottom:1px solid var(--border);">Consultor</th></tr></thead>
                <tbody>
                  <tr><td style="padding:8px 6px;border-bottom:1px dashed var(--border);">Ver todos os cards</td><td style="text-align:center;padding:8px 6px;border-bottom:1px dashed var(--border);">✓</td><td style="text-align:center;padding:8px 6px;border-bottom:1px dashed var(--border);">✓</td><td style="text-align:center;padding:8px 6px;border-bottom:1px dashed var(--border);">—</td></tr>
                  <tr><td style="padding:8px 6px;border-bottom:1px dashed var(--border);">Criar lead novo</td><td style="text-align:center;padding:8px 6px;border-bottom:1px dashed var(--border);">✓</td><td style="text-align:center;padding:8px 6px;border-bottom:1px dashed var(--border);">✓</td><td style="text-align:center;padding:8px 6px;border-bottom:1px dashed var(--border);">✓</td></tr>
                  <tr><td style="padding:8px 6px;border-bottom:1px dashed var(--border);">Mover qualquer card</td><td style="text-align:center;padding:8px 6px;border-bottom:1px dashed var(--border);">✓</td><td style="text-align:center;padding:8px 6px;border-bottom:1px dashed var(--border);">✓</td><td style="text-align:center;padding:8px 6px;border-bottom:1px dashed var(--border);">—</td></tr>
                  <tr><td style="padding:8px 6px;border-bottom:1px dashed var(--border);">Excluir lead</td><td style="text-align:center;padding:8px 6px;border-bottom:1px dashed var(--border);">✓</td><td style="text-align:center;padding:8px 6px;border-bottom:1px dashed var(--border);">✓</td><td style="text-align:center;padding:8px 6px;border-bottom:1px dashed var(--border);">—</td></tr>
                  <tr><td style="padding:8px 6px;border-bottom:1px dashed var(--border);">Exportar / Configurar</td><td style="text-align:center;padding:8px 6px;border-bottom:1px dashed var(--border);">✓</td><td style="text-align:center;padding:8px 6px;border-bottom:1px dashed var(--border);">—</td><td style="text-align:center;padding:8px 6px;border-bottom:1px dashed var(--border);">—</td></tr>
                </tbody>
              </table>
            </div>
            <div class="fv-cfg-pane" data-p="impexp">
              <div class="fv-cfg-st">Importar do Pipeline</div>
              <div class="fv-cfg-ss">Traz vendas do Pipeline Comercial pro funil. Já roda automático na primeira vez. Use abaixo para ressincronizar.</div>
              <button class="fv-btn fv-btn-primary" id="fvCfgImport">📥 Reimportar do Pipeline (novos)</button>
              <div class="fv-cfg-st" style="margin-top:20px;">Exportar</div>
              <div class="fv-cfg-ss">Gera um CSV dos leads do funil pra abrir em Excel.</div>
              <button class="fv-btn" id="fvCfgExport">📊 Baixar CSV</button>
              <div class="fv-cfg-st" style="margin-top:24px;color:#ef4444;">⚠ Zona de risco</div>
              <div class="fv-cfg-ss">Apaga <b>todos os leads e histórico</b> do funil. A importação automática do Pipeline fica desativada após zerar — você reativa clicando em "Reimportar". Use pra começar do zero.</div>
              <button class="fv-btn" id="fvCfgZerar" style="color:#ef4444;border-color:rgba(239,68,68,0.3);background:rgba(239,68,68,0.05);">🗑 Zerar funil (reset total)</button>
            </div>
            <div class="fv-cfg-pane" data-p="audit">
              <div class="fv-cfg-st">Auditoria (${_historico.length} eventos)</div>
              <div class="fv-cfg-ss">Tudo que aconteceu no funil — quem moveu, quando.</div>
              <div style="background:var(--bg-3,#1c2128);border:1px solid var(--border);border-radius:8px;padding:10px;font-size:11px;display:flex;flex-direction:column;gap:6px;max-height:300px;overflow-y:auto;">
                ${_historico.slice(0,50).map(h=>`<div style="display:flex;justify-content:space-between;border-bottom:1px dashed var(--border);padding-bottom:5px;"><span><b>${esc(h.autor||'?')}</b> · ${esc(h.nome||'')}: ${esc(h.txt||'')}</span><span style="color:var(--txt-3,#6b7280);">${h.quando?h.quando.slice(0,10):''}</span></div>`).join('') || '<div style="color:var(--txt-3,#6b7280);text-align:center;padding:10px;">Sem eventos.</div>'}
              </div>
            </div>
          </div>
        </div>
        <div class="fv-modal-f">
          <div style="font-size:10px;color:var(--txt-3,#6b7280);">As alterações são salvas no Firebase em tempo real</div>
          <button class="fv-btn fv-btn-primary" data-close>Fechar</button>
        </div>
      </div>
    </div>`;
    const wrap = document.createElement('div'); wrap.innerHTML = html; document.body.appendChild(wrap.firstElementChild);
    const ov = $('#fvCfgOv');
    const close = () => ov.remove();
    ov.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    ov.addEventListener('click', e => { if(e.target === ov) close(); });
    ov.querySelectorAll('.fv-cfg-nav-i').forEach(i => i.addEventListener('click', () => {
      ov.querySelectorAll('.fv-cfg-nav-i').forEach(x => x.classList.remove('active'));
      ov.querySelectorAll('.fv-cfg-pane').forEach(x => x.classList.remove('active'));
      i.classList.add('active');
      ov.querySelector(`.fv-cfg-pane[data-p="${i.dataset.p}"]`).classList.add('active');
    }));
    ov.querySelectorAll('.fv-switch').forEach(s => s.addEventListener('click', () => s.classList.toggle('on')));
    // Origens: add/remover
    const refreshOrigens = () => {
      const c = ov.querySelector('#fvCfgOrigens');
      c.innerHTML = [...ORIGENS_PADRAO, ..._origensCustom].map(o=>`<span class="fv-cfg-pill">${esc(o)} ${_origensCustom.includes(o)?`<span class="fv-cfg-pill-del" data-or="${esc(o)}">✕</span>`:''}</span>`).join('') + `<span class="fv-cfg-pill fv-cfg-pill-add" id="fvCfgAddOrigem">+ Adicionar</span>`;
      bindOrigens();
    };
    const bindOrigens = () => {
      ov.querySelectorAll('.fv-cfg-pill-del').forEach(b => b.addEventListener('click', () => {
        _origensCustom = _origensCustom.filter(x => x !== b.dataset.or);
        _salvar(); refreshOrigens();
      }));
      ov.querySelector('#fvCfgAddOrigem')?.addEventListener('click', () => {
        const nova = prompt('Nova origem:');
        if(nova && nova.trim()){ _origensCustom.push(nova.trim()); _salvar(); refreshOrigens(); }
      });
    };
    bindOrigens();
    ov.querySelector('#fvCfgImport')?.addEventListener('click', () => {
      close(); /* fecha o Configurar */
      _abrirModalImportar();
    });
    ov.querySelector('#fvCfgExport')?.addEventListener('click', _exportarCsv);
    ov.querySelector('#fvCfgZerar')?.addEventListener('click', () => {
      if(!confirm('⚠ ZERAR FUNIL\n\nIsso vai apagar TODOS os leads e o histórico do funil. A importação automática do Pipeline será desativada.\n\nVocê pode reativar clicando em "Reimportar" depois.\n\nConfirma o reset?')) return;
      _zerarTudo();
      close();
    });
  }

  function _exportarCsv(){
    const headers = ['Nome','Empresa','Valor','Probabilidade','Etapa','Treinamento','Origem','Consultor','Prazo','Temperatura','WhatsApp','Email','Criado em'];
    const rows = _leads.map(l => [l.nome, l.empresa, l.valor, l.prob, ETAPAS[l.etapa]?.nome, l.treinamento, l.origem, l.consultor, l.prazo, l.temp, l.wpp, l.email, l.criadoEm].map(v => `"${(v==null?'':(''+v).replace(/"/g,'""'))}"`).join(';'));
    const csv = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob(['﻿'+csv], {type:'text/csv'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'funil-vendas-'+_hoje()+'.csv'; a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ── F2 · Modal Período Personalizado ── */
  function _abrirPeriodoPerso(){
    const ano = new Date().getFullYear();
    const mes = new Date().getMonth();
    const MESES = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
    const html = `<div class="fv-overlay show" id="fvPerOv">
      <div class="fv-modal fv-per">
        <div class="fv-per-tabs">
          <button class="fv-per-tab" data-pt="ano">Ano</button>
          <button class="fv-per-tab active" data-pt="mes">Mês</button>
          <button class="fv-per-tab" data-pt="per">Período</button>
        </div>
        <div class="fv-per-nav">
          <button class="fv-per-arr" data-prev>‹</button>
          <div class="fv-per-tit" id="fvPerTit">${ano}</div>
          <button class="fv-per-arr" data-next>›</button>
        </div>
        <div class="fv-per-grid" id="fvPerGrid">${MESES.map((m,i)=>`<button class="fv-per-cel ${i===mes?'sel':''}" data-m="${i}">${m}</button>`).join('')}</div>
        <div id="fvPerRange" style="display:none;flex-direction:column;gap:8px;margin-bottom:14px;">
          <div style="display:flex;gap:6px;align-items:center;"><span style="font-size:10px;text-transform:uppercase;color:var(--txt-3,#6b7280);min-width:40px;">De</span><input type="date" class="fv-finput" id="fvPerDe" style="flex:1;"></div>
          <div style="display:flex;gap:6px;align-items:center;"><span style="font-size:10px;text-transform:uppercase;color:var(--txt-3,#6b7280);min-width:40px;">Até</span><input type="date" class="fv-finput" id="fvPerAte" style="flex:1;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:12px;">
          <div style="font-size:11px;color:var(--txt-2);" id="fvPerInfo">Selecionado: <b style="color:var(--accent);">${MESES[mes]}/${ano}</b></div>
          <div style="display:flex;gap:6px;">
            <button class="fv-btn" data-close>Cancelar</button>
            <button class="fv-btn fv-btn-primary" data-apply>Aplicar</button>
          </div>
        </div>
      </div>
    </div>`;
    const wrap = document.createElement('div'); wrap.innerHTML = html; document.body.appendChild(wrap.firstElementChild);
    const ov = $('#fvPerOv');
    let curAno = ano, curMes = mes, modo = 'mes';
    const close = () => ov.remove();
    ov.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => { $('#fvFPer').value = ''; close(); }));
    ov.addEventListener('click', e => { if(e.target === ov){ $('#fvFPer').value = ''; close(); } });
    ov.querySelectorAll('.fv-per-tab').forEach(t => t.addEventListener('click', () => {
      ov.querySelectorAll('.fv-per-tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      modo = t.dataset.pt;
      $('#fvPerGrid').style.display = modo === 'mes' ? 'grid' : 'none';
      $('#fvPerRange').style.display = modo === 'per' ? 'flex' : 'none';
    }));
    ov.querySelector('[data-prev]').addEventListener('click', () => { curAno--; $('#fvPerTit').textContent = curAno; });
    ov.querySelector('[data-next]').addEventListener('click', () => { curAno++; $('#fvPerTit').textContent = curAno; });
    ov.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => {
      ov.querySelectorAll('[data-m]').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel'); curMes = +b.dataset.m;
      $('#fvPerInfo').innerHTML = `Selecionado: <b style="color:var(--accent);">${MESES[curMes]}/${curAno}</b>`;
    }));
    ov.querySelector('[data-apply]').addEventListener('click', () => {
      if(modo === 'per'){
        _filtros.perDe = $('#fvPerDe').value; _filtros.perAte = $('#fvPerAte').value;
        _filtros.per = 'range';
      } else {
        _filtros.per = 'mes:'+curAno+'-'+(curMes+1);
      }
      close(); _render();
    });
  }

  /* ── F3 · Filtros / view toggle ── */
  function _setModo(m){
    _modoLista = (m === 'lista');
    const op = $('#fvOp'); if(!op) return;
    op.classList.toggle('modo-lista', _modoLista);
    $('#fvModoLabel').textContent = _modoLista ? 'Lista' : 'Kanban';
    $('#fvInstr').textContent = _modoLista ? '💡 Clique nas colunas pra ordenar' : '💡 Arraste cards · Clique p/ detalhar';
    $$('.fv-vbtn').forEach(b => b.classList.toggle('active', b.dataset.view === m));
  }

  function _attachFiltros(){
    const sync = (sel, k) => sel.addEventListener('change', () => { _filtros[k] = sel.value; _render(); });
    sync($('#fvFCons'),  'cons');
    sync($('#fvFTrein'), 'trein');
    sync($('#fvFTurma'), 'turma');
    $('#fvFPer').addEventListener('change', () => {
      const v = $('#fvFPer').value;
      if(v === '__perso__'){ _abrirPeriodoPerso(); return; }
      _filtros.per = v; _render();
    });
    $('#fvFOrigem').addEventListener('change', () => {
      const v = $('#fvFOrigem').value;
      const out = $('#fvFOrigOutro');
      if(v === '__outro__'){ out.style.display='inline-block'; out.focus(); _filtros.origem = '__outro__'; }
      else { out.style.display='none'; out.value=''; _filtros.origem = v; _render(); }
    });
    $('#fvFOrigOutro').addEventListener('input', () => { _filtros.origem = $('#fvFOrigOutro').value; _render(); });
    $('#fvFBusca').addEventListener('input', () => { _filtros.busca = $('#fvFBusca').value; _render(); });
    $$('.fv-fchip').forEach(b => b.addEventListener('click', () => {
      const t = b.dataset.temp;
      _filtros.temp = (_filtros.temp === t) ? '' : t;
      $$('.fv-fchip').forEach(x => x.classList.toggle('active', x.dataset.temp === _filtros.temp));
      _render();
    }));
    $$('.fv-vbtn').forEach(b => b.addEventListener('click', () => _setModo(b.dataset.view)));
    $('#fvBtnNovo').addEventListener('click', () => _abrirNovoLead(0));
    $('#fvBtnConfig').addEventListener('click', _abrirConfig);
    $('#fvListaClear').addEventListener('click', () => { _filtroEtapa = null; _render(); });
  }

  /* ── Init ── */
  async function _init(){
    _injectCss();
    _buildShell();
    _attachFiltros();
    document.documentElement.style.setProperty('--fv-max', _maxCards);
    await _carregar();
    // Permissão visual
    const u = window._currentUser || {};
    $('#fvPermTxt').textContent = 'Você: ' + (u.nome || _papel().charAt(0).toUpperCase()+_papel().slice(1));
    _render();
    _booted = true;
    // Sync tempo real
    if(window._fbChange){
      try{
        window._fbChange(_fbPath(), data => {
          if(!data) return;
          _leads = Array.isArray(data.leads) ? data.leads : (data.leads ? Object.values(data.leads) : []);
          _historico = Array.isArray(data.historico) ? data.historico : (data.historico ? Object.values(data.historico) : []);
          _origensCustom = Array.isArray(data.origensCustom) ? data.origensCustom : [];
          if(_booted) _render();
        });
      }catch(e){ console.warn('[FV] _fbChange', e); }
    }
  }

  /* ── Hook no _icShowPane ── */
  document.addEventListener('DOMContentLoaded', function(){
    const orig = window._icShowPane;
    window._icShowPane = function(pane){
      if(orig) orig(pane);
      else {
        document.querySelectorAll('#icTabs .ic-tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-icpane') === pane));
        document.querySelectorAll('#mapeamentoScreen .ic-pane').forEach(p => p.classList.toggle('show', p.getAttribute('data-icpane') === pane));
      }
      if(pane === 'funil' && !_booted) _init();
    };
    // Se a aba inicial for "funil", inicializa direto após o pipeline carregar (espera _mapDados)
    const tentar = () => {
      const root = document.getElementById('funilVendasRoot');
      const ativo = document.querySelector('#icTabs .ic-tab.active');
      if(root && ativo && ativo.getAttribute('data-icpane') === 'funil' && !_booted) _init();
    };
    setTimeout(tentar, 800);
    setTimeout(tentar, 2500);
  });

  // Expor para debug / console
  window._fvLeads = () => _leads;
  window._fvImportar = () => { _zerado = false; return _importarDoPipeline(false); };
  window._fvZerar = _zerarTudo;
})();
