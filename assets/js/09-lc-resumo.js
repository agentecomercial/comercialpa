
/* ══════════════════════════════════════════════════════════════
   MÓDULO lc-resumo v2
   — Seleção múltipla de consultores
   — Distribuição de qualquer seleção (não só sem-consultor)
   — Modal não fecha no backdrop nem no ESC
══════════════════════════════════════════════════════════════ */

var _lcFiltroAtivo=null;       // null | nome | '__sem__'
var _lcSelecao={};             // {nome: true} — cards selecionados para distribuir
var _lcModoSelecao=false;      // true quando ≥1 card selecionado

/* ── Renderizar cards ────────────────────────────────────────── */
function lcRenderResumoConsultores(){
  var bar=document.getElementById('lcResumoBar');
  if(!bar) return;
  var arr=(typeof data!=='undefined'&&Array.isArray(data))?data:[];
  var resumo=impGerarResumoConsultores(arr);
  var COR=['var(--accent)','var(--blue)','var(--green)','var(--amber)','#a78bfa','#f472b6','#fb923c','#38bdf8','#e879f9','#4ade80'];
  bar.innerHTML='';

  /* Card TODOS */
  var dTodos=document.createElement('div');
  dTodos.className='lc-box lc-box--todos'+(_lcFiltroAtivo===null&&!_lcModoSelecao?' ativo':'');
  dTodos.addEventListener('click',lcFiltroTodos);
  dTodos.title='Mostrar todos';
  var lT=document.createElement('div');lT.className='lc-box__label';lT.textContent='Todos';
  var vT=document.createElement('div');vT.className='lc-box__val';vT.textContent=String(arr.length);
  dTodos.appendChild(lT);dTodos.appendChild(vT);
  bar.appendChild(dTodos);

  /* Cards por consultor — clique filtra, clique+Shift ou segundo clique seleciona para distribuir */
  var cons=Object.keys(resumo).filter(function(k){return k!=='SEM CONSULTOR';}).sort();
  cons.forEach(function(nome,i){
    var cor=COR[i%COR.length];
    var filtroAtivo=(_lcFiltroAtivo===nome);
    var selecionado=!!_lcSelecao[nome];
    var d=document.createElement('div');
    d.className='lc-box lc-box--consultor'+(filtroAtivo?' ativo':'')+(selecionado?' lc-selecionado':'');
    d.style.borderColor=selecionado?cor+'cc':filtroAtivo?cor+'88':cor+'33';
    if(selecionado) d.style.background='rgba('+_hexToRgb(cor)+',0.12)';
    d.title=selecionado?'Clique para desmarcar':'Clique para filtrar • Clique duplo para selecionar distribuição';
    (function(n,cor){
      d.addEventListener('click',function(e){
        if(_lcModoSelecao||e.shiftKey){
          /* modo seleção: toggle */
          lcToggleSelecao(n);
        } else {
          lcFiltroConsultor(n);
        }
      });
      d.addEventListener('dblclick',function(e){
        e.preventDefault();
        lcToggleSelecao(n);
      });
    })(nome,cor);
    var l=document.createElement('div');l.className='lc-box__label';l.textContent=nome;l.style.color=cor;
    var v=document.createElement('div');v.className='lc-box__val';v.textContent=String(resumo[nome]);v.style.color=cor;
    /* ícone de seleção */
    if(selecionado){
      var ck=document.createElement('span');
      ck.style.cssText='position:absolute;top:3px;right:5px;font-size:10px;color:'+cor+';font-weight:700;';
      ck.textContent='✓';
      d.style.position='relative';
      d.appendChild(ck);
    }
    d.appendChild(l);d.appendChild(v);
    bar.appendChild(d);
  });

  /* Card SEM CONSULTOR */
  var semQt=resumo['SEM CONSULTOR']||0;
  var semSel=!!_lcSelecao['__sem__'];
  var dSem=document.createElement('div');
  dSem.className='lc-box lc-box--sem'+(_lcFiltroAtivo==='__sem__'?' ativo':'')+(semSel?' lc-selecionado':'');
  if(semSel) dSem.style.background='rgba(255,95,87,0.12)';
  dSem.title=semSel?'Clique para desmarcar':'Clique para filtrar • Duplo clique para selecionar distribuição';
  dSem.addEventListener('click',function(e){
    if(_lcModoSelecao||e.shiftKey){ lcToggleSelecao('__sem__'); }
    else { lcFiltroSem(); }
  });
  dSem.addEventListener('dblclick',function(e){ e.preventDefault(); lcToggleSelecao('__sem__'); });
  var lS=document.createElement('div');lS.className='lc-box__label';lS.textContent='Sem consultor';
  var vS=document.createElement('div');vS.className='lc-box__val';vS.textContent=String(semQt);
  if(semSel){
    var ckS=document.createElement('span');
    ckS.style.cssText='position:absolute;top:3px;right:5px;font-size:10px;color:var(--red);font-weight:700;';
    ckS.textContent='✓';
    dSem.style.position='relative';
    dSem.appendChild(ckS);
  }
  dSem.appendChild(lS);dSem.appendChild(vS);
  bar.appendChild(dSem);

  /* Card DISTRIBUIR AUTO — sempre visível, opera sobre seleção ou sem-consultor */
  var totalSelecionados=_lcContarSelecionados();
  var dd=document.createElement('div');
  dd.className='lc-box lc-box--distribuir';
  dd.style.position='relative';
  dd.title=_lcModoSelecao
    ?'Distribuir '+totalSelecionados+' clientes selecionados'
    :'Distribuir clientes sem consultor';
  dd.addEventListener('click',lcAbrirDistribuicaoSelecionados);
  var dl=document.createElement('div');dl.className='lc-box__label';
  dl.textContent=_lcModoSelecao?'Distribuir ('+totalSelecionados+')':'Distribuir';
  var dv=document.createElement('div');dv.className='lc-box__val';dv.textContent='\u21bb Auto';
  dd.appendChild(dl);dd.appendChild(dv);
  bar.appendChild(dd);

  /* Instrução discreta */
  if(!_lcModoSelecao){
    var hint=document.createElement('div');
    hint.style.cssText='font-size:9px;color:var(--muted);align-self:center;padding:0 4px;opacity:.6;';
    hint.textContent='Duplo clique para selecionar';
    bar.appendChild(hint);
  } else {
    var hint2=document.createElement('div');
    hint2.style.cssText='font-size:9px;color:var(--accent);align-self:center;padding:0 4px;cursor:pointer;';
    hint2.textContent='Limpar seleção ×';
    hint2.addEventListener('click',lcLimparSelecao);
    bar.appendChild(hint2);
  }
}

