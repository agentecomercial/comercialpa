/* ══════════════════════════════════════════════════════════════
   MODAL LISTA DE CLIENTES v12
   — Edição inline completa
   — Checkbox por linha + selecionar todos + excluir em massa
   — NÃO fecha com ESC nem com backdrop
   — Salvar atualiza data[] e Firebase
   (extraído de 05-importacao.js na Fase 16 — code-split)
══════════════════════════════════════════════════════════════ */
var _lcIndicesFiltrados = []; // índices reais no array data[]

function abrirListaClientes(){
  var overlay = document.getElementById('listaClientesOverlay');
  var input   = document.getElementById('lcSearchInput');
  if(!overlay){ console.error('[abrirListaClientes] listaClientesOverlay não encontrado'); return; }
  if(input) input.value = '';
  try{ lcRenderizar(''); } catch(e){ console.warn('[abrirListaClientes] lcRenderizar:', e); }
  // Botão de redistribuição — só ADM e só quando há sem-consultor
  var btn=document.getElementById('lcBtnDistribuir');
  if(btn){
    var isAdm=typeof _getSessao==='function'&&((_getSessao()||{}).perfil==='adm');
    if(isAdm){
      var arr=(typeof data!=='undefined'&&Array.isArray(data))?data:[];
      var sem=arr.filter(function(d){return !d.consultor||!d.consultor.trim();}).length;
      if(sem>0){btn.textContent='⚖ Distribuir sem consultor ('+sem+')';btn.style.display='';}
      else btn.style.display='none';
    } else {
      btn.style.display='none';
    }
  }
  overlay.classList.add('open');
}
function fecharListaClientes(){
  document.getElementById('listaClientesOverlay').classList.remove('open');
}

