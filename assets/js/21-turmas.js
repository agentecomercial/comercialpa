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

  bar.innerHTML=
    '<span style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-right:4px;">Ano</span>'+
    '<div id="turmasAnoPopWrap" style="position:relative;display:inline-block;">'+
      '<button id="turmasAnoTrigger" type="button" '+
        'style="padding:5px 14px;border-radius:20px;border:none;background:linear-gradient(180deg,#d4f565,#c8f05a);color:#0f0f0f;font-family:\'DM Sans\',sans-serif;font-size:12px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">'+
        _tturmasAnoAtual+' <span style="font-size:10px;opacity:.7;">📅</span>'+
      '</button>'+
      '<div id="turmasAnoPopover" style="display:none;position:absolute;top:calc(100% + 8px);left:0;z-index:1600;'+
        'background:var(--surface);border:1px solid var(--border2);border-radius:10px;padding:14px;'+
        'box-shadow:0 8px 28px rgba(0,0,0,.5);min-width:280px;">'+
      '</div>'+
    '</div>';

  document.getElementById('turmasAnoTrigger').addEventListener('click', function(e){
    e.stopPropagation();
    _turmasAnoPopAbrir();
  });
}

function _turmasAnoPopAbrir(){
  var pop=document.getElementById('turmasAnoPopover');
  var bar=document.getElementById('turmasYearBar');
  if(!pop || !bar) return;
  if(pop.style.display==='block'){ _turmasAnoPopFechar(); return; }

  // Recoleta contagem do cache salvo no bar
  var anos=bar._turmasAnosCache||[];
  var anosCount=bar._turmasAnosCount||{};
  var totalTurmas=0;
  anos.forEach(function(a){ totalTurmas+=(anosCount[a]||0); });

  var html='<div style="font-size:10px;color:var(--muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;">📅 Escolha o ano</div>';
  html+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px;">';
  anos.forEach(function(a){
    var qtd=anosCount[a]||0;
    var ativa=(a===_tturmasAnoAtual);
    html+='<button class="turmas-pop-ano" data-ano="'+a+'" '+
      'style="position:relative;background:'+(ativa?'linear-gradient(180deg,#d4f565,#c8f05a)':'var(--surface2)')+';color:'+(ativa?'#0f0f0f':'var(--text)')+';padding:10px 0;text-align:center;font-weight:800;font-size:12px;border-radius:6px;cursor:pointer;border:1px solid '+(ativa?'transparent':'var(--border)')+';font-family:inherit;transition:all .15s;">'+
      a+
      (qtd>0?'<span style="position:absolute;top:2px;right:4px;font-size:8px;background:'+(ativa?'#0a0e1a':'var(--blue)')+';color:'+(ativa?'#c8f05a':'#0a0e1a')+';padding:0 5px;border-radius:6px;font-weight:800;">'+qtd+'</span>':'')+
    '</button>';
  });
  html+='</div>';
  html+='<div style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid var(--border);font-size:10px;color:var(--muted);">'+
    '<span>Total · '+totalTurmas+' turma'+(totalTurmas!==1?'s':'')+' em '+anos.length+' ano'+(anos.length!==1?'s':'')+'</span>'+
    '<button id="turmasPopAddAno" type="button" style="background:transparent;border:none;color:var(--accent);font-weight:700;font-size:11px;cursor:pointer;font-family:inherit;">+ Adicionar ano</button>'+
  '</div>';
  pop.innerHTML=html;
  pop.style.display='block';

  // Click em cada ano
  pop.querySelectorAll('.turmas-pop-ano').forEach(function(btn){
    btn.addEventListener('click', function(){
      var ano=parseInt(btn.getAttribute('data-ano'),10);
      _tturmasAnoAtual=ano;
      _turmasAnoPopFechar();
      _renderTurmasSwim(_tturmasCache);
    });
    btn.addEventListener('mouseenter', function(){
      if(!btn.style.background.includes('linear-gradient')){
        btn.style.borderColor='var(--accent)';
        btn.style.color='var(--accent)';
      }
    });
    btn.addEventListener('mouseleave', function(){
      if(!btn.style.background.includes('linear-gradient')){
        btn.style.borderColor='var(--border)';
        btn.style.color='var(--text)';
      }
    });
  });
  // Adicionar ano
  document.getElementById('turmasPopAddAno').addEventListener('click', function(){
    var maxY=anos.length?Math.max.apply(null,anos):new Date().getFullYear();
    var novo=maxY+1;
    _tturmasAnosExtra.push(novo);
    _tturmasAnoAtual=novo;
    _renderTurmasYearBar(_tturmasCache);
    _renderTurmasSwim(_tturmasCache);
    setTimeout(_turmasAnoPopAbrir, 50);
  });

  // Fechar com click fora
  setTimeout(function(){
    document.addEventListener('click', _turmasAnoPopOnDocClick);
  }, 0);
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

function _renderTurmasSwim(turmas){
  _tturmasCache=turmas;
  _renderTurmasYearBar(turmas);
  var el=document.getElementById('turmasSwimGrid');
  if(!el) return;
  var turmasAno=turmas.filter(function(t){return _swimExtrairAno(t)===_tturmasAnoAtual;});
  if(!turmasAno.length){
    el.innerHTML='<div style="color:var(--muted);font-size:13px;padding:20px 0;">Nenhuma turma em '+_tturmasAnoAtual+'.</div>';
    return;
  }
  // Montar mapa mes → turmas
  var mesMap={};
  for(var m=1;m<=12;m++) mesMap[m]=[];
  turmasAno.forEach(function(t){var m=_swimExtrairMes(t);if(m>=1&&m<=12) mesMap[m].push(t);else mesMap[1].push(t);});
  // Tipos únicos neste ano + mês mais recente de cada tipo (pra ordenação)
  var tiposMesRecente={};
  turmasAno.forEach(function(t){
    var tipo=_swimExtrairTipo(t);
    var mes=_swimExtrairMes(t)||1;
    if(tiposMesRecente[tipo]==null || mes > tiposMesRecente[tipo]){
      tiposMesRecente[tipo]=mes;
    }
  });
  // Ordena por mês mais recente DESC (turma mais nova no topo); empate = alfabético
  var tipos=Object.keys(tiposMesRecente).sort(function(a,b){
    var ma=tiposMesRecente[a], mb=tiposMesRecente[b];
    if(mb !== ma) return mb - ma;
    return a.localeCompare(b,'pt-BR');
  });
  var cols='110px repeat(12,1fr)';
  var html='<div class="swim-wrapper"><div style="display:grid;grid-template-columns:'+cols+';gap:3px;min-width:680px;">';
  // Cabeçalho
  html+='<div></div>';
  _SWIM_MESES.forEach(function(m){html+='<div style="font-size:10px;font-weight:700;color:var(--muted);text-align:center;padding:4px 0;text-transform:uppercase;letter-spacing:.04em;">'+m+'</div>';});
  // Linhas
  tipos.forEach(function(tipo,ti){
    var cor=_SWIM_CORES[ti%_SWIM_CORES.length];
    var corBg=_SWIM_BGS[ti%_SWIM_BGS.length];
    html+='<div style="font-size:11px;font-weight:700;color:'+cor+';display:flex;align-items:center;padding:3px 6px 3px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+tipo+'</div>';
    for(var m=1;m<=12;m++){
      var lista=mesMap[m].filter(function(t){return _swimExtrairTipo(t)===tipo;});
      if(!lista.length){
        html+='<div class="swim-cell-empty"></div>';
      } else {
        lista.forEach(function(t){
          var cod=t.codigo||t.id||'?';
          var tip=t.nome+(t.periodText?' · '+t.periodText:'');
          html+='<div class="swim-cell-filled" onclick="entrarTurma(\''+t.id+'\')" title="'+tip+'" style="background:'+corBg+';border:1px solid '+cor+'55;color:'+cor+';font-size:10px;'+(_turmaGlobalAtiva===t.id?'outline:2px solid var(--accent);outline-offset:2px;box-shadow:0 0 8px rgba(200,240,90,.35);':'')+'">'+cod+'</div>';
        });
      }
    }
  });
  html+='</div></div>';
  el.innerHTML=html;
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