/* ── Toggle seleção de card ──────────────────────────────────── */
function lcToggleSelecao(nome){
  if(_lcSelecao[nome]){
    delete _lcSelecao[nome];
  } else {
    _lcSelecao[nome]=true;
  }
  _lcModoSelecao=Object.keys(_lcSelecao).length>0;
  lcRenderResumoConsultores();
}

function lcLimparSelecao(){
  _lcSelecao={};
  _lcModoSelecao=false;
  lcRenderResumoConsultores();
}

function _lcContarSelecionados(){
  var arr=(typeof data!=='undefined'&&Array.isArray(data))?data:[];
  var total=0;
  Object.keys(_lcSelecao).forEach(function(k){
    if(k==='__sem__'){
      total+=arr.filter(function(d){return !d.consultor||!d.consultor.trim();}).length;
    } else {
      total+=arr.filter(function(d){return (d.consultor||'').trim()===k;}).length;
    }
  });
  return total;
}

function _hexToRgb(hex){
  /* Converte #rrggbb ou var(--xxx) para "r,g,b" para usar em rgba() */
  if(!hex||hex.indexOf('#')<0) return '200,240,90';
  var h=hex.replace('#','');
  if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  var r=parseInt(h.substr(0,2),16);
  var g=parseInt(h.substr(2,2),16);
  var b=parseInt(h.substr(4,2),16);
  return r+','+g+','+b;
}

/* ── Filtros simples ─────────────────────────────────────────── */
function lcFiltroTodos(){
  _lcFiltroAtivo=null;
  _lcSelecao={};_lcModoSelecao=false;
  var inp=document.getElementById('lcSearchInput');
  if(inp) inp.value='';
  if(typeof lcRenderizar==='function') lcRenderizar('');
  lcRenderResumoConsultores();
}

