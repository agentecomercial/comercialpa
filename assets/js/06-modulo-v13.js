/* ════════════════════════════════════════════════════════════
   MÓDULO v13
════════════════════════════════════════════════════════════ */
(function(){
'use strict';

/* ── Fontes de dados consolidadas ─────────────────────────────────
   Coleta de allConsultors, allTrainers, allTreinamentos + importação
──────────────────────────────────────────────────────────────── */
function v13Consultores(){
  var base = Array.isArray(window.allConsultors) ? window.allConsultors.slice() : [];
  // Adicionar consultores que vieram da importação
  if(Array.isArray(window.dadosImportacao)){
    window.dadosImportacao.forEach(function(d){
      var c=(d.consultor||'').trim().toUpperCase();
      if(c && base.indexOf(c)<0) base.push(c);
    });
  }
  // Adicionar consultores existentes em data[]
  if(Array.isArray(window.data)){
    window.data.forEach(function(d){
      var c=(d.consultor||'').trim().toUpperCase();
      if(c && base.indexOf(c)<0) base.push(c);
    });
  }
  return base.filter(Boolean).sort();
}

function v13Treinamentos(){
  var base = Array.isArray(window.allTreinamentos) ? window.allTreinamentos.slice() : [];
  // Adicionar treinamentos existentes em data[]
  if(Array.isArray(window.data)){
    window.data.forEach(function(d){
      var t=(d.treinamento||'').trim().toUpperCase();
      if(t && base.indexOf(t)<0) base.push(t);
    });
  }
  return base.filter(Boolean).sort();
}

function v13Treinadores(){
  var base = Array.isArray(window.allTrainers) ? window.allTrainers.slice() : [];
  if(Array.isArray(window.data)){
    window.data.forEach(function(d){
      var t=(d.treinador||'').trim().toUpperCase();
      if(t && t!=='-' && base.indexOf(t)<0) base.push(t);
    });
  }
  if(Array.isArray(window.dadosImportacao)){
    window.dadosImportacao.forEach(function(d){
      var t=(d.treinador||'').trim().toUpperCase();
      if(t && t!=='-' && base.indexOf(t)<0) base.push(t);
    });
  }
  return base.filter(Boolean).sort();
}

var V13_STATUS = ['aberto','pago','entrada','negociacao','desistiu','estorno','-'];
var V13_STATUS_LABEL = {aberto:'ABERTO',pago:'PAGO',entrada:'ENTRADA',negociacao:'NEGOCIAÇÃO',desistiu:'DESISTIU',estorno:'ESTORNO','-':'—'};


/* ─────────────────────────────────────────────────────────────────
   FEATURE 1+3 — Funções públicas de popular selects (expostas)
──────────────────────────────────────────────────────────────── */
window.popularSelectConsultores = function(){
  var opts = [''].concat(v13Consultores()).map(function(v){
    return '<option value="'+v+'">'+( v||'— Selecionar —')+'</option>';
  }).join('');
  document.querySelectorAll('select[data-campo="consultor"]').forEach(function(s){
    var cur=s.value; s.innerHTML=opts;
    if(cur) s.value=cur;
  });
};
window.popularSelectTreinamentos = function(){
  var opts = [''].concat(v13Treinamentos()).map(function(v){
    return '<option value="'+v+'">'+( v||'— Selecionar —')+'</option>';
  }).join('');
  document.querySelectorAll('select[data-campo="treinamento"]').forEach(function(s){
    var cur=s.value; s.innerHTML=opts;
    if(cur) s.value=cur;
  });
};
window.popularSelectTreinadores = function(){
  var opts = ['','-'].concat(v13Treinadores()).map(function(v){
    return '<option value="'+v+'">'+( v==='-'?'—': v||'— Selecionar —')+'</option>';
  }).join('');
  document.querySelectorAll('select[data-campo="treinador"]').forEach(function(s){
    var cur=s.value; s.innerHTML=opts;
    if(cur) s.value=cur;
  });
};
window.popularSelectStatus = function(){
  var opts = V13_STATUS.map(function(v){
    return '<option value="'+v+'">'+V13_STATUS_LABEL[v]+'</option>';
  }).join('');
  document.querySelectorAll('select[data-campo="status"]').forEach(function(s){
    var cur=s.value; s.innerHTML=opts;
    if(cur) s.value=cur;
  });
};


/* ─────────────────────────────────────────────────────────────────
   FEATURE 2 — Máscara de moeda BRL
──────────────────────────────────────────────────────────────── */
window.formatarMoeda = function(v){
  var n = Number(v)||0;
  return n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
};
window.formatarEntrada = window.formatarMoeda;

function v13AplicarMascaraMoeda(el){
  el.addEventListener('input',function(){
    var raw = this.value.replace(/\D/g,'');
    var cents = parseInt(raw||'0',10);
    var reais = cents/100;
    this.value = reais.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
    this.dataset.val = reais; // guardar valor numérico
  });
  el.addEventListener('focus',function(){
    var raw=this.value.replace(/\D/g,'');
    if(!raw) this.value='';
  });
  el.addEventListener('blur',function(){
    var s=String(this.value||'').replace(/[^\d,.]/g,'');
    if(s.indexOf(',')>=0) s=s.replace(/\./g,'').replace(',','.'); else s=s.replace(/\./g,'');
    var n=parseFloat(s)||0;
    this.value = n>0 ? n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : '';
    this.dataset.val = n;
  });
}


/* ─────────────────────────────────────────────────────────────────
   FEATURE 5 — atualizarCampo
──────────────────────────────────────────────────────────────── */
window.atualizarCampo = function(idx, campo, valor){
  if(!Array.isArray(window.data)||!window.data[idx]) return;
  var v = valor;
  if(campo==='valor'||campo==='entrada'){
    /* Parser robusto: aceita "R$ 1.500,00", "1.500,00", "1500,00", "1500", "1500.00" */
    var s = String(valor||'').replace(/[^\d,.]/g,'');
    if(s.indexOf(',')>=0) s = s.replace(/\./g,'').replace(',','.');
    else s = s.replace(/\./g,'');
    v = parseFloat(s)||0;
  } else if(campo==='cliente'||campo==='consultor'||campo==='treinamento'||campo==='treinador'){
    v = String(valor).trim().toUpperCase();
  }
  window.data[idx][campo] = v;
  if(typeof window.markUnsaved==='function') window.markUnsaved();
};


/* ─────────────────────────────────────────────────────────────────
   FEATURE 4 — Botão dinâmico "Excluir Todos / Selecionados"
   Injeta na barra de ações em massa do Gerenciar Clientes
──────────────────────────────────────────────────────────────── */
function v13InjetarBtnExcluir(){
  // NÃO injetar segundo botão — o #lcBtnExcluirDin já existe no HTML
  // e já exibe "Excluir Todos (N)" ou "Excluir Selecionados (N)"
}

window.verificarSelecao = function(){
  // Delegar para a função nativa que controla #lcBtnExcluirDin
  if(typeof lcAtualizarMassaBar==='function') lcAtualizarMassaBar();
};

window.excluirSelecionados = function(){
  // Delegar para a função nativa que já tem confirm() e toast
  if(typeof lcExcluirSelecionados==='function') lcExcluirSelecionados();
};


/* ─────────────────────────────────────────────────────────────────
   PATCH — lcRenderizar: injetar selects e máscara de moeda
   após cada render do modal Gerenciar Clientes
──────────────────────────────────────────────────────────────── */
// v13 patch: usar lcRenderizar diretamente (exposta via window no script #10)
var _v13OrigLcRender = window.lcRenderizar || (typeof lcRenderizar!=='undefined'?lcRenderizar:null);
window.lcRenderizar = function(filtro){
  if(typeof _v13OrigLcRender==='function') _v13OrigLcRender(filtro);
  _v13InjetarSelectsGerenciar();
  v13InjetarBtnExcluir();
};

function _v13BldSel(campo, vals, atual, extraStyle){
  var style = 'class="lc-cell-input v13-cell-select" data-campo="'+campo+'"'+(extraStyle?' style="'+extraStyle+'"':'');
  var opts = vals.map(function(v){
    return '<option value="'+v+'"'+(v===atual?' selected':'')+'>'+v+'</option>';
  }).join('');
  return '<select '+style+' onchange="lcCellChange(this)"'+'>'+opts+'</select>';
}

function _v13InjetarSelectsGerenciar(){
  var arr   = Array.isArray(window.data) ? window.data : [];
  var cons  = [''].concat(v13Consultores());
  var trein = [''].concat(v13Treinamentos());
  var train = ['','-'].concat(v13Treinadores());

  document.querySelectorAll('#lcTbody tr[data-idx]').forEach(function(tr){
    var idx = parseInt(tr.dataset.idx);
    var d   = arr[idx];
    if(!d) return;

    // Treinamento (col 2)
    var tdT = tr.cells[2];
    if(tdT && tdT.querySelector('input[data-campo="treinamento"]')){
      var opts = trein.map(function(v){
        return '<option value="'+v+'"'+(v===(d.treinamento||'')?' selected':'')+'>'+( v||'— Treinamento —')+'</option>';
      }).join('');
      tdT.innerHTML = '<select class="lc-cell-input v13-cell-select" data-idx="'+idx+'" data-campo="treinamento" onchange="lcCellChange(this)">'+opts+'</select>';
    }

    // Treinador (col 3)
    var tdTr = tr.cells[3];
    if(tdTr && tdTr.querySelector('input[data-campo="treinador"]')){
      var optsTr = train.map(function(v){
        return '<option value="'+v+'"'+(v===(d.treinador||'')?' selected':'')+'>'+( v==='-'?'—': v||'— Treinador —')+'</option>';
      }).join('');
      tdTr.innerHTML = '<select class="lc-cell-input v13-cell-select" data-idx="'+idx+'" data-campo="treinador" data-campo="treinador" onchange="lcCellChange(this)" style="border-color:rgba(251,191,36,.3);">'+optsTr+'</select>';
    }

    // Consultor (col 4)
    var tdC = tr.cells[4];
    if(tdC && tdC.querySelector('input[data-campo="consultor"]')){
      var optsC = cons.map(function(v){
        return '<option value="'+v+'"'+(v===(d.consultor||'')?' selected':'')+'>'+( v||'— Consultor —')+'</option>';
      }).join('');
      tdC.innerHTML = '<select class="lc-cell-input v13-cell-select" data-idx="'+idx+'" data-campo="consultor" onchange="lcCellChange(this)" style="border-color:rgba(200,240,90,.3);">'+optsC+'</select>';
    }

    // Valor (col 5) — máscara BRL
    var tdV = tr.cells[5];
    if(tdV && tdV.querySelector('input[data-campo="valor"]')){
      var n = Number(d.valor)||0;
      var fmted = n>0?n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):'';
      tdV.innerHTML = '<input class="lc-cell-input v13-money-input" data-idx="'+idx+'" data-campo="valor" value="'+fmted+'" placeholder="0,00">';
      var inp = tdV.querySelector('input');
      if(inp){ v13AplicarMascaraMoeda(inp); inp.addEventListener('change',function(){ lcCellChange(this); }); }
    }

    // Entrada (col 7) — máscara BRL
    var tdE = tr.cells[7];
    if(tdE && tdE.querySelector('input[data-campo="entrada"]')){
      var ne = Number(d.entrada)||0;
      var fmtedE = ne>0?ne.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):'';
      tdE.innerHTML = '<input class="lc-cell-input v13-money-input" data-idx="'+idx+'" data-campo="entrada" value="'+fmtedE+'" placeholder="0,00">';
      var inpE = tdE.querySelector('input');
      if(inpE){ v13AplicarMascaraMoeda(inpE); inpE.addEventListener('change',function(){ lcCellChange(this); }); }
    }
  });

  // Atualizar botão excluir dinâmico
  window.verificarSelecao();
}

