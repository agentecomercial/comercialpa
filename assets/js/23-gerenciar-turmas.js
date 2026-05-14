/* ═══════════════════════════════════════════
   SALVAR COMO
═══════════════════════════════════════════ */
function abrirSalvarComo(){
  document.getElementById('salvarComoOverlay').classList.add('open');
}
function fecharSalvarComo(){
  document.getElementById('salvarComoOverlay').classList.remove('open');
}
function salvarArquivoLocal(){
  var titulo=document.getElementById('dashTitle')?document.getElementById('dashTitle').textContent:'turma';
  var info=document.getElementById('infoBarText')?document.getElementById('infoBarText').textContent:'';
  var state={
    data:data,titulo:titulo,info:info,
    periodStart:_periodStart,periodEnd:_periodEnd,periodText:_periodText,
    turmaId:_turmaAtiva?_turmaAtiva.id:'',turma:_turmaAtiva||null,
    exportadoEm:new Date().toLocaleString('pt-BR')
  };
  var sugestao='backup-'+((_turmaAtiva&&_turmaAtiva.codigo)||'turma').toLowerCase()+'-'+new Date().toISOString().slice(0,10);
  var nomeArquivo=window.prompt('Nome do arquivo (sem .json):',sugestao);
  if(nomeArquivo===null) return; // cancelou
  nomeArquivo=(nomeArquivo.trim()||sugestao).replace(/[^a-zA-Z0-9_\-\.]/g,'_');
  var blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=nomeArquivo+'.json';
  a.click();
  URL.revokeObjectURL(a.href);
  _showToast('✅ Arquivo "'+nomeArquivo+'.json" salvo!','var(--accent)');
}

var _gerenciarTurmasList=[]; // cache das turmas no modal

function abrirGerenciarTurmas(){
  var lista=document.getElementById('gerenciarTurmasLista');
  lista.innerHTML='<div style="color:var(--muted);font-size:13px;text-align:center;padding:16px;">Carregando do Firebase...</div>';
  document.getElementById('gerenciarTurmasOverlay').classList.add('open');
  if(!window._fbGet){
    lista.innerHTML='<div style="color:var(--red);font-size:13px;text-align:center;padding:16px;">Firebase não disponível.</div>';
    return;
  }
  // Lê nó unificado turmas/
  window._fbGet(TURMAS_NODE).then(function(fb){
    var turmas=[];
    if(fb&&typeof fb==='object'){
      Object.keys(fb).forEach(function(rid){
        var t=fb[rid];
        if(t) turmas.push(Object.assign({},t,{id:rid}));
      });
    }
    // Fallback: turma_dados/
    if(!turmas.length) return window._fbGet('turma_dados').then(function(fd){
      if(fd&&typeof fd==='object') Object.keys(fd).forEach(function(rid){
        var d=fd[rid];if(d) turmas.push({id:rid,nome:d.titulo||rid,meta:d.meta||0,periodText:d.periodText||'',ordem:0});
      });
      return turmas;
    });
    return turmas;
  }).then(function(turmas){
    turmas.sort(function(a,b){return (a.ordem||0)-(b.ordem||0);});
    _gerenciarTurmasList=turmas;
    _renderGerenciarLista();
  }).catch(function(e){
    document.getElementById('gerenciarTurmasLista').innerHTML='<div style="color:var(--red);font-size:13px;text-align:center;padding:16px;">Erro: '+(e&&e.message?e.message:e)+'</div>';
  });
}

var _gtAnoAtual=new Date().getFullYear();
var _gtAnosDisponiveis=[];

function _gtExtrairAno(t){
  if(t.periodStart){var y=parseInt((t.periodStart||'').slice(0,4));if(y>=2020) return y;}
  if(t.periodText){var m=t.periodText.match(/\b(20\d{2})\b/);if(m) return parseInt(m[1]);}
  return new Date().getFullYear();
}
function _gtExtrairMes(t){
  if(t.periodStart){var m=parseInt((t.periodStart||'').slice(5,7));if(m>=1&&m<=12) return m;}
  return 0;
}
function _gtExtrairTipo(t){
  var cod=(t.codigo||t.id||'').toUpperCase();
  var tipos=['MASTER','MAESTRIA','FCIS','FGPC','CIS','BHP','TAV','ML','CI','IF','CEOP','TOUR'];
  for(var i=0;i<tipos.length;i++){if(cod.indexOf(tipos[i])===0||cod.indexOf(tipos[i])!==-1) return tipos[i];}
  return cod.slice(0,3)||'?';
}