function lcFiltroConsultor(nome){
  _lcFiltroAtivo=nome;
  var inp=document.getElementById('lcSearchInput');
  if(inp) inp.value='';
  lcRenderizarFiltrado(function(r){ return (r.consultor||'').trim()===nome; });
  lcRenderResumoConsultores();
}

function lcFiltroSem(){
  _lcFiltroAtivo='__sem__';
  var inp=document.getElementById('lcSearchInput');
  if(inp) inp.value='';
  lcRenderizarFiltrado(function(r){ return !r.consultor||!r.consultor.trim(); });
  lcRenderResumoConsultores();
}

function lcRenderizarFiltrado(pred){
  var tbody=document.getElementById('lcTbody');
  var vazio=document.getElementById('lcVazio');
  var count=document.getElementById('lcCount');
  var sub=document.getElementById('lcSubtitle');
  if(!tbody) return;
  var arr=(typeof data!=='undefined'&&Array.isArray(data))?data:[];
  window._lcIndicesFiltrados=[];
  arr.forEach(function(r,i){ if(pred(r)) window._lcIndicesFiltrados.push(i); });
  if(!window._lcIndicesFiltrados.length){
    tbody.innerHTML='';
    if(vazio) vazio.style.display='block';
    if(count) count.textContent='0 clientes';
    if(sub) sub.textContent=arr.length+' clientes no total — nenhum encontrado.';
    if(typeof lcAtualizarMassaBar==='function') lcAtualizarMassaBar();
    return;
  }
  if(vazio) vazio.style.display='none';
  _lcRenderTbody(arr,window._lcIndicesFiltrados);
  var lbl=_lcFiltroAtivo==='__sem__'?'Sem consultor':_lcFiltroAtivo;
  if(count) count.textContent=window._lcIndicesFiltrados.length+' cliente'+(window._lcIndicesFiltrados.length!==1?'s':'')+' filtrado'+(window._lcIndicesFiltrados.length!==1?'s':'');
  if(sub) sub.textContent='Filtro: '+lbl+' \u00b7 '+arr.length+' no total.';
  if(typeof lcAtualizarMassaBar==='function') lcAtualizarMassaBar();
}

