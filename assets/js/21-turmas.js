/* ============================================================
   21-turmas.js — Swimlane de turmas e renderTurmasGrid
   Extraído de 02-main.js (Fase 2 da modularização)
   Depende de: APP_CONST, TURMAS_NODE, _turmaGlobalAtiva,
               _carregarTurmaGlobalAtiva, _getSessao, _skelCards,
               entrarTurma, definirTurmaAtiva, formatDate, formatVal,
               getCol, _fbGet (todos em 02-main.js)
============================================================ */

// ── Swimlane de turmas: estado e funções ──
var _tturmasView=localStorage.getItem('_tturmasLayout')||'cards';
var _tturmasAnoAtual=new Date().getFullYear();
var _tturmasAnosExtra=[];
var _tturmasCache=[];
/* Ordem das turmas no Swimlane (opção 5 · switch on/off):
   'desc' = mais recente no topo (default · meses maiores primeiro)
   'asc'  = mais antiga no topo (meses menores primeiro) */
var _tturmasOrdem=localStorage.getItem('_tturmasOrdem')||'desc';
/* Filtro de período aplicado à lista de turmas (sobrescreve o filtro só-por-ano).
   tipo: 'ano' | 'mes' | 'dia' | 'periodo'
   Persiste em localStorage pra manter a escolha do usuário entre sessões. */
var _tturmasFiltro = (function(){
  try { var x = JSON.parse(localStorage.getItem('_tturmasFiltro')||'null'); if(x && x.tipo) return x; } catch(e){}
  return { tipo:'ano' };
})();
/* Estado temporário do picker (antes do APLICAR) */
var _tturmasPick = null;

var _SWIM_MESES = APP_CONST.MESES_CURTO;
var _SWIM_CORES = APP_CONST.PALETTE_SWIM;
var _SWIM_BGS   = APP_CONST.PALETTE_SWIM_BG;

function _swimExtrairTipo(t){
  var cod=(t.codigo||t.id||''). toUpperCase();
  var tipos=['MASTER','MAESTRIA','FCIS','FGPC','CIS-GL','CIS','BHP','TAV','ML','CI','IF','CEOP','TOUR'];
  for(var i=0;i<tipos.length;i++){if(cod.indexOf(tipos[i])===0) return tipos[i];}
  return cod.replace(/[0-9]/g,'').slice(0,5)||'?';
}
function _swimExtrairAno(t){
  if(t.periodStart){var y=parseInt((t.periodStart||''). slice(0,4));if(y>=2020) return y;}
  if(t.periodText){var m=t.periodText.match(/\b(20\d{2})\b/);if(m) return parseInt(m[1]);}
  return new Date().getFullYear();
}
function _swimExtrairMes(t){
  if(t.periodStart){var m=parseInt((t.periodStart||''). slice(5,7));if(m>=1&&m<=12) return m;}
  return 0;
}
/* Data completa em milissegundos (pra ordenar turmas do mesmo mês pelo DIA).
   Usa periodStart (YYYY-MM-DD); fallback: 1º dia do mês. */
function _swimExtrairDataInicioMs(t){
  if(t && t.periodStart){
    var ts = new Date(t.periodStart).getTime();
    if(!isNaN(ts)) return ts;
  }
  var a = _swimExtrairAno(t);
  var m = _swimExtrairMes(t) || 1;
  return new Date(a, m-1, 1).getTime();
}
function _swimExtrairDataFimMs(t){
  if(t && t.periodEnd){
    var ts = new Date(t.periodEnd).getTime();
    if(!isNaN(ts)) return ts;
  }
  /* Sem periodEnd → usa início (turmas de 1 dia) */
  return _swimExtrairDataInicioMs(t);
}

function _tturmasToggleDropdown(){
  var dd=document.getElementById('layoutDropdown');
  var btn=document.getElementById('layoutPickerBtn');
  if(dd.classList.contains('open')){dd.classList.remove('open');return;}
  // Mover para body para não ser cortado por nenhum container
  if(dd.parentNode!==document.body) document.body.appendChild(dd);
  var r=btn.getBoundingClientRect();
  // Posicionar abaixo do botão
  dd.style.top=(r.bottom+4)+'px';
  dd.style.left=r.left+'px';
  dd.style.right='auto';
  dd.style.width='auto';
  // Garantir que não saia da tela pela direita
  dd.classList.add('open');
  var ddR=dd.getBoundingClientRect();
  if(ddR.right>window.innerWidth-8){
    dd.style.left='auto';
    dd.style.right=(window.innerWidth-r.right)+'px';
  }
  setTimeout(function(){
    document.addEventListener('click',function _close(e){
      if(!btn.contains(e.target)&&!dd.contains(e.target)){
        dd.classList.remove('open');document.removeEventListener('click',_close);
      }
    });
  },10);
}
function _tturmasSetView(v){
  _tturmasView=v;
  try{localStorage.setItem('_tturmasLayout',v);}catch(e){}
  var info={'cards':['⊞','Cards'],'A':['A','Timeline'],'B':['B','Grade meses'],'C':['C','Lista'],'D':['D','Linha do tempo'],'E':['E','Kanban'],'F':['F','Mapa de calor'],'G':['G','Semestres'],'H':['H','Swimlane']};
  var lbl=info[v]||info['cards'];
  document.getElementById('layoutPickerLetter').textContent=lbl[0];
  document.getElementById('layoutPickerLabel').textContent=lbl[1];
  document.getElementById('layoutPickerBtn').classList.add('on');
  // Marcar opção ativa
  document.querySelectorAll('#layoutDropdown .layout-opt').forEach(function(b){
    b.classList.toggle('on',b.getAttribute('onclick').indexOf("'"+v+"'")!==-1);
  });
  document.getElementById('layoutDropdown').classList.remove('open');
  // Mostrar/ocultar containers
  var showCards=(v==='cards');
  var showSwim=(v!=='cards');
  document.getElementById('turmasGrid').style.display=showCards?'':'none';
  document.getElementById('turmasSwimWrap').style.display=showSwim?'block':'none';
  if(_tturmasCache.length){
    if(v==='A') _renderTurmasA(_tturmasCache);
    else if(v==='B') _renderTurmasB(_tturmasCache);
    else if(v==='C') _renderTurmasC(_tturmasCache);
    else if(v==='D') _renderTurmasD(_tturmasCache);
    else if(v==='E') _renderTurmasE(_tturmasCache);
    else if(v==='F') _renderTurmasF(_tturmasCache);
    else if(v==='G') _renderTurmasG(_tturmasCache);
    else if(v==='H') _renderTurmasSwim(_tturmasCache);
  }
}

/* Seletor de ano · POPOVER com grade visual + badges de qtd de turmas
   (mesmo padrão do modal Gerenciar Turmas) */
