/* ═══════════════════════════════════════════════════════════════════
   BIBLIOTECA DE CONHECIMENTO · módulo isolado (não interfere no resto)
   ───────────────────────────────────────────────────────────────────
   Card da home → tela com 6 botões (Cases, Respostas, SPIN, ROI,
   Turnover, CAC/LTV). Cada botão abre a ferramenta correspondente,
   embutida via iframe a partir de biblioteca-conhecimento.html?bib=<id>.

   biblioteca-conhecimento.html é um arquivo INDEPENDENTE derivado do
   agente-comercial.html (modo restrito: só a Biblioteca, sem login).

   API PÚBLICA (window):
     abrirBibliotecaConhecimento()  ← chamado pelo card da home
     abrirFerramentaBib(id)         ← clique num dos 6 botões
     voltarGridBib()                ← volta dos 6 botões (fecha ferramenta)
     voltarHomeBib()                ← volta para a home
   ═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var ARQ = 'biblioteca-conhecimento.html';

  var ITENS = [
    { id:'cases',     emoji:'🏆', cor:'251,191,36',  titulo:'Cases por Setor',    sub:'25 cases reais de transformação pelo método Febracis, filtráveis por setor.' },
    { id:'respostas', emoji:'💬', cor:'96,165,250',  titulo:'Respostas de Elite', sub:'Biblioteca de respostas prontas para as objeções mais comuns.' },
    { id:'spin',      emoji:'🎯', cor:'167,139,250', titulo:'Perguntas SPIN',     sub:'Roteiro de perguntas Situação, Problema, Implicação e Necessidade.' },
    { id:'roi',       emoji:'💰', cor:'52,211,153',  titulo:'Calculadora de ROI', sub:'Calcule o retorno do investimento personalizado para o lead.' },
    { id:'turnover',  emoji:'💸', cor:'248,113,113', titulo:'Custo de Turnover',  sub:'Diagnostique o custo financeiro da rotatividade da equipe.' },
    { id:'cac',       emoji:'📊', cor:'34,211,238',  titulo:'CAC / LTV',          sub:'Diagnóstico de Custo de Aquisição e Valor do Tempo de Vida do cliente.' }
  ];

  var _cssInjetado = false;

  function _injectCss(){
    if(_cssInjetado) return;
    _cssInjetado = true;
    var css = ''
      + '#bibScreen{ position:fixed; top:0; left:0; width:100%; height:100%; overflow-y:auto; overflow-x:hidden; z-index:1; background:var(--bg,#0a0e1a); -webkit-overflow-scrolling:touch; }'
      + '.bib-topbar{ position:sticky; top:0; z-index:5; display:flex; align-items:center; gap:14px; padding:14px 22px; background:rgba(10,14,26,.86); backdrop-filter:blur(10px); border-bottom:1px solid var(--border,rgba(255,255,255,.08)); }'
      + '.bib-back{ display:inline-flex; align-items:center; gap:6px; background:transparent; border:1px solid var(--border2,rgba(255,255,255,.14)); color:var(--text,#e6edf3); padding:8px 14px; border-radius:10px; font:inherit; font-size:13px; font-weight:600; cursor:pointer; transition:.15s; }'
      + '.bib-back:hover{ background:rgba(255,255,255,.06); }'
      + '.bib-title{ font-size:16px; font-weight:800; color:var(--text,#e6edf3); }'
      + '.bib-spacer{ flex:1; }'
      + '.bib-body{ max-width:1080px; margin:0 auto; padding:26px 22px 60px; }'
      + '.bib-hero h1{ font-size:24px; font-weight:800; color:var(--text,#e6edf3); margin:0 0 4px; }'
      + '.bib-hero p{ font-size:13px; color:var(--muted,#9aa5b1); margin:0 0 22px; }'
      + '.bib-grid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px; }'
      + '.bib-card{ text-align:left; display:flex; flex-direction:column; gap:8px; padding:20px; border-radius:16px; cursor:pointer; font:inherit; color:var(--text,#e6edf3); background:linear-gradient(135deg, rgba(var(--c),.13), rgba(var(--c),.03)); border:1px solid rgba(var(--c),.28); box-shadow:0 8px 28px rgba(var(--c),.10); transition:transform .15s, box-shadow .15s; }'
      + '.bib-card:hover{ transform:translateY(-3px); box-shadow:0 14px 38px rgba(var(--c),.20); }'
      + '.bib-card-ic{ width:48px; height:48px; display:flex; align-items:center; justify-content:center; font-size:26px; border-radius:12px; background:rgba(var(--c),.16); }'
      + '.bib-card-tit{ font-size:17px; font-weight:800; }'
      + '.bib-card-sub{ font-size:12.5px; line-height:1.5; color:var(--muted,#9aa5b1); flex:1; }'
      + '.bib-card-go{ font-size:12.5px; font-weight:700; color:rgb(var(--c)); display:inline-flex; align-items:center; gap:5px; }'
      + '.bib-viewer{ display:flex; flex-direction:column; height:calc(100vh - 60px); }'
      + '.bib-viewer-bar{ display:flex; align-items:center; gap:12px; padding:0 0 14px; }'
      + '.bib-viewer-tit{ font-size:15px; font-weight:800; color:var(--text,#e6edf3); }'
      + '.bib-iframe-wrap{ flex:1; background:#fff; border-radius:14px; overflow:hidden; border:1px solid var(--border,rgba(255,255,255,.08)); }'
      + '.bib-iframe-wrap iframe{ width:100%; height:100%; border:0; display:block; }';
    var st = document.createElement('style');
    st.id = 'bibConhecimentoCss';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function _registrarNoArrayTelas(){
    try{
      if(typeof window._TELAS !== 'undefined' && Array.isArray(window._TELAS)){
        if(window._TELAS.indexOf('bibScreen') < 0) window._TELAS.push('bibScreen');
      }
    }catch(e){}
  }

  function _ensureScreen(){
    var host = document.getElementById('bibScreen');
    if(host) return host;
    host = document.createElement('div');
    host.id = 'bibScreen';
    host.style.display = 'none';
    document.body.appendChild(host);
    return host;
  }

  function _gridHtml(){
    var cards = ITENS.map(function(it){
      return ''
        + '<button class="bib-card" style="--c:'+it.cor+';" onclick="window.abrirFerramentaBib(\''+it.id+'\')">'
        +   '<div class="bib-card-ic">'+it.emoji+'</div>'
        +   '<div class="bib-card-tit">'+it.titulo+'</div>'
        +   '<div class="bib-card-sub">'+it.sub+'</div>'
        +   '<div class="bib-card-go">Abrir →</div>'
        + '</button>';
    }).join('');
    return ''
      + '<div class="bib-hero"><h1>📚 Biblioteca de Conhecimento</h1>'
      +   '<p>Referência rápida para usar durante a conversa de venda. Escolha uma ferramenta:</p></div>'
      + '<div class="bib-grid">' + cards + '</div>';
  }

  function _montarShell(){
    var host = _ensureScreen();
    host.innerHTML = ''
      + '<div class="bib-topbar">'
      +   '<button class="bib-back" onclick="window.voltarHomeBib()">‹ Voltar</button>'
      +   '<div class="bib-title">📚 Biblioteca de Conhecimento</div>'
      +   '<div class="bib-spacer"></div>'
      + '</div>'
      + '<div class="bib-body">'
      +   '<div id="bibGrid">' + _gridHtml() + '</div>'
      +   '<div id="bibViewer" class="bib-viewer" style="display:none;">'
      +     '<div class="bib-viewer-bar">'
      +       '<button class="bib-back" onclick="window.voltarGridBib()">‹ Biblioteca</button>'
      +       '<div class="bib-viewer-tit" id="bibViewerTit"></div>'
      +     '</div>'
      +     '<div class="bib-iframe-wrap"><iframe id="bibIframe" title="Ferramenta da Biblioteca"></iframe></div>'
      +   '</div>'
      + '</div>';
  }

  window.abrirBibliotecaConhecimento = function(){
    _injectCss();
    _registrarNoArrayTelas();
    _montarShell();
    if(typeof window._mostrarTela === 'function'){
      window._mostrarTela('bibScreen', false);
    } else {
      ['turmasScreen','telaTurmasScreen','mapeamentoScreen','novaPipelineScreen','dashboard','loginScreen','propostaComercialScreen','turmaInativaScreen','trapScreen'].forEach(function(t){
        var el = document.getElementById(t); if(el) el.style.display = 'none';
      });
      document.getElementById('bibScreen').style.display = 'block';
    }
    window.scrollTo(0, 0);
  };

  window.abrirFerramentaBib = function(id){
    var it = ITENS.filter(function(x){ return x.id === id; })[0];
    if(!it) return;
    var grid = document.getElementById('bibGrid');
    var viewer = document.getElementById('bibViewer');
    var tit = document.getElementById('bibViewerTit');
    var ifr = document.getElementById('bibIframe');
    if(!grid || !viewer || !ifr) return;
    tit.textContent = it.emoji + '  ' + it.titulo;
    ifr.src = ARQ + '?bib=' + id;
    grid.style.display = 'none';
    viewer.style.display = 'flex';
    window.scrollTo(0, 0);
  };

  window.voltarGridBib = function(){
    var grid = document.getElementById('bibGrid');
    var viewer = document.getElementById('bibViewer');
    var ifr = document.getElementById('bibIframe');
    if(ifr) ifr.src = 'about:blank';
    if(viewer) viewer.style.display = 'none';
    if(grid) grid.style.display = 'block';
  };

  window.voltarHomeBib = function(){
    if(typeof window._mostrarTela === 'function'){
      window._mostrarTela('turmasScreen', false);
    } else {
      var host = document.getElementById('bibScreen'); if(host) host.style.display = 'none';
      var home = document.getElementById('turmasScreen'); if(home) home.style.display = '';
    }
  };

})();
