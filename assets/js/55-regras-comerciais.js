/* ═══════════════════════════════════════════════════════════════════
   REGRAS COMERCIAIS · módulo isolado (card da home → tela própria)
   ───────────────────────────────────────────────────────────────────
   Navegação em níveis: Regras → Produto → documento (deck em iframe).
   Espelha o padrão da Biblioteca de Conhecimento (54-*).
   Não altera nada do que já existe. Roda via file:// e online.

   API (window):
     abrirRegrasComerciais()   ← card da home
     regrasNav(vista)          ← navega entre níveis ('home'|'produto'|'doc')
     voltarHomeRegras()        ← volta para a home (turmasScreen)
   ═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* Seções iniciais de Regras Comerciais */
  var SECOES = [
    { id:'produto',   emoji:'🛍️', cor:'251,146,60',  titulo:'Produto',                    sub:'Documentos e regras comerciais por produto.', ativo:true },
    { id:'metas',     emoji:'🎯', cor:'56,189,248',  titulo:'Metas e Bonificação',        sub:'Mínima, básica e master · bônus por atingimento.' },
    { id:'descontos', emoji:'🏷️', cor:'200,240,90',  titulo:'Descontos e Alçadas',        sub:'Limites de desconto e quem aprova cada faixa.' },
    { id:'processo',  emoji:'🧭', cor:'167,139,250', titulo:'Processo de Venda',          sub:'Etapas do funil, SLAs e padrões de atendimento.' },
    { id:'conduta',   emoji:'⚖️', cor:'244,114,182', titulo:'Conduta Comercial',          sub:'Ética, postura e regras de relacionamento.' },
    { id:'posvenda',  emoji:'🤝', cor:'45,212,191',  titulo:'Pós-venda e Carteira',       sub:'Distribuição de leads, recompra e carteira.' }
  ];

  /* Documentos da seção Produto */
  var PRODUTO_DOCS = [
    { id:'cis-indicacao', emoji:'📘', cor:'201,168,76',
      titulo:'Método CIS — Ex-alunos e Programa de Indicação',
      sub:'Condição de ex-aluno + campanha de indicação (regras completas).',
      url:'regras-cis-indicacao/index.html' }
  ];

  var _vista = 'home';
  var _docAtual = null;
  var _cssInjetado = false;

  function _injectCss(){
    if(_cssInjetado) return;
    _cssInjetado = true;
    var css = ''
      + '#regrasScreen{ position:fixed; top:0; left:0; width:100%; height:100%; overflow-y:auto; overflow-x:hidden; z-index:1; background:var(--bg,#0a0e1a); -webkit-overflow-scrolling:touch; }'
      + '.rgc-topbar{ position:sticky; top:0; z-index:5; display:flex; align-items:center; gap:14px; padding:14px 22px; background:rgba(10,14,26,.86); backdrop-filter:blur(10px); border-bottom:1px solid var(--border,rgba(255,255,255,.08)); }'
      + '.rgc-back{ display:inline-flex; align-items:center; gap:6px; background:transparent; border:1px solid var(--border2,rgba(255,255,255,.14)); color:var(--text,#e6edf3); padding:8px 14px; border-radius:10px; font:inherit; font-size:13px; font-weight:600; cursor:pointer; transition:.15s; }'
      + '.rgc-back:hover{ background:rgba(255,255,255,.06); }'
      + '.rgc-title{ font-size:16px; font-weight:800; color:var(--text,#e6edf3); }'
      + '.rgc-spacer{ flex:1; }'
      + '.rgc-body{ max-width:1080px; margin:0 auto; padding:22px 22px 60px; }'
      + '.rgc-crumb{ font-size:12px; color:var(--muted,#9aa5b1); margin-bottom:16px; display:flex; gap:7px; flex-wrap:wrap; align-items:center; }'
      + '.rgc-crumb b{ color:#fb923c; } .rgc-crumb span{ opacity:.5; }'
      + '.rgc-hero h1{ font-size:24px; font-weight:800; color:var(--text,#e6edf3); margin:0 0 4px; }'
      + '.rgc-hero p{ font-size:13px; color:var(--muted,#9aa5b1); margin:0 0 22px; }'
      + '.rgc-note{ background:rgba(251,146,60,.08); border:1px solid rgba(251,146,60,.25); border-radius:12px; padding:14px 16px; font-size:12.5px; color:var(--muted,#9aa5b1); line-height:1.55; margin-bottom:22px; }'
      + '.rgc-note b{ color:#fb923c; }'
      + '.rgc-grid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px; }'
      + '.rgc-card{ text-align:left; display:flex; flex-direction:column; gap:8px; padding:20px; border-radius:16px; cursor:pointer; font:inherit; color:var(--text,#e6edf3); background:linear-gradient(135deg, rgba(var(--c),.13), rgba(var(--c),.03)); border:1px solid rgba(var(--c),.28); box-shadow:0 8px 28px rgba(var(--c),.10); transition:transform .15s, box-shadow .15s; }'
      + '.rgc-card:hover{ transform:translateY(-3px); box-shadow:0 14px 38px rgba(var(--c),.20); }'
      + '.rgc-card.soon{ opacity:.5; cursor:default; }'
      + '.rgc-card.soon:hover{ transform:none; box-shadow:0 8px 28px rgba(var(--c),.10); }'
      + '.rgc-card-ic{ width:48px; height:48px; display:flex; align-items:center; justify-content:center; font-size:26px; border-radius:12px; background:rgba(var(--c),.16); }'
      + '.rgc-card-tit{ font-size:16px; font-weight:800; line-height:1.25; }'
      + '.rgc-card-sub{ font-size:12.5px; line-height:1.5; color:var(--muted,#9aa5b1); flex:1; }'
      + '.rgc-card-go{ font-size:12px; font-weight:700; color:rgb(var(--c)); display:inline-flex; align-items:center; gap:5px; }'
      /* visor do documento (deck em iframe) */
      + '.rgc-doc-bar{ display:flex; align-items:center; gap:12px; margin-bottom:12px; }'
      + '.rgc-doc-tit{ font-size:15px; font-weight:800; color:var(--text,#e6edf3); flex:1; min-width:0; }'
      + '.rgc-iframe-wrap{ height:calc(100vh - 150px); min-height:420px; background:#0a1628; border-radius:14px; overflow:hidden; border:1px solid var(--border,rgba(255,255,255,.08)); }'
      + '.rgc-iframe-wrap iframe{ width:100%; height:100%; border:0; display:block; }';
    var st = document.createElement('style');
    st.id = 'regrasComerciaisCss';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function _registrarNoArrayTelas(){
    try{
      if(typeof window._TELAS !== 'undefined' && Array.isArray(window._TELAS)){
        if(window._TELAS.indexOf('regrasScreen') < 0) window._TELAS.push('regrasScreen');
      }
    }catch(e){}
  }

  function _ensureScreen(){
    var host = document.getElementById('regrasScreen');
    if(host) return host;
    host = document.createElement('div');
    host.id = 'regrasScreen';
    host.style.display = 'none';
    document.body.appendChild(host);
    return host;
  }

  /* ── Conteúdos por nível ── */
  function _homeHtml(){
    var cards = SECOES.map(function(s){
      if(s.ativo){
        return ''
          + '<button class="rgc-card" style="--c:'+s.cor+';" onclick="window.regrasNav(\''+s.id+'\')">'
          +   '<div class="rgc-card-ic">'+s.emoji+'</div>'
          +   '<div class="rgc-card-tit">'+s.titulo+'</div>'
          +   '<div class="rgc-card-sub">'+s.sub+'</div>'
          +   '<div class="rgc-card-go">Abrir →</div>'
          + '</button>';
      }
      return ''
        + '<button class="rgc-card soon" style="--c:'+s.cor+';" onclick="window._showToast && window._showToast(\'Seção em construção.\', \'var(--muted)\')">'
        +   '<div class="rgc-card-ic">'+s.emoji+'</div>'
        +   '<div class="rgc-card-tit">'+s.titulo+'</div>'
        +   '<div class="rgc-card-sub">'+s.sub+'</div>'
        +   '<div class="rgc-card-go" style="opacity:.6">em breve</div>'
        + '</button>';
    }).join('');
    return ''
      + '<div class="rgc-hero"><h1>📋 Regras Comerciais</h1>'
      +   '<p>Diretrizes oficiais da operação comercial — referência única para toda a equipe.</p></div>'
      + '<div class="rgc-grid">' + cards + '</div>';
  }

  function _produtoHtml(){
    var cards = PRODUTO_DOCS.map(function(d){
      return ''
        + '<button class="rgc-card" style="--c:'+d.cor+';" onclick="window.regrasNav(\'doc:'+d.id+'\')">'
        +   '<div class="rgc-card-ic">'+d.emoji+'</div>'
        +   '<div class="rgc-card-tit">'+d.titulo+'</div>'
        +   '<div class="rgc-card-sub">'+d.sub+'</div>'
        +   '<div class="rgc-card-go">Abrir →</div>'
        + '</button>';
    }).join('');
    return ''
      + '<div class="rgc-hero"><h1>🛍️ Produto</h1>'
      +   '<p>Documentos e regras comerciais organizados por produto.</p></div>'
      + '<div class="rgc-grid">' + cards + '</div>';
  }

  function _docHtml(doc){
    return ''
      + '<div class="rgc-doc-bar">'
      +   '<div class="rgc-doc-tit">'+doc.emoji+' '+doc.titulo+'</div>'
      +   '<button class="rgc-back" onclick="window.open(\''+doc.url+'\',\'_blank\',\'noopener\')">↗ Nova aba</button>'
      + '</div>'
      + '<div class="rgc-iframe-wrap"><iframe src="'+doc.url+'" title="'+doc.titulo+'" allowfullscreen allow="fullscreen"></iframe></div>';
  }

  function _montarShell(){
    var host = _ensureScreen();
    var backOnclick, crumb, body;

    if(_vista === 'produto'){
      backOnclick = "window.regrasNav('home')";
      crumb = '<span>Regras Comerciais ›</span> <b>Produto</b>';
      body = _produtoHtml();
    } else if(_docAtual){
      backOnclick = "window.regrasNav('produto')";
      crumb = '<span>Regras Comerciais › Produto ›</span> <b>'+_docAtual.titulo+'</b>';
      body = _docHtml(_docAtual);
    } else {
      backOnclick = 'window.voltarHomeRegras()';
      crumb = '';
      body = _homeHtml();
    }

    host.innerHTML = ''
      + '<div class="rgc-topbar">'
      +   '<button class="rgc-back" onclick="'+backOnclick+'">‹ Voltar</button>'
      +   '<div class="rgc-title">📋 Regras Comerciais</div>'
      +   '<div class="rgc-spacer"></div>'
      + '</div>'
      + '<div class="rgc-body">'
      +   (crumb ? '<div class="rgc-crumb">'+crumb+'</div>' : '')
      +   body
      + '</div>';
  }

  window.regrasNav = function(vista){
    if(vista && vista.indexOf('doc:') === 0){
      var id = vista.slice(4);
      _docAtual = PRODUTO_DOCS.filter(function(d){ return d.id === id; })[0] || null;
      _vista = 'doc';
    } else {
      _docAtual = null;
      _vista = (vista === 'produto') ? 'produto' : 'home';
    }
    _montarShell();
    window.scrollTo(0, 0);
  };

  window.abrirRegrasComerciais = function(){
    _injectCss();
    _registrarNoArrayTelas();
    _vista = 'home'; _docAtual = null;
    _montarShell();
    if(typeof window._mostrarTela === 'function'){
      window._mostrarTela('regrasScreen', false);
    } else {
      ['turmasScreen','telaTurmasScreen','mapeamentoScreen','novaPipelineScreen','dashboard','loginScreen','propostaComercialScreen','turmaInativaScreen','trapScreen','bibScreen'].forEach(function(t){
        var el = document.getElementById(t); if(el) el.style.display = 'none';
      });
      document.getElementById('regrasScreen').style.display = 'block';
    }
    window.scrollTo(0, 0);
  };

  window.voltarHomeRegras = function(){
    if(typeof window._mostrarTela === 'function'){
      window._mostrarTela('turmasScreen', false);
    } else {
      var host = document.getElementById('regrasScreen'); if(host) host.style.display = 'none';
      var home = document.getElementById('turmasScreen'); if(home) home.style.display = '';
    }
  };

})();