/* Renderiza tabela com edição inline */
function lcRenderizar(filtro){
  var tbody  = document.getElementById('lcTbody');
  var vazio  = document.getElementById('lcVazio');
  var count  = document.getElementById('lcCount');
  var sub    = document.getElementById('lcSubtitle');
  if(!tbody) return;

  var arr = (typeof data !== 'undefined' && Array.isArray(data)) ? data : [];
  var q   = (filtro || '').toLowerCase().trim();

  // Montar lista de índices filtrados
  _lcIndicesFiltrados = [];
  arr.forEach(function(r, i){
    if(!q){
      _lcIndicesFiltrados.push(i);
    } else if(
      (r.cliente    ||'').toLowerCase().indexOf(q)>=0 ||
      (r.treinamento||'').toLowerCase().indexOf(q)>=0 ||
      (r.consultor  ||'').toLowerCase().indexOf(q)>=0 ||
      (r.treinador  ||'').toLowerCase().indexOf(q)>=0
    ){
      _lcIndicesFiltrados.push(i);
    }
  });

  if(!_lcIndicesFiltrados.length){
    tbody.innerHTML = '';
    vazio.style.display = 'block';
    count.textContent   = '0 clientes';
    if(sub) sub.textContent = arr.length + ' clientes no total — nenhum encontrado.';
    lcAtualizarMassaBar();
    return;
  }

  vazio.style.display = 'none';

  var STATUS_OPTS = [
    {v:'aberto',l:'ABERTO'},{v:'pago',l:'PAGO'},{v:'entrada',l:'ENTRADA'},
    {v:'negociacao',l:'NEGOCIAÇÃO'},{v:'desistiu',l:'DESISTIU'},{v:'estorno',l:'ESTORNO'},{v:'-',l:'—'}
  ];

  // Fontes dos selects: mesmas do modal "Novo cliente"
  var _treinLst = (typeof allTreinamentos!=='undefined'&&Array.isArray(allTreinamentos))?allTreinamentos:[];
  var _trainLst = (typeof allTrainers!=='undefined'&&Array.isArray(allTrainers))?allTrainers:[];
  var _consLst  = (typeof allConsultors!=='undefined'&&Array.isArray(allConsultors))?allConsultors:[];

  var html = '';
  _lcIndicesFiltrados.forEach(function(realIdx){
    var r = arr[realIdx];

    // SELECT treinamento — Fix 7: opção vazia obrigatória, nunca pré-preencher
    var treinOpts = '<option value="">— vazio —</option>'
      + _treinLst.map(function(t){
          return '<option value="'+t+'"'+((r.treinamento||'')=== t?' selected':'')+'>'+t+'</option>';
        }).join('');

    // SELECT treinador (âmbar)
    var trainOpts = '<option value="-"'+((!r.treinador||r.treinador==='-')?' selected':'')+'>—</option>'
      + _trainLst.map(function(t){
          return '<option value="'+t+'"'+(r.treinador===t?' selected':'')+'>'+t.toUpperCase()+'</option>';
        }).join('');

    // SELECT consultor (verde)
    var consOpts = '<option value=""'+(!r.consultor?' selected':'')+'>—</option>'
      + _consLst.map(function(c){
          return '<option value="'+c+'"'+(r.consultor===c?' selected':'')+'>'+c.toUpperCase()+'</option>';
        }).join('');

    // SELECT status
    var selOpts = STATUS_OPTS.map(function(s){
      return '<option value="'+s.v+'"'+((r.status||'aberto')===s.v?' selected':'')+'>'+s.l+'</option>';
    }).join('');

    // Fix 5: formatar valor/entrada como BRL para exibição no input
    var valEdit = r.valor  ? Number(r.valor).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})  : '';
    var entEdit = r.entrada? Number(r.entrada).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : '';
    // Cor de ticket: Low (0-5k)=azul, Middle (5001-10k)=âmbar, High (10k+)=verde
    var ticketCorLC = Number(r.valor||0) >= 10000.01 ? 'var(--green)'
                    : Number(r.valor||0) >= 5001     ? 'var(--amber)'
                    : Number(r.valor||0) > 0         ? 'var(--blue)'
                    : 'var(--muted)';

    html += '<tr data-idx="'+realIdx+'">'
      // Checkbox — Fix 2: mantido no modal Gerenciar
      +'<td style="text-align:center;width:36px;">'
        +'<input type="checkbox" class="lc-row-chk" data-idx="'+realIdx+'" onchange="lcOnChkChange()" style="accent-color:var(--accent);width:14px;height:14px;cursor:pointer;">'
      +'</td>'
      // Cliente — texto fixo (edição via botão "i" no card, só ADM)
      +'<td style="text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;">'
        +'<span style="font-size:12px;font-weight:600;color:var(--text);">'+_lcEsc(r.cliente||'')+'</span>'
      +'</td>'
      // Treinamento — SELECT com opção vazia
      +'<td style="text-align:center;vertical-align:middle;">'
        +'<select class="lc-cell-select" data-idx="'+realIdx+'" data-campo="treinamento" onchange="lcCellChange(this)">'+treinOpts+'</select>'
      +'</td>'
      // Treinador — SELECT âmbar
      +'<td class="lc-cell-treinador" style="text-align:center;vertical-align:middle;">'
        +'<select class="lc-cell-select" data-idx="'+realIdx+'" data-campo="treinador" onchange="lcCellChange(this)" style="color:var(--amber);border-color:rgba(255,183,64,.25);">'+trainOpts+'</select>'
      +'</td>'
      // Consultor — SELECT verde
      +'<td class="lc-cell-consultor" style="text-align:center;vertical-align:middle;">'
        +'<select class="lc-cell-select" data-idx="'+realIdx+'" data-campo="consultor" onchange="lcCellChange(this)" style="color:var(--accent);border-color:rgba(200,240,90,.25);">'+consOpts+'</select>'
      +'</td>'
      // Valor — cor por faixa de ticket, alinhamento direita
      +'<td style="text-align:right;vertical-align:middle;min-width:100px;padding:3px 4px;">'
        +'<input type="text" inputmode="numeric" class="lc-cell-input" data-idx="'+realIdx+'" data-campo="valor"'
          +' value="'+valEdit+'" oninput="this.value=lcMoneyMask(this.value)" onchange="lcCellChange(this)" placeholder="0,00"'
          +' style="text-align:right;font-family:\'DM Mono\',monospace;font-variant-numeric:tabular-nums;font-weight:700;color:'+ticketCorLC+';min-width:90px;">'
      +'</td>'
      // Status — SELECT centralizado
      +'<td style="text-align:center;vertical-align:middle;">'
        +'<select class="lc-cell-select" data-idx="'+realIdx+'" data-campo="status" onchange="lcCellChange(this)">'+selOpts+'</select>'
      +'</td>'
      // Entrada — alinhamento direita, azul
      +'<td style="text-align:right;vertical-align:middle;min-width:90px;padding:3px 4px;">'
        +'<input type="text" inputmode="numeric" class="lc-cell-input" data-idx="'+realIdx+'" data-campo="entrada"'
          +' value="'+entEdit+'" oninput="this.value=lcMoneyMask(this.value)" onchange="lcCellChange(this)" placeholder="0,00"'
          +' style="text-align:right;font-family:\'DM Mono\',monospace;font-variant-numeric:tabular-nums;font-weight:600;color:var(--blue);min-width:80px;">'
      +'</td>'
      +'</tr>';
  });

  tbody.innerHTML = html;
  count.textContent = _lcIndicesFiltrados.length + ' cliente' + (_lcIndicesFiltrados.length!==1?'s':'') + (q?' encontrado'+(_lcIndicesFiltrados.length!==1?'s':''):'');
  if(sub) sub.textContent = 'Total no sistema: '+arr.length+' cliente'+(arr.length!==1?'s':'')+'. Edição inline ativada.';
  lcAtualizarMassaBar();
}