function _renderTurmasYearBar(turmas){
  var bar=document.getElementById('turmasYearBar');
  if(!bar) return;
  // Contar turmas por ano
  var anosCount={};
  turmas.forEach(function(t){
    var a=_swimExtrairAno(t);
    anosCount[a]=(anosCount[a]||0)+1;
  });
  var anos=Object.keys(anosCount).map(Number).sort();
  if(!anos.length) anos=[new Date().getFullYear()];
  // Juntar anos extras (adicionados via "+ Ano")
  _tturmasAnosExtra.forEach(function(a){if(anos.indexOf(a)===-1) anos.push(a);});
  anos.sort();
  if(anos.indexOf(_tturmasAnoAtual)===-1) _tturmasAnoAtual=anos[0];

  // Salva referência pra reabertura/reuso do popover
  bar._turmasAnosCache = anos;
  bar._turmasAnosCount = anosCount;

  /* Label de cada tipo de filtro pro micro-tag ao lado do botão */
  var tipoLbl = {ano:'ANO', mes:'MÊS', dia:'DIA', periodo:'PERÍODO'};
  var lblTipo = tipoLbl[_tturmasFiltro.tipo] || 'ANO';
  bar.innerHTML=
    '<span style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-right:4px;">'+lblTipo+'</span>'+
    '<div id="turmasAnoPopWrap" style="position:relative;display:inline-block;">'+
      '<button id="turmasAnoTrigger" type="button" '+
        'style="padding:5px 14px;border-radius:20px;border:none;background:linear-gradient(180deg,#d4f565,#c8f05a);color:#0f0f0f;font-family:\'DM Sans\',sans-serif;font-size:12px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">'+
        _filtroLabel()+' <span style="font-size:10px;opacity:.7;">📅</span>'+
      '</button>'+
      '<div id="turmasAnoPopover" style="display:none;position:absolute;top:calc(100% + 8px);left:0;z-index:1600;'+
        'background:var(--surface);border:1px solid var(--border2);border-radius:10px;padding:0;'+
        'box-shadow:0 8px 28px rgba(0,0,0,.5);width:320px;">'+
      '</div>'+
    '</div>'+
    /* Botão único alternante (Opção 2): mostra a opção ATIVA com as setas
       empilhadas (a inativa em opacity .25). Tap inverte a ordem. */
    '<span style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-left:14px;margin-right:8px;">Ordem</span>'+
    '<button id="turmasOrdemBtn" type="button" aria-pressed="'+(_tturmasOrdem==='desc')+'" '+
      'title="Toque pra alternar a ordem (antiga ↔ recente)" '+
      'style="background:rgba(200,240,90,.10);border:1px solid rgba(200,240,90,.35);color:var(--accent);padding:7px 12px;border-radius:8px;font-size:11px;font-weight:800;cursor:pointer;font-family:inherit;letter-spacing:.04em;display:inline-flex;align-items:center;gap:6px;text-transform:uppercase;line-height:1;">'+
      '<span style="display:inline-flex;flex-direction:column;font-size:9px;line-height:1;gap:1px;">'+
        '<span style="opacity:'+(_tturmasOrdem==='asc'?'1':'.25')+';">↑</span>'+
        '<span style="opacity:'+(_tturmasOrdem==='desc'?'1':'.25')+';">↓</span>'+
      '</span>'+
      (_tturmasOrdem==='desc'?'Recente primeiro':'Antiga primeiro')+
    '</button>';

  document.getElementById('turmasAnoTrigger').addEventListener('click', function(e){
    e.stopPropagation();
    _turmasAnoPopAbrir();
  });
  var sw=document.getElementById('turmasOrdemBtn');
  if(sw){
    sw.addEventListener('click', _turmasToggleOrdem);
    sw.addEventListener('keydown', function(e){
      if(e.key==='Enter'||e.key===' '){ e.preventDefault(); _turmasToggleOrdem(); }
    });
  }
}

function _turmasToggleOrdem(){
  _tturmasOrdem = (_tturmasOrdem === 'desc') ? 'asc' : 'desc';
  try{ localStorage.setItem('_tturmasOrdem', _tturmasOrdem); }catch(e){}
  _renderTurmasSwim(_tturmasCache);
}

/* ─────── Helpers do filtro (ANO · MÊS · DIA · PERÍODO) ─────── */
function _fmtBR(iso){
  var m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? (m[3]+'/'+m[2]+'/'+m[1]) : '';
}
function _fmtBRcurto(iso){
  var m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? (m[3]+'/'+m[2]) : '';
}
function _isoHoje(){
  var d=new Date(); var p=function(n){return String(n).padStart(2,'0');};
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
}
function _isoComporA(a,m,d){
  var p=function(n){return String(n).padStart(2,'0');};
  return a+'-'+p(m)+'-'+p(d);
}
function _diasDoMes(ano,mes){ /* mes 1..12 */
  return new Date(ano, mes, 0).getDate();
}
function _filtroLabel(){
  var f=_tturmasFiltro;
  if(f.tipo==='mes')     return (_SWIM_MESES[f.mes-1]||'?')+'/'+f.ano;
  if(f.tipo==='dia')     return _fmtBR(f.dia);
  if(f.tipo==='periodo') return _fmtBRcurto(f.ini)+' → '+_fmtBR(f.fim);
  return String(_tturmasAnoAtual);
}
/* Filtra a lista de turmas pelo filtro vigente. Cruzamento de período usa
   periodStart/periodEnd; fallback para periodStart se faltar end. */
function _turmasDoFiltro(turmas){
  var f=_tturmasFiltro;
  if(f.tipo==='mes'){
    return turmas.filter(function(t){
      return _swimExtrairAno(t)===f.ano && _swimExtrairMes(t)===f.mes;
    });
  }
  if(f.tipo==='dia'){
    var diaMs=new Date(f.dia+'T12:00:00').getTime();
    return turmas.filter(function(t){
      var ini=_swimExtrairDataInicioMs(t);
      var fim=_swimExtrairDataFimMs(t);
      return ini<=diaMs && diaMs<=fim;
    });
  }
  if(f.tipo==='periodo'){
    var iniMs=new Date(f.ini+'T00:00:00').getTime();
    var fimMs=new Date(f.fim+'T23:59:59').getTime();
    return turmas.filter(function(t){
      var tIni=_swimExtrairDataInicioMs(t);
      var tFim=_swimExtrairDataFimMs(t);
      return tIni<=fimMs && tFim>=iniMs;
    });
  }
  /* default: tipo='ano' — usa _tturmasAnoAtual */
  return turmas.filter(function(t){return _swimExtrairAno(t)===_tturmasAnoAtual;});
}
function _salvarFiltro(){
  try { localStorage.setItem('_tturmasFiltro', JSON.stringify(_tturmasFiltro)); }catch(e){}
}

function _turmasAnoPopAbrir(){
  var pop=document.getElementById('turmasAnoPopover');
  if(!pop) return;
  if(pop.style.display==='block'){ _turmasAnoPopFechar(); return; }

  /* Inicializa o estado temporário do picker a partir do filtro vigente */
  var f=_tturmasFiltro;
  _tturmasPick = {
    tab: f.tipo,
    ano: f.ano || _tturmasAnoAtual,
    mes: f.mes || (new Date().getMonth()+1),
    dia: f.dia || _isoHoje(),
    ini: f.ini || _isoHoje(),
    fim: f.fim || _isoHoje(),
    selPer: 'ini' /* qual data do período está sendo escolhida no calendário */
  };

  _turmasPickRender();
  pop.style.display='block';
  setTimeout(function(){ document.addEventListener('click', _turmasAnoPopOnDocClick); }, 0);
}