function _lcRenderTbody(arr,indices){
  var tbody=document.getElementById('lcTbody');
  if(!tbody) return;
  var allArr=(typeof data!=='undefined'&&Array.isArray(data))?data:[];
  var STATUS_OPTS=[{v:'aberto',l:'ABERTO'},{v:'pago',l:'PAGO'},{v:'entrada',l:'ENTRADA'},{v:'negociacao',l:'NEGOCIAÇÃO'},{v:'desistiu',l:'DESISTIU'},{v:'estorno',l:'ESTORNO'},{v:'-',l:'—'}];
  var _treinLst=(typeof allTreinamentos!=='undefined'&&Array.isArray(allTreinamentos))?allTreinamentos:[];
  var _trainLst=(typeof allTrainers!=='undefined'&&Array.isArray(allTrainers))?allTrainers:[];
  var _consLst=(typeof allConsultors!=='undefined'&&Array.isArray(allConsultors))?allConsultors:[];
  var Q='"';
  var html='';
  indices.forEach(function(realIdx){
    var r=allArr[realIdx];
    var treinOpts='<option value="">— vazio —</option>'+_treinLst.map(function(t){return '<option value='+Q+t+Q+((r.treinamento||'')=== t?' selected':'')+'>'+t+'</option>';}).join('');
    var trainOpts='<option value='+Q+'-'+Q+((!r.treinador||r.treinador==='-')?' selected':'')+'>—</option>'+_trainLst.map(function(t){return '<option value='+Q+t+Q+(r.treinador===t?' selected':'')+'>'+t.toUpperCase()+'</option>';}).join('');
    var consOpts='<option value='+Q+Q+(!r.consultor?' selected':'')+'>—</option>'+_consLst.map(function(cc){return '<option value='+Q+cc+Q+(r.consultor===cc?' selected':'')+'>'+cc.toUpperCase()+'</option>';}).join('');
    var selOpts=STATUS_OPTS.map(function(s){return '<option value='+Q+s.v+Q+((r.status||'aberto')===s.v?' selected':'')+'>'+s.l+'</option>';}).join('');
    var valEdit=r.valor?Number(r.valor).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):'';
    var entEdit=r.entrada?Number(r.entrada).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):'';
    var tCor=Number(r.valor||0)>=10000.01?'var(--green)':Number(r.valor||0)>=5001?'var(--amber)':Number(r.valor||0)>0?'var(--blue)':'var(--muted)';
    var e=function(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
    html+='<tr data-idx="'+realIdx+'">'
      +'<td style="text-align:center;width:36px;"><input type="checkbox" class="lc-row-chk" data-idx="'+realIdx+'" onchange="lcOnChkChange()" style="accent-color:var(--accent);width:14px;height:14px;cursor:pointer;"></td>'
      +'<td style="text-align:left;"><input class="lc-cell-input" data-idx="'+realIdx+'" data-campo="cliente" value="'+e(r.cliente||'')+'" onchange="lcCellChange(this)" placeholder="Nome..."></td>'
      +'<td style="text-align:center;vertical-align:middle;"><select class="lc-cell-select" data-idx="'+realIdx+'" data-campo="treinamento" onchange="lcCellChange(this)">'+treinOpts+'</select></td>'
      +'<td class="lc-cell-treinador" style="text-align:center;vertical-align:middle;"><select class="lc-cell-select" data-idx="'+realIdx+'" data-campo="treinador" onchange="lcCellChange(this)" style="color:var(--amber);border-color:rgba(255,183,64,.25);">'+trainOpts+'</select></td>'
      +'<td class="lc-cell-consultor" style="text-align:center;vertical-align:middle;"><select class="lc-cell-select" data-idx="'+realIdx+'" data-campo="consultor" onchange="lcCellChange(this)" style="color:var(--accent);border-color:rgba(200,240,90,.25);">'+consOpts+'</select></td>'
      +'<td style="text-align:right;vertical-align:middle;min-width:100px;padding:3px 4px;"><input type="text" inputmode="numeric" class="lc-cell-input" data-idx="'+realIdx+'" data-campo="valor" value="'+valEdit+'" oninput="this.value=lcMoneyMask(this.value)" onchange="lcCellChange(this)" placeholder="0,00" style="text-align:right;font-family:monospace;font-weight:700;color:'+tCor+';min-width:90px;"></td>'
      +'<td style="text-align:center;vertical-align:middle;"><select class="lc-cell-select" data-idx="'+realIdx+'" data-campo="status" onchange="lcCellChange(this)">'+selOpts+'</select></td>'
      +'<td style="text-align:right;vertical-align:middle;min-width:90px;padding:3px 4px;"><input type="text" inputmode="numeric" class="lc-cell-input" data-idx="'+realIdx+'" data-campo="entrada" value="'+entEdit+'" oninput="this.value=lcMoneyMask(this.value)" onchange="lcCellChange(this)" placeholder="0,00" style="text-align:right;font-family:monospace;font-weight:600;color:var(--blue);min-width:80px;"></td>'
      +'</tr>';
  });
  tbody.innerHTML=html;
}