function _lcEsc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* Edição inline do nome do cliente — só ADM */
function lcEditarNomeCliente(btn, idx){
  var td = btn.parentElement;
  var span = td.querySelector('span');
  var nomeAtual = (Array.isArray(data)&&data[idx])?data[idx].cliente||'':'';
  // Substituir conteúdo da célula por input
  td.innerHTML = '<input id="lcNomeEdit_'+idx+'" class="lc-cell-input" value="'+_lcEsc(nomeAtual)+'"'
    +' style="width:100%;min-width:120px;" placeholder="Nome..."'
    +' onblur="lcSalvarNomeCliente(this,'+idx+')" onkeydown="if(event.key===\'Enter\')this.blur();if(event.key===\'Escape\'){lcCancelarNomeCliente(this,'+idx+',\''+_lcEsc(nomeAtual)+'\')}">';
  var inp = document.getElementById('lcNomeEdit_'+idx);
  if(inp){ inp.focus(); inp.select(); }
}

function lcSalvarNomeCliente(inp, idx){
  var novo = inp.value.trim();
  if(novo && Array.isArray(data) && data[idx]){
    data[idx].cliente = novo;
    if(typeof markUnsaved==='function') markUnsaved();
    if(typeof saveStorage==='function') saveStorage();
  }
  lcRenderizar(document.getElementById('lcSearchInput').value||'');
}

function lcCancelarNomeCliente(inp, idx, original){
  lcRenderizar(document.getElementById('lcSearchInput').value||'');
}
function _lcFmtEdit(v){ var n=Number(v)||0; return n?String(n).replace('.',','):''; }
function _lcParseNum(s){ if(!s&&s!==0)return 0; var n=parseFloat(String(s).trim().replace(/R\$\s*/,'').replace(/\./g,'').replace(',','.')); return isNaN(n)?0:n; }