function _gtRenderYearBar(){
  var bar=document.getElementById('gtYearBar');
  if(!bar) return;
  // Coletar anos das turmas
  var anosSet={};
  (_gerenciarTurmasList||[]).forEach(function(t){anosSet[_gtExtrairAno(t)]=true;});
  var anos=Object.keys(anosSet).map(Number).sort();
  if(!anos.length) anos=[new Date().getFullYear()];
  // Garantir que _gtAnosDisponiveis tem esses anos
  anos.forEach(function(a){if(_gtAnosDisponiveis.indexOf(a)===-1) _gtAnosDisponiveis.push(a);});
  _gtAnosDisponiveis.sort();
  if(_gtAnosDisponiveis.indexOf(_gtAnoAtual)===-1) _gtAnoAtual=_gtAnosDisponiveis[0];
  bar.innerHTML='<span style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-right:4px;">Ano</span>';
  _gtAnosDisponiveis.forEach(function(a){
    var btn=document.createElement('button');
    btn.textContent=a;
    btn.style.cssText='padding:4px 12px;border-radius:20px;border:1px solid var(--border2);background:none;color:var(--muted);font-family:"DM Sans",sans-serif;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;';
    if(a===_gtAnoAtual){btn.style.background='linear-gradient(180deg,#d4f565,#c8f05a)';btn.style.color='#0f0f0f';btn.style.borderColor='transparent';}
    btn.addEventListener('click',function(){_gtAnoAtual=a;_renderGerenciarLista();});
    bar.appendChild(btn);
  });
  // Botão + Ano
  var addBtn=document.createElement('button');
  addBtn.textContent='+ Ano';
  addBtn.style.cssText='padding:4px 12px;border-radius:20px;border:1px dashed rgba(200,240,90,.4);background:none;color:var(--accent);font-family:"DM Sans",sans-serif;font-size:11px;font-weight:700;cursor:pointer;';
  addBtn.addEventListener('click',function(){
    var max=Math.max.apply(null,_gtAnosDisponiveis);
    var novo=max+1;
    _gtAnosDisponiveis.push(novo);
    _gtAnoAtual=novo;
    _renderGerenciarLista();
  });
  bar.appendChild(addBtn);
}

var _gtLayout='lista';