/* ── Distribuição — opera sobre seleção ou sem-consultor ─────── */
function lcAbrirDistribuicaoSelecionados(){
  var arr=(typeof data!=='undefined'&&Array.isArray(data))?data:[];
  var indices=[];
  var titulo='';

  if(_lcModoSelecao&&Object.keys(_lcSelecao).length>0){
    /* Coletar índices dos clientes dos consultores selecionados */
    arr.forEach(function(d,i){
      var k=(d.consultor&&d.consultor.trim())?d.consultor.trim():'__sem__';
      var isSem=(!d.consultor||!d.consultor.trim());
      if(_lcSelecao[k]||(isSem&&_lcSelecao['__sem__'])) indices.push(i);
    });
    titulo=_lcContarSelecionados()+' clientes selecionados';
  } else {
    /* Padrão: apenas sem consultor */
    arr.forEach(function(d,i){ if(!d.consultor||!d.consultor.trim()) indices.push(i); });
    titulo=indices.length+' clientes sem consultor';
  }

  if(!indices.length){
    if(typeof _showToast==='function') _showToast('Nenhum cliente para distribuir.','var(--amber)');
    return;
  }
  var cons=(typeof allConsultors!=='undefined'&&allConsultors.length)
    ?allConsultors.slice()
    :Object.keys(impGerarResumoConsultores(arr)).filter(function(k){return k!=='SEM CONSULTOR';});
  if(!cons.length){
    if(typeof _showToast==='function') _showToast('Nenhum consultor disponível.','var(--amber)');
    return;
  }

  var CORES=['#c8f05a','#60a5fa','#34d399','#f59e0b','#a78bfa','#f472b6','#fb923c','#38bdf8','#e879f9','#4ade80'];
  var total=indices.length,n=cons.length,base=Math.floor(total/n),extra=total%n;
  window._impDistExcl={};
  window._impDistCons=cons;
  window._impDistTotal=total;
  window._lcDistIndices=indices; /* guardar índices para lcAplicarDistribuicao */

  function _atualizar(){
    var soma=cons.reduce(function(a,k,i){
      if(window._impDistExcl&&window._impDistExcl[k]) return a;
      return a+(parseInt((document.getElementById('impDQt_'+i)||{}).value)||0);
    },0);
    var ct=document.getElementById('impDistModalCount'),tt=document.getElementById('impDistModalTotal');
    if(ct){ct.textContent=soma;ct.style.color=soma===total?'var(--green)':(soma>total?'var(--red)':'var(--amber)');}
    if(tt) tt.textContent=total;
  }
  window._impDistAtualizarTotal=_atualizar;

  /* Criar modal se não existir — sem listener de backdrop */
  if(!document.getElementById('impDistModal')){
    var dm=document.createElement('div');
    dm.id='impDistModal';
    dm.setAttribute('role','dialog');
    dm.innerHTML='<div class="imp-dist-box"><div class="imp-dist-header"><div class="imp-dist-title" id="impDistModalTitle"></div><div class="imp-dist-sub" id="impDistModalSub"></div></div><div class="imp-dist-body"><div class="imp-cons-grid" id="impDistModalGrid"></div><div class="imp-dist-total">Distribuindo: <span id="impDistModalCount">0</span> / <span id="impDistModalTotal">0</span> clientes</div></div><div class="imp-dist-footer" id="impDistModalFooter"></div></div>';
    document.body.appendChild(dm);
    /* NÃO adicionar listener de backdrop — modal só fecha pelo botão Fechar */
  }

  var grid=document.getElementById('impDistModalGrid');
  if(grid) grid.innerHTML=cons.map(function(k,i){
    var cor=CORES[i%CORES.length];
    return '<div class="imp-cons-card" id="impDCard_'+i+'">'
      +'<div class="imp-cons-avatar" style="background:'+cor+'26;color:'+cor+';border:1.5px solid '+cor+'55;">'+k.trim().charAt(0).toUpperCase()+'</div>'
      +'<div class="imp-cons-nome" title="'+k+'">'+k+'</div>'
      +'<input type="number" class="imp-cons-qt" id="impDQt_'+i+'" value="'+(base+(i<extra?1:0))+'" min="0" max="'+total+'" oninput="_impDistAtualizarTotal()">'
      +'<button class="imp-cons-x" onclick="impDistToggleExcl('+i+')">&times;</button>'
      +'</div>';
  }).join('');

  var tit=document.getElementById('impDistModalTitle');
  var sub2=document.getElementById('impDistModalSub');
  if(tit) tit.textContent=titulo;
  if(sub2) sub2.textContent='Defina quantos clientes cada consultor recebe. \u00d7 para excluir da distribuição.';

  var footer=document.getElementById('impDistModalFooter');
  if(footer) footer.innerHTML=
    '<button class="imp-dist-btn-primary" onclick="lcAplicarDistribuicao2()">\u2713 Aplicar</button>'
    +'<button class="imp-dist-btn-secondary" onclick="lcDistribuirAuto()">\u21bb Equilibrar</button>'
    +'<button class="imp-dist-btn-cancel" onclick="lcFecharDistModal()">Fechar</button>';

  _atualizar();
  var dm2=document.getElementById('impDistModal');
  if(dm2) dm2.classList.add('open');
}

/* Fechar modal APENAS via botão — nunca via backdrop/ESC */
function lcFecharDistModal(){
  var dm=document.getElementById('impDistModal');
  if(dm) dm.classList.remove('open');
}