// Patch: lcOnChkChange → atualizar botão excluir
var _v13OrigChk = window.lcOnChkChange;
window.lcOnChkChange = function(){
  if(typeof _v13OrigChk==='function') _v13OrigChk();
  window.verificarSelecao();
};

// Patch: lcToggleAll → atualizar botão excluir
var _v13OrigToggle = window.lcToggleAll;
window.lcToggleAll = function(checked){
  if(typeof _v13OrigToggle==='function') _v13OrigToggle(checked);
  window.verificarSelecao();
};

// Patch: lcCellChange → suportar valor numérico vindo de money input
var _v13OrigCell = window.lcCellChange;
window.lcCellChange = function(el){
  // Para inputs de moeda: usar dataset.val se disponível
  if(el.classList && el.classList.contains('v13-money-input')){
    var idx   = parseInt(el.dataset.idx);
    var campo = el.dataset.campo;
    var raw   = String(el.value).replace(/\./g,'').replace(',','.');
    var n     = parseFloat(raw)||0;
    if(Array.isArray(window.data) && window.data[idx]){
      window.data[idx][campo] = n;
      if(typeof window.markUnsaved==='function') window.markUnsaved();
      if(typeof window.saveStorage==='function') window.saveStorage();
      // Re-render instantâneo para inputs monetários (v13-money-input)
      if(window._consultorAtivo && document.getElementById('consultorDetail') &&
         document.getElementById('consultorDetail').style.display!=='none'){
        if(typeof _renderConsultorDetail==='function') _renderConsultorDetail(window._consultorAtivo);
      }
    }
    return;
  }
  if(typeof _v13OrigCell==='function') _v13OrigCell(el);
};