/* Atualiza data[] ao mudar uma célula (select ou input) */
function lcCellChange(el){
  var idx   = parseInt(el.dataset.idx);
  var campo = el.dataset.campo;
  var val   = el.value;
  if(!Array.isArray(data)||!data[idx]) return;
  if(campo==='valor'||campo==='entrada'){
    // Fix 5: parse BRL correto — remover pontos de milhar, trocar vírgula por ponto decimal
    var raw = val.trim()
      .replace(/R\$\s*/g,'')
      .replace(/\./g,'')
      .replace(',','.');
    data[idx][campo] = parseFloat(raw)||0;
  } else {
    data[idx][campo] = val;
  }
  if(typeof markUnsaved==='function') markUnsaved();
  if(typeof saveStorage==='function') saveStorage();
  // Re-render instantâneo após edição inline no modal Gerenciar Clientes
  if(window._consultorAtivo && document.getElementById('consultorDetail') &&
     document.getElementById('consultorDetail').style.display!=='none'){
    if(typeof _renderConsultorDetail==='function') _renderConsultorDetail(window._consultorAtivo);
  } else {
    if(typeof renderAll==='function') renderAll();
    if(typeof renderConsultor==='function') renderConsultor();
  }
}

/* Toggle checkbox individual */
function lcOnChkChange(){
  lcAtualizarMassaBar();
  document.querySelectorAll('#lcTbody tr').forEach(function(tr){
    var chk = tr.querySelector('.lc-row-chk');
    if(chk) tr.classList.toggle('lc-selected', chk.checked);
  });
  var todos    = document.querySelectorAll('.lc-row-chk');
  var marcados = document.querySelectorAll('.lc-row-chk:checked');
  var chkAll   = document.getElementById('lcChkAll');
  if(chkAll) chkAll.indeterminate = (marcados.length>0 && marcados.length<todos.length);
  if(chkAll) chkAll.checked       = (marcados.length===todos.length && todos.length>0);
}

/* Toggle todos */
function lcToggleAll(checked){
  document.querySelectorAll('.lc-row-chk').forEach(function(c){ c.checked=checked; });
  document.querySelectorAll('#lcTbody tr').forEach(function(tr){ tr.classList.toggle('lc-selected',checked); });
  lcAtualizarMassaBar();
}

function lcDeselecionarTodos(){
  lcToggleAll(false);
  var ca=document.getElementById('lcChkAll');
  if(ca){ca.checked=false;ca.indeterminate=false;}
}

/* Barra de ações em massa */
function lcAtualizarMassaBar(){
  var sels  = document.querySelectorAll('.lc-row-chk:checked').length;
  var total = document.querySelectorAll('.lc-row-chk').length;
  var bar   = document.getElementById('lcMassaBar');
  var cnt   = document.getElementById('lcMassaCount');
  var btn   = document.getElementById('lcBtnExcluirDin');

  if(!bar) return;

  if(sels>0){
    bar.classList.add('visible');
    if(cnt) cnt.textContent = sels+' selecionado'+(sels!==1?'s':(sels===total&&total>0?' (todos)':''));
    if(btn){
      btn.style.display = 'inline-flex';
      btn.innerHTML = sels===total && total>0
        ? '🗑 Remover Todos ('+total+')'
        : '🗑 Remover selecionados ('+sels+')';
    }
    // Popular selects De/Para com listas dinâmicas
    var _consLst  = (typeof allConsultors!=='undefined'&&Array.isArray(allConsultors))?allConsultors:[];
    var _treinLst = (typeof allTreinamentos!=='undefined'&&Array.isArray(allTreinamentos))?allTreinamentos:[];
    function _populatePar(deId, paraId, opts){
      [deId, paraId].forEach(function(id, isP){
        var el = document.getElementById(id);
        if(!el) return;
        var prev = el.value;
        el.innerHTML = '<option value="">'+(isP?'— Para —':'— De —')+'</option>'
          + opts.map(function(o){ return '<option value="'+o.v+'"'+(prev===o.v?' selected':'')+'>'+o.l+'</option>'; }).join('');
      });
    }
    var consOpts  = _consLst.map(function(c){ return {v:c, l:c.toUpperCase()}; });
    var treinOpts = _treinLst.map(function(t){ return {v:t, l:t}; });
    _populatePar('lcMassaConsultorDe',   'lcMassaConsultorPara',   consOpts);
    _populatePar('lcMassaTreinamentoDe', 'lcMassaTreinamentoPara', treinOpts);
  } else {
    bar.classList.remove('visible');
    if(btn) btn.style.display='none';
  }
}

