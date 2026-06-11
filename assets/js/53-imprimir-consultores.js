/* ============================================================
   53-imprimir-consultores.js
   Modal "🖨 Imprimir relatório" da aba Consultor (Gerenciar Turmas).
   Menu hierárquico em 5 sessões colapsáveis com 20 opções.
   Saída: PDF (print), Copiar, WhatsApp, .txt
============================================================ */
(function(){
  'use strict';

  /* Estado do modal (sessão-only) */
  var _selecionadas = new Set();
  var _consultorEscolhido = '';
  var _consultoresEscolhidos = new Set();  /* IDs dos consultores marcados em "Consultores específicos" */
  var _turmaMesEscolhida = '';   /* id da turma escolhida na opção "Turma do mês vigente" */
  var _sessoesAbertas = new Set(['escopo','status','periodo','executivos']);
  /* Escopo de dados — controla DE ONDE vem a lista de consultores e clientes:
     'atual'  = só da turma atualmente aberta (default · sugestão A)
     'mes'    = todas as turmas do mês selecionado (default = atual)
     'todas'  = todas as turmas cadastradas (consolidado) */
  var _escopo = 'atual';
  var _mesFiltro = ''; /* YYYY-MM — atualizado on-demand para o mês atual */
  function _mesFiltroAtivo(){
    return _mesFiltro || _mesAtualYM();
  }
  /* Pré-seleção sugerida — marcas com ⭐ e marcadas por default na 1ª abertura. */
  var PRE_SELECT = ['esc_todos','st_negoc','st_pago','st_aberto','pe_curso_atual','ex_fin','ex_trein_pg','ex_entradas','ex_negoc'];
  var _primeiraAbertura = true;
  /* Cache de turmas vindas do Firebase (assíncrono — preenchido após o load) */
  var _fbTurmasCache = {};
  var _fbTurmasLoaded = false;
  /* Escala de fonte do modal (zoom A−/A+) — persiste em localStorage */
  var _icvScale = parseFloat(localStorage.getItem('icv_scale')||'1.30') || 1.30;
  function _icvSetScale(v){
    v = Math.max(0.80, Math.min(2.00, +v || 1.30));
    _icvScale = v;
    try { localStorage.setItem('icv_scale', String(v)); } catch(e){}
    var modal = document.querySelector('.icv-modal');
    if(modal) modal.style.setProperty('--icv-scale', v);
    var lbl = document.getElementById('icvZoomLbl');
    if(lbl) lbl.textContent = Math.round(v*100)+'%';
  }

  /* ─────────── Definição das opções (20 ao todo) ─────────── */
  var SESSOES = [
    { id:'periodo', ic:'📅', nome:'Por período', opts:[
      { id:'pe_curso_atual', ic:'📚', t:'Somente a turma atual', d:'Foca no curso atualmente aberto · header com nome e código' },
      { id:'pe_mes',         ic:'📅', t:'Mês atual completo (consolidado)', d:'Estatísticas agregadas do mês corrente' },
      { id:'pe_outro',       ic:'🗓', t:'Escolher outro período', d:'Escolha mês + turma específica (ou todas as turmas do mês)', extra:'periodo' }
    ]},
    { id:'escopo', ic:'📊', nome:'Por escopo (quem entra no relatório)', opts:[
      { id:'esc_parent', ic:'👥', t:'Quem aparece no relatório', d:'FILTRO — recorta TODOS os blocos pelos consultores marcados:', isParent:true, subs:[
        { id:'esc_todos', ic:'👥', t:'Todos os consultores' },
        { id:'esc_top3',  ic:'🥇', t:'Top 3 consultores' },
        { id:'esc_bateu', ic:'🎯', t:'Quem bateu meta' },
        { id:'esc_sel',   ic:'☑', t:'Consultor Individual', hasMultiSelect:true }
      ]}
    ]},
    { id:'status', ic:'💰', nome:'Por status de venda', opts:[
      { id:'st_parent', ic:'📋', t:'Quais status entram no relatório', d:'FILTRO — só os status marcados aparecem nos blocos:', isParent:true, subs:[
        { id:'st_negoc',   ic:'🤝', t:'Em NEGOCIAÇÃO' },
        { id:'st_pago',    ic:'💚', t:'Só PAGOS' },
        { id:'st_aberto',  ic:'🟠', t:'Só EM ABERTO' },
        { id:'st_entrada', ic:'💵', t:'Com ENTRADA recebida' },
        { id:'st_desist',  ic:'❌', t:'Desistências / cancelados' }
      ]}
    ]},
    { id:'treinamento', ic:'🎓', nome:'Por treinamento / produto', opts:[
      { id:'tr_agrup', ic:'📚', t:'Agrupado por TREINAMENTO', d:'Cada treinamento com seus clientes e consultores' },
      { id:'tr_top5',  ic:'💎', t:'Top 5 maiores vendas', d:'As maiores vendas do período' },
      { id:'tr_hight', ic:'🏆', t:'Top Vendas High Ticket', d:'Somente vendas a partir de R$ 30.000,00' }
    ]},
    { id:'executivos', ic:'⭐', nome:'Executivos', opts:[
      { id:'ex_resumo', ic:'📊', t:'Resumo executivo (1 página)', d:'Marque as seções que devem aparecer:', isParent:true, subs:[
        { id:'ex_fin',       ic:'📊', t:'Resumo financeiro' },
        { id:'ex_trein_pg',  ic:'📚', t:'Treinamentos pagos' },
        { id:'ex_entradas',  ic:'💵', t:'Entradas' },
        { id:'ex_negoc',     ic:'🤝', t:'Em negociação' },
        { id:'ex_aberto',    ic:'⏳', t:'Em aberto' },
        { id:'ex_rk_cons',   ic:'🏅', t:'Ranking consultores' },
        { id:'ex_rk_trein',  ic:'🎓', t:'Ranking treinadores' },
        { id:'ex_top_trein', ic:'🏆', t:'Top treinamentos' },
        { id:'ex_meta',      ic:'📈', t:'Meta vs realizado' },
        { id:'ex_assin',     ic:'✍', t:'Assinatura / gerador' }
      ]},
      { id:'ex_detalh', ic:'📄', t:'Detalhado por consultor', d:'Lista completa de clientes por consultor (fluxo contínuo)' }
    ]}
  ];

  /* Contador numérico das sub-opções (estilo V9). Retorna número ou null (mostra ✓ no badge). */
  function _contadorSub(id){
    try {
      switch(id){
        /* Escopo */
        case 'esc_todos': return Object.keys(_porConsultor()).length;
        case 'esc_top3':  return Math.min(3, Object.keys(_porConsultor()).length);
        case 'esc_sel':   return _consultoresEscolhidos.size;
        case 'esc_bateu':
          var g = window._npGoals || {}; var n = 0;
          Object.keys(_porConsultor()).forEach(function(nome){
            var meta = +(g[nome] && (g[nome].metaMinima || g[nome].metaValor) || 0);
            var pago = _statsConsultor(_porConsultor()[nome]).pago;
            if(meta>0 && pago>=meta) n++;
          });
          return n;
        /* Status */
        case 'st_pago':    return _clientesDoEscopo().filter(function(c){return String(c.status||'').toLowerCase()==='pago';}).length;
        case 'st_aberto':  return _clientesDoEscopo().filter(function(c){return String(c.status||'').toLowerCase()==='aberto';}).length;
        case 'st_negoc':   return _clientesDoEscopo().filter(function(c){return String(c.status||'').toLowerCase()==='negociacao';}).length;
        case 'st_entrada': return _clientesDoEscopo().filter(function(c){return +(c.entrada||0)>0;}).length;
        case 'st_desist':  return _clientesDoEscopo().filter(function(c){var s=String(c.status||'').toLowerCase();return s==='desistiu'||s==='cancelado'||s==='cancelada';}).length;
      }
    } catch(e){}
    return null;
  }

  function _esc(s){ return (window._esc ? window._esc(s) : String(s||'').replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];})); }
  function _escSafe(s){ return String(s||'').replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function _fmtR(v){ return (typeof formatVal==='function') ? formatVal(v) : ('R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})); }

  /* ──────────── CSS inline (one-shot) ──────────── */
  function _injetarCss(){
    if(document.getElementById('imprConsCss')) return;
    var st = document.createElement('style'); st.id = 'imprConsCss';
    st.textContent = [
      '.icv-ov{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);}',
      /* Escala global do modal — multiplica todos os tamanhos via var(--icv-scale).
         Inicializada via JS (a partir de _icvScale) ao abrir; default fallback = 1.30.
         Botões A−/A+ no header ajustam ao vivo e salvam em localStorage. */
      '.icv-modal{--icv-scale:1.30;background:#161b22;border:1px solid rgba(255,255,255,.08);border-radius:14px;width:100%;max-width:min(1500px,96vw);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 30px 60px -15px rgba(0,0,0,.7);}',
      '.icv-h{display:flex;justify-content:space-between;align-items:flex-start;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08);}',
      '.icv-h .ttl{font-size:calc(14px * var(--icv-scale,1));font-weight:700;color:#e6edf3;}',
      '.icv-h .sub{font-size:calc(10px * var(--icv-scale,1));color:#6b7280;margin-top:2px;}',
      '.icv-h .x{background:transparent;border:1px solid rgba(255,255,255,.08);color:#9aa5b1;padding:4px 9px;border-radius:6px;cursor:pointer;font-size:13px;font-family:inherit;}',
      /* Controles de zoom A−/A+ no header */
      '.icv-zoom{display:inline-flex;align-items:center;gap:0;margin-right:8px;border:1px solid rgba(212,165,116,.30);border-radius:6px;overflow:hidden;background:rgba(212,165,116,.06);}',
      '.icv-zoom button{background:transparent;border:none;color:#d4a574;padding:4px 9px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;line-height:1;}',
      '.icv-zoom button:hover{background:rgba(212,165,116,.15);}',
      '.icv-zoom .lbl{font-size:10px;color:#d4a574;font-weight:700;padding:0 6px;min-width:36px;text-align:center;font-variant-numeric:tabular-nums;}',
      '.icv-h .x:hover{color:#d4a574;border-color:#d4a574;}',
      '.icv-toolbar{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:rgba(212,165,116,.04);border-bottom:1px solid rgba(255,255,255,.08);font-size:calc(11px * var(--icv-scale,1));}',
      /* Seletor de escopo (sugestão B) */
      '.icv-escopo{display:flex;align-items:center;gap:10px;padding:10px 16px;background:rgba(212,165,116,.06);border-bottom:1px solid rgba(255,255,255,.08);font-size:calc(11px * var(--icv-scale,1));flex-wrap:wrap;}',
      '.icv-escopo .lbl{font-size:calc(10px * var(--icv-scale,1));color:#9aa5b1;font-weight:700;text-transform:uppercase;letter-spacing:.05em;}',
      '.icv-escopo .seg{display:inline-flex;background:rgba(0,0,0,.3);border-radius:6px;padding:3px;gap:2px;}',
      '.icv-escopo .seg button{padding:5px 11px;border:none;background:transparent;color:#9aa5b1;font-size:calc(10px * var(--icv-scale,1));font-weight:700;cursor:pointer;border-radius:4px;font-family:inherit;}',
      '.icv-escopo .seg button.on{background:#d4a574;color:#0a0e1a;}',
      '.icv-escopo .seg button:hover:not(.on){color:#d4a574;}',
      '.icv-escopo .info{margin-left:auto;font-size:10px;color:#6b7280;}',
      '.icv-escopo .info b{color:#d4a574;}',
      /* Input de mês (aparece quando escopo=Por mês) */
      '.icv-mes-picker{background:rgba(0,0,0,.3);border:1px solid rgba(212,165,116,.35);color:#d4a574;padding:4px 8px;border-radius:5px;font-size:11px;font-family:inherit;font-weight:600;cursor:pointer;color-scheme:dark;}',
      '.icv-mes-picker:focus{outline:none;border-color:#d4a574;box-shadow:0 0 0 2px rgba(212,165,116,.15);}',
      '.icv-mes-hoje{background:transparent;border:1px solid rgba(255,255,255,.10);color:#9aa5b1;padding:4px 9px;border-radius:5px;font-size:10px;font-family:inherit;font-weight:600;cursor:pointer;}',
      '.icv-mes-hoje:hover{color:#d4a574;border-color:#d4a574;}',
      '.icv-toolbar a{color:#d4a574;cursor:pointer;font-weight:600;margin-right:10px;}',
      '.icv-toolbar a:hover{text-decoration:underline;}',
      '.icv-toolbar .cnt b{color:#d4a574;font-weight:700;}',
      /* Mais espaço pro preview (~58%) e menos pras opções (~42%) — caber relatório sem cortar */
      '.icv-b{flex:1;overflow:hidden;padding:0;display:grid;grid-template-columns:minmax(360px,42fr) minmax(560px,58fr);gap:0;}',
      '@media(max-width:820px){.icv-b{grid-template-columns:1fr;}}',
      '.icv-opts{overflow-y:auto;padding:8px 14px 14px;border-right:1px solid rgba(255,255,255,.06);}',
      '.icv-preview{overflow-y:auto;padding:14px;background:#0a0e13;}',
      '.icv-preview .pv-h{display:flex;justify-content:space-between;align-items:center;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#d4a574;font-weight:700;padding-bottom:8px;margin-bottom:10px;border-bottom:1px dashed rgba(212,165,116,.25);}',
      '.icv-preview .pv-h .meta{color:#6b7280;font-weight:600;font-size:9px;}',
      '.icv-preview .pv-c{font-size:11px;color:#cbd5e0;line-height:1.5;}',
      /* Preview NÃO usa quebras de página — flui contínuo (page-breaks só no PDF) */
      '.icv-preview .pv-c *{page-break-before:auto!important;page-break-after:auto!important;page-break-inside:auto!important;break-before:auto!important;break-after:auto!important;break-inside:auto!important;}',
      '.icv-preview .pv-c h2{font-size:13px;color:#f0c896;margin:14px 0 4px;padding-bottom:3px;border-bottom:1px solid rgba(212,165,116,.25);}',
      '.icv-preview .pv-c h2:first-child{margin-top:0;}',
      '.icv-preview .pv-c h3{font-size:11px;color:#b88a5a;margin:8px 0 4px;}',
      '.icv-preview .pv-c table{width:100%;border-collapse:collapse;font-size:10px;margin-top:4px;}',
      '.icv-preview .pv-c table th{background:rgba(255,255,255,.04)!important;color:#9aa5b1!important;padding:4px 6px!important;text-align:left;}',
      '.icv-preview .pv-c table td{padding:3px 6px!important;border-bottom:1px solid rgba(255,255,255,.04)!important;}',
      '.icv-preview .pv-c p{margin:4px 0;font-size:10px;}',
      '.icv-preview .pv-empty{text-align:center;padding:32px 14px;color:#6b7280;font-size:11px;font-style:italic;}',
      '.icv-preview .pv-empty .ic{font-size:32px;display:block;margin-bottom:6px;opacity:.5;}',
      /* Header de filtros em cascata (preview) */
      '.icv-preview .pv-filtros{margin:0 0 12px;padding:9px 12px;background:linear-gradient(180deg,rgba(212,165,116,.10),rgba(212,165,116,.04));border:1px solid rgba(212,165,116,.30);border-left:3px solid #d4a574;border-radius:6px;font-size:calc(11px * var(--icv-scale,1));color:#e6edf3;line-height:1.55;}',
      '.icv-preview .pv-filtros b{color:#d4a574;font-weight:700;}',
      '.icv-preview .pv-filtros em{color:#9aa5b1;font-style:italic;}',
      /* Tag "FILTRO" nas sub-opções de Status e Escopo */
      '.icv-sub-opt .filtro-tag{margin-left:auto;font-size:calc(9px * var(--icv-scale,1));font-weight:700;letter-spacing:.08em;color:#d4a574;background:rgba(212,165,116,.12);border:1px solid rgba(212,165,116,.30);padding:1px 7px;border-radius:8px;text-transform:uppercase;}',
      '.icv-sub-opt.sel .filtro-tag{background:rgba(212,165,116,.22);color:#fff;}',
      '.icv-cat{border:1px solid rgba(255,255,255,.08);border-radius:8px;margin:8px 0;background:rgba(255,255,255,.02);overflow:hidden;border-left-width:3px;}',
      '.icv-cat.open{background:rgba(255,255,255,.025);}',
      /* Cores por categoria (sugestão 06) — borda esquerda + título + badge */
      '.icv-cat[data-sec-id="escopo"]{border-left-color:#3b82f6;}',
      '.icv-cat[data-sec-id="escopo"] .nome{color:#93c5fd;}',
      '.icv-cat[data-sec-id="escopo"] .icv-badge{background:#3b82f6;color:#fff;}',
      '.icv-cat[data-sec-id="escopo"] .icv-opt.sel{background:rgba(59,130,246,.10);border-left-color:#3b82f6;}',
      '.icv-cat[data-sec-id="status"]{border-left-color:#34d399;}',
      '.icv-cat[data-sec-id="status"] .nome{color:#86efac;}',
      '.icv-cat[data-sec-id="status"] .icv-badge{background:#34d399;color:#0a0e1a;}',
      '.icv-cat[data-sec-id="status"] .icv-opt.sel{background:rgba(52,211,153,.10);border-left-color:#34d399;}',
      '.icv-cat[data-sec-id="treinamento"]{border-left-color:#a855f7;}',
      '.icv-cat[data-sec-id="treinamento"] .nome{color:#c4b5fd;}',
      '.icv-cat[data-sec-id="treinamento"] .icv-badge{background:#a855f7;color:#fff;}',
      '.icv-cat[data-sec-id="treinamento"] .icv-opt.sel{background:rgba(168,85,247,.10);border-left-color:#a855f7;}',
      '.icv-cat[data-sec-id="periodo"]{border-left-color:#f59e0b;}',
      '.icv-cat[data-sec-id="periodo"] .nome{color:#fbbf24;}',
      '.icv-cat[data-sec-id="periodo"] .icv-badge{background:#f59e0b;color:#0a0e1a;}',
      '.icv-cat[data-sec-id="periodo"] .icv-opt.sel{background:rgba(245,158,11,.10);border-left-color:#f59e0b;}',
      '.icv-cat[data-sec-id="executivos"]{border-left-color:#d4a574;}',
      '.icv-cat[data-sec-id="executivos"] .nome{color:#f0c896;}',
      '.icv-cat[data-sec-id="executivos"] .icv-badge{background:#d4a574;color:#0a0e1a;}',
      '.icv-cat[data-sec-id="executivos"] .icv-opt.sel{background:rgba(212,165,116,.10);border-left-color:#d4a574;}',
      '.icv-cat-h{display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:pointer;user-select:none;}',
      '.icv-cat-h:hover{background:rgba(255,255,255,.03);}',
      '.icv-arrow{font-size:11px;color:#d4a574;width:14px;text-align:center;transition:transform .2s ease;display:inline-block;}',
      '.icv-cat.open .icv-arrow{transform:rotate(90deg);}',
      '.icv-cat-h .ic{font-size:calc(15px * var(--icv-scale,1));}',
      '.icv-cat-h .nome{flex:1;font-size:calc(12px * var(--icv-scale,1));font-weight:700;color:#e6edf3;}',
      '.icv-cat-h .info{font-size:calc(9px * var(--icv-scale,1));color:#6b7280;font-weight:600;display:flex;align-items:center;gap:5px;}',
      '.icv-badge{background:#d4a574;color:#0a0e1a;padding:2px 7px;border-radius:9px;font-size:calc(9px * var(--icv-scale,1));font-weight:800;}',
      '.icv-cat-b{border-top:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.15);padding:8px 0;display:none;}',
      '.icv-cat.open .icv-cat-b{display:block;}',
      '.icv-opt{display:flex;align-items:flex-start;gap:9px;padding:8px 14px 8px 38px;cursor:pointer;border-left:3px solid transparent;}',
      '.icv-opt:hover{background:rgba(212,165,116,.04);}',
      '.icv-opt.sel{background:rgba(212,165,116,.07);border-left-color:#d4a574;}',
      '.icv-opt input[type=checkbox]{width:14px;height:14px;accent-color:#d4a574;cursor:pointer;flex-shrink:0;margin-top:1px;}',
      '.icv-opt .opt-c{flex:1;min-width:0;}',
      '.icv-opt .opt-t{font-size:calc(11px * var(--icv-scale,1));font-weight:600;color:#e6edf3;display:flex;gap:6px;align-items:center;}',
      '.icv-opt .opt-d{font-size:calc(9px * var(--icv-scale,1));color:#6b7280;margin-top:2px;line-height:1.4;}',
      '.icv-opt.sel .opt-t{color:#d4a574;}',
      '.icv-opt.parent{font-weight:700;}',
      /* Extras embutidos da opção pe_outro (mês picker + select de turma) */
      '.icv-extra-periodo{margin-top:8px;padding:8px 10px;background:rgba(245,158,11,.06);border:1px dashed rgba(245,158,11,.25);border-radius:6px;display:none;flex-direction:column;gap:6px;}',
      '.icv-opt.sel .icv-extra-periodo{display:flex;}',
      '.icv-extra-row{display:flex;align-items:center;gap:8px;font-size:calc(10px * var(--icv-scale,1));}',
      '.icv-extra-row .lbl{color:#fbbf24;font-weight:700;min-width:50px;font-size:calc(10px * var(--icv-scale,1));}',
      '.icv-extra-row input[type=month]{background:rgba(0,0,0,.3);border:1px solid rgba(245,158,11,.30);color:#fbbf24;padding:4px 8px;border-radius:5px;font-size:calc(10px * var(--icv-scale,1));font-family:inherit;color-scheme:dark;}',
      '.icv-extra-row select{flex:1;background:rgba(0,0,0,.3);border:1px solid rgba(245,158,11,.30);color:#e6edf3;padding:4px 7px;border-radius:5px;font-size:calc(10px * var(--icv-scale,1));font-family:inherit;}',
      '.icv-extra-row button{background:transparent;border:1px solid rgba(255,255,255,.10);color:#9aa5b1;padding:4px 9px;border-radius:5px;font-size:calc(9px * var(--icv-scale,1));font-family:inherit;cursor:pointer;}',
      '.icv-extra-row button:hover{color:#fbbf24;border-color:#fbbf24;}',
      /* Sub-opções (estilo V9 com contador numérico) */
      '.icv-sub-opts{padding:6px 0 8px 50px;border-left:1px dashed rgba(212,165,116,.30);margin-left:38px;}',
      '.icv-sub-opt{display:flex;align-items:center;gap:7px;padding:calc(5px * var(--icv-scale,1)) calc(12px * var(--icv-scale,1));cursor:pointer;border-left:3px solid transparent;font-size:calc(10.5px * var(--icv-scale,1));color:#9aa5b1;}',
      '.icv-sub-opt input{width:calc(12px * var(--icv-scale,1));height:calc(12px * var(--icv-scale,1));accent-color:#d4a574;flex-shrink:0;}',
      '.icv-sub-opt .ic{font-size:calc(12px * var(--icv-scale,1));flex-shrink:0;}',
      '.icv-sub-opt .lbl{flex:1;}',
      '.icv-sub-opt .cnt{background:rgba(212,165,116,.15);color:#d4a574;padding:1px 7px;border-radius:8px;font-size:calc(9px * var(--icv-scale,1));font-weight:800;min-width:24px;text-align:center;font-variant-numeric:tabular-nums;}',
      '.icv-sub-opt.sel{color:#e6edf3;font-weight:600;background:rgba(212,165,116,.05);}',
      '.icv-sub-opt.sel .cnt{background:#d4a574;color:#0a0e1a;}',
      /* Multi-select de consultores (embutido na sub-opção esc_sel) */
      '.icv-multi-cons{margin:6px 12px 8px 50px;padding:10px;background:rgba(59,130,246,.06);border:1px dashed rgba(59,130,246,.30);border-radius:7px;}',
      '.icv-multi-cons-h{display:flex;align-items:center;gap:8px;font-size:calc(10px * var(--icv-scale,1));color:#93c5fd;font-weight:700;margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em;}',
      '.icv-multi-cons-h button{background:transparent;border:1px solid rgba(59,130,246,.40);color:#93c5fd;padding:2px 8px;border-radius:4px;font-size:calc(9px * var(--icv-scale,1));font-family:inherit;cursor:pointer;font-weight:700;}',
      '.icv-multi-cons-h button:hover{background:rgba(59,130,246,.15);}',
      /* Lista em ÁRVORE com guias verticais conectoras (estilo file explorer) */
      '.icv-multi-cons-chips{display:flex;flex-direction:column;gap:0;padding-left:6px;}',
      '.icv-cons-chip{display:flex;align-items:center;gap:8px;background:transparent;border:none;padding:5px 8px 5px 30px;border-radius:4px;font-size:calc(10.5px * var(--icv-scale,1));color:#9aa5b1;cursor:pointer;font-weight:500;position:relative;}',
      '.icv-cons-chip::before{content:"";position:absolute;left:8px;top:0;bottom:0;width:1px;background:rgba(59,130,246,.35);}',
      '.icv-cons-chip::after{content:"";position:absolute;left:8px;top:50%;width:14px;height:1px;background:rgba(59,130,246,.35);}',
      '.icv-cons-chip:last-child::before{height:50%;top:0;}',
      '.icv-cons-chip input{width:calc(12px * var(--icv-scale,1));height:calc(12px * var(--icv-scale,1));accent-color:#3b82f6;flex-shrink:0;}',
      '.icv-cons-chip:hover{background:rgba(59,130,246,.06);color:#cbd5e0;}',
      '.icv-cons-chip.on{background:rgba(59,130,246,.10);color:#93c5fd;font-weight:600;}',
      '.icv-star{color:#fbbf24;font-size:calc(10px * var(--icv-scale,1));margin-left:auto;flex-shrink:0;}',
      '.icv-star-tag{font-size:calc(8px * var(--icv-scale,1));background:rgba(251,191,36,.12);color:#fbbf24;padding:1px 6px;border-radius:8px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;}',
      '.icv-extra{margin-top:5px;font-size:calc(10px * var(--icv-scale,1));color:#9aa5b1;display:none;align-items:center;gap:6px;}',
      '.icv-opt.sel .icv-extra{display:flex;}',
      '.icv-extra select{flex:1;max-width:220px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.08);color:#e6edf3;padding:4px 7px;border-radius:4px;font-size:10px;font-family:inherit;}',
      '.icv-f{padding:12px 16px;border-top:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;}',
      '.icv-f .info{font-size:calc(10px * var(--icv-scale,1));color:#6b7280;}',
      '.icv-f .actions{display:flex;gap:6px;flex-wrap:wrap;}',
      '.icv-btn{font-size:calc(11px * var(--icv-scale,1));padding:7px 12px;border-radius:5px;cursor:pointer;border:1px solid rgba(255,255,255,.08);background:transparent;color:#e6edf3;font-weight:600;font-family:inherit;display:inline-flex;align-items:center;gap:5px;}',
      '.icv-btn:hover{border-color:#d4a574;color:#d4a574;}',
      '.icv-btn.primary{background:#d4a574;color:#0a0e1a;border-color:#d4a574;font-weight:800;}',
      '.icv-btn.primary:hover{background:#f0c896;}',
      '.icv-btn.primary:disabled{opacity:.5;cursor:not-allowed;}',
      /* Botão Imprimir — borda Neon outline estático (opção 04): linha dourada + halo sutil. */
      '.icv-split{display:inline-flex;align-items:center;gap:5px;border:1.5px solid #d4a574;border-radius:7px;box-shadow:0 0 0 1px rgba(212,165,116,.18), 0 0 12px -2px rgba(212,165,116,.35);background:#161b22;color:#d4a574;font-weight:700;padding:5.5px 14px;font-size:11px;cursor:pointer;font-family:inherit;transition:background .12s, box-shadow .12s;}',
      '.icv-split:hover{background:rgba(212,165,116,.10);box-shadow:0 0 0 1px rgba(212,165,116,.30), 0 0 18px -2px rgba(212,165,116,.50);}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ──────────── Lista de consultores (consolidada de 4 fontes) ──────────── */
  function _listaConsultores(){
    var set = new Map(); /* nome_upper → nome original */
    function _add(n){
      if(!n) return;
      var s = String(n).trim(); if(!s) return;
      var k = s.toUpperCase();
      if(!set.has(k)) set.set(k, s);
    }
    /* Fonte 1: gestão de usuários (Pipeline Comercial / IC) */
    var u = window._npUsuarios || {};
    Object.values(u).forEach(function(x){
      if(x && x.perfil==='consultor' && x.nome) _add(x.nome);
    });
    /* Fonte 2: allConsultors global (via getter dinâmico) */
    var allC = (typeof window.__getAllConsultors === 'function') ? window.__getAllConsultors() : (window.allConsultors || []);
    if(Array.isArray(allC)) allC.forEach(_add);
    /* Fonte 3: campo consultor nos clientes da turma atual */
    _coletarClientes().forEach(function(c){ _add(c.consultor); });
    /* Fonte 4: campo consultor nos clientes de TODAS as turmas (varredura) */
    try {
      _listarTodasTurmas().forEach(function(t){
        if(!t || !t.id) return;
        _clientesDeTurma(t.id).forEach(function(c){ _add(c.consultor); });
      });
    } catch(e){}
    return Array.from(set.values()).sort(function(a,b){ return a.localeCompare(b, 'pt-BR'); });
  }

  /* ──────────── Render do modal ──────────── */
  function _renderModal(){
    /* 1ª abertura: aplica pré-seleção sugerida */
    if(_primeiraAbertura){
      PRE_SELECT.forEach(function(id){ _selecionadas.add(id); });
      _primeiraAbertura = false;
    }
    /* Dropdown "Consultor selecionado" usa lista DO ESCOPO atual (sugestão A+B) */
    var consultores = _consultoresDoEscopo();
    var sessoesHtml = SESSOES.map(function(sec){
      var optsHtml = sec.opts.map(function(o){
        /* Sincronização: parent fica marcado quando TODOS os filhos estão marcados */
        if(o.isParent && o.subs && o.subs.length){
          var todosMarcados = o.subs.every(function(s){ return _selecionadas.has(s.id); });
          if(todosMarcados) _selecionadas.add(o.id);
          else _selecionadas.delete(o.id);
        }
        var sel = _selecionadas.has(o.id);
        var sugerida = PRE_SELECT.indexOf(o.id) >= 0;
        /* Extras embutidos (mês + turma) para a opção pe_outro */
        var extraHtml = '';
        if(o.extra === 'periodo'){
          var ymSel = _mesFiltroAtivo();
          var tmes = _turmasDoMesVigente(ymSel);
          extraHtml = '<div class="icv-extra-periodo">'
            + '<div class="icv-extra-row"><span class="lbl">Mês:</span><input type="month" id="icvMesPicker" value="'+_escSafe(ymSel)+'"><button id="icvMesHoje" type="button">Hoje</button></div>'
            + '<div class="icv-extra-row"><span class="lbl">Turma:</span><select id="icvTurmaSel">'
            +   '<option value="">— todas as turmas do mês ('+tmes.length+') —</option>'
            +   tmes.map(function(t){
                  var nome = t.nome||t.codigo||t.id;
                  return '<option value="'+_esc(t.id)+'"'+(t.id===_turmaMesEscolhida?' selected':'')+'>'+_esc(nome)+(t.codigo&&t.codigo!==nome?' · '+_esc(t.codigo):'')+'</option>';
                }).join('')
            + '</select></div>'
            + '</div>';
        }
        var optHtml = '<label class="icv-opt'+(sel?' sel':'')+(o.isParent?' parent':'')+'" data-opt-id="'+o.id+'">'
          + '<input type="checkbox" '+(sel?'checked':'')+'>'
          + '<div class="opt-c">'
          +   '<div class="opt-t"><span>'+o.ic+'</span>'+_esc(o.t)+(sugerida?'<span class="icv-star-tag" title="Pré-selecionada · sugerida">⭐ sugerida</span>':'')+'</div>'
          +   (o.d ? '<div class="opt-d">'+_esc(o.d)+'</div>' : '')
          +   extraHtml
          + '</div>'
          + '</label>';
        /* Sub-opções (parents que têm subs) — render com contador */
        if(o.subs && o.subs.length){
          var subsHtml = o.subs.map(function(s){
            var ssel = _selecionadas.has(s.id);
            var ssug = PRE_SELECT.indexOf(s.id) >= 0;
            var cnt = _contadorSub(s.id);
            var cntHtml = '<span class="cnt">'+(cnt==null?'✓':cnt)+'</span>';
            /* Multi-select de consultores embutido (sub-opção esc_sel) */
            var multiHtml = '';
            if(s.hasMultiSelect && ssel){
              var consDoEscopo = _consultoresDoEscopo();
              var nSel = _consultoresEscolhidos.size;
              var consChips = consDoEscopo.map(function(nome){
                var marcado = _consultoresEscolhidos.has(nome);
                return '<label class="icv-cons-chip'+(marcado?' on':'')+'" data-cons="'+_esc(nome)+'">'
                  + '<input type="checkbox" '+(marcado?'checked':'')+'>'
                  + '<span>'+_esc(nome)+'</span></label>';
              }).join('');
              multiHtml = '<div class="icv-multi-cons">'
                + '<div class="icv-multi-cons-h">'
                +   '<span>Escolha consultores ('+nSel+' de '+consDoEscopo.length+')</span>'
                +   '<button type="button" data-multi-act="all">Todos</button>'
                +   '<button type="button" data-multi-act="none">Nenhum</button>'
                + '</div>'
                + '<div class="icv-multi-cons-chips">'+consChips+'</div>'
                + '</div>';
            }
            /* Sub-opções de Status (st_*) e Escopo (esc_*) viraram FILTROS
               em cascata — não geram bloco. Mostro tag "FILTRO" pra deixar
               claro pro usuário. */
            var ehFiltro = /^st_|^esc_/.test(s.id);
            var filtroTag = ehFiltro ? '<span class="filtro-tag">FILTRO</span>' : '';
            return '<label class="icv-sub-opt'+(ssel?' sel':'')+'" data-opt-id="'+s.id+'">'
              + '<input type="checkbox" '+(ssel?'checked':'')+'>'
              + '<span class="ic">'+s.ic+'</span>'
              + '<span class="lbl">'+_esc(s.t)+(ssug?' <span class="icv-star-tag" style="margin-left:4px;">⭐</span>':'')+'</span>'
              + cntHtml
              + filtroTag
              + '</label>'
              + multiHtml;
          }).join('');
          optHtml += '<div class="icv-sub-opts">'+subsHtml+'</div>';
        }
        return optHtml;
      }).join('');
      /* Conta opções + subs selecionadas pra badge da sessão */
      var n = 0, totalOptsSec = 0;
      sec.opts.forEach(function(o){
        if(_selecionadas.has(o.id)) n++;
        if(!o.isParent) totalOptsSec++;
        if(o.subs){ o.subs.forEach(function(s){ totalOptsSec++; if(_selecionadas.has(s.id)) n++; }); }
      });
      var aberto = _sessoesAbertas.has(sec.id);
      return '<div class="icv-cat'+(aberto?' open':'')+'" data-sec-id="'+sec.id+'">'
        + '<div class="icv-cat-h">'
        +   '<span class="icv-arrow">▸</span>'
        +   '<span class="ic">'+sec.ic+'</span>'
        +   '<span class="nome">'+_esc(sec.nome)+'</span>'
        +   '<span class="info">'+totalOptsSec+' opções <span class="icv-badge" style="'+(n?'':'display:none;')+'">'+n+'</span></span>'
        + '</div>'
        + '<div class="icv-cat-b">'+optsHtml+'</div>'
        + '</div>';
    }).join('');
    var total = _selecionadas.size;
    var totalOpts = 0;
    SESSOES.forEach(function(sec){
      sec.opts.forEach(function(o){
        if(!o.isParent) totalOpts++;
        if(o.subs) totalOpts += o.subs.length;
      });
    });
    var html = '<div class="icv-ov" id="icvOv">'
      + '<div class="icv-modal">'
      +   '<div class="icv-h">'
      +     '<div>'
      +       '<div class="ttl">🖨 Imprimir relatório de consultores</div>'
      +       '<div class="sub">'+(window._turmaAtiva && window._turmaAtiva.nome ? '📚 Curso atual: <b style="color:#d4a574;">'+_esc(window._turmaAtiva.nome)+(window._turmaAtiva.codigo?' · '+_esc(window._turmaAtiva.codigo):'')+'</b> · ' : '')+'Marque as opções desejadas em uma ou mais sessões.</div>'
      +     '</div>'
      +     '<div style="display:flex;align-items:center;gap:6px;">'
      +       '<div class="icv-zoom" title="Ajustar tamanho da fonte">'
      +         '<button id="icvZoomDown" title="Diminuir fonte (A−)">A−</button>'
      +         '<span class="lbl" id="icvZoomLbl">'+Math.round(_icvScale*100)+'%</span>'
      +         '<button id="icvZoomUp" title="Aumentar fonte (A+)">A+</button>'
      +       '</div>'
      +       '<button class="x" id="icvFechar">✕</button>'
      +     '</div>'
      +   '</div>'
      +   '<div class="icv-toolbar">'
      +     '<div><a id="icvSelTudo">☑ Selecionar todas</a><a id="icvLimpar">☐ Limpar seleção</a></div>'
      +     '<div class="cnt"><b id="icvTotal">'+total+'</b> de '+totalOpts+' opções selecionadas</div>'
      +   '</div>'
      +   '<div class="icv-b">'
      +     '<div class="icv-opts">'+sessoesHtml+'</div>'
      +     '<div class="icv-preview">'
      +       '<div class="pv-h"><span>👁 Preview do relatório</span><span class="meta" id="icvPvMeta">—</span></div>'
      +       '<div class="pv-c" id="icvPvC"></div>'
      +     '</div>'
      +   '</div>'
      +   '<div class="icv-f">'
      +     '<div class="info">💡 <b>Período / Escopo / Status</b> são <b>filtros em cascata</b> · <b>Executivos / Treinamentos</b> são os <b>blocos</b> que entram no relatório.</div>'
      +     '<div class="actions">'
      +       '<button class="icv-btn" id="icvCancel">Cancelar</button>'
      +       '<button class="icv-btn" id="icvCopiar">📋 Copiar</button>'
      +       '<button class="icv-btn" id="icvWpp">💬 WhatsApp</button>'
      +       '<button class="icv-btn" id="icvTxt">💾 .txt</button>'
      +       '<button class="icv-btn primary" id="icvPdf">📄 Gerar PDF</button>'
      +     '</div>'
      +   '</div>'
      + '</div>'
      + '</div>';
    return html;
  }

  /* Wire-up dos handlers */
  function _wire(ov){
    ov.querySelector('#icvFechar').addEventListener('click', _fechar);
    ov.querySelector('#icvCancel').addEventListener('click', _fechar);
    ov.addEventListener('click', function(e){ if(e.target === ov) _fechar(); });

    /* Zoom A−/A+ (passo de 5%; intervalo 80%-200%) */
    var btnDown = ov.querySelector('#icvZoomDown');
    var btnUp = ov.querySelector('#icvZoomUp');
    if(btnDown) btnDown.addEventListener('click', function(){ _icvSetScale(_icvScale - 0.05); });
    if(btnUp)   btnUp.addEventListener('click',   function(){ _icvSetScale(_icvScale + 0.05); });

    /* Toggle de sessões */
    ov.querySelectorAll('.icv-cat-h').forEach(function(h){
      h.addEventListener('click', function(e){
        if(e.target.closest('input, label, select')) return;
        var id = h.parentElement.dataset.secId;
        if(_sessoesAbertas.has(id)) _sessoesAbertas.delete(id);
        else _sessoesAbertas.add(id);
        h.parentElement.classList.toggle('open');
      });
    });

    /* IDs que ao mudar precisam RE-RENDERIZAR o modal (porque expandem UI extra
       como multi-select de consultores, picker de mês, etc). */
    var IDS_RERENDER = ['esc_sel','pe_outro','pe_mes','pe_curso_atual'];
    /* Helper: encontra a opção parent (isParent:true) pelo id */
    function _acharParent(id){
      var encontrada = null;
      SESSOES.forEach(function(sec){
        sec.opts.forEach(function(o){
          if(o.id === id && o.subs && o.subs.length) encontrada = o;
        });
      });
      return encontrada;
    }
    /* Checkboxes (opções principais E sub-opções) */
    function _bindCheckbox(label){
      var id = label.dataset.optId; if(!id) return;
      var cb = label.querySelector('input[type=checkbox]'); if(!cb) return;
      cb.addEventListener('change', function(){
        if(cb.checked) _selecionadas.add(id); else _selecionadas.delete(id);
        /* Se for um parent (st_parent, esc_parent, ex_resumo), propaga
           marcação/desmarcação para todos os filhos. */
        var parent = _acharParent(id);
        if(parent){
          parent.subs.forEach(function(s){
            if(cb.checked) _selecionadas.add(s.id);
            else _selecionadas.delete(s.id);
          });
          _rerender();
          return;
        }
        label.classList.toggle('sel', cb.checked);
        if(IDS_RERENDER.indexOf(id) >= 0){
          _rerender();
        } else {
          _atualizarContadores(ov);
        }
      });
    }
    ov.querySelectorAll('.icv-opt').forEach(_bindCheckbox);
    ov.querySelectorAll('.icv-sub-opt').forEach(_bindCheckbox);

    /* Mês picker + select de turma (extras embutidos na opção pe_outro) */
    var mp = ov.querySelector('#icvMesPicker');
    if(mp){
      mp.addEventListener('change', function(){ _mesFiltro = mp.value || _mesAtualYM(); _rerender(); });
      mp.addEventListener('click', function(e){ e.stopPropagation(); });
    }
    var btnHoje = ov.querySelector('#icvMesHoje');
    if(btnHoje){
      btnHoje.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation();
        _mesFiltro = _mesAtualYM();
        _rerender();
      });
    }
    var tsel = ov.querySelector('#icvTurmaSel');
    if(tsel){
      tsel.addEventListener('change', function(){ _turmaMesEscolhida = tsel.value; _atualizarPreview(ov); });
      tsel.addEventListener('click', function(e){ e.stopPropagation(); });
    }
    /* Multi-select de consultores (chips com checkbox) */
    ov.querySelectorAll('.icv-cons-chip').forEach(function(chip){
      var nome = chip.dataset.cons;
      var cb = chip.querySelector('input[type=checkbox]');
      chip.addEventListener('click', function(e){
        if(e.target.tagName !== 'INPUT'){
          cb.checked = !cb.checked;
        }
        if(cb.checked) _consultoresEscolhidos.add(nome);
        else _consultoresEscolhidos.delete(nome);
        chip.classList.toggle('on', cb.checked);
        var hdrSpan = ov.querySelector('.icv-multi-cons-h span:first-child');
        if(hdrSpan){
          var total = ov.querySelectorAll('.icv-cons-chip').length;
          hdrSpan.textContent = 'Escolha consultores ('+_consultoresEscolhidos.size+' de '+total+')';
        }
        _atualizarPreview(ov);
        e.stopPropagation();
      });
    });
    /* Botões "Todos" e "Nenhum" do multi-select */
    ov.querySelectorAll('[data-multi-act]').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation();
        var act = btn.dataset.multiAct;
        var todosNomes = _consultoresDoEscopo();
        if(act === 'all'){
          todosNomes.forEach(function(n){ _consultoresEscolhidos.add(n); });
        } else {
          _consultoresEscolhidos.clear();
        }
        _rerender();
      });
    });

    /* Selecionar todas / limpar (inclui sub-opções) */
    ov.querySelector('#icvSelTudo').addEventListener('click', function(){
      SESSOES.forEach(function(sec){
        sec.opts.forEach(function(o){
          _selecionadas.add(o.id);
          if(o.subs) o.subs.forEach(function(s){ _selecionadas.add(s.id); });
        });
      });
      _rerender();
    });
    ov.querySelector('#icvLimpar').addEventListener('click', function(){
      _selecionadas.clear();
      _rerender();
    });

    /* Saída */
    ov.querySelector('#icvCopiar').addEventListener('click', function(){ _exportar('copiar'); });
    ov.querySelector('#icvWpp').addEventListener('click', function(){ _exportar('whatsapp'); });
    ov.querySelector('#icvTxt').addEventListener('click', function(){ _exportar('txt'); });
    ov.querySelector('#icvPdf').addEventListener('click', function(){ _exportar('pdf'); });
  }

  function _atualizarContadores(ov){
    SESSOES.forEach(function(sec){
      var n = 0;
      sec.opts.forEach(function(o){
        if(_selecionadas.has(o.id)) n++;
        if(o.subs) o.subs.forEach(function(s){ if(_selecionadas.has(s.id)) n++; });
      });
      var cat = ov.querySelector('[data-sec-id="'+sec.id+'"]'); if(!cat) return;
      var b = cat.querySelector('.icv-badge');
      if(b){ b.textContent = n; b.style.display = n>0 ? '' : 'none'; }
    });
    var t = ov.querySelector('#icvTotal'); if(t) t.textContent = _selecionadas.size;
    _atualizarPreview(ov);
  }
  function _atualizarPreview(ov){
    var pvC = ov.querySelector('#icvPvC');
    var pvM = ov.querySelector('#icvPvMeta');
    if(!pvC) return;
    if(!_selecionadas.size){
      pvC.innerHTML = '<div class="pv-empty"><span class="ic">📄</span>Marque uma ou mais opções nas sessões à esquerda para visualizar o relatório aqui.</div>'+_diagBoxHtml();
      if(pvM) pvM.textContent = '—';
      return;
    }
    /* Header de filtros aplicados em cascata */
    var filtroResumo = _filtroResumo();
    var totalCli = _clientesFiltrados().length;
    var hdrFiltros = '<div class="pv-filtros">'
      + '<b>🔗 Filtros em cascata:</b> '
      + (filtroResumo || '<em>nenhum filtro — universo completo do escopo</em>')
      + '<br><b>📊 Clientes no recorte:</b> ' + totalCli
      + '</div>';
    /* Coleta blocos selecionados respeitando ORDEM_HIERARQUICA fixa */
    var ids = Array.from(_selecionadas).filter(function(id){
      return id in ORDEM_HIERARQUICA;
    }).sort(function(a,b){ return _ordemDe(a) - _ordemDe(b); });
    var partes = [];
    var qtdBlocos = 0;
    ids.forEach(function(id){
      var sec = _buildSection(id);
      if(sec){ partes.push('<section>'+sec.html+'</section>'); qtdBlocos++; }
    });
    if(!partes.length){
      /* Usuário só marcou filtros mas nenhum bloco — preview mostra resumo */
      partes.push('<div class="pv-empty"><span class="ic">📋</span>Marque ao menos 1 bloco em <b>Executivos</b> ou <b>Por treinamento</b> para gerar conteúdo. Os filtros estão ativos.</div>');
    }
    pvC.innerHTML = hdrFiltros + partes.join('') + _diagBoxHtml();
    if(pvM) pvM.textContent = qtdBlocos + ' bloco(s) · ' + totalCli + ' cliente(s) filtrado(s) · '+_dataStrPt();
  }
  /* Diagnóstico das fontes de dados — sempre visível no fim do preview */
  function _diagBoxHtml(){
    var qData = _coletarClientes().length;
    var qTodas = _clientesDoEscopo().length;
    var qCons = _consultoresDoEscopo().length;
    var qConsGlobal = _listaConsultores().length;
    var todasT = _listarTodasTurmas();
    var qTurmas = todasT.length;
    var ymHoje = _mesAtualYM();
    var ym = (_escopo==='mes' ? _mesFiltroAtivo() : ymHoje);
    var qTurmasMes = _turmasDoMesVigente(ym).length;
    var qGoals = Object.keys(window._npGoals||{}).length;
    var turmaAtiva = (window._turmaAtiva && (window._turmaAtiva.nome||window._turmaAtiva.codigo)) || '—';
    /* Lista resumida de turmas encontradas + suas datas */
    var listaT = todasT.slice(0, 6).map(function(t){
      var dt = t.periodStart || t.criadoEm || '—';
      return '<li>'+_esc(t.nome||t.codigo||t.id)+' · <span style="color:#6b7280;">'+_esc(dt)+'</span></li>';
    }).join('') + (todasT.length > 6 ? '<li style="opacity:.6;">… (+'+(todasT.length-6)+' outras)</li>' : '');
    var fbStatus = _fbTurmasLoaded
      ? '<span style="color:#86efac;">✓ '+Object.keys(_fbTurmasCache).length+' turmas</span>'
      : '<span style="color:#fbbf24;">⏳ carregando...</span>';
    return '<div style="margin-top:18px;padding:10px;background:rgba(255,255,255,.03);border:1px dashed rgba(212,165,116,.20);border-radius:6px;font-size:10px;color:#9aa5b1;line-height:1.6;">'
      + '<b style="color:#d4a574;">🔍 Fontes de dados</b><br>'
      + '• Firebase (turmas): '+fbStatus+'<br>'
      + '• Turma ativa: <b>'+_esc(turmaAtiva)+'</b> · clientes nela: <b>'+qData+'</b><br>'
      + '• Clientes consolidados (todas turmas): <b>'+qTodas+'</b><br>'
      + '• Consultores no escopo atual: <b>'+qCons+'</b> · global: <b>'+qConsGlobal+'</b><br>'
      + '• Turmas encontradas: <b>'+qTurmas+'</b> · no mês '+ym+(ym===ymHoje?' (vigente)':'')+': <b>'+qTurmasMes+'</b><br>'
      + '• Metas mensais (npGoals): <b>'+qGoals+'</b>'
      + (qTurmas ? '<br><br><b style="color:#d4a574;">📋 Turmas detectadas</b><ul style="margin:4px 0 0;padding-left:16px;font-size:9px;">'+listaT+'</ul>' : '<br><br><span style="color:#fbbf24;">⚠ Aguarde o Firebase responder ou verifique sua conexão.</span>')
      + '</div>';
  }
  function _dataStrPt(){
    var d = new Date();
    return d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear();
  }
  function _rerender(){
    var ov = document.getElementById('icvOv'); if(!ov) return;
    /* Preserva posição de scroll do painel de opções e do preview pra evitar
       que clicar em checkboxes específicos (esc_sel, pe_*, parents) volte
       tudo pro topo. */
    var optsEl = ov.querySelector('.icv-opts');
    var pvEl   = ov.querySelector('#icvPvC');
    var scOpts = optsEl ? optsEl.scrollTop : 0;
    var scPv   = pvEl ? pvEl.scrollTop : 0;
    ov.outerHTML = _renderModal();
    var ovNovo = document.getElementById('icvOv');
    _wire(ovNovo);
    var optsN = ovNovo && ovNovo.querySelector('.icv-opts');
    var pvN   = ovNovo && ovNovo.querySelector('#icvPvC');
    if(optsN) optsN.scrollTop = scOpts;
    if(pvN)   pvN.scrollTop   = scPv;
  }

  /* ──────────── Geração de conteúdo ──────────── */
  function _hojeStr(){
    var d = new Date();
    return d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear();
  }
  function _coletarClientes(){
    /* IMPORTANTE: `data` é `let` no 02-main.js — NÃO está em window.data.
       Usa o getter dinâmico exposto em window.__getData(). */
    var d = (typeof window.__getData === 'function') ? window.__getData() : (window.data || []);
    if(!Array.isArray(d)) d = [];
    return d.filter(function(x){ return x && x.cliente; });
  }
  /* Agrupa por consultor — UNIVERSO BASE (só escopo, sem filtros de status/consultor).
     Usado para resolver "top 3", "bateu meta", etc. sem dependência circular.
     Marca cada cliente com a turma de origem (_turmaNome) pra rastreio. */
  function _porConsultorBase(){
    var map = {};
    _clientesDoEscopo().forEach(function(c){
      if(!c || !c.cliente) return;
      var k = c.consultor || '(Sem consultor)';
      if(!map[k]) map[k] = [];
      map[k].push(c);
    });
    return map;
  }
  /* Agrupa por consultor — JÁ FILTRADO (escopo + status + consultor).
     Usado por rankings, listagens, executivos e detalhado. */
  function _porConsultor(){
    var map = {};
    _clientesFiltrados().forEach(function(c){
      if(!c || !c.cliente) return;
      var k = c.consultor || '(Sem consultor)';
      if(!map[k]) map[k] = [];
      map[k].push(c);
    });
    return map;
  }

  /* ─── FILTROS GLOBAIS (cascata) ───────────────────────────────────────
     As sub-opções de "Por status" e "Por escopo" deixaram de gerar blocos
     próprios — viraram FILTROS que afetam TODAS as seções do relatório.
       _filtroStatusAtivo()        → Set de status marcados (vazio = todos)
       _filtroEntradaAtivo()       → flag pra st_entrada (entrada>0)
       _filtroConsultoresAtivo()   → Set de nomes (null = todos)
       _clientesDoEscopoComConsultor()
                                   → escopo + filtro consultor, SEM filtro
                                     de status. Usado nos blocos com filtro
                                     hardcoded (ex_em_negoc, ex_em_aberto,
                                     ex_trein_pg, ex_entradas).
       _clientesFiltrados()        → escopo + status + consultor. Cascata
                                     completa. Usado por blocos que devem
                                     espelhar os filtros do usuário. */
  function _filtroStatusAtivo(){
    var sts = new Set();
    if(_selecionadas.has('st_pago'))    sts.add('pago');
    if(_selecionadas.has('st_aberto'))  sts.add('aberto');
    if(_selecionadas.has('st_negoc'))   sts.add('negociacao');
    if(_selecionadas.has('st_desist')){ sts.add('desistiu'); sts.add('cancelado'); sts.add('cancelada'); }
    return sts;
  }
  function _filtroEntradaAtivo(){
    return _selecionadas.has('st_entrada');
  }
  function _filtroConsultoresAtivo(){
    var set = new Set();
    var ativo = false;
    if(_selecionadas.has('esc_top3')){
      ativo = true;
      var base = _porConsultorBase();
      Object.keys(base).map(function(n){
        return { nome:n, pago:_statsConsultor(base[n]).pago };
      }).sort(function(a,b){ return b.pago - a.pago; }).slice(0,3)
        .forEach(function(r){ set.add(r.nome); });
    }
    if(_selecionadas.has('esc_bateu')){
      ativo = true;
      var goals = window._npGoals || {};
      var base2 = _porConsultorBase();
      Object.keys(base2).forEach(function(n){
        var g = goals[n] || {};
        var meta = +(g.metaMinima || g.metaValor || 0);
        var pago = _statsConsultor(base2[n]).pago;
        if(meta>0 && pago>=meta) set.add(n);
      });
    }
    if(_selecionadas.has('esc_sel') && _consultoresEscolhidos.size > 0){
      ativo = true;
      _consultoresEscolhidos.forEach(function(n){ set.add(n); });
    }
    /* esc_todos = não filtra (universo total). Se nenhum filtro ativo → null. */
    return ativo ? set : null;
  }
  function _clientesDoEscopoComConsultor(){
    var lista = _clientesDoEscopo();
    var cs = _filtroConsultoresAtivo();
    if(!cs) return lista;
    return lista.filter(function(c){
      return cs.has(String(c.consultor||'').trim());
    });
  }
  function _clientesFiltrados(){
    var lista = _clientesDoEscopoComConsultor();
    var sts = _filtroStatusAtivo();
    var fent = _filtroEntradaAtivo();
    var algumStatus = sts.size > 0 || fent;
    if(!algumStatus) return lista;
    return lista.filter(function(c){
      var st = String(c.status||'').toLowerCase();
      if(sts.size > 0 && sts.has(st)) return true;
      if(fent && +(c.entrada||0) > 0) return true;
      return false;
    });
  }
  /* Resumo textual dos filtros ativos — usado em header do preview e PDF */
  function _filtroResumo(){
    var partes = [];
    var sts = _filtroStatusAtivo();
    var labels = { pago:'PAGO', aberto:'ABERTO', negociacao:'NEGOCIAÇÃO', desistiu:'DESISTIU' };
    var stLabel = [];
    if(sts.has('pago'))       stLabel.push(labels.pago);
    if(sts.has('aberto'))     stLabel.push(labels.aberto);
    if(sts.has('negociacao')) stLabel.push(labels.negociacao);
    if(sts.has('desistiu'))   stLabel.push(labels.desistiu);
    if(_filtroEntradaAtivo()) stLabel.push('COM ENTRADA');
    if(stLabel.length) partes.push('status=' + stLabel.join(','));
    var cs = _filtroConsultoresAtivo();
    if(cs){
      var nomes = Array.from(cs);
      var resumo = nomes.length <= 3 ? nomes.join(', ') : (nomes.slice(0,3).join(', ')+' +'+(nomes.length-3));
      partes.push('consultor=' + resumo);
    }
    return partes.join(' · ');
  }
  /* Período como TOPO DA CADEIA — todas as outras seções (status, treinamento,
     executivos) usam o resultado desta função. A opção de Período marcada define
     o universo de dados. Prioridade: pe_outro > pe_mes > pe_curso_atual (default). */
  function _periodoAtivo(){
    if(_selecionadas.has('pe_outro')) return 'outro';
    if(_selecionadas.has('pe_mes'))   return 'mes_atual';
    return 'atual'; /* pe_curso_atual ou nenhum marcado */
  }
  function _clientesDoEscopo(){
    var per = _periodoAtivo();
    if(per === 'outro'){
      var ym = _mesFiltroAtivo();
      if(_turmaMesEscolhida){
        /* Turma específica do mês escolhido */
        return _clientesDeTurma(_turmaMesEscolhida);
      }
      /* Todas as turmas do mês escolhido (dedup) */
      var turmasO = _turmasDoMesVigente(ym);
      var todosO = [], seenO = {};
      turmasO.forEach(function(t){
        if(!t || !t.id) return;
        var nomeO = t.nome || t.codigo || t.id;
        _clientesDeTurma(t.id).forEach(function(c){
          if(!c || !c.cliente) return;
          var k = (c.cliente||'')+'|'+(c.consultor||'')+'|'+(c.treinamento||'')+'|'+(+c.valor||0);
          if(seenO[k]) return; seenO[k] = 1;
          var cp = Object.assign({}, c);
          if(!cp._turmaNome) cp._turmaNome = nomeO;
          todosO.push(cp);
        });
      });
      return todosO;
    }
    if(per === 'mes_atual'){
      /* Todas as turmas do mês corrente (dedup) */
      var ymH = _mesAtualYM();
      var turmasM = _turmasDoMesVigente(ymH);
      var todosM = [], seenM = {};
      turmasM.forEach(function(t){
        if(!t || !t.id) return;
        var nomeM = t.nome || t.codigo || t.id;
        _clientesDeTurma(t.id).forEach(function(c){
          if(!c || !c.cliente) return;
          var k = (c.cliente||'')+'|'+(c.consultor||'')+'|'+(c.treinamento||'')+'|'+(+c.valor||0);
          if(seenM[k]) return; seenM[k] = 1;
          var cp = Object.assign({}, c);
          if(!cp._turmaNome) cp._turmaNome = nomeM;
          todosM.push(cp);
        });
      });
      return todosM;
    }
    /* 'atual' (default) — só a turma ativa */
    return _coletarClientes();
  }
  /* Lista de consultores baseada no escopo (deduz a partir dos clientes) */
  function _consultoresDoEscopo(){
    var set = new Map();
    _clientesDoEscopo().forEach(function(c){
      if(!c || !c.consultor) return;
      var s = String(c.consultor).trim(); if(!s) return;
      var k = s.toUpperCase();
      if(!set.has(k)) set.set(k, s);
    });
    return Array.from(set.values()).sort(function(a,b){ return a.localeCompare(b, 'pt-BR'); });
  }
  function _escopoLabel(){
    var per = _periodoAtivo();
    if(per === 'atual'){
      var t = window._turmaAtiva;
      return 'desta turma' + (t && (t.nome||t.codigo) ? ' · '+(t.nome||t.codigo) : '');
    }
    if(per === 'mes_atual'){
      var ym = _mesAtualYM();
      return 'do mês '+ym+' (vigente · todas as turmas)';
    }
    /* 'outro' */
    var ymO = _mesFiltroAtivo();
    if(_turmaMesEscolhida){
      var todasT = _listarTodasTurmas();
      var tEsc = todasT.find(function(x){ return x.id === _turmaMesEscolhida; });
      return 'turma '+(tEsc?(tEsc.nome||tEsc.codigo||tEsc.id):_turmaMesEscolhida)+' · mês '+ymO;
    }
    return 'do mês '+ymO+' (todas as turmas)';
  }

  function _consolidarTodasTurmasClientes(){
    var todos = [];
    var seen = {};
    function _addLista(lst, tNome){
      (lst||[]).forEach(function(c){
        if(!c || !c.cliente) return;
        var k = (c.cliente||'')+'|'+(c.consultor||'')+'|'+(c.treinamento||'')+'|'+(+c.valor||0);
        if(seen[k]) return;
        seen[k] = 1;
        var copia = Object.assign({}, c);
        if(tNome && !copia._turmaNome) copia._turmaNome = tNome;
        todos.push(copia);
      });
    }
    _addLista(_coletarClientes(), window._turmaAtiva && window._turmaAtiva.nome || '');
    try {
      _listarTodasTurmas().forEach(function(t){
        if(!t || !t.id) return;
        if(window._turmaAtiva && t.id === window._turmaAtiva.id) return;
        _addLista(_clientesDeTurma(t.id), t.nome || t.codigo || t.id);
      });
    } catch(e){}
    return todos;
  }
  function _statsConsultor(clientes){
    var pago = 0, aberto = 0, entrada = 0, neg = 0, total = 0;
    clientes.forEach(function(c){
      var v = +(c.valor||0);
      var st = String(c.status||'').toLowerCase();
      total += v;
      if(st === 'pago') pago += v;
      else if(st === 'aberto') aberto += v;
      else if(st === 'negociacao') neg += v;
      entrada += +(c.entrada||0);
    });
    return { total:total, pago:pago, aberto:aberto, negociacao:neg, entrada:entrada, qtd:clientes.length };
  }

  /* Cada section retorna {titulo, html, txt}
     ── NOVO FLUXO (cascata) ────────────────────────────────────────
     Sub-opções de "Por escopo" (esc_*) e "Por status" (st_*) deixaram
     de gerar BLOCOS — viraram FILTROS GLOBAIS aplicados em cascata
     sobre todas as seções. Por isso retornam null aqui.
     "Por treinamento" (tr_*) e "Executivos" (ex_*) continuam como
     blocos opcionais que aparecem no relatório quando marcados. */
  function _buildSection(id){
    switch(id){
      /* FILTROS (não geram bloco) */
      case 'esc_parent': case 'esc_todos': case 'esc_top3':
      case 'esc_bateu':  case 'esc_sel':
      case 'st_parent':  case 'st_pago':   case 'st_aberto':
      case 'st_negoc':   case 'st_entrada':case 'st_desist':
      case 'pe_curso_atual': case 'pe_mes': case 'pe_outro':
      case 'ex_resumo':
        return null;
      /* BLOCOS DE TREINAMENTO */
      case 'tr_agrup':    return _sec_trAgrupado();
      case 'tr_top5':     return _sec_trTop5();
      case 'tr_hight':    return _sec_trHightTicket();
      /* BLOCOS DE EXECUTIVOS */
      case 'ex_fin':       return _sec_exFinanceiro();
      case 'ex_trein_pg':  return _sec_exTreinPagos();
      case 'ex_entradas':  return _sec_exEntradas();
      case 'ex_negoc':     return _sec_exEmNegoc();
      case 'ex_aberto':    return _sec_exEmAberto();
      case 'ex_rk_cons':   return _sec_exRkConsultores();
      case 'ex_rk_trein':  return _sec_exRkTreinadores();
      case 'ex_top_trein': return _sec_exTopTreinamentos();
      case 'ex_meta':      return _sec_exMetaRealizado();
      case 'ex_assin':     return _sec_exAssinatura();
      case 'ex_detalh':    return _sec_exDetalh();
    }
    return null;
  }

  /* ── ESCOPO ── */
  function _sec_escTodos(){
    var grupos = _porConsultor();
    var nomes = Object.keys(grupos).sort(function(a,b){ return a.localeCompare(b,'pt-BR'); });
    var html = '<h2>👥 Todos os consultores</h2>';
    var txt  = '👥 TODOS OS CONSULTORES\n';
    nomes.forEach(function(n){
      var lst = grupos[n], s = _statsConsultor(lst);
      html += '<h3 style="margin-top:14px;color:#b88a5a;">'+_esc(n)+' · '+s.qtd+' cliente(s) · '+_fmtR(s.total)+'</h3>';
      html += '<table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:#1c2128;color:#9aa5b1;"><th style="padding:5px 8px;text-align:left;">Cliente</th><th style="padding:5px 8px;text-align:left;">Treinamento</th><th style="padding:5px 8px;text-align:right;">Valor</th><th style="padding:5px 8px;">Status</th></tr></thead><tbody>';
      lst.forEach(function(c){
        html += '<tr style="border-bottom:1px solid #2a2f37;"><td style="padding:5px 8px;">'+_esc(c.cliente)+'</td><td style="padding:5px 8px;color:#9aa5b1;">'+_esc(c.treinamento||'—')+'</td><td style="padding:5px 8px;text-align:right;">'+_fmtR(c.valor)+'</td><td style="padding:5px 8px;text-align:center;font-size:10px;">'+_esc(String(c.status||'').toUpperCase())+'</td></tr>';
      });
      html += '</tbody></table>';
      txt += '\n▼ '+n+' · '+s.qtd+' cliente(s) · '+_fmtR(s.total)+'\n';
      lst.forEach(function(c){
        txt += '   • '+c.cliente+' · '+(c.treinamento||'—')+' · '+_fmtR(c.valor)+' · '+String(c.status||'').toUpperCase()+'\n';
      });
    });
    return { titulo:'👥 Todos os consultores', html:html, txt:txt };
  }
  function _sec_escSel(){
    if(!_consultorEscolhido){
      return { titulo:'👤 Consultor selecionado', html:'<p style="color:#fbbf24;">Nenhum consultor escolhido no dropdown.</p>', txt:'(nenhum consultor escolhido)\n' };
    }
    var lst = _coletarClientes().filter(function(c){ return c.consultor === _consultorEscolhido; });
    var s = _statsConsultor(lst);
    var html = '<h2>👤 '+_esc(_consultorEscolhido)+'</h2>'
      + '<p style="color:#9aa5b1;">'+s.qtd+' cliente(s) · Total: <b>'+_fmtR(s.total)+'</b> · Pago: <b style="color:#34d399;">'+_fmtR(s.pago)+'</b> · Aberto: <b style="color:#f59e0b;">'+_fmtR(s.aberto)+'</b></p>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:#1c2128;color:#9aa5b1;"><th style="padding:5px 8px;text-align:left;">Cliente</th><th style="padding:5px 8px;">Treinamento</th><th style="padding:5px 8px;text-align:right;">Valor</th><th style="padding:5px 8px;">Status</th></tr></thead><tbody>';
    lst.forEach(function(c){
      html += '<tr style="border-bottom:1px solid #2a2f37;"><td style="padding:5px 8px;">'+_esc(c.cliente)+'</td><td style="padding:5px 8px;">'+_esc(c.treinamento||'—')+'</td><td style="padding:5px 8px;text-align:right;">'+_fmtR(c.valor)+'</td><td style="padding:5px 8px;text-align:center;font-size:10px;">'+_esc(String(c.status||'').toUpperCase())+'</td></tr>';
    });
    html += '</tbody></table>';
    var txt = '👤 '+_consultorEscolhido+'\n'
      + s.qtd+' cliente(s) · Total: '+_fmtR(s.total)+' · Pago: '+_fmtR(s.pago)+' · Aberto: '+_fmtR(s.aberto)+'\n';
    lst.forEach(function(c){
      txt += '   • '+c.cliente+' · '+(c.treinamento||'—')+' · '+_fmtR(c.valor)+' · '+String(c.status||'').toUpperCase()+'\n';
    });
    return { titulo:'👤 Consultor selecionado', html:html, txt:txt };
  }
  /* Consultores específicos — usa _consultoresEscolhidos (Set) */
  function _sec_escSelManual(){
    if(!_consultoresEscolhidos.size){
      return { titulo:'☑ Consultores específicos', html:'<h2>☑ Consultores específicos</h2><p style="color:#fbbf24;">Nenhum consultor selecionado nos chips. Marque pelo menos um.</p>', txt:'(nenhum consultor selecionado)\n' };
    }
    var grupos = _porConsultor();
    var html = '<h2>☑ Consultores selecionados ('+_consultoresEscolhidos.size+')</h2>';
    var txt = '☑ CONSULTORES SELECIONADOS\n';
    var totGeral = 0;
    Array.from(_consultoresEscolhidos).sort(function(a,b){ return a.localeCompare(b, 'pt-BR'); }).forEach(function(nome){
      var lst = grupos[nome] || [];
      var s = _statsConsultor(lst);
      totGeral += s.pago;
      html += '<h3 style="margin-top:14px;color:#b88a5a;">'+_esc(nome)+' · '+s.qtd+' cliente(s) · pago: <b style="color:#34d399;">'+_fmtR(s.pago)+'</b></h3>';
      html += '<table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:#1c2128;"><th style="padding:5px 8px;text-align:left;">Cliente</th><th style="padding:5px 8px;text-align:left;">Treinamento</th><th style="padding:5px 8px;text-align:right;">Valor</th><th style="padding:5px 8px;">Status</th></tr></thead><tbody>';
      lst.forEach(function(c){
        html += '<tr style="border-bottom:1px solid #2a2f37;"><td style="padding:4px 8px;">'+_esc(c.cliente)+'</td><td style="padding:4px 8px;">'+_esc(c.treinamento||'—')+'</td><td style="padding:4px 8px;text-align:right;">'+_fmtR(c.valor)+'</td><td style="padding:4px 8px;text-align:center;font-size:9px;">'+_esc(String(c.status||'').toUpperCase())+'</td></tr>';
      });
      html += '</tbody></table>';
      txt += '\n▼ '+nome+' · '+s.qtd+' cliente(s) · pago '+_fmtR(s.pago)+'\n';
      lst.forEach(function(c){
        txt += '   • '+c.cliente+' · '+(c.treinamento||'—')+' · '+_fmtR(c.valor)+' · '+String(c.status||'').toUpperCase()+'\n';
      });
    });
    html += '<p style="margin-top:8px;color:#9aa5b1;">Total faturado dos selecionados: <b style="color:#d4a574;">'+_fmtR(totGeral)+'</b></p>';
    return { titulo:'☑ Consultores específicos', html:html, txt:txt };
  }

  function _sec_escTop3(){
    var grupos = _porConsultor();
    var ranking = Object.keys(grupos).map(function(n){
      var s = _statsConsultor(grupos[n]);
      return { nome:n, pago:s.pago, qtd:s.qtd };
    }).sort(function(a,b){ return b.pago - a.pago; }).slice(0,3);
    var medals = ['🥇','🥈','🥉'];
    var html = '<h2>🥇 Top 3 consultores</h2><table style="width:100%;font-size:12px;">';
    var txt = '🥇 TOP 3 CONSULTORES\n';
    ranking.forEach(function(r,i){
      html += '<tr><td style="padding:6px;font-size:18px;">'+medals[i]+'</td><td style="padding:6px;font-weight:700;">'+_esc(r.nome)+'</td><td style="padding:6px;color:#34d399;text-align:right;font-weight:700;">'+_fmtR(r.pago)+'</td><td style="padding:6px;color:#9aa5b1;text-align:right;">'+r.qtd+' clientes</td></tr>';
      txt += medals[i]+' '+r.nome+' · '+_fmtR(r.pago)+' · '+r.qtd+' clientes\n';
    });
    html += '</table>';
    return { titulo:'🥇 Top 3 consultores', html:html, txt:txt };
  }
  function _sec_escBateu(){
    var goals = window._npGoals || {};
    var grupos = _porConsultor();
    var bateu = [];
    Object.keys(grupos).forEach(function(n){
      var s = _statsConsultor(grupos[n]);
      var g = goals[n] || {};
      var meta = +(g.metaMinima || g.metaValor || 0);
      if(meta > 0 && s.pago >= meta){
        bateu.push({nome:n, pago:s.pago, meta:meta, pct:Math.round(s.pago/meta*100)});
      }
    });
    bateu.sort(function(a,b){ return b.pct - a.pct; });
    var html = '<h2>🎯 Quem bateu meta ('+bateu.length+' de '+Object.keys(grupos).length+')</h2>';
    var txt = '🎯 QUEM BATEU META\n';
    if(!bateu.length){ html += '<p style="color:#fbbf24;">Nenhum consultor bateu meta ainda neste mês.</p>'; txt+='(nenhum)\n'; }
    else {
      html += '<table style="width:100%;font-size:12px;">';
      bateu.forEach(function(b){
        html += '<tr><td style="padding:6px;font-weight:700;">✓ '+_esc(b.nome)+'</td><td style="padding:6px;color:#34d399;text-align:right;">'+_fmtR(b.pago)+'</td><td style="padding:6px;text-align:right;font-weight:700;color:#34d399;">'+b.pct+'%</td></tr>';
        txt += '✓ '+b.nome+' · '+_fmtR(b.pago)+' · '+b.pct+'%\n';
      });
      html += '</table>';
    }
    return { titulo:'🎯 Bateu meta', html:html, txt:txt };
  }
  function _sec_escAbaixo(){
    var goals = window._npGoals || {};
    var consultores = _consultoresDoEscopo();
    var abaixo = [];
    consultores.forEach(function(n){
      var grupos = _porConsultor();
      var lst = grupos[n] || [];
      var s = _statsConsultor(lst);
      var g = goals[n] || {};
      var meta = +(g.metaMinima || g.metaValor || 0);
      if(!meta || s.pago < meta){
        abaixo.push({nome:n, pago:s.pago, meta:meta, pct:meta?Math.round(s.pago/meta*100):0});
      }
    });
    abaixo.sort(function(a,b){ return a.pct - b.pct; });
    var html = '<h2>⚠ Abaixo da meta ('+abaixo.length+')</h2><table style="width:100%;font-size:12px;">';
    var txt = '⚠ ABAIXO DA META\n';
    abaixo.forEach(function(b){
      html += '<tr><td style="padding:6px;font-weight:700;">'+_esc(b.nome)+'</td><td style="padding:6px;text-align:right;">'+_fmtR(b.pago)+'</td><td style="padding:6px;text-align:right;">'+(b.meta?_fmtR(b.meta):'sem meta')+'</td><td style="padding:6px;text-align:right;color:#fca5a5;font-weight:700;">'+b.pct+'%</td></tr>';
      txt += b.nome+' · '+_fmtR(b.pago)+' / '+(b.meta?_fmtR(b.meta):'sem meta')+' · '+b.pct+'%\n';
    });
    html += '</table>';
    return { titulo:'⚠ Abaixo da meta', html:html, txt:txt };
  }

  /* ── STATUS ── (consolida TODAS as turmas, não só a atual) */
  function _sec_stTodos(){
    var lst = _clientesDoEscopo();
    var html = '<h2>📋 Todos os clientes ('+lst.length+')</h2>'
      + '<table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:#1c2128;"><th style="padding:5px 8px;text-align:left;">Cliente</th><th style="padding:5px 8px;text-align:left;">Consultor</th><th style="padding:5px 8px;text-align:left;">Treinamento</th><th style="padding:5px 8px;text-align:right;">Valor</th><th style="padding:5px 8px;">Status</th></tr></thead><tbody>';
    var txt = '📋 TODOS OS CLIENTES ('+lst.length+')\n';
    lst.forEach(function(c){
      html += '<tr style="border-bottom:1px solid #2a2f37;"><td style="padding:4px 8px;">'+_esc(c.cliente)+'</td><td style="padding:4px 8px;color:#9aa5b1;">'+_esc(c.consultor||'—')+'</td><td style="padding:4px 8px;">'+_esc(c.treinamento||'—')+'</td><td style="padding:4px 8px;text-align:right;">'+_fmtR(c.valor)+'</td><td style="padding:4px 8px;text-align:center;font-size:9px;">'+_esc(String(c.status||'').toUpperCase())+'</td></tr>';
      txt += '• '+c.cliente+' · '+(c.consultor||'—')+' · '+_fmtR(c.valor)+' · '+String(c.status||'').toUpperCase()+'\n';
    });
    html += '</tbody></table>';
    return { titulo:'📋 Todos os clientes', html:html, txt:txt };
  }
  /* Strip de emojis pra títulos limpos no PDF estilo "Relatório Executivo".
     Preserva texto, remove só pictogramas iniciais. */
  function _stripEmoji(s){
    return String(s||'').replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]+\s*/u, '').trim();
  }
  function _sec_stFiltro(status, titulo, lblTxt){
    /* Bloco de status fixo — filtra hardcoded por status, respeita consultor.
       Mensagem vazia segue padrão "Nenhum X registrado. —". Header "TÍTULO (N · R$)". */
    var lst = _clientesDoEscopoComConsultor().filter(function(c){ return String(c.status||'').toLowerCase() === status; });
    var sum = lst.reduce(function(a,c){ return a + +(c.valor||0); }, 0);
    var tituloLimpo = _stripEmoji(titulo);
    var header = '<h2>'+_esc(tituloLimpo)+' ('+lst.length+(lst.length ? ' · '+_fmtR(sum) : '')+')</h2>';
    var txt = tituloLimpo+' ('+lst.length+(lst.length?' · '+_fmtR(sum):'')+')\n';
    if(!lst.length){
      var label = String(lblTxt||'').toLowerCase();
      var msg = (status === 'pago')       ? 'Nenhum pagamento registrado.'
              : (status === 'aberto')     ? 'Nenhum cliente em aberto.'
              : (status === 'negociacao') ? 'Nenhuma negociação ativa.'
              : (status === 'desistiu')   ? 'Nenhuma desistência registrada.'
              : 'Sem registros.';
      return { titulo:tituloLimpo, html: header + '<div class="rs-empty"><span>'+msg+'</span><span class="dash">—</span></div>', txt: txt + '  ' + msg + '\n' };
    }
    var html = header
      + '<table><thead><tr><th>Cliente</th><th>Treinamento</th><th style="text-align:right;">Valor</th><th>Forma</th><th>Consultor</th></tr></thead><tbody>';
    lst.forEach(function(c){
      var forma = c.forma || c.formaPagamento || '—';
      html += '<tr><td>'+_esc(c.cliente)+'</td><td>'+_esc(c.treinamento||'—')+'</td><td style="text-align:right;font-weight:700;">'+_fmtR(c.valor)+'</td><td>'+_esc(forma)+'</td><td>'+_esc(c.consultor||'—')+'</td></tr>';
      txt += '• '+c.cliente+' · '+(c.treinamento||'—')+' · '+_fmtR(c.valor)+' · '+(c.consultor||'—')+'\n';
    });
    html += '</tbody></table>';
    return { titulo:tituloLimpo, html:html, txt:txt };
  }
  function _sec_stEntrada(){
    var lst = _clientesDoEscopoComConsultor().filter(function(c){ return +(c.entrada||0) > 0; });
    var sum = lst.reduce(function(a,c){ return a + +(c.entrada||0); }, 0);
    var tituloLimpo = 'Entradas recebidas';
    var header = '<h2>'+tituloLimpo+' ('+lst.length+(lst.length ? ' · '+_fmtR(sum) : '')+')</h2>';
    var txt = tituloLimpo.toUpperCase()+' ('+lst.length+(lst.length?' · '+_fmtR(sum):'')+')\n';
    if(!lst.length){
      return { titulo:tituloLimpo, html: header + '<div class="rs-empty"><span>Nenhuma entrada registrada.</span><span class="dash">—</span></div>', txt: txt + '  Nenhuma entrada registrada.\n' };
    }
    var html = header
      + '<table><thead><tr><th>Cliente</th><th>Consultor</th><th style="text-align:right;">Entrada</th><th style="text-align:right;">Valor total</th></tr></thead><tbody>';
    lst.forEach(function(c){
      html += '<tr><td>'+_esc(c.cliente)+'</td><td>'+_esc(c.consultor||'—')+'</td><td style="text-align:right;font-weight:700;">'+_fmtR(c.entrada)+'</td><td style="text-align:right;">'+_fmtR(c.valor)+'</td></tr>';
      txt += '• '+c.cliente+' · '+(c.consultor||'—')+' · entrada '+_fmtR(c.entrada)+' / total '+_fmtR(c.valor)+'\n';
    });
    html += '</tbody></table>';
    return { titulo:tituloLimpo, html:html, txt:txt };
  }

  /* ── TREINAMENTO ── (consolida TODAS as turmas) */
  function _sec_trAgrupado(){
    var grupos = {};
    _clientesFiltrados().forEach(function(c){
      var k = c.treinamento || '(Sem treinamento)';
      if(!grupos[k]) grupos[k] = [];
      grupos[k].push(c);
    });
    var html = '<h2>Por treinamento</h2>';
    var txt = 'POR TREINAMENTO\n';
    Object.keys(grupos).sort().forEach(function(k){
      var lst = grupos[k];
      var sum = lst.reduce(function(a,c){ return a + +(c.valor||0); }, 0);
      html += '<h3 style="margin-top:14px;color:#b88a5a;">'+_esc(k)+' · '+lst.length+' venda(s) · '+_fmtR(sum)+'</h3>';
      html += '<ul style="margin:0;padding-left:18px;font-size:11px;">';
      lst.forEach(function(c){
        html += '<li>'+_esc(c.cliente)+' ('+_esc(c.consultor||'—')+') · '+_fmtR(c.valor)+'</li>';
      });
      html += '</ul>';
      txt += '\n▼ '+k+' · '+lst.length+' venda(s) · '+_fmtR(sum)+'\n';
      lst.forEach(function(c){ txt += '   • '+c.cliente+' ('+(c.consultor||'—')+') · '+_fmtR(c.valor)+'\n'; });
    });
    return { titulo:'Por treinamento', html:html, txt:txt };
  }
  function _sec_trTop5(){
    var top = _clientesFiltrados().slice().sort(function(a,b){ return +(b.valor||0) - +(a.valor||0); }).slice(0,5);
    if(!top.length){
      return { titulo:'Top 5 maiores vendas', html:'<h2>Top 5 maiores vendas</h2><div class="rs-empty"><span>Nenhuma venda no recorte.</span><span class="dash">—</span></div>', txt:'TOP 5 MAIORES VENDAS\n  (sem dados)\n' };
    }
    var html = '<h2>Top 5 maiores vendas</h2><table><thead><tr><th style="width:8mm;">#</th><th>Cliente</th><th>Treinamento</th><th>Consultor</th><th style="text-align:right;">Valor</th></tr></thead><tbody>';
    var txt = 'TOP 5 MAIORES VENDAS\n';
    top.forEach(function(c,i){
      html += '<tr><td>'+(i+1)+'</td><td>'+_esc(c.cliente)+'</td><td>'+_esc(c.treinamento||'—')+'</td><td>'+_esc(c.consultor||'—')+'</td><td style="text-align:right;font-weight:700;">'+_fmtR(c.valor)+'</td></tr>';
      txt += (i+1)+'. '+c.cliente+' · '+(c.treinamento||'—')+' · '+(c.consultor||'—')+' · '+_fmtR(c.valor)+'\n';
    });
    html += '</tbody></table>';
    return { titulo:'Top 5 maiores vendas', html:html, txt:txt };
  }
  /* Top Vendas High Ticket — só vendas ≥ R$ 30.000 */
  function _sec_trHightTicket(){
    var LIMITE = 30000;
    var lst = _clientesFiltrados()
      .filter(function(c){ return +(c.valor||0) >= LIMITE; })
      .sort(function(a,b){ return +(b.valor||0) - +(a.valor||0); });
    var total = lst.reduce(function(s,c){ return s + +(c.valor||0); }, 0);
    var head = '<h2>Top vendas High Ticket · ≥ R$ 30.000 ('+lst.length+(lst.length?' · '+_fmtR(total):'')+')</h2>';
    if(!lst.length){
      return { titulo:'Top vendas High Ticket', html: head + '<div class="rs-empty"><span>Nenhuma venda acima do limite.</span><span class="dash">—</span></div>', txt:'TOP HIGH TICKET\n  (sem dados)\n' };
    }
    var html = head + '<table><thead><tr><th style="width:8mm;">#</th><th>Cliente</th><th>Consultor</th><th>Treinamento</th><th style="text-align:right;">Valor</th></tr></thead><tbody>';
    var txt = 'TOP HIGH TICKET (≥ R$ 30.000)\n';
    lst.forEach(function(c, i){
      html += '<tr><td>'+(i+1)+'</td><td>'+_esc(c.cliente)+'</td><td>'+_esc(c.consultor||'—')+'</td><td>'+_esc(c.treinamento||'—')+'</td><td style="text-align:right;font-weight:700;">'+_fmtR(c.valor)+'</td></tr>';
      txt += (i+1)+'. '+c.cliente+' · '+(c.consultor||'—')+' · '+(c.treinamento||'—')+' · '+_fmtR(c.valor)+'\n';
    });
    html += '</tbody></table>';
    return { titulo:'Top vendas High Ticket', html:html, txt:txt };
  }

  /* ── EXECUTIVOS · 10 sub-seções do Resumo ── */
  function _sec_exFinanceiro(){
    var lst = _clientesFiltrados();
    var s = _statsConsultor(lst);
    /* Contagens auxiliares pro título de cada linha */
    var nPago = lst.filter(function(c){ return String(c.status||'').toLowerCase() === 'pago'; }).length;
    var nEnt  = lst.filter(function(c){ return +(c.entrada||0) > 0; }).length;
    var nNeg  = lst.filter(function(c){ return String(c.status||'').toLowerCase() === 'negociacao'; }).length;
    var nAbe  = lst.filter(function(c){ return String(c.status||'').toLowerCase() === 'aberto'; }).length;
    var trPago = new Set(lst.filter(function(c){ return String(c.status||'').toLowerCase() === 'pago'; }).map(function(c){ return c.treinamento||'—'; })).size;
    var trNeg  = new Set(lst.filter(function(c){ return String(c.status||'').toLowerCase() === 'negociacao'; }).map(function(c){ return c.treinamento||'—'; })).size;
    var trAbe  = new Set(lst.filter(function(c){ return String(c.status||'').toLowerCase() === 'aberto'; }).map(function(c){ return c.treinamento||'—'; })).size;
    var html = '<h2>Resumo financeiro</h2>'
      + '<div class="fin-resumo">'
      +   '<div class="fr-row"><span class="lbl">Total faturado (PAGO) · '+trPago+' treinos · '+nPago+' clientes</span><span class="val">'+_fmtR(s.pago)+'</span></div>'
      +   '<div class="fr-row"><span class="lbl">Total em entradas · '+nEnt+' clientes</span><span class="val">'+_fmtR(s.entrada)+'</span></div>'
      +   '<div class="fr-row"><span class="lbl">Em negociação · '+trNeg+' treinos · '+nNeg+' clientes</span><span class="val">'+_fmtR(s.negociacao)+'</span></div>'
      +   '<div class="fr-row"><span class="lbl">Em aberto · '+trAbe+' treinos · '+nAbe+' clientes</span><span class="val">'+_fmtR(s.aberto)+'</span></div>'
      +   '<div class="fr-row fr-total"><span class="lbl">TOTAL GERAL (RECEITA REALIZADA)</span><span class="val">'+_fmtR(s.pago)+'</span></div>'
      + '</div>';
    var txt = 'RESUMO FINANCEIRO\n'
      + '  Total faturado (PAGO): '+_fmtR(s.pago)+' · '+nPago+' clientes\n'
      + '  Total em entradas:    '+_fmtR(s.entrada)+' · '+nEnt+' clientes\n'
      + '  Em negociação:        '+_fmtR(s.negociacao)+' · '+nNeg+' clientes\n'
      + '  Em aberto:            '+_fmtR(s.aberto)+' · '+nAbe+' clientes\n'
      + '  TOTAL GERAL:          '+_fmtR(s.pago)+'\n';
    return { titulo:'Resumo financeiro', html:html, txt:txt };
  }
  function _sec_exTreinPagos(){
    return _sec_stFiltro('pago', 'Treinamentos pagos', 'PAGO');
  }
  function _sec_exEntradas(){ return _sec_stEntrada(); }
  function _sec_exEmNegoc(){ return _sec_stFiltro('negociacao', 'Em negociação', 'NEGOCIAÇÃO'); }
  function _sec_exEmAberto(){ return _sec_stFiltro('aberto', 'Em aberto', 'ABERTO'); }
  function _sec_exRkConsultores(){
    var grupos = _porConsultor();
    var ranking = Object.keys(grupos).map(function(n){
      var s = _statsConsultor(grupos[n]);
      return {nome:n, pago:s.pago, qtd:s.qtd};
    }).sort(function(a,b){ return b.pago - a.pago; });
    var html = '<h2>Ranking de consultores</h2>';
    if(!ranking.length){
      html += '<div class="rs-empty"><span>Nenhum consultor com vendas no recorte.</span><span class="dash">—</span></div>';
      return { titulo:'Ranking de consultores', html:html, txt:'RANKING DE CONSULTORES\n  (sem dados)\n' };
    }
    html += '<table><thead><tr><th style="width:10mm;">#</th><th>Consultor</th><th style="text-align:right;">Faturado</th><th style="text-align:right;">Clientes</th></tr></thead><tbody>';
    var txt = 'RANKING DE CONSULTORES\n';
    ranking.forEach(function(r,i){
      html += '<tr><td>'+(i+1)+'º</td><td>'+_esc(r.nome)+'</td><td style="text-align:right;font-weight:700;">'+_fmtR(r.pago)+'</td><td style="text-align:right;">'+r.qtd+'</td></tr>';
      txt += (i+1)+'. '+r.nome+' · '+_fmtR(r.pago)+' · '+r.qtd+' clientes\n';
    });
    html += '</tbody></table>';
    return { titulo:'Ranking de consultores', html:html, txt:txt };
  }
  function _sec_exRkTreinadores(){
    var trainers = (typeof window.__getAllTrainers === 'function') ? window.__getAllTrainers() : (window.allTrainers || []);
    if(!trainers || !trainers.length){
      return { titulo:'Ranking de treinadores', html:'<h2>Ranking de treinadores</h2><div class="rs-empty"><span>Sem dados de treinadores no contexto atual.</span><span class="dash">—</span></div>', txt:'RANKING DE TREINADORES\n  (sem dados)\n' };
    }
    var html = '<h2>Ranking de treinadores</h2><table><thead><tr><th style="width:10mm;">#</th><th>Treinador</th></tr></thead><tbody>';
    var txt = 'RANKING DE TREINADORES\n';
    trainers.forEach(function(t,i){
      var nome = (typeof t === 'string') ? t : (t && (t.nome||t.name) || '—');
      html += '<tr><td>'+(i+1)+'º</td><td>'+_esc(nome)+'</td></tr>';
      txt += (i+1)+'. '+nome+'\n';
    });
    html += '</tbody></table>';
    return { titulo:'Ranking de treinadores', html:html, txt:txt };
  }
  function _sec_exTopTreinamentos(){
    var map = {};
    _clientesDoEscopoComConsultor().forEach(function(c){
      if(String(c.status||'').toLowerCase() !== 'pago') return;
      var k = c.treinamento || '(Sem treinamento)';
      if(!map[k]) map[k] = { nome:k, qtd:0, total:0 };
      map[k].qtd++; map[k].total += +(c.valor||0);
    });
    var lst = Object.values(map).sort(function(a,b){ return b.total - a.total; }).slice(0,10);
    if(!lst.length){
      return { titulo:'Top treinamentos', html:'<h2>Top treinamentos (pagos)</h2><div class="rs-empty"><span>Nenhum treinamento pago no recorte.</span><span class="dash">—</span></div>', txt:'TOP TREINAMENTOS\n  (sem dados)\n' };
    }
    var html = '<h2>Top treinamentos (pagos)</h2><table><thead><tr><th style="width:10mm;">#</th><th>Treinamento</th><th style="text-align:right;">Qtd</th><th style="text-align:right;">Total</th></tr></thead><tbody>';
    var txt = 'TOP TREINAMENTOS\n';
    lst.forEach(function(t,i){
      html += '<tr><td>'+(i+1)+'</td><td>'+_esc(t.nome)+'</td><td style="text-align:right;">'+t.qtd+'×</td><td style="text-align:right;font-weight:700;">'+_fmtR(t.total)+'</td></tr>';
      txt += (i+1)+'. '+t.nome+' · '+t.qtd+'× · '+_fmtR(t.total)+'\n';
    });
    html += '</tbody></table>';
    return { titulo:'Top treinamentos', html:html, txt:txt };
  }
  function _sec_exMetaRealizado(){
    var goals = window._npGoals || {};
    var grupos = _porConsultor();
    var nomes = Object.keys(grupos).sort();
    if(!nomes.length){
      return { titulo:'Meta vs Realizado', html:'<h2>Meta vs Realizado</h2><div class="rs-empty"><span>Sem consultores no recorte.</span><span class="dash">—</span></div>', txt:'META VS REALIZADO\n  (sem dados)\n' };
    }
    var html = '<h2>Meta vs Realizado</h2><table><thead><tr><th>Consultor</th><th style="text-align:right;">Meta</th><th style="text-align:right;">Realizado</th><th style="text-align:right;">%</th></tr></thead><tbody>';
    var txt = 'META VS REALIZADO\n';
    nomes.forEach(function(n){
      var s = _statsConsultor(grupos[n]);
      var g = goals[n] || {};
      var meta = +(g.metaMinima || g.metaValor || 0);
      var pct = meta ? Math.round(s.pago/meta*100) : 0;
      html += '<tr><td>'+_esc(n)+'</td><td style="text-align:right;">'+(meta?_fmtR(meta):'sem meta')+'</td><td style="text-align:right;font-weight:700;">'+_fmtR(s.pago)+'</td><td style="text-align:right;font-weight:700;">'+(meta?pct+'%':'—')+'</td></tr>';
      txt += n+' · meta '+(meta?_fmtR(meta):'—')+' · real '+_fmtR(s.pago)+' · '+(meta?pct+'%':'—')+'\n';
    });
    html += '</tbody></table>';
    return { titulo:'Meta vs Realizado', html:html, txt:txt };
  }
  function _sec_exAssinatura(){
    var hoje = _hojeStr();
    var html = '<h2>Assinatura</h2>'
      + '<p style="color:#9aa5b1;font-size:11px;">Gerado em '+hoje+'</p>'
      + '<div style="margin-top:24px;padding-top:24px;border-top:1px solid rgba(255,255,255,.1);">'
      +   '<div style="display:flex;justify-content:space-between;gap:40px;">'
      +     '<div style="flex:1;text-align:center;"><div style="border-top:1px solid #6b7280;padding-top:6px;font-size:11px;color:#9aa5b1;">Coordenador comercial</div></div>'
      +     '<div style="flex:1;text-align:center;"><div style="border-top:1px solid #6b7280;padding-top:6px;font-size:11px;color:#9aa5b1;">Diretor</div></div>'
      +   '</div>'
      + '</div>';
    var txt = '✍ ASSINATURA · Gerado em '+hoje+'\n_________________________   _________________________\nCoordenador comercial         Diretor\n';
    return { titulo:'✍ Assinatura', html:html, txt:txt };
  }

  /* ── PERÍODO ── */
  /* Helpers de turmas — múltiplas fontes pra evitar dependência do
     localStorage `ci_turmas_index` (que pode estar vazio em browsers
     que sincronizam apenas via Firebase). */
  function _mesAtualYM(){
    var d = new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  }
  function _listarTodasTurmas(){
    var map = {};
    /* Fonte 1: cache do Firebase (carregado em _loadTurmasDoFirebase) */
    Object.keys(_fbTurmasCache).forEach(function(id){
      map[id] = Object.assign({}, _fbTurmasCache[id]);
    });
    /* Fonte 2: _getTurmas (localStorage ci_turmas_index) */
    if(typeof _getTurmas === 'function'){
      try {
        (_getTurmas() || []).forEach(function(t){
          if(t && t.id && !map[t.id]) map[t.id] = Object.assign({}, t);
        });
      } catch(e){}
    }
    /* Fonte 3: varrer localStorage por chaves ci_turma_* (turmas abertas localmente) */
    try {
      for(var i=0; i<localStorage.length; i++){
        var k = localStorage.key(i);
        if(!k || k.indexOf('ci_turma_') !== 0) continue;
        var id = k.replace(/^ci_turma_/,'');
        if(map[id]) continue;
        try {
          var td = JSON.parse(localStorage.getItem(k)) || {};
          map[id] = {
            id: id,
            nome: td.nome || td.titulo || id,
            codigo: td.codigo || id,
            periodStart: td.periodStart || '',
            periodEnd: td.periodEnd || '',
            criadoEm: td.criadoEm || ''
          };
        } catch(e){}
      }
    } catch(e){}
    /* Fonte 4: window._npVendasTurma (Pipeline Comercial) */
    if(window._npVendasTurma && Array.isArray(window._npVendasTurma)){
      window._npVendasTurma.forEach(function(v){
        if(v && v._turmaId && !map[v._turmaId]){
          map[v._turmaId] = { id:v._turmaId, nome:v._turmaNome||v._turmaId, codigo:'', periodStart:'', periodEnd:'' };
        }
      });
    }
    return Object.values(map);
  }
  /* Carrega turmas do Firebase de forma assíncrona. Quando completa,
     re-renderiza o modal (se aberto) pra refletir os dados novos. */
  function _loadTurmasDoFirebase(onDone){
    if(typeof window._fbGet !== 'function'){
      _fbTurmasLoaded = true;
      if(onDone) onDone();
      return;
    }
    window._fbGet('turmas').then(function(data){
      if(data && typeof data === 'object'){
        Object.keys(data).forEach(function(id){
          var t = data[id]; if(!t) return;
          var clientes = t.clientes;
          if(clientes && !Array.isArray(clientes) && typeof clientes === 'object'){
            clientes = Object.values(clientes).filter(Boolean);
          }
          _fbTurmasCache[id] = {
            id: id,
            nome: t.nome || t.titulo || id,
            codigo: t.codigo || id,
            periodStart: t.periodStart || '',
            periodEnd: t.periodEnd || '',
            criadoEm: t.criadoEm || '',
            _clientesFb: clientes || []
          };
        });
      }
      _fbTurmasLoaded = true;
      if(onDone) onDone();
    }).catch(function(e){
      console.warn('[Imprimir] Falha ao carregar turmas do Firebase:', e);
      _fbTurmasLoaded = true;
      if(onDone) onDone();
    });
  }
  function _turmasDoMesVigente(ymOverride){
    var ym = ymOverride || _mesFiltroAtivo();
    var todas = _listarTodasTurmas();
    var doMes = todas.filter(function(t){
      if(!t) return false;
      var iniMS = (t.periodStart||'').slice(0,7);
      var fimMS = (t.periodEnd||'').slice(0,7);
      if(iniMS === ym || fimMS === ym) return true;
      if(iniMS && fimMS && iniMS <= ym && fimMS >= ym) return true;
      /* Fallback: usa criadoEm se as datas do periodo não estiverem setadas */
      var cri = (t.criadoEm||'').slice(0,7);
      if(cri === ym) return true;
      return false;
    });
    /* Se NENHUMA turma do mês foi encontrada, devolve todas as turmas
       (melhor mostrar a lista completa do que dropdown vazio). */
    var lista = doMes.length ? doMes : todas;
    return lista.sort(function(a,b){
      return String(a.nome||a.codigo||a.id).localeCompare(String(b.nome||b.codigo||b.id), 'pt-BR');
    });
  }
  function _clientesDeTurma(id){
    if(!id) return [];
    /* Fonte 1: cache do Firebase já carregado (online) */
    var fbT = _fbTurmasCache[id];
    if(fbT && Array.isArray(fbT._clientesFb) && fbT._clientesFb.length){
      return fbT._clientesFb.filter(function(c){ return c && c.cliente; });
    }
    /* Fonte 2: _getTurmaData (rota oficial do app) */
    var td = null;
    if(typeof _getTurmaData === 'function'){
      try { td = _getTurmaData(id); } catch(e){}
    }
    /* Fonte 3: localStorage direto */
    if(!td){
      try { td = JSON.parse(localStorage.getItem('ci_turma_'+id)) || null; } catch(e){}
    }
    if(!td) return [];
    var clientes = td.data || td.clientes || [];
    if(clientes && !Array.isArray(clientes) && typeof clientes === 'object'){
      clientes = Object.values(clientes);
    }
    return (clientes || []).filter(function(c){ return c && c.cliente; });
  }
  function _renderTurmaBlock(turma, lst){
    var nome = turma.nome || turma.codigo || turma.id;
    var codigo = turma.codigo || '';
    var s = _statsConsultor(lst);
    var html = '<h3 style="margin-top:14px;color:#b88a5a;">'+_esc(nome)+(codigo?' · '+_esc(codigo):'')+' · '+s.qtd+' cliente(s) · '+_fmtR(s.total)+'</h3>'
      + '<p style="font-size:10px;color:#9aa5b1;margin:2px 0 6px;">Pago: <b style="color:#34d399;">'+_fmtR(s.pago)+'</b> · Aberto: <b style="color:#f59e0b;">'+_fmtR(s.aberto)+'</b> · Negociação: <b style="color:#a855f7;">'+_fmtR(s.negociacao)+'</b></p>'
      + '<table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:#1c2128;color:#9aa5b1;"><th style="padding:4px 8px;text-align:left;">Cliente</th><th style="padding:4px 8px;text-align:left;">Consultor</th><th style="padding:4px 8px;text-align:left;">Treinamento</th><th style="padding:4px 8px;text-align:right;">Valor</th><th style="padding:4px 8px;">Status</th></tr></thead><tbody>';
    lst.forEach(function(c){
      html += '<tr style="border-bottom:1px solid #2a2f37;"><td style="padding:3px 8px;">'+_esc(c.cliente)+'</td><td style="padding:3px 8px;color:#9aa5b1;">'+_esc(c.consultor||'—')+'</td><td style="padding:3px 8px;">'+_esc(c.treinamento||'—')+'</td><td style="padding:3px 8px;text-align:right;">'+_fmtR(c.valor)+'</td><td style="padding:3px 8px;text-align:center;font-size:9px;">'+_esc(String(c.status||'').toUpperCase())+'</td></tr>';
    });
    html += '</tbody></table>';
    var txt = '\n▼ '+nome+(codigo?' · '+codigo:'')+' · '+s.qtd+' cliente(s) · '+_fmtR(s.total)+'\n';
    txt += '   Pago: '+_fmtR(s.pago)+' · Aberto: '+_fmtR(s.aberto)+' · Negoc: '+_fmtR(s.negociacao)+'\n';
    lst.forEach(function(c){
      txt += '   • '+c.cliente+' · '+(c.consultor||'—')+' · '+_fmtR(c.valor)+' · '+String(c.status||'').toUpperCase()+'\n';
    });
    return { html:html, txt:txt };
  }
  function _sec_peMesTodas(){
    var ym = _mesFiltroAtivo();
    var turmas = _turmasDoMesVigente(ym);
    var sufixo = (ym === _mesAtualYM()) ? ' (vigente)' : '';
    if(!turmas.length){
      return { titulo:'🗂 Todas as turmas do mês', html:'<h2>🗂 Todas as turmas do mês '+ym+sufixo+'</h2><p style="color:#fbbf24;">Nenhuma turma encontrada para '+ym+'.</p>', txt:'(sem turmas no mês '+ym+')\n' };
    }
    var html = '<h2>🗂 Todas as turmas do mês '+ym+sufixo+' · '+turmas.length+' turma'+(turmas.length>1?'s':'')+'</h2>';
    var txt = '🗂 TODAS AS TURMAS DO MÊS · '+ym+sufixo+'\n';
    turmas.forEach(function(t){
      var lst = _clientesDeTurma(t.id);
      var block = _renderTurmaBlock(t, lst);
      html += block.html; txt += block.txt;
    });
    return { titulo:'🗂 Todas as turmas do mês', html:html, txt:txt };
  }
  function _sec_peMesSel(){
    if(!_turmaMesEscolhida){
      return { titulo:'🎯 Turma do mês escolhida', html:'<h2>🎯 Turma do mês escolhida</h2><p style="color:#fbbf24;">Nenhuma turma escolhida no dropdown.</p>', txt:'(escolha uma turma do mês no dropdown)\n' };
    }
    var turmas = _turmasDoMesVigente();
    var t = turmas.find(function(x){ return x.id === _turmaMesEscolhida; });
    if(!t){
      return { titulo:'🎯 Turma do mês escolhida', html:'<h2>🎯 Turma do mês escolhida</h2><p style="color:#fbbf24;">Turma não encontrada para o mês corrente. Escolha outra no dropdown.</p>', txt:'(turma não encontrada no mês)\n' };
    }
    var lst = _clientesDeTurma(t.id);
    var html = '<h2>🎯 Turma do mês: '+_esc(t.nome||t.codigo||t.id)+'</h2>';
    var txt = '🎯 TURMA DO MÊS: '+(t.nome||t.codigo||t.id)+'\n';
    var block = _renderTurmaBlock(t, lst);
    html += block.html; txt += block.txt;
    return { titulo:'🎯 Turma do mês escolhida', html:html, txt:txt };
  }

  function _sec_peCursoAtual(){
    var t = window._turmaAtiva || {};
    var nome = t.nome || t.codigo || '(curso atual)';
    var codigo = t.codigo || '';
    var lst = _coletarClientes();
    var s = _statsConsultor(lst);
    var html = '<h2>📚 Curso/turma atual: '+_esc(nome)+(codigo?' · '+_esc(codigo):'')+'</h2>'
      + '<p style="color:#9aa5b1;">Total: <b>'+s.qtd+' cliente(s)</b> · Faturado: <b style="color:#34d399;">'+_fmtR(s.pago)+'</b> · Aberto: <b style="color:#f59e0b;">'+_fmtR(s.aberto)+'</b> · Negociação: <b style="color:#a855f7;">'+_fmtR(s.negociacao)+'</b></p>'
      + '<table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:#1c2128;color:#9aa5b1;"><th style="padding:5px 8px;text-align:left;">Cliente</th><th style="padding:5px 8px;text-align:left;">Consultor</th><th style="padding:5px 8px;text-align:left;">Treinamento</th><th style="padding:5px 8px;text-align:right;">Valor</th><th style="padding:5px 8px;">Status</th></tr></thead><tbody>';
    lst.forEach(function(c){
      html += '<tr style="border-bottom:1px solid #2a2f37;"><td style="padding:4px 8px;">'+_esc(c.cliente)+'</td><td style="padding:4px 8px;color:#9aa5b1;">'+_esc(c.consultor||'—')+'</td><td style="padding:4px 8px;">'+_esc(c.treinamento||'—')+'</td><td style="padding:4px 8px;text-align:right;">'+_fmtR(c.valor)+'</td><td style="padding:4px 8px;text-align:center;font-size:9px;">'+_esc(String(c.status||'').toUpperCase())+'</td></tr>';
    });
    html += '</tbody></table>';
    var txt = '📚 CURSO/TURMA: '+nome+(codigo?' · '+codigo:'')+'\n'
      + s.qtd+' cliente(s) · Pago '+_fmtR(s.pago)+' · Aberto '+_fmtR(s.aberto)+'\n';
    lst.forEach(function(c){
      txt += '• '+c.cliente+' · '+(c.consultor||'—')+' · '+_fmtR(c.valor)+' · '+String(c.status||'').toUpperCase()+'\n';
    });
    return { titulo:'📚 Curso atual', html:html, txt:txt };
  }
  function _sec_peMes(){
    var lst = _clientesDoEscopo();
    var s = _statsConsultor(lst);
    var html = '<h2>📅 Mês atual completo</h2>'
      + '<table style="width:100%;font-size:12px;">'
      +   '<tr><td style="padding:6px;">Total de clientes</td><td style="padding:6px;text-align:right;font-weight:700;">'+s.qtd+'</td></tr>'
      +   '<tr><td style="padding:6px;">Faturado</td><td style="padding:6px;text-align:right;color:#34d399;font-weight:700;">'+_fmtR(s.pago)+'</td></tr>'
      +   '<tr><td style="padding:6px;">Em aberto</td><td style="padding:6px;text-align:right;color:#f59e0b;font-weight:700;">'+_fmtR(s.aberto)+'</td></tr>'
      +   '<tr><td style="padding:6px;">Negociação</td><td style="padding:6px;text-align:right;color:#a855f7;font-weight:700;">'+_fmtR(s.negociacao)+'</td></tr>'
      +   '<tr><td style="padding:6px;">Entradas</td><td style="padding:6px;text-align:right;color:#34d399;font-weight:700;">'+_fmtR(s.entrada)+'</td></tr>'
      + '</table>';
    var txt = '📅 MÊS ATUAL\n'
      + '  Total de clientes: '+s.qtd+'\n'
      + '  Faturado: '+_fmtR(s.pago)+'\n'
      + '  Em aberto: '+_fmtR(s.aberto)+'\n'
      + '  Negociação: '+_fmtR(s.negociacao)+'\n'
      + '  Entradas: '+_fmtR(s.entrada)+'\n';
    return { titulo:'📅 Mês atual', html:html, txt:txt };
  }
  function _sec_peComp(){
    return { titulo:'📈 Comparativo mês × anterior', html:'<h2>📈 Comparativo</h2><p style="color:#9aa5b1;">Compara mês corrente com anterior. (Dados consolidados nas próximas iterações.)</p>', txt:'📈 COMPARATIVO MÊS × ANTERIOR\n(em desenvolvimento)\n' };
  }
  /* Outro período — usa _mesFiltro + _turmaMesEscolhida (extras embutidos na opção) */
  function _sec_peOutroPeriodo(){
    var ym = _mesFiltroAtivo();
    var turmas = _turmasDoMesVigente(ym);
    /* Caso 1: turma específica escolhida */
    if(_turmaMesEscolhida){
      var t = turmas.find(function(x){ return x.id === _turmaMesEscolhida; });
      if(!t){
        return { titulo:'🗓 Outro período', html:'<h2>🗓 Outro período</h2><p style="color:#fbbf24;">Turma escolhida não encontrada no mês '+ym+'. Escolha outra no dropdown.</p>', txt:'(turma não encontrada)\n' };
      }
      var lst = _clientesDeTurma(t.id);
      var block = _renderTurmaBlock(t, lst);
      return {
        titulo:'🗓 Outro período · '+(t.nome||t.codigo||t.id),
        html:'<h2>🗓 Outro período · mês '+ym+'</h2>' + block.html,
        txt:'🗓 OUTRO PERÍODO · MÊS '+ym+'\n' + block.txt
      };
    }
    /* Caso 2: todas as turmas do mês */
    if(!turmas.length){
      return { titulo:'🗓 Outro período', html:'<h2>🗓 Outro período · '+ym+'</h2><p style="color:#fbbf24;">Nenhuma turma encontrada para '+ym+'.</p>', txt:'(sem turmas no mês '+ym+')\n' };
    }
    var html = '<h2>🗓 Outro período · mês '+ym+' · '+turmas.length+' turma'+(turmas.length>1?'s':'')+'</h2>';
    var txt = '🗓 OUTRO PERÍODO · MÊS '+ym+' · '+turmas.length+' turma(s)\n';
    turmas.forEach(function(tt){
      var lstT = _clientesDeTurma(tt.id);
      var blockT = _renderTurmaBlock(tt, lstT);
      html += blockT.html; txt += blockT.txt;
    });
    return { titulo:'🗓 Outro período', html:html, txt:txt };
  }
  function _sec_peSem(){
    return { titulo:'🗓 Semanal', html:'<h2>🗓 Semana atual</h2><p style="color:#9aa5b1;">Recorte da semana corrente. (Integração com módulo semanal nas próximas iterações.)</p>', txt:'🗓 SEMANA ATUAL\n(em desenvolvimento)\n' };
  }

  /* ── EXECUTIVOS ── */
  function _sec_exResumo(){
    var lst = _coletarClientes();
    var s = _statsConsultor(lst);
    var goals = window._npGoals || {};
    var grupos = _porConsultor();
    var nomes = Object.keys(grupos);
    var ranking = nomes.map(function(n){ var ss = _statsConsultor(grupos[n]); return {n:n, pago:ss.pago}; }).sort(function(a,b){ return b.pago-a.pago; });
    var bateuQtd = nomes.filter(function(n){
      var g = goals[n] || {}; var meta = +(g.metaMinima || g.metaValor || 0);
      var ss = _statsConsultor(grupos[n]);
      return meta>0 && ss.pago >= meta;
    }).length;
    var html = '<h2>📊 Resumo executivo</h2>'
      + '<table style="width:100%;font-size:12px;">'
      +   '<tr><td style="padding:5px;">Faturado total</td><td style="padding:5px;text-align:right;color:#34d399;font-weight:700;">'+_fmtR(s.pago)+'</td></tr>'
      +   '<tr><td style="padding:5px;">Em aberto</td><td style="padding:5px;text-align:right;color:#f59e0b;">'+_fmtR(s.aberto)+'</td></tr>'
      +   '<tr><td style="padding:5px;">Top consultor</td><td style="padding:5px;text-align:right;font-weight:700;">'+(ranking[0]?_esc(ranking[0].n)+' · '+_fmtR(ranking[0].pago):'—')+'</td></tr>'
      +   '<tr><td style="padding:5px;">Bateram meta</td><td style="padding:5px;text-align:right;font-weight:700;color:#34d399;">'+bateuQtd+' de '+nomes.length+'</td></tr>'
      + '</table>';
    var txt = '📊 RESUMO EXECUTIVO\n'
      + '  Faturado: '+_fmtR(s.pago)+'\n'
      + '  Em aberto: '+_fmtR(s.aberto)+'\n'
      + '  Top: '+(ranking[0]?ranking[0].n+' · '+_fmtR(ranking[0].pago):'—')+'\n'
      + '  Bateram meta: '+bateuQtd+'/'+nomes.length+'\n';
    return { titulo:'📊 Resumo executivo', html:html, txt:txt };
  }
  function _sec_exDetalh(){
    var grupos = _porConsultor();
    var nomes = Object.keys(grupos).sort();
    if(!nomes.length){
      return { titulo:'Detalhado', html:'<h2>Detalhado por consultor</h2><div class="rs-empty"><span>Sem consultores no recorte.</span><span class="dash">—</span></div>', txt:'DETALHADO POR CONSULTOR\n  (sem dados)\n' };
    }
    var html = '<h2>Detalhado por consultor</h2>';
    var txt = 'DETALHADO POR CONSULTOR\n';
    nomes.forEach(function(n){
      var lst = grupos[n], s = _statsConsultor(lst);
      /* Consultores um abaixo do outro — sem quebra de página */
      html += '<div class="rs-detalh-item"><h3>'+_esc(n)+'</h3>'
        + '<p>Clientes: <b>'+s.qtd+'</b> · Faturado: <b>'+_fmtR(s.pago)+'</b> · Aberto: <b>'+_fmtR(s.aberto)+'</b></p>';
      html += '<table><thead><tr><th>Cliente</th><th>Treinamento</th><th style="text-align:right;">Valor</th><th>Status</th></tr></thead><tbody>';
      lst.forEach(function(c){
        html += '<tr><td>'+_esc(c.cliente)+'</td><td>'+_esc(c.treinamento||'—')+'</td><td style="text-align:right;font-weight:700;">'+_fmtR(c.valor)+'</td><td>'+_esc(String(c.status||'').toUpperCase())+'</td></tr>';
      });
      html += '</tbody></table></div>';
      txt += '\n═══ '+n+' ═══\nClientes: '+s.qtd+' · Faturado: '+_fmtR(s.pago)+' · Aberto: '+_fmtR(s.aberto)+'\n';
      lst.forEach(function(c){ txt += '   • '+c.cliente+' · '+(c.treinamento||'—')+' · '+_fmtR(c.valor)+' · '+String(c.status||'').toUpperCase()+'\n'; });
    });
    return { titulo:'Detalhado', html:html, txt:txt };
  }

  /* ──────────── Hierarquia das seções ────────────
     EXECUTIVOS sempre no topo do relatório. Em seguida, Detalhado (com 1
     página por consultor, vinculado ao filtro), depois os blocos de
     Treinamento. Status/Escopo/Período não saem como blocos — viraram
     filtros globais. */
  var ORDEM_HIERARQUICA = {
    /* 10-29 · EXECUTIVOS (sempre no topo) */
    'ex_fin':       10,
    /* Detalhado por consultor SEMPRE logo abaixo do Resumo financeiro */
    'ex_detalh':    11,
    'ex_meta':      12,
    'ex_rk_cons':   14,
    'ex_rk_trein':  16,
    'ex_top_trein': 18,
    /* Blocos de status seguem a mesma ordem dos checkboxes:
       NEGOCIAÇÃO → PAGOS → EM ABERTO → ENTRADAS */
    'ex_negoc':     20,
    'ex_trein_pg':  22,
    'ex_aberto':    24,
    'ex_entradas':  26,
    'ex_assin':     28,
    /* 40-49 · TREINAMENTOS / produtos */
    'tr_agrup':     40,
    'tr_top5':      42,
    'tr_hight':     44
  };
  function _ordemDe(id){
    return (id in ORDEM_HIERARQUICA) ? ORDEM_HIERARQUICA[id] : 999;
  }

  /* ──────────── Exportação ────────────
     Ordem fixa do relatório (executivos → detalhado → treinamentos),
     ignorando ids que não são blocos (st_*, esc_*, pe_*). */
  function _gerarConteudo(){
    var idsBlocos = Array.from(_selecionadas).filter(function(id){
      return id in ORDEM_HIERARQUICA;
    });
    if(!idsBlocos.length){
      return { html:'', txt:'(nenhum bloco marcado — só filtros)' };
    }
    var idsOrdenados = idsBlocos.sort(function(a,b){
      return _ordemDe(a) - _ordemDe(b);
    });
    var allHtml = [], allTxt = [];
    idsOrdenados.forEach(function(id){
      var sec = _buildSection(id);
      if(!sec) return;
      /* Sem quebra de página entre seções — fluxo contínuo pra economizar folhas */
      allHtml.push('<section class="rs-section">'+sec.html+'</section>');
      allTxt.push(sec.txt);
    });
    return { html:allHtml.join('\n'), txt:allTxt.join('\n────────────────────────────\n') };
  }
  function _exportar(formato){
    if(!_selecionadas.size){
      if(typeof _showToast==='function') _showToast('⚠ Marque ao menos 1 opção','var(--amber)');
      return;
    }
    var c = _gerarConteudo();
    if(formato === 'copiar'){
      _copiar(c.txt);
    } else if(formato === 'whatsapp'){
      var msg = encodeURIComponent(c.txt);
      window.open('https://wa.me/?text='+msg, '_blank');
    } else if(formato === 'txt'){
      _baixarTxt('relatorio-consultores-'+_dataStr()+'.txt', c.txt);
    } else if(formato === 'pdf'){
      _abrirPrint(c.html);
    }
  }
  function _copiar(texto){
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(texto).then(function(){
        if(typeof _showToast==='function') _showToast('📋 Copiado!','var(--accent)');
      });
    } else {
      var ta = document.createElement('textarea');
      ta.value = texto; ta.style.cssText='position:fixed;top:-9999px;';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); if(typeof _showToast==='function') _showToast('📋 Copiado!','var(--accent)'); } catch(e){}
      document.body.removeChild(ta);
    }
  }
  function _baixarTxt(nome, conteudo){
    var blob = new Blob([conteudo], {type:'text/plain;charset=utf-8'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
    if(typeof _showToast==='function') _showToast('💾 Arquivo baixado','var(--accent)');
  }
  /* Helper: período do relatório no formato "DD/MM → DD/MM/YYYY" pra usar no hero */
  function _periodoStrPdf(){
    var per = _periodoAtivo();
    /* Tenta extrair datas reais do escopo */
    if(per === 'atual'){
      var t = window._turmaAtiva || {};
      if(t.periodStart || t.periodEnd){
        var ini = _fmtDataBR(t.periodStart);
        var fim = _fmtDataBR(t.periodEnd || t.periodStart);
        if(ini && fim) return ini + ' → ' + fim;
      }
      return '';
    }
    if(per === 'mes_atual' || per === 'outro'){
      var ym = (per === 'outro') ? _mesFiltroAtivo() : _mesAtualYM();
      var parts = (ym || '').split('-');
      if(parts.length === 2){
        var meses = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
        var idx = parseInt(parts[1], 10) - 1;
        return (meses[idx] || parts[1]) + ' / ' + parts[0];
      }
    }
    return '';
  }
  function _fmtDataBR(ymd){
    if(!ymd) return '';
    var m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(m) return m[3] + '/' + m[2] + '/' + m[1];
    return ymd;
  }
  function _hojeFmtFlat(){
    var d = new Date();
    return String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + d.getFullYear();
  }
  function _perfilAtual(){
    try {
      var sess = (typeof _getSessao === 'function') ? _getSessao() : null;
      if(sess && sess.perfil) return String(sess.perfil).toUpperCase();
    } catch(e){}
    return 'ADM';
  }

  function _abrirPrint(htmlBody){
    var data = _hojeStr();
    var dataFlat = _hojeFmtFlat();
    var perfil = _perfilAtual();
    var turma = window._turmaAtiva || {};
    var turmaNome = turma.nome || turma.codigo || '';
    var periodo = _periodoStrPdf();
    /* Detecta "modo individual": esc_sel marcado com exatamente 1 consultor escolhido.
       O eyebrow é fixo; no modo individual, o nome do consultor vira o h1. */
    var consFiltro = _filtroConsultoresAtivo();
    var modoIndividual = (consFiltro && consFiltro.size === 1
                          && _selecionadas.has('esc_sel')
                          && _consultoresEscolhidos.size === 1);
    var consultorUnico = modoIndividual ? Array.from(_consultoresEscolhidos)[0] : '';
    var eyebrowText = 'R E L A T Ó R I O &nbsp;&nbsp; E X E C U T I V O &nbsp;&nbsp; C O N S U L T O R';
    var heroTitle;
    if(modoIndividual){
      /* Nome do consultor em destaque; turma/período como sub-linha */
      heroTitle = _escSafe(consultorUnico);
    } else {
      heroTitle = turmaNome
        ? (turmaNome + (periodo ? ' &nbsp;·&nbsp; ' + _escSafe(periodo) : ''))
        : (periodo || 'Relatório Consultor');
    }
    var heroSubExtra = '';
    if(modoIndividual && (turmaNome || periodo)){
      var subParts = [];
      if(turmaNome) subParts.push(turmaNome);
      if(periodo) subParts.push(periodo);
      heroSubExtra = '<div class="sub-extra">' + _escSafe(subParts.join(' · ')) + '</div>';
    }
    /* Texto do footer (injetado no @page · @bottom-center via CSS) */
    var footerText = 'FEBRACIS · CONFIDENCIAL'
      + (turmaNome ? ' · ' + turmaNome : '')
      + ' · Pág. ';
    /* Paleta corporativa do Relatório Executivo:
       PRETO    = #111111  · texto principal e títulos
       OCRE     = #c9a14a  · acentos, eyebrow, hairline ocre, valor destacado
       CINZA    = #888888  · textos secundários (sub, header de tabela)
       HAIRLINE = #d6d6d6  · linhas finas */
    var css = ''
      /* Formato A4 explícito (210×297mm, retrato) + margens enxutas.
         "size: A4 portrait" força o navegador a usar A4 em qualquer região. */
      + '@page{size:A4 portrait;size:210mm 297mm;margin:12mm 12mm 14mm;'
      +   '@bottom-center{content:"'+footerText.replace(/"/g,'\\"')+'" counter(page) " / " counter(pages);'
      +     'font-family:Helvetica,Arial,sans-serif;font-size:7pt;color:#888;letter-spacing:.10em;}'
      + '}'
      /* Reforço pro caso do navegador ignorar o size:A4 — limita largura visual */
      + '@media print{html,body{width:210mm;}}'
      + '*{box-sizing:border-box;}'
      + 'html,body{margin:0;padding:0;}'
      + 'body{font-family:Helvetica,Arial,sans-serif;background:#fff;color:#111;font-size:9pt;line-height:1.3;}'
      /* HERO compacto (sem capa fullpage — só na 1ª página) */
      + '.rs-hero{padding:0 0 3mm;border-bottom:1.2pt solid #111;margin-bottom:4mm;}'
      + '.rs-hero .eyebrow{font-family:Helvetica,Arial,sans-serif;font-size:7.5pt;font-weight:700;letter-spacing:.38em;color:#c9a14a;text-transform:uppercase;margin-bottom:2mm;}'
      + '.rs-hero h1{font-family:"Times New Roman",Times,Georgia,serif;font-size:22pt;font-weight:400;color:#111;letter-spacing:-.01em;line-height:1;margin:0 0 1.5mm;}'
      + '.rs-hero .sub{font-family:Helvetica,Arial,sans-serif;font-size:8pt;color:#888;letter-spacing:.02em;}'
      + '.rs-hero .sub-extra{font-family:Helvetica,Arial,sans-serif;font-size:9pt;color:#666;letter-spacing:.06em;text-transform:uppercase;margin:0 0 1.5mm;}'
      + '.rs-hero .filtros{font-family:Helvetica,Arial,sans-serif;font-size:7.5pt;color:#666;margin-top:1.5mm;padding-top:1.5mm;border-top:.4pt solid #d6d6d6;line-height:1.35;}'
      + '.rs-hero .filtros b{color:#c9a14a;font-weight:700;letter-spacing:.08em;text-transform:uppercase;}'
      /* SEÇÕES compactas — header ocre uppercase sem fundo, hairline abaixo */
      + '.rs-section{margin:0 0 3.5mm;page-break-inside:auto;}'
      /* Detalhado: blocos um abaixo do outro, sem quebra de página */
      + '.rs-detalh-item{padding-top:2mm;}'
      + '.rs-detalh-item + .rs-detalh-item{padding-top:3mm;border-top:.4pt solid #d6d6d6;margin-top:2mm;}'
      + '.rs-section h2{font-family:Helvetica,Arial,sans-serif;font-size:7.5pt;font-weight:700;color:#c9a14a;text-transform:uppercase;letter-spacing:.16em;margin:0 0 1.2mm;padding-bottom:.8mm;border-bottom:.5pt solid #111;}'
      + '.rs-section h3{font-family:"Times New Roman",Times,serif;font-size:11pt;font-weight:400;color:#c9a14a;margin:2.5mm 0 1mm;font-style:italic;}'
      + '.rs-section p{margin:.6mm 0;font-size:9pt;color:#111;}'
      + '.rs-section ul{margin:.5mm 0 1mm 5mm;padding:0;font-size:8.5pt;}'
      + '.rs-section ul li{margin:.2mm 0;color:#111;line-height:1.3;}'
      + '.rs-section b{color:#111;font-weight:700;}'
      + '.rs-section em{font-style:italic;color:#666;}'
      /* EMPTY STATE — "Nenhum X registrado. —" alinhado em 2 colunas */
      + '.rs-empty{display:flex;justify-content:space-between;align-items:baseline;padding:.8mm 0 1.2mm;border-bottom:.4pt solid #d6d6d6;font-size:9pt;color:#111;font-style:italic;}'
      + '.rs-empty .dash{color:#888;font-style:normal;letter-spacing:.05em;}'
      /* TABELAS densas — header ocre uppercase, sem bg, hairlines simples */
      + '.rs-section table{width:100%;border-collapse:collapse;margin:.3mm 0 1mm;font-family:Helvetica,Arial,sans-serif;font-size:8pt;page-break-inside:auto;}'
      + '.rs-section table thead{background:transparent;}'
      + '.rs-section table th{padding:1.2mm 1.5mm .8mm;text-align:left;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:.10em;font-size:6.8pt;border-bottom:.5pt solid #111;background:transparent;}'
      + '.rs-section table td{padding:1mm 1.5mm;border-bottom:.4pt solid #e6e6e6;color:#111;vertical-align:top;background:transparent;line-height:1.3;}'
      + '.rs-section table tr:last-child td{border-bottom:.4pt solid #e6e6e6;}'
      /* Resumo financeiro — linhas label→valor + linha TOTAL GERAL destacada */
      + '.fin-resumo{margin:.3mm 0 1mm;}'
      + '.fin-resumo .fr-row{display:flex;justify-content:space-between;align-items:baseline;gap:5mm;padding:1.3mm 0;border-bottom:.4pt solid #d6d6d6;font-size:9pt;}'
      + '.fin-resumo .fr-row .lbl{color:#111;}'
      + '.fin-resumo .fr-row .val{color:#111;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap;}'
      + '.fin-resumo .fr-total{border-top:1.2pt solid #111;border-bottom:1.2pt solid #111;margin-top:.5mm;padding:1.8mm 0;}'
      + '.fin-resumo .fr-total .lbl{font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#111;font-size:9pt;}'
      + '.fin-resumo .fr-total .val{color:#c9a14a;font-size:13pt;font-family:"Times New Roman",Times,serif;font-weight:400;}'
      /* Cores semânticas — neutraliza no impresso, mantém preto/negrito */
      + '.rs-section [style*="color:#34d399"]{color:#111 !important;font-weight:700;}'
      + '.rs-section [style*="color:#f59e0b"]{color:#111 !important;font-weight:700;}'
      + '.rs-section [style*="color:#a855f7"]{color:#111 !important;font-weight:700;}'
      + '.rs-section [style*="color:#b88a5a"]{color:#c9a14a !important;}'
      + '.rs-section [style*="color:#d4a574"]{color:#c9a14a !important;}'
      + '.rs-section [style*="color:#9aa5b1"]{color:#888 !important;}'
      + '.rs-section [style*="color:#fca5a5"]{color:#111 !important;font-weight:700;}'
      + '.rs-section [style*="color:#6b7280"]{color:#888 !important;}'
      + '.rs-section [style*="background:#1c2128"]{background:transparent !important;}'
      + '.rs-section [style*="background:#1c1c1c"]{background:transparent !important;}'
      + '.rs-section [style*="border-bottom:1px solid #2a2f37"]{border-bottom:.4pt solid #e6e6e6 !important;}'
      /* Preview no pop-up antes da impressão (mesmas margens) */
      + '@media screen{body{max-width:210mm;margin:0 auto;padding:12mm;background:#f4f3f0;}}';

    /* Nome do arquivo PDF · usa o <title> da página gerada.
       Padrão "Turma & Consultor" quando os dois existem;
       senão usa o que tiver disponível. */
    var partesTitulo = [];
    if(turmaNome) partesTitulo.push(turmaNome);
    if(modoIndividual && consultorUnico) partesTitulo.push(consultorUnico);
    var docTitle = partesTitulo.length ? partesTitulo.join(' & ') : 'Febracis';
    var doc = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
      + '<title>'+_escSafe(docTitle)+'</title>'
      + '<style>'+css+'</style></head><body>'
      /* HERO (sem capa fullpage) */
      + '<div class="rs-hero">'
        + '<div class="eyebrow">'+eyebrowText+'</div>'
        + '<h1>'+heroTitle+'</h1>'
        + heroSubExtra
        + '<div class="sub">Gerado em '+_escSafe(dataFlat)+' por '+_escSafe(perfil)+'</div>'
      + '</div>'
      + htmlBody
      + '<script>window.onload=function(){setTimeout(function(){window.print();},350);};<\/script>'
      + '</body></html>';

    var w = window.open('', '_blank', 'width=900,height=700');
    if(!w){ if(typeof _showToast==='function') _showToast('⚠ Bloqueado por pop-up. Permita pop-ups e tente de novo.','var(--amber)'); return; }
    w.document.open(); w.document.write(doc); w.document.close();
  }
  function _dataStr(){
    var d = new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }

  /* ──────────── API pública ──────────── */
  window.abrirImprimirConsultores = function(){
    _injetarCss();
    _fechar();
    var wrap = document.createElement('div'); wrap.innerHTML = _renderModal();
    document.body.appendChild(wrap.firstChild);
    var ov = document.getElementById('icvOv');
    /* Aplica escala salva (default 1.30) no modal recém criado */
    var modalEl = ov.querySelector('.icv-modal');
    if(modalEl) modalEl.style.setProperty('--icv-scale', _icvScale);
    _wire(ov);
    _atualizarPreview(ov);
    /* Carrega turmas do Firebase async (modal já está aberto) e re-renderiza */
    _loadTurmasDoFirebase(function(){
      var ovOpen = document.getElementById('icvOv');
      if(!ovOpen) return; /* usuário fechou enquanto carregava */
      _rerender();
    });
  };
  function _fechar(){
    var ov = document.getElementById('icvOv');
    if(ov) ov.remove();
  }
  window.fecharImprimirConsultores = _fechar;

  /* Injeta CSS na carga do script — garante que o botão split na barra
     (que existe no DOM desde o load) ja tenha o estilo gradient
     antes do modal ser aberto pela primeira vez. */
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', _injetarCss);
  } else {
    _injetarCss();
  }
})();