// Patch: lcAtualizarMassaBar
// Antes este patch chamava window.verificarSelecao() que por sua vez
// chama lcAtualizarMassaBar — gerando recursão infinita. Removida.
var _v13OrigMassa = window.lcAtualizarMassaBar;
window.lcAtualizarMassaBar = function(){
  if(typeof _v13OrigMassa==='function') _v13OrigMassa();
};


/* ─────────────────────────────────────────────────────────────────
   FEATURE 1 — Selects inline no card CLIENTES (tabela principal)
   Substituir inputs da tabela renderAll por selects dinâmicos
──────────────────────────────────────────────────────────────── */
// Patch em renderAll: substituir célula de consultor, treinamento, status por selects interativos
var _v13OrigRenderAll = window.renderAll;
window.renderAll = function(){
  if(typeof _v13OrigRenderAll==='function') _v13OrigRenderAll();
  _v13InjetarSelectsTabela();
};

function _v13InjetarSelectsTabela(){
  var arr   = Array.isArray(window.data) ? window.data : [];
  var f     = typeof window.filtered==='function' ? window.filtered() : arr;
  var cons  = [''].concat(v13Consultores());
  var trein = [''].concat(v13Treinamentos());
  var train = ['','-'].concat(v13Treinadores());

  var tbody = document.getElementById('clientTable');
  if(!tbody) return;

  var rows = tbody.querySelectorAll('tr:not(.empty-row)');
  rows.forEach(function(tr){
    var ri = parseInt((tr.querySelector('[onclick*="openModal"]')||{getAttribute:function(){return '';}}
      ).getAttribute('onclick')||'openModal(-1)'.replace('openModal(',''));
    // Extrair ri do botão editar
    var editBtn = tr.querySelector('.edit-btn:not(.del)');
    if(!editBtn) return;
    var m = (editBtn.getAttribute('onclick')||'').match(/openModal\((\d+)\)/);
    if(!m) return;
    ri = parseInt(m[1]);
    var d = arr[ri];
    if(!d) return;

    var tds = tr.querySelectorAll('td');
    // Col 1=cliente, 2=treinador, 3=treinamento, 4=consultor, 5=valor, 6=status, 7=entrada
    // Treinamento (td[2])
    if(tds[2] && !tds[2].querySelector('select')){
      var optsT = trein.map(function(v){
        return '<option value="'+_vEsc(v)+'"'+(v===(d.treinamento||'')?' selected':'')+'>'+( v||'—')+'</option>';
      }).join('');
      tds[2].innerHTML = '<select class="v13-cell-select" data-idx="'+ri+'" data-campo="treinamento"'
        +' style="font-size:10px;" onchange="v13QuickEdit(this)">'+optsT+'</select>';
    }

    // Consultor (td[3])
    if(tds[3] && !tds[3].querySelector('select')){
      var optsC = cons.map(function(v){
        return '<option value="'+_vEsc(v)+'"'+(v===(d.consultor||'')?' selected':'')+'>'+( v||'—')+'</option>';
      }).join('');
      tds[3].innerHTML = '<select class="v13-cell-select" data-idx="'+ri+'" data-campo="consultor"'
        +' style="font-size:10px;" onchange="v13QuickEdit(this)">'+optsC+'</select>';
    }

    // Status (td[5]) — substituir o badge por select
    if(tds[5] && !tds[5].querySelector('select')){
      var STATUS_COR={aberto:'var(--amber)',pago:'var(--green)',entrada:'var(--accent)',negociacao:'var(--blue)',desistiu:'var(--red)',estorno:'var(--muted)','-':'var(--muted)'};
      var optsS = V13_STATUS.map(function(v){
        return '<option value="'+v+'"'+(v===(d.status||'-')?' selected':'')+'>'+V13_STATUS_LABEL[v]+'</option>';
      }).join('');
      var corSt = STATUS_COR[d.status||'-']||'var(--muted)';
      tds[5].innerHTML = '<select class="v13-cell-select" data-idx="'+ri+'" data-campo="status"'
        +' style="font-size:10px;color:'+corSt+';border-color:'+corSt+'33;" onchange="v13QuickEdit(this)">'+optsS+'</select>';
    }
  });
}

