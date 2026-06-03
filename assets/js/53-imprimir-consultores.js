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
  var _turmaMesEscolhida = '';   /* id da turma escolhida na opção "Turma do mês vigente" */
  var _sessoesAbertas = new Set(['escopo','status','periodo','executivos']);
  /* Pré-seleção sugerida — marcas com ⭐ e marcadas por default na 1ª abertura. */
  var PRE_SELECT = ['esc_todos','st_pago','st_aberto','pe_curso_atual','ex_resumo'];
  var _primeiraAbertura = true;
  /* Cache de turmas vindas do Firebase (assíncrono — preenchido após o load) */
  var _fbTurmasCache = {};
  var _fbTurmasLoaded = false;

  /* ─────────── Definição das opções (20 ao todo) ─────────── */
  var SESSOES = [
    { id:'escopo',       ic:'📊', nome:'Por escopo (quem entra no relatório)', opts:[
      { id:'esc_todos',   ic:'👥', t:'Todos os consultores', d:'Cada consultor + clientes vinculados, ordenados alfabeticamente' },
      { id:'esc_sel',     ic:'👤', t:'Consultor selecionado', d:'Escolha 1 consultor específico', extra:'consultor' },
      { id:'esc_top3',    ic:'🥇', t:'Top 3 consultores', d:'Os 3 com maior faturamento no mês' },
      { id:'esc_bateu',   ic:'🎯', t:'Quem bateu meta', d:'Filtra só consultores que atingiram alguma meta' },
      { id:'esc_abaixo',  ic:'⚠', t:'Abaixo da meta', d:'Foco em quem precisa de atenção' },
      { id:'esc_multi',   ic:'☑', t:'Múltipla seleção', d:'Sub-modal com checkboxes para escolher quais (futuro)' }
    ]},
    { id:'status',       ic:'💰', nome:'Por status de venda', opts:[
      { id:'st_todos',    ic:'📋', t:'Todos os clientes (todos os status)', d:'Lista completa sem filtro' },
      { id:'st_pago',     ic:'💚', t:'Só clientes PAGOS', d:'Quem já fechou e pagou — conferir entrega' },
      { id:'st_aberto',   ic:'🟠', t:'Só EM ABERTO', d:'Quem fechou mas não pagou — lista de cobrança' },
      { id:'st_negoc',    ic:'🤝', t:'Em NEGOCIAÇÃO', d:'Pipeline em andamento' },
      { id:'st_entrada',  ic:'💵', t:'Só com ENTRADA recebida', d:'Pagou entrada mas restante em aberto' },
      { id:'st_desist',   ic:'❌', t:'DESISTÊNCIAS / cancelados', d:'Análise de churn' }
    ]},
    { id:'treinamento',  ic:'🎓', nome:'Por treinamento / produto', opts:[
      { id:'tr_agrup',    ic:'📚', t:'Agrupado por TREINAMENTO', d:'Cada treinamento com seus clientes e consultores' },
      { id:'tr_top5',     ic:'💎', t:'Top 5 maiores vendas', d:'As maiores vendas do mês' },
      { id:'tr_novos',    ic:'✨', t:'Clientes NOVOS do mês', d:'Primeira compra — foco em aquisição' }
    ]},
    { id:'periodo',      ic:'📅', nome:'Por período', opts:[
      { id:'pe_curso_atual',  ic:'📚', t:'Somente a turma atual', d:'Foca no curso atualmente aberto · header com nome e código' },
      { id:'pe_mes_todas',    ic:'🗂', t:'Todas as turmas do mês vigente', d:'Lista todas as turmas que iniciam no mês corrente + clientes' },
      { id:'pe_mes_sel',      ic:'🎯', t:'Turma escolhida do mês vigente', d:'Escolha 1 turma do mês para focar', extra:'turma_mes' },
      { id:'pe_mes',          ic:'📅', t:'Mês atual completo (consolidado)', d:'Estatísticas agregadas do mês' },
      { id:'pe_comp',         ic:'📈', t:'Comparativo mês × anterior', d:'Lado a lado' },
      { id:'pe_sem',          ic:'🗓', t:'Semanal (semana atual)', d:'Recorte da semana corrente' }
    ]},
    { id:'executivos',   ic:'⭐', nome:'Executivos', opts:[
      { id:'ex_resumo',   ic:'📊', t:'Resumo executivo (1 página)', d:'KPIs principais + ranking + alertas' },
      { id:'ex_detalh',   ic:'📄', t:'Detalhado · 1 página por consultor', d:'PDF paginado para entrega individual' }
    ]}
  ];

  function _esc(s){ return (window._esc ? window._esc(s) : String(s||'').replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];})); }
  function _fmtR(v){ return (typeof formatVal==='function') ? formatVal(v) : ('R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})); }

  /* ──────────── CSS inline (one-shot) ──────────── */
  function _injetarCss(){
    if(document.getElementById('imprConsCss')) return;
    var st = document.createElement('style'); st.id = 'imprConsCss';
    st.textContent = [
      '.icv-ov{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);}',
      '.icv-modal{background:#161b22;border:1px solid rgba(255,255,255,.08);border-radius:14px;width:100%;max-width:1100px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 30px 60px -15px rgba(0,0,0,.7);}',
      '.icv-h{display:flex;justify-content:space-between;align-items:flex-start;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08);}',
      '.icv-h .ttl{font-size:14px;font-weight:700;color:#e6edf3;}',
      '.icv-h .sub{font-size:10px;color:#6b7280;margin-top:2px;}',
      '.icv-h .x{background:transparent;border:1px solid rgba(255,255,255,.08);color:#9aa5b1;padding:4px 9px;border-radius:6px;cursor:pointer;font-size:13px;font-family:inherit;}',
      '.icv-h .x:hover{color:#d4a574;border-color:#d4a574;}',
      '.icv-toolbar{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:rgba(212,165,116,.04);border-bottom:1px solid rgba(255,255,255,.08);font-size:11px;}',
      '.icv-toolbar a{color:#d4a574;cursor:pointer;font-weight:600;margin-right:10px;}',
      '.icv-toolbar a:hover{text-decoration:underline;}',
      '.icv-toolbar .cnt b{color:#d4a574;font-weight:700;}',
      '.icv-b{flex:1;overflow:hidden;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:0;}',
      '@media(max-width:820px){.icv-b{grid-template-columns:1fr;}}',
      '.icv-opts{overflow-y:auto;padding:8px 14px 14px;border-right:1px solid rgba(255,255,255,.06);}',
      '.icv-preview{overflow-y:auto;padding:14px;background:#0a0e13;}',
      '.icv-preview .pv-h{display:flex;justify-content:space-between;align-items:center;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#d4a574;font-weight:700;padding-bottom:8px;margin-bottom:10px;border-bottom:1px dashed rgba(212,165,116,.25);}',
      '.icv-preview .pv-h .meta{color:#6b7280;font-weight:600;font-size:9px;}',
      '.icv-preview .pv-c{font-size:11px;color:#cbd5e0;line-height:1.5;}',
      '.icv-preview .pv-c h2{font-size:13px;color:#f0c896;margin:14px 0 4px;padding-bottom:3px;border-bottom:1px solid rgba(212,165,116,.25);}',
      '.icv-preview .pv-c h2:first-child{margin-top:0;}',
      '.icv-preview .pv-c h3{font-size:11px;color:#b88a5a;margin:8px 0 4px;}',
      '.icv-preview .pv-c table{width:100%;border-collapse:collapse;font-size:10px;margin-top:4px;}',
      '.icv-preview .pv-c table th{background:rgba(255,255,255,.04)!important;color:#9aa5b1!important;padding:4px 6px!important;text-align:left;}',
      '.icv-preview .pv-c table td{padding:3px 6px!important;border-bottom:1px solid rgba(255,255,255,.04)!important;}',
      '.icv-preview .pv-c p{margin:4px 0;font-size:10px;}',
      '.icv-preview .pv-empty{text-align:center;padding:32px 14px;color:#6b7280;font-size:11px;font-style:italic;}',
      '.icv-preview .pv-empty .ic{font-size:32px;display:block;margin-bottom:6px;opacity:.5;}',
      '.icv-cat{border:1px solid rgba(255,255,255,.08);border-radius:8px;margin:8px 0;background:rgba(255,255,255,.02);overflow:hidden;}',
      '.icv-cat.open{border-color:rgba(212,165,116,.30);background:rgba(212,165,116,.03);}',
      '.icv-cat-h{display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:pointer;user-select:none;}',
      '.icv-cat-h:hover{background:rgba(255,255,255,.03);}',
      '.icv-arrow{font-size:11px;color:#d4a574;width:14px;text-align:center;transition:transform .2s ease;display:inline-block;}',
      '.icv-cat.open .icv-arrow{transform:rotate(90deg);}',
      '.icv-cat-h .ic{font-size:15px;}',
      '.icv-cat-h .nome{flex:1;font-size:12px;font-weight:700;color:#e6edf3;}',
      '.icv-cat-h .info{font-size:9px;color:#6b7280;font-weight:600;display:flex;align-items:center;gap:5px;}',
      '.icv-badge{background:#d4a574;color:#0a0e1a;padding:2px 7px;border-radius:9px;font-size:9px;font-weight:800;}',
      '.icv-cat-b{border-top:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.15);padding:8px 0;display:none;}',
      '.icv-cat.open .icv-cat-b{display:block;}',
      '.icv-opt{display:flex;align-items:flex-start;gap:9px;padding:8px 14px 8px 38px;cursor:pointer;border-left:3px solid transparent;}',
      '.icv-opt:hover{background:rgba(212,165,116,.04);}',
      '.icv-opt.sel{background:rgba(212,165,116,.07);border-left-color:#d4a574;}',
      '.icv-opt input[type=checkbox]{width:14px;height:14px;accent-color:#d4a574;cursor:pointer;flex-shrink:0;margin-top:1px;}',
      '.icv-opt .opt-c{flex:1;min-width:0;}',
      '.icv-opt .opt-t{font-size:11px;font-weight:600;color:#e6edf3;display:flex;gap:6px;align-items:center;}',
      '.icv-opt .opt-d{font-size:9px;color:#6b7280;margin-top:2px;line-height:1.4;}',
      '.icv-opt.sel .opt-t{color:#d4a574;}',
      '.icv-star{color:#fbbf24;font-size:10px;margin-left:auto;flex-shrink:0;}',
      '.icv-star-tag{font-size:8px;background:rgba(251,191,36,.12);color:#fbbf24;padding:1px 6px;border-radius:8px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;}',
      '.icv-extra{margin-top:5px;font-size:10px;color:#9aa5b1;display:none;align-items:center;gap:6px;}',
      '.icv-opt.sel .icv-extra{display:flex;}',
      '.icv-extra select{flex:1;max-width:220px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.08);color:#e6edf3;padding:4px 7px;border-radius:4px;font-size:10px;font-family:inherit;}',
      '.icv-f{padding:12px 16px;border-top:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;}',
      '.icv-f .info{font-size:10px;color:#6b7280;}',
      '.icv-f .actions{display:flex;gap:6px;flex-wrap:wrap;}',
      '.icv-btn{font-size:11px;padding:7px 12px;border-radius:5px;cursor:pointer;border:1px solid rgba(255,255,255,.08);background:transparent;color:#e6edf3;font-weight:600;font-family:inherit;display:inline-flex;align-items:center;gap:5px;}',
      '.icv-btn:hover{border-color:#d4a574;color:#d4a574;}',
      '.icv-btn.primary{background:#d4a574;color:#0a0e1a;border-color:#d4a574;font-weight:800;}',
      '.icv-btn.primary:hover{background:#f0c896;}',
      '.icv-btn.primary:disabled{opacity:.5;cursor:not-allowed;}',
      /* Split button — borda Neon outline estático (opção 04): linha dourada fixa + halo sutil */
      '.icv-split{display:inline-flex;border:1.5px solid #d4a574;border-radius:7px;box-shadow:0 0 0 1px rgba(212,165,116,.18), 0 0 12px -2px rgba(212,165,116,.35);cursor:pointer;background:#161b22;}',
      '.icv-split .add-btn{border:none;border-radius:5px 0 0 5px;background:#161b22;color:#d4a574;font-weight:700;padding:5.5px 14px;font-size:11px;cursor:pointer;font-family:inherit;}',
      '.icv-split .add-btn:hover{background:rgba(212,165,116,.10);}',
      '.icv-split .icv-split-drop{border:none;border-radius:0 5px 5px 0;border-left:1px solid rgba(212,165,116,.30);padding:5.5px 9px;background:#161b22;color:#d4a574;cursor:pointer;font-family:inherit;font-size:11px;font-weight:700;}',
      '.icv-split .icv-split-drop:hover{background:rgba(212,165,116,.10);}'
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
    var consultores = _listaConsultores();
    var sessoesHtml = SESSOES.map(function(sec){
      var optsHtml = sec.opts.map(function(o){
        var sel = _selecionadas.has(o.id);
        var sugerida = PRE_SELECT.indexOf(o.id) >= 0;
        var extra = '';
        if(o.extra === 'consultor'){
          extra = '<div class="icv-extra"><span>Consultor:</span><select data-extra-cons>'
            + '<option value="">— escolha —</option>'
            + consultores.map(function(c){
                return '<option value="'+_esc(c)+'"'+(c===_consultorEscolhido?' selected':'')+'>'+_esc(c)+'</option>';
              }).join('')
            + '</select></div>';
        }
        if(o.extra === 'turma_mes'){
          var tmes = _turmasDoMesVigente();
          extra = '<div class="icv-extra"><span>Turma do mês:</span><select data-extra-turma>'
            + '<option value="">— escolha —</option>'
            + tmes.map(function(t){
                var nome = (t.nome||t.codigo||t.id);
                return '<option value="'+_esc(t.id)+'"'+(t.id===_turmaMesEscolhida?' selected':'')+'>'+_esc(nome)+(t.codigo&&t.codigo!==nome?' · '+_esc(t.codigo):'')+'</option>';
              }).join('')
            + '</select></div>';
        }
        return '<label class="icv-opt'+(sel?' sel':'')+'" data-opt-id="'+o.id+'">'
          + '<input type="checkbox" '+(sel?'checked':'')+'>'
          + '<div class="opt-c">'
          +   '<div class="opt-t"><span>'+o.ic+'</span>'+_esc(o.t)+(sugerida?'<span class="icv-star-tag" title="Pré-selecionada · sugerida">⭐ sugerida</span>':'')+'</div>'
          +   '<div class="opt-d">'+_esc(o.d)+'</div>'
          +   extra
          + '</div>'
          + '</label>';
      }).join('');
      var n = sec.opts.filter(function(o){ return _selecionadas.has(o.id); }).length;
      var aberto = _sessoesAbertas.has(sec.id);
      return '<div class="icv-cat'+(aberto?' open':'')+'" data-sec-id="'+sec.id+'">'
        + '<div class="icv-cat-h">'
        +   '<span class="icv-arrow">▸</span>'
        +   '<span class="ic">'+sec.ic+'</span>'
        +   '<span class="nome">'+_esc(sec.nome)+'</span>'
        +   '<span class="info">'+sec.opts.length+' opções <span class="icv-badge" style="'+(n?'':'display:none;')+'">'+n+'</span></span>'
        + '</div>'
        + '<div class="icv-cat-b">'+optsHtml+'</div>'
        + '</div>';
    }).join('');
    var total = _selecionadas.size;
    var totalOpts = SESSOES.reduce(function(s,sec){ return s+sec.opts.length; },0);
    var html = '<div class="icv-ov" id="icvOv">'
      + '<div class="icv-modal">'
      +   '<div class="icv-h">'
      +     '<div>'
      +       '<div class="ttl">🖨 Imprimir relatório de consultores</div>'
      +       '<div class="sub">'+(window._turmaAtiva && window._turmaAtiva.nome ? '📚 Curso atual: <b style="color:#d4a574;">'+_esc(window._turmaAtiva.nome)+(window._turmaAtiva.codigo?' · '+_esc(window._turmaAtiva.codigo):'')+'</b> · ' : '')+'Marque as opções desejadas em uma ou mais sessões.</div>'
      +     '</div>'
      +     '<button class="x" id="icvFechar">✕</button>'
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
      +     '<div class="info">💡 As seleções viram seções no relatório final.</div>'
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

    /* Checkboxes */
    ov.querySelectorAll('.icv-opt').forEach(function(label){
      var id = label.dataset.optId;
      var cb = label.querySelector('input[type=checkbox]');
      cb.addEventListener('change', function(){
        if(cb.checked) _selecionadas.add(id); else _selecionadas.delete(id);
        label.classList.toggle('sel', cb.checked);
        _atualizarContadores(ov);
      });
      var sel = label.querySelector('[data-extra-cons]');
      if(sel){
        sel.addEventListener('change', function(){ _consultorEscolhido = sel.value; _atualizarPreview(ov); });
        sel.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); });
      }
      var selT = label.querySelector('[data-extra-turma]');
      if(selT){
        selT.addEventListener('change', function(){ _turmaMesEscolhida = selT.value; _atualizarPreview(ov); });
        selT.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); });
      }
    });

    /* Selecionar todas / limpar */
    ov.querySelector('#icvSelTudo').addEventListener('click', function(){
      SESSOES.forEach(function(sec){ sec.opts.forEach(function(o){ _selecionadas.add(o.id); }); });
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
      var n = sec.opts.filter(function(o){ return _selecionadas.has(o.id); }).length;
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
    var partes = [];
    _selecionadas.forEach(function(id){
      var sec = _buildSection(id);
      if(sec){ partes.push('<section>'+sec.html+'</section>'); }
    });
    pvC.innerHTML = partes.join('') + _diagBoxHtml();
    if(pvM) pvM.textContent = _selecionadas.size+' seção(ões) · '+_dataStrPt();
  }
  /* Diagnóstico das fontes de dados — sempre visível no fim do preview */
  function _diagBoxHtml(){
    var qData = _coletarClientes().length;
    var qTodas = _coletarClientesTodasTurmas().length;
    var qCons = _listaConsultores().length;
    var todasT = _listarTodasTurmas();
    var qTurmas = todasT.length;
    var qTurmasMes = _turmasDoMesVigente().length;
    var qGoals = Object.keys(window._npGoals||{}).length;
    var turmaAtiva = (window._turmaAtiva && (window._turmaAtiva.nome||window._turmaAtiva.codigo)) || '—';
    var ym = _mesAtualYM();
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
      + '• Consultores identificados: <b>'+qCons+'</b><br>'
      + '• Turmas encontradas: <b>'+qTurmas+'</b> · no mês vigente ('+ym+'): <b>'+qTurmasMes+'</b><br>'
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
    ov.outerHTML = _renderModal();
    _wire(document.getElementById('icvOv'));
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
  /* Agrupa por consultor — varre TODAS as turmas (não só a ativa).
     Marca cada cliente com a turma de origem (_turmaNome) pra rastreio. */
  function _porConsultor(){
    var map = {};
    function _add(lista, turmaNome){
      lista.forEach(function(c){
        if(!c || !c.cliente) return;
        var k = c.consultor || '(Sem consultor)';
        if(!map[k]) map[k] = [];
        /* Evita duplicar se mesmo cliente já está (mesmo nome+treinamento+valor) */
        var jaTem = map[k].some(function(x){
          return x.cliente === c.cliente && (x.treinamento||'') === (c.treinamento||'') && +(x.valor||0) === +(c.valor||0);
        });
        if(!jaTem){
          var copia = Object.assign({}, c);
          if(turmaNome && !copia._turmaNome) copia._turmaNome = turmaNome;
          map[k].push(copia);
        }
      });
    }
    /* Primeiro: clientes da turma ativa (data atual) */
    _add(_coletarClientes(), window._turmaAtiva && window._turmaAtiva.nome || '');
    /* Depois: clientes de TODAS as outras turmas (varredura) */
    try {
      _listarTodasTurmas().forEach(function(t){
        if(!t || !t.id) return;
        if(window._turmaAtiva && t.id === window._turmaAtiva.id) return;
        _add(_clientesDeTurma(t.id), t.nome || t.codigo || t.id);
      });
    } catch(e){}
    return map;
  }
  function _coletarClientesTodasTurmas(){
    var todos = [];
    _add_seen = {}; /* dedup local */
    function _addLista(lst, tNome){
      (lst||[]).forEach(function(c){
        if(!c || !c.cliente) return;
        var k = (c.cliente||'')+'|'+(c.consultor||'')+'|'+(c.treinamento||'')+'|'+(+c.valor||0);
        if(_add_seen[k]) return;
        _add_seen[k] = 1;
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
  var _add_seen = {};
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

  /* Cada section retorna {titulo, html, txt} */
  function _buildSection(id){
    switch(id){
      case 'esc_todos':   return _sec_escTodos();
      case 'esc_sel':     return _sec_escSel();
      case 'esc_top3':    return _sec_escTop3();
      case 'esc_bateu':   return _sec_escBateu();
      case 'esc_abaixo':  return _sec_escAbaixo();
      case 'esc_multi':   return { titulo:'☑ Múltipla seleção', html:'<p>Funcionalidade em desenvolvimento.</p>', txt:'(em breve)\n' };
      case 'st_todos':    return _sec_stTodos();
      case 'st_pago':     return _sec_stFiltro('pago', '💚 Clientes PAGOS', 'PAGO');
      case 'st_aberto':   return _sec_stFiltro('aberto', '🟠 Clientes EM ABERTO', 'ABERTO');
      case 'st_negoc':    return _sec_stFiltro('negociacao', '🤝 Em NEGOCIAÇÃO', 'NEGOCIAÇÃO');
      case 'st_entrada':  return _sec_stEntrada();
      case 'st_desist':   return _sec_stFiltro('desistiu', '❌ DESISTÊNCIAS / cancelados', 'DESISTIU');
      case 'tr_agrup':    return _sec_trAgrupado();
      case 'tr_top5':     return _sec_trTop5();
      case 'tr_novos':    return _sec_trNovos();
      case 'pe_curso_atual': return _sec_peCursoAtual();
      case 'pe_mes_todas':   return _sec_peMesTodas();
      case 'pe_mes_sel':     return _sec_peMesSel();
      case 'pe_mes':      return _sec_peMes();
      case 'pe_comp':     return _sec_peComp();
      case 'pe_sem':      return _sec_peSem();
      case 'ex_resumo':   return _sec_exResumo();
      case 'ex_detalh':   return _sec_exDetalh();
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
    var consultores = _listaConsultores();
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
    var lst = _coletarClientesTodasTurmas();
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
  function _sec_stFiltro(status, titulo, lblTxt){
    var lst = _coletarClientesTodasTurmas().filter(function(c){ return String(c.status||'').toLowerCase() === status; });
    var sum = lst.reduce(function(a,c){ return a + +(c.valor||0); }, 0);
    var html = '<h2>'+_esc(titulo)+' ('+lst.length+')</h2>'
      + '<p style="color:#9aa5b1;">Total: <b style="color:#d4a574;">'+_fmtR(sum)+'</b></p>'
      + '<table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:#1c2128;"><th style="padding:5px 8px;text-align:left;">Cliente</th><th style="padding:5px 8px;text-align:left;">Consultor</th><th style="padding:5px 8px;text-align:right;">Valor</th></tr></thead><tbody>';
    var txt = titulo+' ('+lst.length+') · Total '+_fmtR(sum)+'\n';
    lst.forEach(function(c){
      html += '<tr style="border-bottom:1px solid #2a2f37;"><td style="padding:4px 8px;">'+_esc(c.cliente)+'</td><td style="padding:4px 8px;color:#9aa5b1;">'+_esc(c.consultor||'—')+'</td><td style="padding:4px 8px;text-align:right;">'+_fmtR(c.valor)+'</td></tr>';
      txt += '• '+c.cliente+' · '+(c.consultor||'—')+' · '+_fmtR(c.valor)+'\n';
    });
    html += '</tbody></table>';
    return { titulo:titulo, html:html, txt:txt };
  }
  function _sec_stEntrada(){
    var lst = _coletarClientesTodasTurmas().filter(function(c){ return +(c.entrada||0) > 0; });
    var sum = lst.reduce(function(a,c){ return a + +(c.entrada||0); }, 0);
    var html = '<h2>💵 Clientes com ENTRADA ('+lst.length+')</h2>'
      + '<p style="color:#9aa5b1;">Total entradas: <b style="color:#34d399;">'+_fmtR(sum)+'</b></p>'
      + '<table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:#1c2128;"><th style="padding:5px 8px;text-align:left;">Cliente</th><th style="padding:5px 8px;text-align:left;">Consultor</th><th style="padding:5px 8px;text-align:right;">Entrada</th><th style="padding:5px 8px;text-align:right;">Valor total</th></tr></thead><tbody>';
    var txt = '💵 COM ENTRADA · Total '+_fmtR(sum)+'\n';
    lst.forEach(function(c){
      html += '<tr style="border-bottom:1px solid #2a2f37;"><td style="padding:4px 8px;">'+_esc(c.cliente)+'</td><td style="padding:4px 8px;color:#9aa5b1;">'+_esc(c.consultor||'—')+'</td><td style="padding:4px 8px;text-align:right;color:#34d399;">'+_fmtR(c.entrada)+'</td><td style="padding:4px 8px;text-align:right;">'+_fmtR(c.valor)+'</td></tr>';
      txt += '• '+c.cliente+' · '+(c.consultor||'—')+' · entrada '+_fmtR(c.entrada)+' / total '+_fmtR(c.valor)+'\n';
    });
    html += '</tbody></table>';
    return { titulo:'💵 Com entrada', html:html, txt:txt };
  }

  /* ── TREINAMENTO ── (consolida TODAS as turmas) */
  function _sec_trAgrupado(){
    var grupos = {};
    _coletarClientesTodasTurmas().forEach(function(c){
      var k = c.treinamento || '(Sem treinamento)';
      if(!grupos[k]) grupos[k] = [];
      grupos[k].push(c);
    });
    var html = '<h2>📚 Por treinamento</h2>';
    var txt = '📚 POR TREINAMENTO\n';
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
    return { titulo:'📚 Por treinamento', html:html, txt:txt };
  }
  function _sec_trTop5(){
    var top = _coletarClientesTodasTurmas().slice().sort(function(a,b){ return +(b.valor||0) - +(a.valor||0); }).slice(0,5);
    var html = '<h2>💎 Top 5 maiores vendas</h2><table style="width:100%;font-size:12px;">';
    var txt = '💎 TOP 5 MAIORES VENDAS\n';
    top.forEach(function(c,i){
      html += '<tr><td style="padding:5px;font-weight:700;">'+(i+1)+'.</td><td style="padding:5px;">'+_esc(c.cliente)+' · '+_esc(c.treinamento||'—')+'</td><td style="padding:5px;color:#9aa5b1;">'+_esc(c.consultor||'—')+'</td><td style="padding:5px;text-align:right;color:#34d399;font-weight:700;">'+_fmtR(c.valor)+'</td></tr>';
      txt += (i+1)+'. '+c.cliente+' · '+(c.treinamento||'—')+' · '+(c.consultor||'—')+' · '+_fmtR(c.valor)+'\n';
    });
    html += '</table>';
    return { titulo:'💎 Top 5 vendas', html:html, txt:txt };
  }
  function _sec_trNovos(){
    var html = '<h2>✨ Clientes novos do mês</h2><p style="color:#9aa5b1;">Lista derivada das vendas adicionadas neste período.</p>';
    var lst = _coletarClientesTodasTurmas().slice(0, 30);
    html += '<ul style="font-size:11px;">';
    var txt = '✨ NOVOS DO MÊS\n';
    lst.forEach(function(c){
      html += '<li>'+_esc(c.cliente)+' ('+_esc(c.consultor||'—')+') · '+_fmtR(c.valor)+'</li>';
      txt += '• '+c.cliente+' · '+(c.consultor||'—')+' · '+_fmtR(c.valor)+'\n';
    });
    html += '</ul>';
    return { titulo:'✨ Novos do mês', html:html, txt:txt };
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
  function _turmasDoMesVigente(){
    var ym = _mesAtualYM();
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
    var turmas = _turmasDoMesVigente();
    var ym = _mesAtualYM();
    if(!turmas.length){
      return { titulo:'🗂 Todas as turmas do mês', html:'<h2>🗂 Todas as turmas do mês vigente</h2><p style="color:#fbbf24;">Nenhuma turma encontrada para '+ym+'.</p>', txt:'(sem turmas no mês '+ym+')\n' };
    }
    var html = '<h2>🗂 Todas as turmas do mês vigente · '+ym+' ('+turmas.length+' turma'+(turmas.length>1?'s':'')+')</h2>';
    var txt = '🗂 TODAS AS TURMAS DO MÊS · '+ym+'\n';
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
    var lst = _coletarClientesTodasTurmas();
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
    var html = '<h2>📄 Detalhado · 1 página por consultor</h2>';
    var txt = '📄 DETALHADO POR CONSULTOR\n';
    nomes.forEach(function(n, i){
      var lst = grupos[n], s = _statsConsultor(lst);
      var quebra = i > 0 ? 'page-break-before:always;' : '';
      html += '<div style="'+quebra+'padding-top:18px;"><h3 style="color:#b88a5a;">'+_esc(n)+'</h3>'
        + '<p>Clientes: <b>'+s.qtd+'</b> · Faturado: <b style="color:#34d399;">'+_fmtR(s.pago)+'</b> · Aberto: <b style="color:#f59e0b;">'+_fmtR(s.aberto)+'</b></p>';
      html += '<ul style="font-size:11px;">';
      lst.forEach(function(c){ html += '<li>'+_esc(c.cliente)+' · '+_esc(c.treinamento||'—')+' · '+_fmtR(c.valor)+' · '+_esc(String(c.status||'').toUpperCase())+'</li>'; });
      html += '</ul></div>';
      txt += '\n═══ '+n+' ═══\nClientes: '+s.qtd+' · Faturado: '+_fmtR(s.pago)+' · Aberto: '+_fmtR(s.aberto)+'\n';
      lst.forEach(function(c){ txt += '   • '+c.cliente+' · '+(c.treinamento||'—')+' · '+_fmtR(c.valor)+' · '+String(c.status||'').toUpperCase()+'\n'; });
    });
    return { titulo:'📄 Detalhado', html:html, txt:txt };
  }

  /* ──────────── Exportação ──────────── */
  function _gerarConteudo(){
    if(!_selecionadas.size){
      return { html:'', txt:'(nenhuma seção selecionada)' };
    }
    var allHtml = [], allTxt = [];
    _selecionadas.forEach(function(id){
      var sec = _buildSection(id);
      if(sec){
        allHtml.push('<section style="margin-bottom:24px;">'+sec.html+'</section>');
        allTxt.push(sec.txt);
      }
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
  function _abrirPrint(htmlBody){
    var data = _hojeStr();
    var doc = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de Consultores</title><style>'
      + '*{box-sizing:border-box;}'
      + 'body{font-family:-apple-system,sans-serif;background:#fff;color:#1f2937;padding:24px;margin:0;}'
      + 'h1{font-size:18px;margin:0 0 4px;color:#111827;}'
      + 'h2{font-size:14px;margin:18px 0 8px;color:#b88a5a;border-bottom:1px solid #d4a574;padding-bottom:4px;}'
      + 'h3{font-size:12px;margin:10px 0 6px;color:#374151;}'
      + 'table{border-collapse:collapse;}'
      + 'p{margin:6px 0;font-size:11px;}'
      + 'ul{margin:6px 0;}'
      + '.header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #d4a574;padding-bottom:8px;margin-bottom:18px;}'
      + '.header .date{font-size:10px;color:#6b7280;}'
      + '@media print { body{padding:12mm;} }'
      + '</style></head><body>'
      + '<div class="header"><h1>📋 Relatório de Consultores</h1><div class="date">Gerado em '+data+'</div></div>'
      + htmlBody
      + '<script>window.onload=function(){setTimeout(function(){window.print();},300);};<\/script>'
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