function _turmasPickRender(){
  var pop=document.getElementById('turmasAnoPopover');
  if(!pop) return;
  var p=_tturmasPick;
  var tabs=['ano','mes','dia','periodo'];
  var lblTabs={ano:'ANO',mes:'MÊS',dia:'DIA',periodo:'PERÍODO'};
  var html='<div class="tp-pick">';

  /* Tabs */
  html+='<div class="tp-tabs">';
  tabs.forEach(function(k){
    html+='<button type="button" class="tp-tab'+(p.tab===k?' on':'')+'" data-tab="'+k+'">'+lblTabs[k]+'</button>';
  });
  html+='</div>';

  /* Navegação de ano (sempre presente, exceto na tab PERÍODO que usa o próprio) */
  if(p.tab !== 'periodo'){
    html+='<div class="tp-nav">'
      + '<button type="button" class="tp-navbtn" data-nav="prev">‹</button>'
      + '<span class="tp-navlbl">'+p.ano+'</span>'
      + '<button type="button" class="tp-navbtn" data-nav="next">›</button>'
      + '</div>';
  }

  html+='<div class="tp-body">';

  if(p.tab === 'ano'){
    /* Grid 3×N de anos: cache (com turmas) + extras + ano de hoje + botão "+".
       Anos REMOVÍVEIS (extras sem turmas) podem ser excluídos com long-press
       de 2 segundos, que dispara um modal de confirmação. */
    var bar=document.getElementById('turmasYearBar');
    var anosCache=(bar && bar._turmasAnosCache) ? bar._turmasAnosCache.slice() : [];
    var anosCount=(bar && bar._turmasAnosCount) ? bar._turmasAnosCount : {};
    var anos=anosCache.slice();
    var hoje=new Date().getFullYear();
    if(anos.indexOf(hoje)===-1) anos.push(hoje);
    _tturmasAnosExtra.forEach(function(a){ if(anos.indexOf(a)===-1) anos.push(a); });
    anos.sort();
    html+='<div class="tp-grid">';
    anos.forEach(function(a){
      var temTurmas=(anosCount[a]||0)>0;
      var ehExtra=(_tturmasAnosExtra.indexOf(a)!==-1);
      var removivel = ehExtra && !temTurmas;
      var attrs = 'data-ano="'+a+'"';
      if(removivel) attrs += ' data-rm="1" title="Segure 2s pra excluir"';
      html+='<button type="button" class="tp-cell'+(a===p.ano?' on':'')+(removivel?' tp-cell-rm':'')+'" '+attrs+'>'+a
        + (removivel?'<span class="tp-cell-press"></span>':'')
        + '</button>';
    });
    /* Botão "+" que adiciona o próximo ano (maior+1) */
    html+='<button type="button" class="tp-cell tp-cell-add" data-add-ano="1" title="Adicionar próximo ano">+</button>';
    html+='</div>';
  } else if(p.tab === 'mes'){
    /* Grid 3×4 de meses — só meses COM TURMAS no ano são clicáveis */
    var cntMes={};
    (_tturmasCache||[]).forEach(function(t){
      if(_swimExtrairAno(t) !== p.ano) return;
      var mm=_swimExtrairMes(t); if(mm>=1 && mm<=12) cntMes[mm]=(cntMes[mm]||0)+1;
    });
    html+='<div class="tp-grid tp-grid-mes">';
    for(var m=1;m<=12;m++){
      var nome=(APP_CONST.MESES_CURTO[m-1]||'').toUpperCase();
      var qtd=cntMes[m]||0;
      var off = qtd ? '' : ' off';
      var ativo = (p.mes===m && qtd) ? ' on' : '';
      var attrs = qtd ? ('data-mes="'+m+'"') : 'disabled';
      html+='<button type="button" class="tp-cell'+ativo+off+'" '+attrs+' title="'+(qtd?qtd+' turma'+(qtd>1?'s':''):'sem turmas')+'">'+nome
        + (qtd?'<span class="tp-cell-cnt">'+qtd+'</span>':'')
        + '</button>';
    }
    html+='</div>';
  } else if(p.tab === 'dia'){
    /* Mini-calendário do mês atual de p.ano/p.mes */
    html+=_calendarioHTML(p.ano, p.mes, p.dia, 'dia');
    /* Mini-seletor de mês (opcional, abaixo do calendário) */
    html+='<div class="tp-mini-mes">';
    for(var mm=1;mm<=12;mm++){
      var nm=(APP_CONST.MESES_CURTO[mm-1]||'').toUpperCase();
      html+='<button type="button" class="tp-mini'+(p.mes===mm?' on':'')+'" data-pickmes="'+mm+'">'+nm+'</button>';
    }
    html+='</div>';
  } else if(p.tab === 'periodo'){
    /* Dois inputs date + calendário interativo do mês p.ano/p.mes */
    html+='<div class="tp-per">'
      + '<label class="tp-perlbl'+(p.selPer==='ini'?' on':'')+'" data-selper="ini">'
      +   '<span>Início</span><b>'+_fmtBR(p.ini)+'</b>'
      + '</label>'
      + '<label class="tp-perlbl'+(p.selPer==='fim'?' on':'')+'" data-selper="fim">'
      +   '<span>Fim</span><b>'+_fmtBR(p.fim)+'</b>'
      + '</label>'
      + '</div>';
    html+='<div class="tp-nav tp-nav-per">'
      + '<button type="button" class="tp-navbtn" data-nav="prev-mes">‹</button>'
      + '<span class="tp-navlbl">'+(APP_CONST.MESES_FULL[p.mes-1]||'')+' '+p.ano+'</span>'
      + '<button type="button" class="tp-navbtn" data-nav="next-mes">›</button>'
      + '</div>';
    html+=_calendarioHTML(p.ano, p.mes, p[p.selPer], 'periodo');
  }

  html+='</div>'; /* /tp-body */

  /* Rodapé com label + ações */
  var sel='';
  if(p.tab==='ano')     sel=String(p.ano);
  if(p.tab==='mes')     sel=(APP_CONST.MESES_CURTO[p.mes-1]||'')+'/'+p.ano;
  if(p.tab==='dia')     sel=_fmtBR(p.dia);
  if(p.tab==='periodo') sel=_fmtBR(p.ini)+' → '+_fmtBR(p.fim);
  html+='<div class="tp-foot">'
    + '<span class="tp-sel" title="'+sel+'">Selecionado: <b>'+sel+'</b></span>'
    + '<div class="tp-actions">'
    +   '<button type="button" class="tp-btn" data-act="cancel">CANCELAR</button>'
    +   '<button type="button" class="tp-btn tp-btn-on" data-act="apply">APLICAR</button>'
    + '</div>'
    + '</div>';

  html+='</div>'; /* /tp-pick */
  pop.innerHTML=html;
  _turmasPickWire(pop);
}

function _calendarioHTML(ano, mes, isoSel, modo){
  var dias=_diasDoMes(ano,mes);
  /* getDay(): 0=Dom..6=Sáb. Vamos começar a semana no domingo. */
  var primeiroDow = new Date(ano, mes-1, 1).getDay();
  var sigla=['D','S','T','Q','Q','S','S'];
  var html='<div class="tp-cal">';
  /* Cabeçalho dos dias da semana */
  html+='<div class="tp-cal-h">';
  sigla.forEach(function(s){ html+='<span>'+s+'</span>'; });
  html+='</div>';
  /* Dias */
  html+='<div class="tp-cal-g">';
  for(var i=0;i<primeiroDow;i++) html+='<span></span>';
  var hoje=_isoHoje();
  for(var d=1; d<=dias; d++){
    var iso=_isoComporA(ano,mes,d);
    var cls='tp-day';
    if(iso===isoSel) cls+=' on';
    if(iso===hoje)   cls+=' today';
    html+='<button type="button" class="'+cls+'" data-dia="'+iso+'">'+d+'</button>';
  }
  html+='</div></div>';
  return html;
}

/* Modal de confirmação para excluir ano extra (disparado por long-press 2s) */
function _turmasConfirmExcluirAno(ano){
  /* Sobrepõe o picker com um modal de confirmação compacto */
  var pop=document.getElementById('turmasAnoPopover');
  if(!pop) return;
  var ov=document.createElement('div');
  ov.className='tp-confirm-ov';
  ov.innerHTML='<div class="tp-confirm">'
    + '<div class="tp-confirm-ttl">Excluir ano '+ano+'?</div>'
    + '<div class="tp-confirm-sub">O ano será removido da lista. Você pode adicioná-lo de novo com o botão +.</div>'
    + '<div class="tp-confirm-acts">'
    +   '<button type="button" class="tp-btn" data-conf="no">CANCELAR</button>'
    +   '<button type="button" class="tp-btn tp-btn-warn" data-conf="yes">EXCLUIR</button>'
    + '</div>'
    + '</div>';
  pop.appendChild(ov);
  ov.addEventListener('click', function(e){ e.stopPropagation(); });
  ov.querySelector('[data-conf="no"]').addEventListener('click', function(){
    ov.remove();
  });
  ov.querySelector('[data-conf="yes"]').addEventListener('click', function(){
    var idx=_tturmasAnosExtra.indexOf(ano);
    if(idx>=0) _tturmasAnosExtra.splice(idx,1);
    var p=_tturmasPick;
    if(p && p.ano===ano){
      var bar=document.getElementById('turmasYearBar');
      var anosCache=(bar && bar._turmasAnosCache) ? bar._turmasAnosCache : [];
      p.ano = anosCache[0] || (new Date().getFullYear());
    }
    ov.remove();
    _turmasPickRender();
  });
}