function _vEsc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

window.v13QuickEdit = function(el){
  var idx   = parseInt(el.dataset.idx);
  var campo = el.dataset.campo;
  var val   = el.value;
  if(!Array.isArray(window.data)||!window.data[idx]) return;
  if(campo==='cliente'||campo==='consultor'||campo==='treinamento'||campo==='treinador'){
    window.data[idx][campo] = val.trim().toUpperCase();
  } else {
    window.data[idx][campo] = val;
  }
  if(typeof window.markUnsaved==='function') window.markUnsaved();
  // Atualizar cor do select de status em tempo real
  var STATUS_COR={aberto:'var(--amber)',pago:'var(--green)',entrada:'var(--accent)',negociacao:'var(--blue)',desistiu:'var(--red)',estorno:'var(--muted)','-':'var(--muted)'};
  if(campo==='status'){
    var cor = STATUS_COR[val]||'var(--muted)';
    el.style.color = cor;
    el.style.borderColor = cor+'33';
  }
  // Atualizar somatórios sem re-render completo (parcial)
  if(typeof window.renderAll==='function'){
    clearTimeout(window._v13RenderTimer);
    window._v13RenderTimer = setTimeout(function(){
      var _tmp = window.renderAll;
      // Evitar loop: desconectar patch temporariamente
      window.renderAll = _v13OrigRenderAll;
      if(typeof window.renderAll==='function') window.renderAll();
      window.renderAll = _tmp;
      _v13InjetarSelectsTabela();
    }, 300);
  }
};