function _gtToggleDropdown(){
  var dd=document.getElementById('gtLayoutDropdown');
  var btn=document.getElementById('gtLayoutPickerBtn');
  if(dd.classList.contains('open')){dd.classList.remove('open');return;}
  // Mover para body para não ser cortado pelo overflow do modal pai
  if(dd.parentNode!==document.body) document.body.appendChild(dd);
  var r=btn.getBoundingClientRect();
  dd.style.top=(r.bottom+4)+'px';
  dd.style.left=r.left+'px';
  dd.style.right='auto';
  dd.classList.add('open');
  // Ajuste se sair da tela pela direita
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
function _gtSetLayout(v){
  _gtLayout=v;
  var info={lista:['≡','Lista'],A:['A','Timeline'],B:['B','Grade meses'],C:['C','Lista detalhada'],D:['D','Linha do tempo'],E:['E','Kanban'],F:['F','Mapa de calor'],G:['G','Semestres'],H:['H','Swimlane']};
  var lbl=info[v]||info['lista'];
  document.getElementById('gtLayoutLetter').textContent=lbl[0];
  document.getElementById('gtLayoutLabel').textContent=lbl[1];
  document.querySelectorAll('#gtLayoutDropdown .layout-opt').forEach(function(b){
    b.classList.toggle('on',b.getAttribute('onclick').indexOf("'"+v+"'")!==-1);
  });
  document.getElementById('gtLayoutDropdown').classList.remove('open');
  // Ano só aparece nos layouts visuais
  var gtYB=document.getElementById('gtYearBar');
  if(gtYB) gtYB.style.display=(v==='lista')?'none':'flex';
  _renderGerenciarLista();
}

function _gtFmtDate(d){
  if(!d) return '';
  var p=d.split('-');if(p.length===3) return p[2]+'/'+p[1]+'/'+p[0];
  return d;
}

function _renderGerenciarLista(){
  var el=document.getElementById('gerenciarTurmasLista');
  if(!el) return;
  _gtRenderYearBar();
  // YearBar sempre visível — filtra em todos os layouts incluindo lista
  var gtYB=document.getElementById('gtYearBar');
  if(gtYB) gtYB.style.display='flex';
  if(!_gerenciarTurmasList||!_gerenciarTurmasList.length){
    el.innerHTML='<div style="color:var(--muted);font-size:13px;text-align:center;padding:24px;">Nenhuma turma no Firebase.</div>';
    return;
  }
  if(_gtLayout==='lista') _gtRenderLista(el);
  else if(_gtLayout==='A') _gtRenderA(el);
  else if(_gtLayout==='B') _gtRenderB(el);
  else if(_gtLayout==='C') _gtRenderC(el);
  else if(_gtLayout==='D') _gtRenderD(el);
  else if(_gtLayout==='E') _gtRenderE(el);
  else if(_gtLayout==='F') _gtRenderF(el);
  else if(_gtLayout==='G') _gtRenderG(el);
  else if(_gtLayout==='H') _gtRenderH(el);
}

// ── Layout Lista (padrão) — com ações de edição ──
function _gtRenderLista(el){
  el.innerHTML='';
  // Filtrar por ano selecionado
  var _listaFiltrada=_gerenciarTurmasList.filter(function(t){return _gtExtrairAno(t)===_gtAnoAtual;});
  if(!_listaFiltrada.length){
    el.innerHTML='<div style="color:var(--muted);font-size:13px;text-align:center;padding:24px;">Nenhuma turma em '+_gtAnoAtual+'.</div>';
    return;
  }
  _listaFiltrada.forEach(function(t,i){
    var ps=_gtFmtDate(t.periodStart),pe=_gtFmtDate(t.periodEnd);
    var periodo=ps&&pe?ps+' → '+pe:(t.periodText||'');
    var div=document.createElement('div');
    div.style.cssText='display:flex;flex-direction:column;gap:10px;padding:14px 16px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);margin-bottom:8px;';
    var topRow=document.createElement('div');topRow.style.cssText='display:flex;align-items:center;gap:8px;';
    var btns=document.createElement('div');btns.style.cssText='display:flex;flex-direction:column;gap:2px;flex-shrink:0;';
    var bUp=document.createElement('button');bUp.textContent='↑';bUp.style.cssText='background:var(--surface);border:1px solid var(--border2);border-radius:4px;width:32px;height:32px;min-width:32px;min-height:32px;cursor:pointer;color:var(--muted);font-size:13px;display:flex;align-items:center;justify-content:center;';bUp.disabled=(i===0);if(i===0)bUp.style.opacity='0.3';
    bUp.addEventListener('click',function(){_moverTurma(i,-1);});
    var bDown=document.createElement('button');bDown.textContent='↓';bDown.style.cssText='background:var(--surface);border:1px solid var(--border2);border-radius:4px;width:32px;height:32px;min-width:32px;min-height:32px;cursor:pointer;color:var(--muted);font-size:13px;display:flex;align-items:center;justify-content:center;';bDown.disabled=(i===_gerenciarTurmasList.length-1);if(i===_gerenciarTurmasList.length-1)bDown.style.opacity='0.3';
    bDown.addEventListener('click',function(){_moverTurma(i,1);});
    btns.appendChild(bUp);btns.appendChild(bDown);
    var info=document.createElement('div');info.style.cssText='flex:1;min-width:0;';
    info.innerHTML='<div id="gt_nome_'+i+'" style="font-size:13px;font-weight:700;color:var(--text);">'+t.nome+'</div>'
      +'<div style="font-size:10px;color:var(--muted);font-family:monospace;margin-top:1px;">'+t.id+'</div>';
    topRow.appendChild(btns);topRow.appendChild(info);div.appendChild(topRow);
    var actRow=document.createElement('div');actRow.style.cssText='display:flex;align-items:center;gap:6px;';
    var metaInp=document.createElement('input');metaInp.type='text';metaInp.value=formatVal(t.meta||0);metaInp.placeholder='Meta (R$)';
    metaInp.style.cssText='flex:1;min-width:0;background:var(--surface);border:1px solid var(--border2);border-radius:6px;padding:7px 10px;color:var(--text);font-family:"DM Mono",monospace;font-size:12px;text-align:right;height:34px;box-sizing:border-box;';
    metaInp.addEventListener('focus',function(){this.value=(t.meta||0).toString().replace('.',',');});
    metaInp.addEventListener('blur',function(){this.value=formatVal(parseVal(this.value)||t.meta||0);});
    var metaBtn=document.createElement('button');metaBtn.innerHTML='💾 Meta';metaBtn.style.cssText='height:34px;padding:0 12px;background:var(--accent-dim);color:var(--accent);border:1px solid rgba(200,240,90,.35);border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:"DM Sans",sans-serif;';
    (function(turma,inp){metaBtn.addEventListener('click',function(){var v=parseVal(inp.value);turma.meta=v;window._fbSave&&window._fbSave(TURMAS_NODE+'/'+turma.id+'/meta',v).then(function(){_showToast('✅ Meta atualizada!','var(--accent)');inp.value=formatVal(v);}).catch(function(){_showToast('❌ Erro','var(--red)');});});})(t,metaInp);
    var editBtn=document.createElement('button');editBtn.innerHTML='✏ Nome';editBtn.style.cssText='height:34px;padding:0 12px;background:var(--blue-bg);color:var(--blue);border:1px solid rgba(96,165,250,.35);border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:"DM Sans",sans-serif;';
    (function(turma,idx){editBtn.addEventListener('click',function(){_gtEditarNome(idx);});})(t,i);
    var delBtn=document.createElement('button');delBtn.innerHTML='🗑 Excluir';delBtn.style.cssText='height:34px;padding:0 12px;background:var(--red-bg);color:var(--red);border:1px solid rgba(255,95,87,.3);border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:"DM Sans",sans-serif;';
    delBtn.addEventListener('click',function(){excluirTurma(t.id,t.nome);});
    actRow.appendChild(metaInp);actRow.appendChild(metaBtn);actRow.appendChild(editBtn);actRow.appendChild(delBtn);
    div.appendChild(actRow);
    // ── Linha de datas ──
    var dateRow=document.createElement('div');
    dateRow.style.cssText='display:flex;align-items:center;gap:6px;flex-wrap:wrap;';
    var lbStart=document.createElement('span');
    lbStart.textContent='Início:';
    lbStart.style.cssText='font-size:11px;color:var(--muted);font-weight:600;flex-shrink:0;';
    var inpStart=document.createElement('input');
    inpStart.type='date';
    inpStart.value=t.periodStart||'';
    inpStart.style.cssText='background:var(--surface);border:1px solid var(--border2);border-radius:6px;padding:5px 8px;color:var(--text);font-family:"DM Sans",sans-serif;font-size:12px;height:32px;box-sizing:border-box;flex:1;min-width:120px;color-scheme:dark;';
    var lbEnd=document.createElement('span');
    lbEnd.textContent='Fim:';
    lbEnd.style.cssText='font-size:11px;color:var(--muted);font-weight:600;flex-shrink:0;';
    var inpEnd=document.createElement('input');
    inpEnd.type='date';
    inpEnd.value=t.periodEnd||'';
    inpEnd.style.cssText='background:var(--surface);border:1px solid var(--border2);border-radius:6px;padding:5px 8px;color:var(--text);font-family:"DM Sans",sans-serif;font-size:12px;height:32px;box-sizing:border-box;flex:1;min-width:120px;color-scheme:dark;';
    var savePerBtn=document.createElement('button');
    savePerBtn.innerHTML='📅 Período';
    savePerBtn.style.cssText='height:32px;padding:0 12px;background:rgba(96,165,250,.15);color:var(--blue);border:1px solid rgba(96,165,250,.35);border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:"DM Sans",sans-serif;flex-shrink:0;';
    (function(turma,is,ie){
      savePerBtn.addEventListener('click',function(){
        var ps=is.value,pe=ie.value;
        if(!ps||!pe){_showToast('⚠️ Informe início e fim.','var(--amber)');return;}
        if(pe<ps){_showToast('⚠️ Fim deve ser após o início.','var(--amber)');return;}
        var fmt=function(d){var p=d.split('-');return p[2]+'/'+p[1]+'/'+p[0];};
        var pt=fmt(ps)+'  →  '+fmt(pe);
        turma.periodStart=ps;turma.periodEnd=pe;turma.periodText=pt;
        if(window._fbSave){
          window._fbSave(TURMAS_NODE+'/'+turma.id+'/periodStart',ps);
          window._fbSave(TURMAS_NODE+'/'+turma.id+'/periodEnd',pe);
          window._fbSave(TURMAS_NODE+'/'+turma.id+'/periodText',pt)
            .then(function(){_showToast('✅ Período salvo!','var(--accent)');})
            .catch(function(){_showToast('❌ Erro ao salvar.','var(--red)');});
        }
      });
    })(t,inpStart,inpEnd);
    dateRow.appendChild(lbStart);dateRow.appendChild(inpStart);
    dateRow.appendChild(lbEnd);dateRow.appendChild(inpEnd);
    dateRow.appendChild(savePerBtn);
    div.appendChild(dateRow);
    el.appendChild(div);
  });
}

// ── Helpers compartilhados pelos layouts visuais ──
var _gtMeses     = APP_CONST.MESES_CURTO;
var _gtMesesFull = APP_CONST.MESES_FULL;
var _gtCores     = APP_CONST.PALETTE_SWIM;
var _gtBgs       = APP_CONST.PALETTE_SWIM_BG;

function _gtMesMap(){
  var turmasAno=_gerenciarTurmasList.filter(function(t){return _gtExtrairAno(t)===_gtAnoAtual;});
  var map={};for(var m=1;m<=12;m++)map[m]=[];
  turmasAno.forEach(function(t){var m=_gtExtrairMes(t);if(m>=1&&m<=12)map[m].push(t);else map[1].push(t);});
  return {map:map,turmasAno:turmasAno};
}
function _gtChip(t,ti){
  var cor=_gtCores[ti%_gtCores.length];
  var bg=_gtBgs[ti%_gtBgs.length];
  var ps=_gtFmtDate(t.periodStart),pe=_gtFmtDate(t.periodEnd);
  var periodo=ps&&pe?ps+' → '+pe:(t.periodText||'');
  var tip=t.nome+(periodo?' · '+periodo:'');
  var idx=_gerenciarTurmasList.indexOf(t);
  return '<div onclick="_gtAbrirEditar('+idx+')" title="'+tip+'" style="border-radius:5px;padding:6px 8px;font-size:10px;font-weight:700;text-align:center;cursor:pointer;background:'+bg+';border:1px solid '+cor+'55;color:'+cor+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:3px;">'+(t.codigo||t.id)+(periodo?'<div style="font-size:9px;color:'+cor+';opacity:.8;margin-top:2px;">'+periodo+'</div>':'')+'</div>';
}

// ── A: Timeline ──
function _gtRenderA(el){
  var d=_gtMesMap();if(!d.turmasAno.length){el.innerHTML='<div style="color:var(--muted);font-size:13px;padding:20px 0;">Nenhuma turma em '+_gtAnoAtual+'.</div>';return;}
  var html='<div style="overflow-x:auto;"><div style="display:grid;grid-template-columns:repeat(12,minmax(68px,1fr));gap:5px;min-width:660px;">';
  for(var m=1;m<=12;m++){
    html+='<div><div style="font-size:10px;font-weight:700;color:var(--muted);text-align:center;padding:4px 0;border-bottom:1px solid var(--border);margin-bottom:5px;text-transform:uppercase;letter-spacing:.05em;">'+_gtMeses[m-1]+'</div>';
    var list=d.map[m];
    if(!list.length) html+='<div style="height:28px;"></div>';
    else list.forEach(function(t,ti){html+=_gtChip(t,ti);});
    html+='</div>';
  }
  html+='</div></div>';el.innerHTML=html;
}
// ── B: Grade meses ──
function _gtRenderB(el){
  var d=_gtMesMap();
  var html='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">';
  for(var m=1;m<=12;m++){
    var list=d.map[m];
    html+='<div style="background:var(--surface);border:1px solid var(--border2);border-radius:var(--radius);padding:12px;">';
    html+='<div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">'+_gtMesesFull[m-1]+'</div>';
    if(!list.length){html+='<div style="font-size:11px;color:rgba(255,255,255,.15);text-align:center;padding:6px 0;">—</div>';}
    else list.forEach(function(t,ti){html+=_gtChip(t,ti);});
    html+='</div>';
  }
  html+='</div>';el.innerHTML=html;
}
// ── C: Lista detalhada ──
function _gtRenderC(el){
  var d=_gtMesMap();var html='';
  for(var m=1;m<=12;m++){
    var list=d.map[m];if(!list.length) continue;
    html+='<div style="margin-bottom:18px;"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border);"><span style="font-size:14px;font-weight:700;">'+_gtMesesFull[m-1]+'</span><span style="font-size:11px;color:var(--muted);background:var(--surface2);padding:2px 8px;border-radius:20px;">'+list.length+' turma'+(list.length!==1?'s':'')+'</span></div><div style="display:flex;flex-wrap:wrap;gap:8px;">';
    list.forEach(function(t,ti){
      var cor=_gtCores[ti%_gtCores.length];
      var ps=_gtFmtDate(t.periodStart),pe=_gtFmtDate(t.periodEnd);
      var periodo=ps&&pe?ps+' → '+pe:(t.periodText||'');
      var idx=_gerenciarTurmasList.indexOf(t);
      html+='<div onclick="_gtAbrirEditar('+idx+')" style="background:var(--surface);border:1px solid var(--border2);border-top:2px solid '+cor+';border-radius:var(--radius-sm);padding:10px 14px;cursor:pointer;min-width:150px;">'
        +'<div style="font-size:10px;font-weight:700;color:'+cor+';margin-bottom:3px;">'+(t.codigo||t.id)+'</div>'
        +'<div style="font-size:12px;font-weight:600;color:var(--text);">'+t.nome+'</div>'
        +(periodo?'<div style="font-size:10px;color:var(--accent);margin-top:3px;">'+periodo+'</div>':'')
        +'</div>';
    });
    html+='</div></div>';
  }
  if(!html) html='<div style="color:var(--muted);font-size:13px;padding:20px 0;">Nenhuma turma em '+_gtAnoAtual+'.</div>';
  el.innerHTML=html;
}
// ── D: Linha do tempo ──
function _gtRenderD(el){
  var d=_gtMesMap();var html='<div style="padding-left:70px;">';
  for(var m=1;m<=12;m++){
    var list=d.map[m];if(!list.length) continue;
    html+='<div style="display:flex;margin-bottom:18px;position:relative;">'
      +'<div style="position:absolute;left:-70px;top:8px;font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;width:52px;text-align:right;">'+_gtMeses[m-1]+'</div>'
      +'<div style="position:absolute;left:-18px;top:10px;width:8px;height:8px;border-radius:50%;background:var(--accent);border:2px solid var(--surface);"></div>'
      +'<div style="display:flex;flex-wrap:wrap;gap:8px;">';
    list.forEach(function(t,ti){
      var cor=_gtCores[ti%_gtCores.length];
      var ps=_gtFmtDate(t.periodStart),pe=_gtFmtDate(t.periodEnd);
      var periodo=ps&&pe?ps+' → '+pe:(t.periodText||'');
      var idx=_gerenciarTurmasList.indexOf(t);
      html+='<div onclick="_gtAbrirEditar('+idx+')" style="display:inline-flex;flex-direction:column;align-items:flex-start;background:var(--surface);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:7px 12px;cursor:pointer;">'
        +'<span style="font-size:12px;font-weight:700;color:'+cor+';">'+(t.codigo||t.id)+' — '+t.nome+'</span>'
        +(periodo?'<span style="font-size:10px;color:var(--accent);margin-top:2px;">'+periodo+'</span>':'')
        +'</div>';
    });
    html+='</div></div>';
  }
  html+='</div>';
  if(!d.turmasAno.length) html='<div style="color:var(--muted);font-size:13px;padding:20px 0;">Nenhuma turma em '+_gtAnoAtual+'.</div>';
  el.innerHTML=html;
}
// ── E: Kanban ──
function _gtRenderE(el){
  var d=_gtMesMap();
  var trims=[{l:'Q1 — Jan/Mar',m:[1,2,3]},{l:'Q2 — Abr/Jun',m:[4,5,6]},{l:'Q3 — Jul/Set',m:[7,8,9]},{l:'Q4 — Out/Dez',m:[10,11,12]}];
  var corQ=['var(--blue)','var(--accent)','#a78bfa','var(--red)'];
  var html='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">';
  trims.forEach(function(q,qi){
    var lista=[];q.m.forEach(function(m){d.map[m].forEach(function(t){lista.push({t:t,m:m});});});
    html+='<div style="background:var(--surface);border:1px solid var(--border2);border-radius:var(--radius);overflow:hidden;">'
      +'<div style="padding:10px 12px;font-size:11px;font-weight:700;color:'+corQ[qi]+';border-bottom:1px solid '+corQ[qi]+'33;">'+q.l+'<br><span style="font-size:10px;color:var(--muted);font-weight:400;">'+lista.length+' turma'+(lista.length!==1?'s':'')+'</span></div>'
      +'<div style="padding:10px;display:flex;flex-direction:column;gap:7px;">';
    if(!lista.length) html+='<div style="font-size:11px;color:var(--muted);text-align:center;padding:8px;">sem turmas</div>';
    else lista.forEach(function(x,ti){
      var cor=_gtCores[ti%_gtCores.length];
      var ps=_gtFmtDate(x.t.periodStart),pe=_gtFmtDate(x.t.periodEnd);
      var periodo=ps&&pe?ps+' → '+pe:(x.t.periodText||'');
      var idx=_gerenciarTurmasList.indexOf(x.t);
      html+='<div onclick="_gtAbrirEditar('+idx+')" style="background:var(--surface2);border-radius:var(--radius-sm);padding:9px 11px;cursor:pointer;border-left:3px solid '+cor+';">'
        +'<div style="font-size:10px;color:var(--muted);margin-bottom:2px;">'+_gtMesesFull[x.m-1]+'</div>'
        +'<div style="font-size:11px;font-weight:700;color:'+cor+';">'+(x.t.codigo||x.t.id)+'</div>'
        +'<div style="font-size:12px;color:var(--text);">'+x.t.nome+'</div>'
        +(periodo?'<div style="font-size:9px;color:var(--accent);margin-top:2px;">'+periodo+'</div>':'')
        +'</div>';
    });
    html+='</div></div>';
  });
  html+='</div>';el.innerHTML=html;
}
// ── F: Mapa de calor ──
function _gtRenderF(el){
  var d=_gtMesMap();
  var tiposSet={};d.turmasAno.forEach(function(t){tiposSet[_gtExtrairTipo(t)]=true;});
  var tipos=Object.keys(tiposSet).sort();
  if(!tipos.length){el.innerHTML='<div style="color:var(--muted);font-size:13px;padding:20px 0;">Nenhuma turma em '+_gtAnoAtual+'.</div>';return;}
  var html='<div style="overflow-x:auto;"><div style="display:grid;grid-template-columns:90px repeat(12,1fr);gap:3px;min-width:620px;">';
  html+='<div></div>';
  _gtMeses.forEach(function(m){html+='<div style="font-size:10px;font-weight:700;color:var(--muted);text-align:center;padding:3px 0;text-transform:uppercase;letter-spacing:.04em;">'+m+'</div>';});
  tipos.forEach(function(tipo,ti){
    var cor=_gtCores[ti%_gtCores.length];var bg=_gtBgs[ti%_gtBgs.length];
    html+='<div style="font-size:11px;font-weight:700;color:'+cor+';display:flex;align-items:center;padding-right:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+tipo+'</div>';
    for(var m=1;m<=12;m++){
      var list=d.map[m].filter(function(t){return _gtExtrairTipo(t)===tipo;});
      if(!list.length){html+='<div style="height:34px;border-radius:4px;background:var(--surface2);opacity:.3;"></div>';}
      else{
        var idx=_gerenciarTurmasList.indexOf(list[0]);
        var ps=_gtFmtDate(list[0].periodStart),pe=_gtFmtDate(list[0].periodEnd);
        var periodo=ps&&pe?ps+' → '+pe:(list[0].periodText||'');
        var tip=list[0].nome+(periodo?' · '+periodo:'');
        html+='<div onclick="_gtAbrirEditar('+idx+')" title="'+tip+'" style="height:34px;border-radius:4px;background:'+bg+';border:1px solid '+cor+'55;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:'+cor+';cursor:pointer;overflow:hidden;padding:0 3px;white-space:nowrap;">'+list.length+'</div>';
      }
    }
  });
  html+='</div></div>';el.innerHTML=html;
}
// ── G: Semestres ──
function _gtRenderG(el){
  var d=_gtMesMap();
  var sems=[{l:'1º Semestre — Jan a Jun',m:[1,2,3,4,5,6]},{l:'2º Semestre — Jul a Dez',m:[7,8,9,10,11,12]}];
  var html='';
  sems.forEach(function(s){
    var lista=[];s.m.forEach(function(m){d.map[m].forEach(function(t){lista.push({t:t,m:m});});});
    html+='<div style="margin-bottom:12px;border:1px solid var(--border2);border-radius:var(--radius);overflow:hidden;">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--surface);"><span style="font-size:13px;font-weight:700;">'+s.l+'</span><span style="font-size:11px;color:var(--muted);background:var(--surface2);padding:2px 8px;border-radius:20px;">'+lista.length+' turma'+(lista.length!==1?'s':'')+'</span></div>';
    if(lista.length){
      html+='<div style="padding:12px;display:flex;flex-wrap:wrap;gap:8px;">';
      lista.forEach(function(x,ti){
        var cor=_gtCores[ti%_gtCores.length];
        var ps=_gtFmtDate(x.t.periodStart),pe=_gtFmtDate(x.t.periodEnd);
        var periodo=ps&&pe?ps+' → '+pe:(x.t.periodText||'');
        var idx=_gerenciarTurmasList.indexOf(x.t);
        html+='<div onclick="_gtAbrirEditar('+idx+')" style="background:var(--surface2);border-radius:var(--radius-sm);padding:9px 12px;cursor:pointer;border-top:2px solid '+cor+';">'
          +'<div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px;">'+_gtMesesFull[x.m-1]+'</div>'
          +'<div style="font-size:11px;font-weight:700;color:'+cor+';">'+(x.t.codigo||x.t.id)+'</div>'
          +'<div style="font-size:12px;color:var(--text);">'+x.t.nome+'</div>'
          +(periodo?'<div style="font-size:9px;color:var(--accent);margin-top:2px;">'+periodo+'</div>':'')
          +'</div>';
      });
      html+='</div>';
    } else {html+='<div style="padding:12px;font-size:11px;color:var(--muted);">Nenhuma turma neste semestre.</div>';}
    html+='</div>';
  });
  el.innerHTML=html;
}
// ── H: Swimlane ──
function _gtRenderH(el){
  var d=_gtMesMap();
  var tiposSet={};d.turmasAno.forEach(function(t){tiposSet[_gtExtrairTipo(t)]=true;});
  var tipos=Object.keys(tiposSet).sort();
  if(!tipos.length){el.innerHTML='<div style="color:var(--muted);font-size:13px;padding:20px 0;">Nenhuma turma em '+_gtAnoAtual+'.</div>';return;}
  var html='<div style="overflow-x:auto;"><div style="display:grid;grid-template-columns:110px repeat(12,1fr);gap:3px;min-width:680px;">';
  html+='<div></div>';
  _gtMeses.forEach(function(m){html+='<div style="font-size:10px;font-weight:700;color:var(--muted);text-align:center;padding:4px 0;text-transform:uppercase;letter-spacing:.04em;">'+m+'</div>';});
  tipos.forEach(function(tipo,ti){
    var cor=_gtCores[ti%_gtCores.length];var bg=_gtBgs[ti%_gtBgs.length];
    html+='<div style="font-size:11px;font-weight:700;color:'+cor+';display:flex;align-items:center;padding-right:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+tipo+'</div>';
    for(var m=1;m<=12;m++){
      var list=d.map[m].filter(function(t){return _gtExtrairTipo(t)===tipo;});
      if(!list.length){html+='<div style="height:44px;border-radius:4px;background:var(--surface2);opacity:.3;"></div>';}
      else{
        var t=list[0];
        var ps=_gtFmtDate(t.periodStart),pe=_gtFmtDate(t.periodEnd);
        var periodo=ps&&pe?ps+' → '+pe:(t.periodText||'');
        var idx=_gerenciarTurmasList.indexOf(t);
        html+='<div onclick="_gtAbrirEditar('+idx+')" title="'+t.nome+(periodo?' · '+periodo:'')+'" style="height:44px;border-radius:4px;background:'+bg+';border:1px solid '+cor+'55;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:'+cor+';cursor:pointer;overflow:hidden;padding:0 3px;text-align:center;">'
          +(t.codigo||t.id)
          +(periodo?'<span style="font-size:8px;opacity:.8;margin-top:2px;overflow:hidden;max-width:100%;text-overflow:ellipsis;white-space:nowrap;">'+periodo+'</span>':'')
          +'</div>';
      }
    }
  });
  html+='</div></div>';el.innerHTML=html;
}


function _gtAbrirEditar(idx){
  var t=_gerenciarTurmasList[idx];
  if(!t) return;
  // Painel de edição inline abaixo do swimlane
  var existing=document.getElementById('gtEditPanel');
  if(existing) existing.remove();
  var panel=document.createElement('div');
  panel.id='gtEditPanel';
  panel.style.cssText='margin-top:12px;padding:14px 16px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);display:flex;flex-direction:column;gap:10px;';
  panel.innerHTML=
    '<div style="font-size:12px;font-weight:700;color:var(--text);">'+t.nome+' <span style="color:var(--muted);font-weight:400;font-size:11px;">'+t.id+'</span></div>'+
    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">'+
      '<input id="gtEditMeta" type="text" value="'+formatVal(t.meta||0)+'" placeholder="Meta (R$)" style="flex:1;min-width:120px;background:var(--surface);border:1px solid var(--border2);border-radius:6px;padding:7px 10px;color:var(--text);font-family:\'DM Mono\',monospace;font-size:12px;text-align:right;height:34px;box-sizing:border-box;">'+
      '<button onclick="_gtSalvarMeta('+idx+')" style="height:34px;padding:0 12px;background:var(--accent-dim);color:var(--accent);border:1px solid rgba(200,240,90,.35);border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:\'DM Sans\',sans-serif;white-space:nowrap;">💾 Meta</button>'+
      '<button onclick="_gtEditarNome('+idx+')" style="height:34px;padding:0 12px;background:var(--blue-bg);color:var(--blue);border:1px solid rgba(96,165,250,.35);border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:\'DM Sans\',sans-serif;white-space:nowrap;">✏ Nome</button>'+
      '<button onclick="excluirTurma(\''+t.id+'\',\''+t.nome.replace(/'/g,"\\'")+'\')" style="height:34px;padding:0 12px;background:var(--red-bg);color:var(--red);border:1px solid rgba(255,95,87,.3);border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:\'DM Sans\',sans-serif;white-space:nowrap;">🗑 Excluir</button>'+
      '<button onclick="document.getElementById(\'gtEditPanel\').remove()" style="height:34px;padding:0 10px;background:none;color:var(--muted);border:1px solid var(--border2);border-radius:6px;font-size:12px;cursor:pointer;font-family:\'DM Sans\',sans-serif;">✕</button>'+
    '</div>';
  document.getElementById('gerenciarTurmasLista').appendChild(panel);
}
function _gtSalvarMeta(idx){
  var t=_gerenciarTurmasList[idx];
  var val=parseVal(document.getElementById('gtEditMeta').value)||0;
  t.meta=val;
  if(window._fbSave) window._fbSave(TURMAS_NODE+'/'+t.id+'/meta',val).then(function(){_showToast('✅ Meta atualizada!','var(--accent)');}).catch(function(e){_showToast('❌ Erro','var(--red)');});
}
function _gtEditarNome(idx){
  var t=_gerenciarTurmasList[idx];
  var novo=prompt('Novo nome:',t.nome);
  if(!novo||!novo.trim()) return;
  t.nome=novo.trim();
  if(window._fbSave) window._fbSave(TURMAS_NODE+'/'+t.id+'/nome',t.nome).then(function(){_showToast('✅ Nome atualizado!','var(--accent)');renderTurmasGrid();_renderGerenciarLista();}).catch(function(e){_showToast('❌ Erro','var(--red)');});
}
function _moverTurma(idx,dir){
  var novo=idx+dir;
  if(novo<0||novo>=_gerenciarTurmasList.length) return;
  var tmp=_gerenciarTurmasList[idx];
  _gerenciarTurmasList[idx]=_gerenciarTurmasList[novo];
  _gerenciarTurmasList[novo]=tmp;
  // Atualizar campo ordem e salvar no Firebase
  _gerenciarTurmasList.forEach(function(t,i){
    t.ordem=i;
    if(window._fbSave) window._fbSave(TURMAS_NODE+'/'+t.id+'/ordem',i).catch(function(e){ window._errSilent&&window._errSilent('salvar ordem turma',e); });
  });
  _renderGerenciarLista();
}

function fecharGerenciarTurmas(){document.getElementById('gerenciarTurmasOverlay').classList.remove('open');}

function _abrirNovaTurmaDoGerenciar(){
  fecharGerenciarTurmas();
  abrirNovaTurma();
}