function _turmasPickWire(pop){
  var p=_tturmasPick;
  /* Stop-propagation no popover inteiro: qualquer click interno NÃO escapa pro
     document, evitando que _turmasAnoPopOnDocClick feche o popover por engano
     quando o re-render destrói o elemento clicado (e contains() vira false). */
  pop.addEventListener('click', function(e){ e.stopPropagation(); });
  /* Tabs */
  pop.querySelectorAll('.tp-tab').forEach(function(btn){
    btn.addEventListener('click', function(){
      p.tab = btn.getAttribute('data-tab');
      _turmasPickRender();
    });
  });
  /* Setas de ano (ANO/MÊS/DIA) e mês (PERÍODO) */
  pop.querySelectorAll('.tp-navbtn').forEach(function(btn){
    btn.addEventListener('click', function(){
      var n=btn.getAttribute('data-nav');
      if(n==='prev') p.ano--;
      else if(n==='next') p.ano++;
      else if(n==='prev-mes'){
        if(p.mes===1){ p.mes=12; p.ano--; } else p.mes--;
      } else if(n==='next-mes'){
        if(p.mes===12){ p.mes=1; p.ano++; } else p.mes++;
      }
      _turmasPickRender();
    });
  });
  /* Grid de anos — click curto seleciona; long-press de 2s em anos removíveis
     dispara modal de confirmação pra excluir. */
  pop.querySelectorAll('[data-ano]').forEach(function(btn){
    var ano = parseInt(btn.getAttribute('data-ano'),10);
    var removivel = btn.getAttribute('data-rm') === '1';
    var timer = null;
    var pressed = false;
    var holdFired = false;
    function _start(e){
      if(!removivel) return;
      pressed = true; holdFired = false;
      btn.classList.add('tp-pressing');
      timer = setTimeout(function(){
        holdFired = true;
        btn.classList.remove('tp-pressing');
        _turmasConfirmExcluirAno(ano);
      }, 2000);
    }
    function _cancel(){
      if(timer){ clearTimeout(timer); timer=null; }
      btn.classList.remove('tp-pressing');
      pressed = false;
    }
    btn.addEventListener('mousedown', _start);
    btn.addEventListener('touchstart', _start, {passive:true});
    btn.addEventListener('mouseup', _cancel);
    btn.addEventListener('mouseleave', _cancel);
    btn.addEventListener('touchend', _cancel);
    btn.addEventListener('touchcancel', _cancel);
    btn.addEventListener('click', function(e){
      if(holdFired){ e.preventDefault(); e.stopPropagation(); holdFired=false; return; }
      p.ano = ano;
      _turmasPickRender();
    });
  });
  /* Botão "+" para gerar próximo ano (maior atual + 1) */
  pop.querySelectorAll('[data-add-ano]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var bar=document.getElementById('turmasYearBar');
      var anos=(bar && bar._turmasAnosCache) ? bar._turmasAnosCache.slice() : [];
      _tturmasAnosExtra.forEach(function(a){ if(anos.indexOf(a)===-1) anos.push(a); });
      var maxA = anos.length ? Math.max.apply(null, anos) : new Date().getFullYear();
      var novo = maxA + 1;
      if(_tturmasAnosExtra.indexOf(novo)===-1) _tturmasAnosExtra.push(novo);
      p.ano = novo;
      _turmasPickRender();
    });
  });
  /* Grid de meses */
  pop.querySelectorAll('[data-mes]').forEach(function(btn){
    btn.addEventListener('click', function(){
      p.mes = parseInt(btn.getAttribute('data-mes'),10);
      _turmasPickRender();
    });
  });
  /* Mini-seletor de mês na aba DIA */
  pop.querySelectorAll('[data-pickmes]').forEach(function(btn){
    btn.addEventListener('click', function(){
      p.mes = parseInt(btn.getAttribute('data-pickmes'),10);
      _turmasPickRender();
    });
  });
  /* Dias do calendário */
  pop.querySelectorAll('[data-dia]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var iso = btn.getAttribute('data-dia');
      if(p.tab==='dia') p.dia = iso;
      else if(p.tab==='periodo'){
        if(p.selPer==='ini'){
          p.ini = iso;
          /* Se fim < ini, reseta fim para o mesmo dia */
          if(p.fim < p.ini) p.fim = iso;
          p.selPer='fim';
        } else {
          /* selPer === 'fim' */
          if(iso < p.ini){ p.ini=iso; p.fim=iso; p.selPer='fim'; }
          else { p.fim=iso; p.selPer='ini'; }
        }
      }
      _turmasPickRender();
    });
  });
  /* Toggle entre início/fim na aba PERÍODO */
  pop.querySelectorAll('[data-selper]').forEach(function(el){
    el.addEventListener('click', function(){
      p.selPer = el.getAttribute('data-selper');
      _turmasPickRender();
    });
  });
  /* Ações */
  pop.querySelectorAll('[data-act]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var act=btn.getAttribute('data-act');
      if(act==='cancel'){
        _turmasAnoPopFechar();
        return;
      }
      /* apply */
      var novo={ tipo:p.tab };
      if(p.tab==='ano'){
        _tturmasAnoAtual = p.ano;
      } else if(p.tab==='mes'){
        novo.ano = p.ano; novo.mes = p.mes;
        _tturmasAnoAtual = p.ano;
      } else if(p.tab==='dia'){
        novo.dia = p.dia;
        _tturmasAnoAtual = parseInt(p.dia.slice(0,4),10);
      } else if(p.tab==='periodo'){
        novo.ini = p.ini; novo.fim = p.fim;
        _tturmasAnoAtual = parseInt(p.ini.slice(0,4),10);
      }
      _tturmasFiltro = novo;
      _salvarFiltro();
      _turmasAnoPopFechar();
      _renderTurmasYearBar(_tturmasCache);
      _renderTurmasSwim(_tturmasCache);
    });
  });
}

function _turmasAnoPopFechar(){
  var pop=document.getElementById('turmasAnoPopover');
  if(pop) pop.style.display='none';
  document.removeEventListener('click', _turmasAnoPopOnDocClick);
}

function _turmasAnoPopOnDocClick(e){
  var pop=document.getElementById('turmasAnoPopover');
  var trig=document.getElementById('turmasAnoTrigger');
  if(!pop || !trig) return;
  if(pop.contains(e.target) || trig.contains(e.target)) return;
  _turmasAnoPopFechar();
}


var _SWIM_MESES_FULL = APP_CONST.MESES_FULL;

/* ─── Prólogo comum dos layouts A–G ───
   Retorna {el, ano, mesMap} ou null se o container não existe. */
function _turmasPrepararDados(turmas){
  var el = document.getElementById('turmasSwimGrid');
  if(!el) return null;
  _renderTurmasYearBar(turmas);
  var ano = turmas.filter(function(t){return _swimExtrairAno(t)===_tturmasAnoAtual;});
  var mesMap = {};
  for(var m=1;m<=12;m++) mesMap[m]=[];
  ano.forEach(function(t){var m=_swimExtrairMes(t);if(m>=1&&m<=12)mesMap[m].push(t);else mesMap[1].push(t);});
  return { el:el, ano:ano, mesMap:mesMap };
}