/* Seleciona automaticamente as linhas cujo campo === valor ao escolher "De" */
function lcSelecionarPorDe(campo, valor){
  if(!valor) return; // "— De —" selecionado: não altera seleção
  var arr = (typeof data!=='undefined'&&Array.isArray(data))?data:[];
  document.querySelectorAll('.lc-row-chk').forEach(function(chk){
    var idx = parseInt(chk.dataset.idx);
    var d = arr[idx];
    if(!d) return;
    var match = (d[campo]||'') === valor;
    chk.checked = match;
    var tr = chk.closest('tr');
    if(tr) tr.classList.toggle('lc-selected', match);
  });
  var ca = document.getElementById('lcChkAll');
  var todos = document.querySelectorAll('.lc-row-chk');
  var marcados = document.querySelectorAll('.lc-row-chk:checked');
  if(ca){
    ca.checked = marcados.length === todos.length && todos.length > 0;
    ca.indeterminate = marcados.length > 0 && marcados.length < todos.length;
  }
  lcAtualizarMassaBar();
}

/* Aplicar alterações em massa com lógica De → Para */
function lcAplicarMassa(){
  var consDe   = (document.getElementById('lcMassaConsultorDe')    ||{}).value || '';
  var consPara = (document.getElementById('lcMassaConsultorPara')   ||{}).value || '';
  var stDe     = (document.getElementById('lcMassaStatusDe')        ||{}).value || '';
  var stPara   = (document.getElementById('lcMassaStatusPara')      ||{}).value || '';
  var treinDe  = (document.getElementById('lcMassaTreinamentoDe')   ||{}).value || '';
  var treinPara= (document.getElementById('lcMassaTreinamentoPara') ||{}).value || '';

  var temAlgo = (consPara) || (stPara) || (treinPara);
  if(!temAlgo){
    if(typeof _showToast==='function') _showToast('Preencha ao menos um campo "Para".','var(--amber)');
    return;
  }

  var indices = Array.from(document.querySelectorAll('.lc-row-chk:checked')).map(function(c){ return parseInt(c.dataset.idx); });
  if(!indices.length) return;

  var alterados = 0;
  indices.forEach(function(idx){
    if(!Array.isArray(data)||!data[idx]) return;
    var d = data[idx];
    var mudou = false;
    if(consPara && (!consDe || d.consultor === consDe)){
      d.consultor = consPara; mudou = true;
    }
    if(stPara && (!stDe || d.status === stDe)){
      d.status = stPara; mudou = true;
    }
    if(treinPara && (!treinDe || d.treinamento === treinDe)){
      d.treinamento = treinPara; mudou = true;
    }
    if(mudou) alterados++;
  });

  if(!alterados){
    if(typeof _showToast==='function') _showToast('Nenhum cliente correspondeu aos critérios "De".','var(--amber)');
    return;
  }

  if(typeof markUnsaved==='function') markUnsaved();
  if(typeof saveStorage==='function') saveStorage();

  // Resetar selects
  ['lcMassaConsultorDe','lcMassaConsultorPara','lcMassaStatusDe','lcMassaStatusPara',
   'lcMassaTreinamentoDe','lcMassaTreinamentoPara'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.value='';
  });

  lcDeselecionarTodos();
  lcRenderizar(document.getElementById('lcSearchInput').value||'');
  if(typeof renderAll==='function') renderAll();
  if(typeof renderConsultor==='function') renderConsultor();

  if(typeof _showToast==='function') _showToast('✅ '+alterados+' cliente'+(alterados!==1?'s':'')+' alterado'+(alterados!==1?'s':'')+'!','var(--accent)');
}