function lcDistribuirAuto(){
  var cons=window._impDistCons||[],total=window._impDistTotal||0;
  var ativos=cons.filter(function(k){return !(window._impDistExcl&&window._impDistExcl[k]);});
  var na=ativos.length; if(!na) return;
  var ba=Math.floor(total/na),ea=total%na;
  ativos.forEach(function(k,ai){
    var inp=document.getElementById('impDQt_'+cons.indexOf(k));
    if(inp) inp.value=ba+(ai<ea?1:0);
  });
  if(window._impDistAtualizarTotal) window._impDistAtualizarTotal();
}

function lcAplicarDistribuicao2(){
  var cons=window._impDistCons||[],total=window._impDistTotal||0;
  var arr=(typeof data!=='undefined'&&Array.isArray(data))?data:[];
  var indices=window._lcDistIndices||[];
  var qtds=cons.map(function(k,i){
    if(window._impDistExcl&&window._impDistExcl[k]) return 0;
    return Math.max(0,parseInt((document.getElementById('impDQt_'+i)||{}).value)||0);
  });
  var soma=qtds.reduce(function(a,v){return a+v;},0);
  if(soma>total){
    if(typeof _showToast==='function') _showToast('Soma ('+soma+') excede os '+total+' clientes.','var(--red)');
    return;
  }
  var ptr=0;
  cons.forEach(function(nome,ci){
    for(var j=0;j<qtds[ci];j++){
      if(ptr>=indices.length) break;
      arr[indices[ptr]].consultor=nome; ptr++;
    }
  });
  lcFecharDistModal();
  _lcFiltroAtivo=null;
  _lcSelecao={};_lcModoSelecao=false;
  if(typeof markUnsaved==='function') markUnsaved();
  if(typeof saveStorage==='function') saveStorage();
  if(typeof lcRenderizar==='function') lcRenderizar('');
  lcRenderResumoConsultores();
  var inp=document.getElementById('lcSearchInput');
  if(inp) inp.value='';
  if(typeof _showToast==='function') _showToast(soma+' clientes distribu\u00eddos!','var(--accent)');
}

/* Compatibilidade com botão antigo */
function lcAbrirDistribuicao(){ lcAbrirDistribuicaoSelecionados(); }
function lcAplicarDistribuicao(){ lcAplicarDistribuicao2(); }

(function _lcPatches(){
  var _origAbrir=window.abrirListaClientes;
  window.abrirListaClientes=function(){
    _lcFiltroAtivo=null;_lcSelecao={};_lcModoSelecao=false;
    if(typeof _origAbrir==='function') _origAbrir.apply(this,arguments);
    setTimeout(lcRenderResumoConsultores,30);
  };
  var _origCell=window.lcCellChange;
  window.lcCellChange=function(el){
    if(typeof _origCell==='function') _origCell.apply(this,arguments);
    if(el&&el.dataset&&el.dataset.campo==='consultor') setTimeout(lcRenderResumoConsultores,60);
  };
  var _origSalvar=window.lcSalvarTodos;
  window.lcSalvarTodos=function(){
    if(typeof _origSalvar==='function') _origSalvar.apply(this,arguments);
    setTimeout(lcRenderResumoConsultores,80);
  };
  var _origFiltrar=window.lcFiltrar;
  window.lcFiltrar=function(){
    _lcFiltroAtivo=null;
    if(typeof _origFiltrar==='function') _origFiltrar.apply(this,arguments);
    setTimeout(lcRenderResumoConsultores,30);
  };
})();

window.lcRenderResumoConsultores=lcRenderResumoConsultores;
window.lcFiltroTodos=lcFiltroTodos;
window.lcFiltroConsultor=lcFiltroConsultor;
window.lcFiltroSem=lcFiltroSem;
window.lcRenderizarFiltrado=lcRenderizarFiltrado;
window.lcAbrirDistribuicao=lcAbrirDistribuicao;
window.lcAbrirDistribuicaoSelecionados=lcAbrirDistribuicaoSelecionados;
window.lcAplicarDistribuicao=lcAplicarDistribuicao;
window.lcAplicarDistribuicao2=lcAplicarDistribuicao2;
window.lcDistribuirAuto=lcDistribuirAuto;
window.lcFecharDistModal=lcFecharDistModal;
window.lcToggleSelecao=lcToggleSelecao;
window.lcLimparSelecao=lcLimparSelecao;
/* fim módulo lc-resumo v2 */