/* ── A: Timeline horizontal ── */
function _renderTurmasA(turmas){
  var d=_turmasPrepararDados(turmas); if(!d) return;
  var el=d.el, mesMap=d.mesMap;
  var html='<div style="display:grid;grid-template-columns:repeat(12,minmax(70px,1fr));gap:5px;min-width:680px;">';
  _SWIM_MESES.forEach(function(m,i){
    var list=mesMap[i+1];
    html+='<div><div style="font-size:10px;font-weight:700;color:var(--muted);text-align:center;padding:4px 0;border-bottom:1px solid var(--border);margin-bottom:5px;text-transform:uppercase;letter-spacing:.05em;">'+m+'</div>';
    list.forEach(function(t,ti){var cor=_SWIM_CORES[ti%_SWIM_CORES.length];var bg=_SWIM_BGS[ti%_SWIM_BGS.length];html+='<div onclick="entrarTurma(\''+t.id+'\')" title="'+t.nome+'" style="border-radius:5px;padding:6px 8px;font-size:11px;font-weight:600;text-align:center;cursor:pointer;margin-bottom:4px;background:'+bg+';border:1px solid '+cor+'55;color:'+cor+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'+(_turmaGlobalAtiva===t.id?'outline:2px solid var(--accent);outline-offset:2px;box-shadow:0 0 8px rgba(200,240,90,.35);':'')+'">'+(t.codigo||t.id)+'</div>';});
    if(!list.length) html+='<div style="height:28px;"></div>';
    html+='</div>';
  });
  html+='</div>';
  el.innerHTML='<div class="swim-wrapper">'+html+'</div>';
}

/* ── B: Grade de meses ── */
function _renderTurmasB(turmas){
  var d=_turmasPrepararDados(turmas); if(!d) return;
  var el=d.el, mesMap=d.mesMap;
  var html='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">';
  for(var m=1;m<=12;m++){
    var list=mesMap[m];
    html+='<div style="background:var(--surface);border:1px solid var(--border2);border-radius:var(--radius);padding:12px;">';
    html+='<div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">'+_SWIM_MESES_FULL[m-1]+'</div>';
    if(!list.length){html+='<div style="font-size:11px;color:rgba(255,255,255,.15);text-align:center;padding:8px 0;">—</div>';}
    else list.forEach(function(t,ti){var cor=_SWIM_CORES[ti%_SWIM_CORES.length];html+='<div onclick="entrarTurma(\''+t.id+'\')" style="display:flex;align-items:center;gap:7px;padding:6px 8px;border-radius:5px;background:var(--surface2);margin-bottom:5px;cursor:pointer;'+(_turmaGlobalAtiva===t.id?'outline:2px solid var(--accent);outline-offset:2px;box-shadow:0 0 8px rgba(200,240,90,.35);':'')+'"><div style="width:7px;height:7px;border-radius:50%;background:'+cor+';flex-shrink:0;"></div><span style="font-size:11px;font-weight:600;color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+t.nome+'</span><span style="font-size:10px;color:var(--muted);">'+(t.codigo||'')+'</span></div>';});
    html+='</div>';
  }
  html+='</div>';el.innerHTML=html;
}

/* ── C: Lista detalhada por mês ── */
function _renderTurmasC(turmas){
  var d=_turmasPrepararDados(turmas); if(!d) return;
  var el=d.el, mesMap=d.mesMap;
  var html='';
  for(var m=1;m<=12;m++){
    var list=mesMap[m];if(!list.length)continue;
    html+='<div style="margin-bottom:18px;"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border);"><span style="font-size:14px;font-weight:700;color:var(--text);">'+_SWIM_MESES_FULL[m-1]+'</span><span style="font-size:11px;color:var(--muted);background:var(--surface2);padding:2px 8px;border-radius:20px;">'+list.length+' turma'+(list.length!==1?'s':'')+'</span></div>';
    html+='<div style="display:flex;flex-wrap:wrap;gap:8px;">';
    list.forEach(function(t,ti){var cor=_SWIM_CORES[ti%_SWIM_CORES.length];html+='<div onclick="entrarTurma(\''+t.id+'\')" style="background:var(--surface);border:1px solid var(--border2);border-top:2px solid '+cor+';border-radius:var(--radius-sm);padding:10px 14px;cursor:pointer;min-width:150px;'+(_turmaGlobalAtiva===t.id?'outline:2px solid var(--accent);outline-offset:2px;box-shadow:0 0 8px rgba(200,240,90,.35);':'')+'"><div style="font-size:10px;font-weight:700;color:'+cor+';margin-bottom:4px;">'+(t.codigo||t.id)+'</div><div style="font-size:12px;font-weight:600;color:var(--text);">'+t.nome+'</div>'+(t.periodText?'<div style="font-size:10px;color:var(--muted);margin-top:3px;">'+t.periodText+'</div>':'')+'</div>';});
    html+='</div></div>';
  }
  if(!html) html='<div style="color:var(--muted);font-size:13px;padding:20px 0;">Nenhuma turma em '+_tturmasAnoAtual+'.</div>';
  el.innerHTML=html;
}

/* ── D: Linha do tempo vertical ── */
function _renderTurmasD(turmas){
  var d=_turmasPrepararDados(turmas); if(!d) return;
  var el=d.el, ano=d.ano, mesMap=d.mesMap;
  var html='<div style="padding-left:70px;">';
  for(var m=1;m<=12;m++){
    var list=mesMap[m];if(!list.length)continue;
    html+='<div style="display:flex;margin-bottom:18px;position:relative;"><div style="position:absolute;left:-70px;top:8px;font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;width:52px;text-align:right;">'+_SWIM_MESES[m-1]+'</div>';
    html+='<div style="position:absolute;left:-18px;top:10px;width:8px;height:8px;border-radius:50%;background:var(--accent);border:2px solid var(--bg);"></div>';
    html+='<div style="display:flex;flex-wrap:wrap;gap:8px;">';
    list.forEach(function(t,ti){var cor=_SWIM_CORES[ti%_SWIM_CORES.length];html+='<div onclick="entrarTurma(\''+t.id+'\')" style="display:inline-flex;align-items:center;gap:7px;background:var(--surface);border:1px solid var(--border2);border-radius:20px;padding:6px 14px;font-size:12px;cursor:pointer;'+(_turmaGlobalAtiva===t.id?'outline:2px solid var(--accent);outline-offset:2px;box-shadow:0 0 8px rgba(200,240,90,.35);':'')+'"><div style="width:7px;height:7px;border-radius:50%;background:'+cor+';flex-shrink:0;"></div>'+(t.codigo||t.id)+' — '+t.nome+'</div>';});
    html+='</div></div>';
  }
  html+='</div>';
  if(!ano.length) html='<div style="color:var(--muted);font-size:13px;padding:20px 0;">Nenhuma turma em '+_tturmasAnoAtual+'.</div>';
  el.innerHTML=html;
}

/* ── E: Kanban por trimestre ── */
function _renderTurmasE(turmas){
  var d=_turmasPrepararDados(turmas); if(!d) return;
  var el=d.el, ano=d.ano;
  var trims=[{l:'Q1 — Jan/Mar',m:[1,2,3]},{l:'Q2 — Abr/Jun',m:[4,5,6]},{l:'Q3 — Jul/Set',m:[7,8,9]},{l:'Q4 — Out/Dez',m:[10,11,12]}];
  var corQ=['var(--blue)','var(--accent)','#a78bfa','var(--red)'];
  var html='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">';
  trims.forEach(function(q,qi){
    var lista=[];q.m.forEach(function(m){ano.forEach(function(t){if(_swimExtrairMes(t)===m)lista.push({t:t,m:m});});});
    html+='<div style="background:var(--surface);border:1px solid var(--border2);border-radius:var(--radius);overflow:hidden;"><div style="padding:10px 12px;font-size:11px;font-weight:700;color:'+corQ[qi]+';border-bottom:1px solid '+corQ[qi]+'33;">'+q.l+'<br><span style="font-size:10px;color:var(--muted);font-weight:400;">'+lista.length+' turma'+(lista.length!==1?'s':'')+'</span></div><div style="padding:10px;display:flex;flex-direction:column;gap:7px;">';
    if(!lista.length) html+='<div style="font-size:11px;color:var(--muted);text-align:center;padding:8px;">sem turmas</div>';
    else lista.forEach(function(x,ti){var cor=_SWIM_CORES[ti%_SWIM_CORES.length];html+='<div onclick="entrarTurma(\''+x.t.id+'\')" style="background:var(--surface2);border-radius:var(--radius-sm);padding:9px 11px;cursor:pointer;border-left:3px solid '+cor+';'+(_turmaGlobalAtiva===x.t.id?'outline:2px solid var(--accent);outline-offset:2px;box-shadow:0 0 8px rgba(200,240,90,.35);':'')+'"><div style="font-size:10px;color:var(--muted);margin-bottom:3px;">'+_SWIM_MESES_FULL[x.m-1]+'</div><div style="font-size:11px;font-weight:700;color:'+cor+';">'+(x.t.codigo||x.t.id)+'</div><div style="font-size:12px;color:var(--text);">'+x.t.nome+'</div></div>';});
    html+='</div></div>';
  });
  html+='</div>';el.innerHTML=html;
}

/* ── F: Mapa de calor ── */
function _renderTurmasF(turmas){
  var d=_turmasPrepararDados(turmas); if(!d) return;
  var el=d.el, ano=d.ano, mesMap=d.mesMap;
  var tiposSet={};ano.forEach(function(t){tiposSet[_swimExtrairTipo(t)]=true;});
  var tipos=Object.keys(tiposSet).sort();
  var html='<div class="swim-wrapper"><div style="display:grid;grid-template-columns:90px repeat(12,1fr);gap:3px;min-width:620px;">';
  html+='<div></div>';
  _SWIM_MESES.forEach(function(m){html+='<div style="font-size:10px;font-weight:700;color:var(--muted);text-align:center;padding:3px 0;text-transform:uppercase;letter-spacing:.04em;">'+m+'</div>';});
  tipos.forEach(function(tipo,ti){
    var cor=_SWIM_CORES[ti%_SWIM_CORES.length];var bg=_SWIM_BGS[ti%_SWIM_BGS.length];
    html+='<div style="font-size:11px;font-weight:700;color:'+cor+';display:flex;align-items:center;padding-right:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+tipo+'</div>';
    for(var m=1;m<=12;m++){
      var list=mesMap[m].filter(function(t){return _swimExtrairTipo(t)===tipo;});
      if(!list.length){html+='<div style="height:34px;border-radius:4px;background:var(--surface2);opacity:.3;"></div>';}
      else{html+='<div onclick="entrarTurma(\''+list[0].id+'\')" title="'+list[0].nome+'" style="height:34px;border-radius:4px;background:'+bg+';border:1px solid '+cor+'55;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:'+cor+';cursor:pointer;overflow:hidden;padding:0 3px;white-space:nowrap;'+(_turmaGlobalAtiva===list[0].id?'outline:2px solid var(--accent);outline-offset:2px;box-shadow:0 0 8px rgba(200,240,90,.35);':'')+'">'+list.length+'</div>';}
    }
  });
  html+='</div></div>';
  if(!tipos.length) html='<div style="color:var(--muted);font-size:13px;padding:20px 0;">Nenhuma turma em '+_tturmasAnoAtual+'.</div>';
  el.innerHTML=html;
}

/* ── G: Semestres ── */
function _renderTurmasG(turmas){
  var d=_turmasPrepararDados(turmas); if(!d) return;
  var el=d.el, ano=d.ano;
  var sems=[{l:'1º Semestre — Jan a Jun',m:[1,2,3,4,5,6]},{l:'2º Semestre — Jul a Dez',m:[7,8,9,10,11,12]}];
  var html='';
  sems.forEach(function(s){
    var lista=[];s.m.forEach(function(m){ano.forEach(function(t){if(_swimExtrairMes(t)===m)lista.push({t:t,m:m});});});
    html+='<div style="margin-bottom:12px;border:1px solid var(--border2);border-radius:var(--radius);overflow:hidden;"><div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--surface);"><span style="font-size:13px;font-weight:700;">'+s.l+'</span><span style="font-size:11px;color:var(--muted);background:var(--surface2);padding:2px 8px;border-radius:20px;">'+lista.length+' turma'+(lista.length!==1?'s':'')+'</span></div>';
    if(lista.length){
      html+='<div style="padding:12px;display:flex;flex-wrap:wrap;gap:8px;">';
      lista.forEach(function(x,ti){var cor=_SWIM_CORES[ti%_SWIM_CORES.length];html+='<div onclick="entrarTurma(\''+x.t.id+'\')" style="background:var(--surface2);border-radius:var(--radius-sm);padding:9px 12px;cursor:pointer;border-top:2px solid '+cor+';'+(_turmaGlobalAtiva===x.t.id?'outline:2px solid var(--accent);outline-offset:2px;box-shadow:0 0 8px rgba(200,240,90,.35);':'')+'"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px;">'+_SWIM_MESES_FULL[x.m-1]+'</div><div style="font-size:11px;font-weight:700;color:'+cor+';">'+(x.t.codigo||x.t.id)+'</div><div style="font-size:12px;color:var(--text);">'+x.t.nome+'</div></div>';});
      html+='</div>';
    } else {
      html+='<div style="padding:12px;font-size:11px;color:var(--muted);">Nenhuma turma neste semestre.</div>';
    }
    html+='</div>';
  });
  el.innerHTML=html;
}

/* Mapa tipo → cor estável (sem depender da posição na lista — o mesmo tipo
   tem a mesma cor mesmo se outros tipos somem/aparecerem). */
function _swimCorDoTipo(tipo){
  var TIPOS = ['MASTER','MAESTRIA','FCIS','FGPC','CIS-GL','CIS','BHP','TAV','ML','CI','IF','CEOP','TOUR','MCIS'];
  var i = TIPOS.indexOf(tipo);
  if(i < 0){
    /* tipo desconhecido — hash simples pra manter cor estável */
    i = 0;
    for(var k=0;k<tipo.length;k++) i = (i*31 + tipo.charCodeAt(k)) >>> 0;
  }
  return {
    cor: _SWIM_CORES[i % _SWIM_CORES.length],
    bg:  _SWIM_BGS[i % _SWIM_BGS.length]
  };
}

function _renderTurmasSwim(turmas){
  _tturmasCache=turmas;
  _renderTurmasYearBar(turmas);
  var el=document.getElementById('turmasSwimGrid');
  if(!el) return;
  var turmasAno=_turmasDoFiltro(turmas);
  if(!turmasAno.length){
    el.innerHTML='<div style="color:var(--muted);font-size:13px;padding:20px 0;">Nenhuma turma em '+_filtroLabel()+'.</div>';
    return;
  }
  /* Lista cronológica por MÊS — uma seção por mês com turmas listadas
     em ordem da data de INÍCIO (periodStart). O toggle (asc/desc) inverte
     a direção dentro de cada mês, mas os meses sempre seguem Jan→Dez. */
  var asc = _tturmasOrdem === 'asc';
  var mesMap = {};
  for(var m=1;m<=12;m++) mesMap[m] = [];
  turmasAno.forEach(function(t){
    var m = _swimExtrairMes(t);
    if(m>=1 && m<=12) mesMap[m].push(t);
    else mesMap[1].push(t);
  });

  function _fmtDiaMes(iso){
    var s=String(iso||''); var mt=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(!mt) return '';
    return mt[3]+'/'+mt[2];
  }
  function _periodoCurto(t){
    var s = _fmtDiaMes(t.periodStart||'');
    var e = _fmtDiaMes(t.periodEnd||'');
    if(s && e) return s+' → '+e;
    if(s) return s;
    if(t.periodText) return t.periodText;
    return '—';
  }

  var html = '<div class="tlc-list">';
  for(var mm=1; mm<=12; mm++){
    var lista = mesMap[mm];
    if(!lista.length) continue;
    /* Ordena turmas do mês pela data de INÍCIO (asc/desc). Empate → código alfa. */
    lista.sort(function(a,b){
      var da=_swimExtrairDataInicioMs(a), db=_swimExtrairDataInicioMs(b);
      if(da !== db) return asc ? (da - db) : (db - da);
      return String(a.codigo||a.id||'').localeCompare(String(b.codigo||b.id||''),'pt-BR');
    });
    html += '<div class="tlc-mes">'
      + '<div class="tlc-mes-h"><span class="tlc-mes-nome">'+(_SWIM_MESES_FULL[mm-1]||_SWIM_MESES[mm-1])+'</span>'
      + '<span class="tlc-mes-cnt">'+lista.length+' turma'+(lista.length>1?'s':'')+'</span></div>'
      + '<div class="tlc-mes-items">';
    lista.forEach(function(t){
      var tipo = _swimExtrairTipo(t);
      var paleta = _swimCorDoTipo(tipo);
      var cor = paleta.cor, corBg = paleta.bg;
      var cod = t.codigo||t.id||'?';
      var per = _periodoCurto(t);
      var ativo = _turmaGlobalAtiva === t.id;
      html += '<div class="tlc-item'+(ativo?' tlc-item--ativa':'')+'" onclick="entrarTurma(\''+t.id+'\')" '
        + 'title="'+(t.nome||'').replace(/"/g,'&quot;')+' · '+per+'" '
        + 'style="--tlc-cor:'+cor+';--tlc-bg:'+corBg+';">'
        + '<span class="tlc-data">'+per+'</span>'
        + '<span class="tlc-cod">'+cod+'</span>'
        + '<span class="tlc-nome">'+(t.nome||'')+'</span>'
        + '<span class="tlc-tipo">'+tipo+'</span>'
        + '</div>';
    });
    html += '</div></div>';
  }
  html += '</div>';
  el.innerHTML = html;
}

function renderTurmasGrid(){
  // Controlar visibilidade dos botões na telaTurmasScreen
  var _sRT=_getSessao?_getSessao():null;var _pRT=_sRT?_sRT.perfil:'adm';
  var _btnGI=document.getElementById('btnGerenciarTurmasInner');
  var _btnSI=document.getElementById('btnSalvarTurmasInner');
  if(_btnGI)_btnGI.style.display=(_pRT==='adm')?'':' none';
  if(_btnSI)_btnSI.style.display=(_pRT==='adm')?'':' none';
  _carregarTurmaGlobalAtiva(function(){
    var grid=document.getElementById('turmasGrid');
    grid.innerHTML=_skelCards(6);

    // Lê nó unificado turmas/ — tudo em um só read
    // Fallback: lê turma_dados/ (estrutura antiga) se turmas/ estiver vazio
    Promise.all([
      window._fbGet(TURMAS_NODE).catch(function(){return null;}),
      window._fbGet('turma_dados').catch(function(){return null;})
    ]).then(function(results){
      var fbTurmas=results[0];  // novo nó unificado
      var fbDadosAntigo=results[1]; // fallback

      var turmasFinais=[];

      if(fbTurmas&&typeof fbTurmas==='object'&&Object.keys(fbTurmas).length>0){
        // ── Novo nó turmas/ ──
        Object.keys(fbTurmas).forEach(function(rid){
          var t=fbTurmas[rid];
          if(!t) return;
          var clientes=t.clientes;
          if(clientes&&!Array.isArray(clientes)&&typeof clientes==='object'){
            clientes=Object.values(clientes).filter(Boolean);
          }
          // FIX: fallback para turma_dados/{id} quando clientes ausente no novo nó
          if((!clientes||clientes.length===0)&&fbDadosAntigo&&fbDadosAntigo[rid]){
            var _fd=fbDadosAntigo[rid].data||fbDadosAntigo[rid];
            if(!Array.isArray(_fd)&&typeof _fd==='object') _fd=Object.values(_fd).filter(function(v){return v&&v.cliente;});
            if(Array.isArray(_fd)&&_fd.length>0) clientes=_fd;
          }
          turmasFinais.push({
            id:rid,
            nome:t.nome||t.titulo||rid,
            codigo:t.codigo||(rid.replace(/^turma_/,'').split('_')[0].toUpperCase()),
            meta:t.meta||0,
            ministrante:t.ministrante||null,
            ordem:t.ordem!=null?t.ordem:999,
            periodStart:t.periodStart||'',
            periodEnd:t.periodEnd||'',
            periodText:t.periodText||'',
            criadoEm:t.criadoEm||'',
            consultores:Array.isArray(t.consultores)?t.consultores:(t.consultores?Object.values(t.consultores):[]),
            treinadores:Array.isArray(t.treinadores)?t.treinadores:(t.treinadores?Object.values(t.treinadores):[]),
            _clientesCount:(clientes&&clientes.length)||0,
            _clientesPago:(clientes||[]).reduce(function(a,c){
              if(!c) return a;
              /* Regra granular: soma APENAS sub-treinamentos pagos.
                 Cliente em negociação com 1 sub pago entra com o valor desse sub. */
              if(Array.isArray(c.treinamentos)&&c.treinamentos.length){
                return a + c.treinamentos.reduce(function(s,sub){
                  if(!sub) return s;
                  var st=sub.status||c.status||'aberto';
                  return st==='pago' ? s+(Number(sub.valor)||0) : s;
                },0);
              }
              return a + (c.status==='pago' ? (Number(c.valor)||0) : 0);
            },0),
            _clientesTotal:(clientes||[]).reduce(function(a,cc){return a+(cc&&cc.valor||0);},0)
          });
        });
      } else if(fbDadosAntigo&&typeof fbDadosAntigo==='object'){
        // ── Fallback: estrutura antiga turma_dados/ ──
        Object.keys(fbDadosAntigo).forEach(function(rid,i){
          var d=fbDadosAntigo[rid];
          if(!d) return;
          var clientes=d.data;
          if(clientes&&!Array.isArray(clientes)&&typeof clientes==='object'){
            clientes=Object.values(clientes).filter(Boolean);
          }
          var tObj={
            id:rid,
            nome:d.titulo||rid,
            codigo:(rid.replace(/^turma_/,'').split('_')[0].toUpperCase()),
            meta:d.meta||0,
            ministrante:d.ministrante||null,
            ordem:i,
            periodStart:d.periodStart||'',
            periodEnd:d.periodEnd||'',
            periodText:d.periodText||'',
            criadoEm:d.criadoEm||'',
            titulo:d.titulo||'',
            info:d.info||'',
            clientes:clientes||[]
          };
          turmasFinais.push({
            id:rid, nome:tObj.nome, codigo:tObj.codigo, meta:tObj.meta,
            ministrante:tObj.ministrante, ordem:tObj.ordem,
            periodStart:tObj.periodStart, periodEnd:tObj.periodEnd,
            periodText:tObj.periodText, criadoEm:tObj.criadoEm,
            _clientesCount:(clientes&&clientes.length)||0,
            _clientesPago:(clientes||[]).reduce(function(a,c){
              if(!c) return a;
              if(Array.isArray(c.treinamentos)&&c.treinamentos.length){
                return a + c.treinamentos.reduce(function(s,sub){
                  if(!sub) return s;
                  var st=sub.status||c.status||'aberto';
                  return st==='pago' ? s+(Number(sub.valor)||0) : s;
                },0);
              }
              return a + (c.status==='pago' ? (Number(c.valor)||0) : 0);
            },0),
            _clientesTotal:(clientes||[]).reduce(function(a,cc){return a+(cc&&cc.valor||0);},0)
          });
        });
      }

      // Ordenar: 1º campo ordem, 2º timestamp no ID, 3º criadoEm, 4º periodStart
      turmasFinais.sort(function(a,b){
        if(a.ordem!==b.ordem) return a.ordem-b.ordem;
        function _ts(t){
          var m=(t.id||'').match(/_(\d{10,13})$/);
          if(m) return parseInt(m[1]);
          if(t.criadoEm){var p=t.criadoEm.split('/');if(p.length===3)return new Date(p[2],p[1]-1,p[0]).getTime();}
          if(t.periodStart) return new Date(t.periodStart).getTime();
          return 0;
        }
        return _ts(b)-_ts(a);
      });

      /* Para consultor: mostrar apenas a turma globalmente ativa.
         (ADM e ministrante continuam vendo todas.) */
      var _sCons=_getSessao?_getSessao():null;
      if(_sCons && _sCons.perfil==='consultor'){
        if(_turmaGlobalAtiva){
          turmasFinais=turmasFinais.filter(function(t){return t.id===_turmaGlobalAtiva;});
        } else {
          turmasFinais=[];
        }
      }

      if(turmasFinais.length>0){
        _tturmasCache=turmasFinais;
        _renderTurmasCards(turmasFinais);
        if(_tturmasView==='A') _renderTurmasA(turmasFinais);
        else if(_tturmasView==='B') _renderTurmasB(turmasFinais);
        else if(_tturmasView==='C') _renderTurmasC(turmasFinais);
        else if(_tturmasView==='D') _renderTurmasD(turmasFinais);
        else if(_tturmasView==='E') _renderTurmasE(turmasFinais);
        else if(_tturmasView==='F') _renderTurmasF(turmasFinais);
        else if(_tturmasView==='G') _renderTurmasG(turmasFinais);
        else if(_tturmasView==='H'||_tturmasView==='swim') _renderTurmasSwim(turmasFinais);
      } else {
        grid.innerHTML='<div style="color:var(--muted);font-size:13px;padding:20px;">Nenhuma turma encontrada no Firebase.</div>';
      }
    }).catch(function(e){
      grid.innerHTML='<div style="color:var(--red);font-size:13px;padding:20px;">Erro: '+(e&&e.message?e.message:e)+'</div>';
    });
  });
}

function _renderTurmasCards(turmas){
  const grid=document.getElementById('turmasGrid');
  grid.innerHTML=turmas.map(t=>{
    // FIX: usar dados calculados do Firebase em vez de localStorage
    const periodStart=t.periodStart||'';
    const periodEnd=t.periodEnd||'';
    const periodText=t.periodText||'';
    const pago=t._clientesPago||0;
    const total=t._clientesTotal||0;
    const pct=t.meta>0?Math.round((pago/t.meta)*100):0;
    const col=getCol(pct);
    const barW=Math.min(Math.round((pago/((t.meta||1)*1.5))*100),100);
    const ini=t.nome.split(' ').map(w=>w[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
    const consultores=(t.consultores||[]).length;
    const treinadores=(t.treinadores||[]).length;
    return `<div class="turma-card${_turmaGlobalAtiva===t.id?' turma-card--ativa':''}">
      <div class="turma-card-header">
        <div style="display:flex;align-items:center;gap:12px;width:100%;">
          <div style="width:48px;height:48px;border-radius:12px;background:${col.bar}18;border:2px solid ${col.bar}55;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:${col.text};flex-shrink:0;">${ini}</div>
          <div style="flex:1;min-width:0;">
            <div class="turma-card-nome" style="margin:0 0 4px;">${t.nome}</div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span class="turma-card-codigo">${t.codigo||'—'}</span>
              ${(periodStart&&periodEnd)?`<span style="font-size:11px;color:var(--muted);">${periodText||formatDate(periodStart)+' → '+formatDate(periodEnd)}</span>`:`<span style="font-size:11px;color:var(--muted);">${t.criadoEm||''}</span>`}
            </div>
          </div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;">
        <span style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;">Progresso · Meta ${formatVal(t.meta||0)}</span>
        <span style="font-size:12px;font-weight:700;color:${col.text};">${pct}%</span>
      </div>
      <div class="turma-card-bar"><div class="turma-card-fill" style="width:${barW}%;background:${col.bar};box-shadow:0 0 8px ${col.bar}88;"></div></div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:var(--muted);margin-bottom:14px;">
        <span>R$ 0</span>
        ${pago>t.meta&&t.meta>0
          ?`<span style="font-size:11px;font-weight:700;color:#c8f05a;background:rgba(200,240,90,.1);border:1px solid rgba(200,240,90,.25);border-radius:20px;padding:2px 10px;">+${formatVal(pago-t.meta)} acima</span>`
          :`<span>${formatVal(t.meta||0)}</span>`}
      </div>
      <div class="turma-card-stats">
        <div class="turma-stat"><div class="turma-stat-label">Faturado</div><div class="turma-stat-val" style="color:${col.text};">${formatVal(pago)}</div></div>
        <div class="turma-stat"><div class="turma-stat-label">Potencial</div><div class="turma-stat-val" style="color:var(--blue);">${formatVal(total)}</div></div>
        <div class="turma-stat"><div class="turma-stat-label">Clientes</div><div class="turma-stat-val">${t._clientesCount||0}</div></div>
        <div class="turma-stat"><div class="turma-stat-label">% Meta</div><div class="turma-stat-val" style="color:${col.text};">${pct}%</div></div>
      </div>
      <div style="height:1px;background:var(--border);margin-bottom:12px;"></div>
      <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
        <span style="font-size:11px;color:var(--muted);display:flex;align-items:center;gap:5px;"><span style="width:6px;height:6px;border-radius:50%;background:var(--green);display:inline-block;"></span>${consultores} consultor${consultores!==1?'es':''}</span>
        <span style="font-size:11px;color:var(--muted);display:flex;align-items:center;gap:5px;"><span style="width:6px;height:6px;border-radius:50%;background:var(--blue);display:inline-block;"></span>${treinadores} treinador${treinadores!==1?'es':''}</span>
        ${t.ministrante?`<span style="font-size:11px;color:var(--accent);display:flex;align-items:center;gap:5px;"><span style="width:6px;height:6px;border-radius:50%;background:var(--accent);display:inline-block;"></span>🎙 ${t.ministrante}</span>`:''}
      </div>
      <div class="turma-card-footer" style="flex-direction:column;gap:8px;">
        <div style="display:flex;gap:8px;">
          <button class="turma-enter-btn" onclick="entrarTurma('${t.id}')">Entrar →</button>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--surface2);border-radius:8px;border:1px solid var(--border2);">
          <span style="font-size:12px;font-weight:700;color:${_turmaGlobalAtiva===t.id?'var(--accent)':'var(--muted)'};text-transform:uppercase;letter-spacing:.06em;">${_turmaGlobalAtiva===t.id?'Ativa':'Inativa'}</span>
          <div onclick="definirTurmaAtiva('${t.id}')" style="cursor:pointer;width:44px;height:24px;border-radius:999px;background:${_turmaGlobalAtiva===t.id?'var(--accent)':'rgba(255,255,255,.1)'};position:relative;transition:background .3s;flex-shrink:0;">
            <div style="position:absolute;top:3px;left:${_turmaGlobalAtiva===t.id?'23':'3'}px;width:18px;height:18px;border-radius:50%;background:${_turmaGlobalAtiva===t.id?'#0f0f0f':'var(--muted)'};transition:left .3s;"></div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}