/* Excluir linha individual */
function lcExcluirLinha(idx){
  if(!Array.isArray(data)||!data[idx]) return;
  var nome = data[idx].cliente||'este cliente';
  if(!confirm('Excluir "'+nome+'"? Esta ação não pode ser desfeita.')) return;
  data.splice(idx,1);
  if(typeof markUnsaved==='function') markUnsaved();
  if(typeof saveStorage==='function') saveStorage();
  lcRenderizar(document.getElementById('lcSearchInput').value);
  if(typeof renderAll==='function') renderAll();
}

/* Fix 2: excluir selecionados — confirm obrigatório por spec */
function lcExcluirSelecionados(){
  var sels  = Array.from(document.querySelectorAll('.lc-row-chk:checked')).map(function(c){ return parseInt(c.dataset.idx); });
  var total = document.querySelectorAll('.lc-row-chk').length;
  if(!sels.length) return;
  if(!confirm('Deseja realmente excluir os clientes selecionados?')) return;
  sels.sort(function(a,b){return b-a;});
  sels.forEach(function(idx){ if(Array.isArray(data)&&data[idx]) data.splice(idx,1); });
  if(typeof markUnsaved==='function') markUnsaved();
  if(typeof saveStorage==='function') saveStorage();
  lcRenderizar(document.getElementById('lcSearchInput').value||'');
  if(typeof renderAll==='function') renderAll();
  if(typeof renderConsultor==='function') renderConsultor();
  if(typeof _showToast==='function') _showToast('🗑 '+sels.length+' cliente'+(sels.length!==1?'s':'')+' excluído'+(sels.length!==1?'s':'')+'!','var(--red)');
}

/* Salvar tudo */
function lcSalvarTodos(){
  if(typeof markUnsaved==='function') markUnsaved();
  if(typeof saveStorage==='function') saveStorage();
  if(typeof buildSelects==='function') buildSelects();
  if(typeof buildFilterBtns==='function') buildFilterBtns();
  if(typeof renderAll==='function') renderAll();
  if(typeof renderConsultor==='function') renderConsultor();
  if(typeof renderTreinador==='function') renderTreinador();
  if(typeof renderProduto==='function') renderProduto();
  // Sincronizar com Firebase se disponível
  if(typeof _fbSave==='function' && typeof _turmaAtiva!=='undefined' && _turmaAtiva){
    var _tid=(_turmaAtiva&&_turmaAtiva.id)||_turmaAtiva;
    if(_tid && typeof _tid==='string'){
      _fbSave('turmas/'+_tid+'/clientes', data).catch(function(e){console.warn('[LC] Firebase save:',e);});
    }
  }
  _showToast && _showToast('✅ Alterações salvas!','var(--accent)');
}

function lcFiltrar(){
  var q=document.getElementById('lcSearchInput').value;
  lcRenderizar(q);
}

// Expor globalmente
window.abrirListaClientes  = abrirListaClientes;
window.fecharListaClientes = fecharListaClientes;
window.lcFiltrar           = lcFiltrar;
window.lcRenderizar        = lcRenderizar;
window.lcCellChange        = lcCellChange;
window.lcOnChkChange       = lcOnChkChange;
window.lcToggleAll         = lcToggleAll;
window.lcDeselecionarTodos = lcDeselecionarTodos;
window.lcExcluirLinha      = lcExcluirLinha;
window.lcExcluirSelecionados = lcExcluirSelecionados;
window.lcSalvarTodos       = lcSalvarTodos;
window.lcAplicarMassa      = lcAplicarMassa;
window.lcSelecionarPorDe   = lcSelecionarPorDe;
window.lcEditarNomeCliente  = lcEditarNomeCliente;
window.lcSalvarNomeCliente  = lcSalvarNomeCliente;
window.lcCancelarNomeCliente= lcCancelarNomeCliente;

// BLOQUEIOS: modal NÃO fecha com ESC nem backdrop
// (backdrop bloqueado via onclick="event.stopPropagation()" no HTML)

/* ══ fim MODAL LISTA DE CLIENTES v12 ══ */