/* ─────────────────────────────────────────────────────────────────
   FEATURE 2 — Máscara BRL nos campos mValor e mEntrada (modal editar)
   e também nos campos do modal Adicionar Cliente
──────────────────────────────────────────────────────────────── */
(function _aplicarMascaraModaisExistentes(){
  ['mValor','mEntrada','aValor','aEntrada'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) v13AplicarMascaraMoeda(el);
  });
})();

/* ─────────────────────────────────────────────────────────────────
   FEATURE 6 — Atualização em tempo real: re-popular selects
   sempre que buildSelects é chamado
──────────────────────────────────────────────────────────────── */
var _v13OrigBuildSelects = window.buildSelects;
window.buildSelects = function(){
  if(typeof _v13OrigBuildSelects==='function') _v13OrigBuildSelects();
  // Sinc selects da tabela e do gerenciar
  setTimeout(function(){
    _v13InjetarSelectsGerenciar();
    _v13InjetarSelectsTabela();
  },50);
};

/* ─────────────────────────────────────────────────────────────────
   Expor funções exigidas pelo spec
──────────────────────────────────────────────────────────────── */
window.popularSelectConsultores  = window.popularSelectConsultores;
window.popularSelectTreinamentos = window.popularSelectTreinamentos;
window.popularSelectTreinadores  = window.popularSelectTreinadores;
window.popularSelectStatus       = window.popularSelectStatus;
window.formatarMoeda             = window.formatarMoeda;
window.formatarEntrada           = window.formatarEntrada;
window.atualizarCampo            = window.atualizarCampo;
window.excluirSelecionados       = window.excluirSelecionados;
window.verificarSelecao          = window.verificarSelecao;
window.v13QuickEdit              = window.v13QuickEdit;

console.log('[v13] Módulo selects + máscara BRL + excluir dinâmico carregado ✅');

})();
