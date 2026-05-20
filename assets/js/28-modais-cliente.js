/* ═══════════════════════════════════════════
   MODAIS EDITAR / ADICIONAR
═══════════════════════════════════════════ */
function onEditTreinamentoChange(){const t=document.getElementById('mTreinamento').value,ic=t==='CI',ts=document.getElementById('mTreinador'),nt=document.getElementById('mTreinamentoNote');ts.disabled=!ic;ts.style.opacity=ic?'1':'0.4';if(!ic)ts.value='-';nt.textContent=ic?'CI: selecione o treinador.':(t==='-'?'Treinamento não especificado.':'Treinamento '+t+': treinador não aplicável (—).');}
function onAddTreinamentoChange(){const t=document.getElementById('aTreinamento').value,ic=t==='CI',ts=document.getElementById('aTreinador'),nt=document.getElementById('aTreinamentoNote');ts.disabled=!ic;ts.style.opacity=ic?'1':'0.4';if(!ic)ts.value='-';nt.textContent=ic?'CI: selecione o treinador responsável.':(t==='-'?'Treinamento não especificado.':'Treinamento '+t+': treinador não aplicável (—).');}
function setEntradaToggle(sim){entradaRealizada=sim;document.getElementById('eToggleSim').className='etoggle'+(sim?' active-yes':'');document.getElementById('eToggleNao').className='etoggle'+(!sim?' active-no':'');document.getElementById('entradaValField').style.display=sim?'block':'none';}
function openModal(idx){
  editIdx=idx;const d=data[idx];
  document.getElementById('mCliente').value=d.cliente;
  document.getElementById('mEditSub').textContent=d.treinador+' · '+d.consultor;
  document.getElementById('mTreinamento').value=d.treinamento;
  document.getElementById('mTreinador').value=d.treinador||'-';
  document.getElementById('mConsultor').value=d.consultor;
  document.getElementById('mValor').value=d.valor.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  document.getElementById('mStatus').value=d.status;
  document.getElementById('mEntrada').value=d.entrada>0?d.entrada.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):'';
  setEntradaToggle(d.entrada>0);onEditTreinamentoChange();
  // ── Elevar z-index se modal de clientes vinculados estiver aberto ──
  var ov = document.getElementById('clientesVinculadosOverlay');
  var mo = document.getElementById('modalOverlay');
  var co = document.getElementById('confirmOverlay');
  if(ov && ov.classList.contains('open')){
    if(mo) mo.classList.add('sobre-vinculados');
    if(co) co.classList.add('sobre-vinculados');
  } else {
    if(mo) mo.classList.remove('sobre-vinculados');
    if(co) co.classList.remove('sobre-vinculados');
  }
  if(mo) mo.classList.add('open');
}
function closeModal(){
  var mo=document.getElementById('modalOverlay');
  var co=document.getElementById('confirmOverlay');
  if(mo){ mo.classList.remove('open'); mo.classList.remove('sobre-vinculados'); }
  if(co) co.classList.remove('sobre-vinculados');
  editIdx=null;
}
function saveEdit(){
  if(editIdx===null)return;
  const nome=document.getElementById('mCliente').value.trim();if(!nome){document.getElementById('mCliente').focus();return;}
  const trein=document.getElementById('mTreinamento').value,ic=trein==='CI';
  data[editIdx].cliente=nome.toUpperCase();
  if(typeof window._setTreinamentoScalar==='function') window._setTreinamentoScalar(data[editIdx], trein);
  else data[editIdx].treinamento=trein;
  data[editIdx].treinador=ic?document.getElementById('mTreinador').value:'-';
  const consultorSalvo=document.getElementById('mConsultor').value;
  data[editIdx].consultor=consultorSalvo;
  const mValorRaw=document.getElementById('mValor').value.trim();data[editIdx].valor=mValorRaw===''?data[editIdx].valor:parseVal(mValorRaw);
  var _statusAntes=data[editIdx].status;
  data[editIdx].status=document.getElementById('mStatus').value;
  data[editIdx].entrada=entradaRealizada?parseVal(document.getElementById('mEntrada').value):0;
  /* Notificar pagamento quando status muda para 'pago' */
  if(_statusAntes!=='pago'&&data[editIdx].status==='pago'&&typeof window._notifOnPagamento==='function'){
    window._notifOnPagamento(_turmaAtiva&&_turmaAtiva.id,_turmaAtiva&&_turmaAtiva.nome,data[editIdx].cliente,data[editIdx].consultor,data[editIdx].valor);
  }
  closeModal();markUnsaved();saveStorage();renderAll();renderConsultor();renderTreinador();renderProduto();
  // Se o modal de clientes vinculados estava aberto, re-renderizá-lo com dados atualizados
  var ov=document.getElementById('clientesVinculadosOverlay');
  if(ov&&ov.classList.contains('open')&&typeof abrirClientesVinculados==='function'){
    var nomEl=document.getElementById('cvNome');
    if(nomEl&&nomEl.textContent) abrirClientesVinculados(nomEl.textContent);
    else if(consultorSalvo) abrirClientesVinculados(consultorSalvo);
  }
}
function openConfirm(idx){
  confirmIdx=idx;
  document.getElementById('confirmMsg').textContent='Excluir '+(data[idx]?data[idx].cliente.toUpperCase():'?')+'? Esta ação não pode ser desfeita.';
  var co=document.getElementById('confirmOverlay');
  var ov=document.getElementById('clientesVinculadosOverlay');
  if(ov&&ov.classList.contains('open')) co.classList.add('sobre-vinculados');
  else co.classList.remove('sobre-vinculados');
  co.classList.add('open');
}
function cancelConfirm(){
  var co=document.getElementById('confirmOverlay');
  co.classList.remove('open');
  co.classList.remove('sobre-vinculados');
  confirmIdx=null;
}
function executeDelete(){
  if(confirmIdx===null)return;
  const idx=confirmIdx;
  var co=document.getElementById('confirmOverlay');
  co.classList.remove('open');
  co.classList.remove('sobre-vinculados');
  if(editIdx!==null)closeModal();
  confirmIdx=null;
  data.splice(idx,1);
  markUnsaved();saveStorage();renderAll();renderConsultor();renderTreinador();renderProduto();
  // Atualizar ou fechar modal de clientes vinculados
  var ov=document.getElementById('clientesVinculadosOverlay');
  if(ov&&ov.classList.contains('open')&&typeof abrirClientesVinculados==='function'){
    var nomEl=document.getElementById('cvNome');
    if(nomEl&&nomEl.textContent) abrirClientesVinculados(nomEl.textContent);
  }
}
function setAddEntradaToggle(sim){addEntradaRealizada=sim;document.getElementById('aToggleSim').className='etoggle'+(sim?' active-yes':'');document.getElementById('aToggleNao').className='etoggle'+(!sim?' active-no':'');document.getElementById('addEntradaValField').style.display=sim?'block':'none';}
// Modal simplificado para consultor — campos restritos
// ── Mini-menu "+" por linha de cliente ──
/* ═══════════════════════════════════════════
   TREINAMENTOS MÚLTIPLOS — helpers
═══════════════════════════════════════════ */
function _treinTotalId(listId){return listId==='aTreinamentosLista'?'aValorTotal':'cdValorTotal';}

function _removerUltimoTrein(listId){
  var container=document.getElementById(listId);
  if(!container)return;
  var rows=container.querySelectorAll('.trein-row');
  if(!rows.length) return;
  rows[rows.length-1].remove();
  _calcTotalTrein(listId);
  _checkCITreinador(listId);
  _updateRemoveBtns(listId);
}
window._removerUltimoTrein=_removerUltimoTrein;

function _updateRemoveBtns(listId){
  var container=document.getElementById(listId);
  if(!container)return;
  var rows=container.querySelectorAll('.trein-row');
  rows.forEach(function(row){
    var btn=row.querySelector('.trein-remove-btn');
    if(btn)btn.style.display='flex';
  });
}

function _addTreinRow(listId,cod,val){
  var container=document.getElementById(listId);
  if(!container)return;
  var opts='<option value="-">—</option>';
  var _tl=(typeof allTreinamentos!=='undefined'&&Array.isArray(allTreinamentos))?allTreinamentos:[];
  _tl.forEach(function(t){opts+='<option value="'+t+'"'+(cod===t?' selected':'')+'>'+t+'</option>';});
  var valStr=val?Number(val).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):'';
  var row=document.createElement('div');
  row.className='trein-row';
  row.style.cssText='display:flex;gap:6px;align-items:center;';
  row.innerHTML='<select class="modal-select trein-cod" style="flex:1;min-width:0;font-size:12px;padding:6px 8px;" onchange="_calcTotalTrein(\''+listId+'\');_checkCITreinador(\''+listId+'\')">'+opts+'</select>'
    +'<input type="text" inputmode="numeric" class="modal-input trein-valor" style="width:110px;flex-shrink:0;font-size:12px;padding:6px 8px;text-align:right;margin:0;" placeholder="0,00" value="'+valStr+'" oninput="this.value=lcMoneyMask(this.value);_calcTotalTrein(\''+listId+'\')">'
    +'<button type="button" class="trein-remove-btn" onclick="this.closest(\'.trein-row\').remove();_calcTotalTrein(\''+listId+'\');_checkCITreinador(\''+listId+'\');_updateRemoveBtns(\''+listId+'\')" style="width:28px;height:28px;border-radius:50%;border:1px solid var(--red);background:transparent;color:var(--red);cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;line-height:1;font-family:monospace;">×</button>';
  container.appendChild(row);
  _calcTotalTrein(listId);
  _checkCITreinador(listId);
  _updateRemoveBtns(listId);
}

function _calcTotalTrein(listId){
  var container=document.getElementById(listId);
  var totalEl=document.getElementById(_treinTotalId(listId));
  if(!container||!totalEl)return;
  var total=0;
  container.querySelectorAll('.trein-valor').forEach(function(inp){total+=parseVal(inp.value)||0;});
  totalEl.textContent=formatVal(total);
}

function _getTreinRows(listId){
  var container=document.getElementById(listId);
  if(!container)return[];
  var rows=[];
  container.querySelectorAll('.trein-row').forEach(function(row){
    var sel=row.querySelector('.trein-cod');
    var inp=row.querySelector('.trein-valor');
    if(!sel||!inp)return;
    var cod=sel.value;
    if(!cod||cod==='-')return;
    rows.push({cod:cod,valor:parseVal(inp.value)||0});
  });
  return rows;
}

function _checkCITreinador(listId){
  var container=document.getElementById(listId);
  if(!container)return;
  var hasCI=false;
  container.querySelectorAll('.trein-cod').forEach(function(sel){if(sel.value==='CI')hasCI=true;});
  if(listId==='aTreinamentosLista'){
    var rowEl=document.getElementById('addTreinadorRow');
    if(rowEl)rowEl.style.display=hasCI?'':'none';
  } else {
    var rowEl=document.getElementById('clienteDetalheTreinadorRow');
    if(rowEl)rowEl.style.display=hasCI?'flex':'none';
  }
}
window._addTreinRow=_addTreinRow;
window._calcTotalTrein=_calcTotalTrein;
window._getTreinRows=_getTreinRows;
window._checkCITreinador=_checkCITreinador;
window._updateRemoveBtns=_updateRemoveBtns;

window._abrirMenuCliente=function(e,nomeCliente,ri){
  e=e||window.event;
  if(e){ try{e.stopPropagation();}catch(_){} try{if(e.stopImmediatePropagation)e.stopImmediatePropagation();}catch(_){} try{e.preventDefault&&e.preventDefault();}catch(_){} }
  // Remove menu anterior se existir
  var old=document.getElementById('_menuCliente');
  if(old){ old.remove(); return; }

  // currentTarget pode ser null após re-render — fallback para target/activeElement
  var btn=(e&&(e.currentTarget||e.target))||document.activeElement;
  var rect=(btn&&btn.getBoundingClientRect)?btn.getBoundingClientRect():{bottom:120,left:80,right:120,top:100};

  var menu=document.createElement('div');
  menu.id='_menuCliente';
  // z-index máximo (acima de qualquer modal/overlay/drawer) + pointer-events explícito
  menu.style.cssText='position:fixed;z-index:2147483647;pointer-events:auto;background:var(--surface);border:1px solid var(--border2);border-radius:var(--radius);padding:6px;min-width:200px;'
    +'box-shadow:0 16px 48px rgba(0,0,0,.75);display:flex;flex-direction:column;gap:2px;';
  menu.style.top=(rect.bottom+6)+'px';
  menu.style.left=Math.min(rect.left,window.innerWidth-220)+'px';

  var opcoes=[
    {icon:'➕', label:'Adicionar treinamento', fn:function(){
      // Encontra o registro existente do cliente e abre o modal de edição
      var _riEdit=data.findIndex(function(d){
        return d&&d.cliente&&d.cliente===nomeCliente&&(!window._consultorAtivo||d.consultor===window._consultorAtivo);
      });
      if(_riEdit>=0){
        abrirClienteDetalhe(_riEdit);
        setTimeout(function(){
          /* Adiciona linha vazia APENAS se ainda não houver uma sem treinamento
             selecionado — evita duplicação por double-click ou re-render */
          var _cont=document.getElementById('cdTreinamentosLista');
          var _temVazia=false;
          if(_cont){
            _cont.querySelectorAll('.trein-row').forEach(function(row){
              var sel=row.querySelector('.trein-cod');
              if(sel && (!sel.value || sel.value==='-' || sel.value==='')) _temVazia=true;
            });
          }
          if(!_temVazia) _addTreinRow('cdTreinamentosLista');
          var _btns=document.getElementById('cdTreinBtns');
          if(_btns)_btns.style.display='';
        },80);
      }
    }},
    {icon:'✏️', label:'Editar registro', fn:function(){ abrirClienteDetalhe(ri); }},
    {icon:'ℹ️', label:'Ver informações', fn:function(){ openClientInfo(ri); }},
  ];

  opcoes.forEach(function(op){
    var item=document.createElement('button');
    item.style.cssText='display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:var(--radius-sm);cursor:pointer;border:none;background:none;font-family:"DM Sans",sans-serif;font-size:13px;color:var(--muted);width:100%;text-align:left;transition:background .12s;';
    item.innerHTML='<span style="font-size:14px;">'+op.icon+'</span><span>'+op.label+'</span>';
    item.onmouseover=function(){this.style.background='var(--surface2)';this.style.color='var(--text)';};
    item.onmouseout=function(){this.style.background='none';this.style.color='var(--muted)';};
    item.onclick=function(){ menu.remove(); op.fn(); };
    menu.appendChild(item);
  });

  document.body.appendChild(menu);
  setTimeout(function(){
    document.addEventListener('click',function _c(ev){
      if(ev && ev.target && menu.contains(ev.target)) return; // click dentro do menu não fecha
      menu.remove();
      document.removeEventListener('click',_c);
    });
  },50);
};

function openAddModalConsultor(){
  var _s=_getSessao?_getSessao():null;
  if(!_s||_s.perfil!=='consultor'){openAddModal();return;}
  // Pré-preencher campos fixos
  document.getElementById('aNome').value='';
  document.getElementById('aStatus').value='aberto';
  document.getElementById('aEntrada').value='';
  // Init multi-training list
  var _lista=document.getElementById('aTreinamentosLista');
  if(_lista){_lista.innerHTML='';_addTreinRow('aTreinamentosLista');}
  var _tot=document.getElementById('aValorTotal');if(_tot)_tot.textContent='R$ 0,00';
  var _trdRow=document.getElementById('addTreinadorRow');if(_trdRow)_trdRow.style.display='none';
  // Treinador e consultor: ocultar/fixar
  var _vinculo=_s.vinculo||_s.nome||'';
  var _aConsEl=document.getElementById('aConsultor');
  if(_aConsEl)_aConsEl.value=_vinculo;
  var _aTreinEl=document.getElementById('aTreinador');
  if(_aTreinEl){_aTreinEl.value='-';_aTreinEl.disabled=true;_aTreinEl.style.opacity='0.4';}
  // Ocultar campos que consultor não deve ver
  var _cRow=document.getElementById('addConsultorRow');
  if(_cRow)_cRow.style.display='none';
  setAddEntradaToggle(false);
  // Mudar título do modal
  var _mt=document.querySelector('#addModalOverlay .modal-title');
  if(_mt)_mt.textContent='Novo cliente';
  var _ms=document.querySelector('#addModalOverlay .modal-subtitle');
  if(_ms)_ms.textContent='Preencha os dados. O cliente será vinculado à sua conta.';
  document.getElementById('addModalOverlay').classList.add('open');
}

function openAddModal(){
  document.getElementById('aNome').value='';
  document.getElementById('aStatus').value='aberto';document.getElementById('aEntrada').value='';
  if(allConsultors.length)document.getElementById('aConsultor').value=allConsultors[0];
  // Init multi-training list
  var _lista=document.getElementById('aTreinamentosLista');
  if(_lista){_lista.innerHTML='';_addTreinRow('aTreinamentosLista');}
  var _tot=document.getElementById('aValorTotal');if(_tot)_tot.textContent='R$ 0,00';
  var _trdRow=document.getElementById('addTreinadorRow');if(_trdRow)_trdRow.style.display='none';
  if(allTrainers.length){var _trd=document.getElementById('aTreinador');if(_trd)_trd.value=allTrainers[0];}
  setAddEntradaToggle(false);document.getElementById('addModalOverlay').classList.add('open');
}
function closeAddModal(){
  document.getElementById('addModalOverlay').classList.remove('open');
  var _cRow=document.getElementById('addConsultorRow');
  if(_cRow)_cRow.style.display='';
  var _aTreinEl=document.getElementById('aTreinador');
  if(_aTreinEl){_aTreinEl.disabled=false;_aTreinEl.style.opacity='1';}
  // Resetar nome e consultor (podem ter sido fixados pelo fluxo de "adicionar treinamento")
  var _aNomeEl=document.getElementById('aNome');
  if(_aNomeEl){_aNomeEl.disabled=false;_aNomeEl.style.opacity='1';}
  var _aConsReset=document.getElementById('aConsultor');
  if(_aConsReset){_aConsReset.disabled=false;_aConsReset.style.opacity='1';}
  var _mt=document.querySelector('#addModalOverlay .modal-title');
  if(_mt)_mt.textContent='Novo cliente';
  var _ms=document.querySelector('#addModalOverlay .modal-subtitle');
  if(_ms)_ms.textContent='';
}
function saveAdd(){
  const nome=document.getElementById('aNome').value.trim();
  if(!nome){document.getElementById('aNome').focus();return;}
  // ── Regra 1: nome obrigatório com mínimo 2 palavras ──
  const _palavras=nome.trim().split(/\s+/);
  if(_palavras.length<2){
    _showToast('⚠️ Informe o nome completo (mínimo nome e sobrenome).','var(--amber)');
    document.getElementById('aNome').focus();
    return;
  }
  const nomeUp=nome.toUpperCase();
  const _consultorVal=document.getElementById('aConsultor').value;
  // ── Ler treinamentos múltiplos (opcional) ──
  var _treinRows=_getTreinRows('aTreinamentosLista');
  // ── Regra: 1 registro por cliente+consultor ──
  var _dupCliente=data.find(function(d){return d&&d.cliente&&d.cliente.toUpperCase()===nomeUp&&(d.consultor||'')===((_consultorVal)||'');});
  if(_dupCliente){
    _showToast('❌ "'+nomeUp+'" já tem registro neste consultor. Use "+" no card do cliente para adicionar treinamentos.','var(--red)');return;
  }
  // ── Gravar criadoPor ──
  var _sessA=_getSessao?_getSessao():null;
  var _criadoPor=_sessA?(_sessA.vinculo||_sessA.nome||_sessA.login||'adm'):'adm';
  var _valorTotal=_treinRows.reduce(function(a,t){return a+t.valor;},0);
  var _hasCI=_treinRows.some(function(t){return t.cod==='CI';});
  data.push({
    cliente:nomeUp,
    treinamento:_treinRows.length?_treinRows[0].cod:'-',
    treinamentos:_treinRows,
    treinador:_hasCI?document.getElementById('aTreinador').value:'-',
    consultor:_consultorVal,
    valor:_valorTotal,
    status:document.getElementById('aStatus').value,
    entrada:addEntradaRealizada?parseVal(document.getElementById('aEntrada').value):0,
    criadoPor:_criadoPor,
    presenca:'pendente',
    presencaLog:[]
  });
  closeAddModal();markUnsaved();saveStorage();renderAll();renderConsultor();renderTreinador();renderProduto();
  // Se estava no detalhe de um consultor, reabrir o detalhe ao invés de voltar ao grid
  if(window._consultorAtivo&&document.getElementById('consultorDetail')&&document.getElementById('consultorDetail').style.display!=='none'){
    _renderConsultorDetail(window._consultorAtivo);
  } else if(window._consultorAtivo){
    openConsultorDetail(window._consultorAtivo);
  }
}

/* ═══════════════════════════════════════════
   INFO CLIENTE
═══════════════════════════════════════════ */
let _ciIdx=null;
function openClientInfo(idx){
  _ciIdx=idx;
  const d=data[idx];
  document.getElementById('clientInfoSub').textContent=d.cliente+' · '+d.treinador+' · '+d.consultor;
  document.getElementById('clientInfoText').value=d.info||'';
  // Extrato (Opção 2): cards colapsáveis por treinamento (expande array d.treinamentos[])
  var extratoBlock=document.getElementById('clientInfoExtratoBlock');
  if(extratoBlock){
    var _nome=String(d.cliente||'').toUpperCase().trim();
    var _todas=Array.isArray(data)?data.filter(function(x){
      return x && x.cliente && String(x.cliente).toUpperCase().trim()===_nome;
    }):[];
    // ── Achatar: cada item da UI representa UM treinamento ──
    // Se a linha tem d.treinamentos[] array, expandir cada sub; senão usar campo simples.
    var _items=[];
    _todas.forEach(function(t){
      var ri=data.indexOf(t);
      if(Array.isArray(t.treinamentos) && t.treinamentos.length>0){
        t.treinamentos.forEach(function(sub,arrIdx){
          // Entrada usa _entradaParaSub (canônica): reatribui entradas de subs
          // pagos para o primeiro sub não-pago. Evita exibir entrada em sub
          // já quitado e duplicação via fallback t.entrada em múltiplos subs.
          var _entSub = (typeof window._entradaParaSub === 'function')
            ? window._entradaParaSub(t, arrIdx)
            : ((sub && sub.entrada!=null) ? sub.entrada : (t.entrada||0));
          _items.push({
            ri:ri, arrIdx:arrIdx, source:'array',
            cod: (sub && sub.cod) || '—',
            valor: (sub && sub.valor!=null) ? sub.valor : 0,
            entrada: _entSub,
            status: (sub && sub.status) || t.status || 'aberto',
            formaPagamento: (sub && sub.formaPagamento) || t.formaPagamento || '',
            parcelas: (sub && sub.parcelas && sub.parcelas>0) ? sub.parcelas : ((t.parcelas && t.parcelas>0) ? t.parcelas : 1)
          });
        });
      } else {
        _items.push({
          ri:ri, arrIdx:null, source:'single',
          cod: t.treinamento||'—',
          valor: t.valor||0,
          entrada: t.entrada||0,
          status: t.status||'aberto',
          formaPagamento: t.formaPagamento||'',
          parcelas: (t.parcelas && t.parcelas>0) ? t.parcelas : 1
        });
      }
    });
    var _totPago=0;
    _items.forEach(function(it){ if(it.status==='pago') _totPago += (it.valor||0); });
    var _fmt=function(v){ return (Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); };
    var _esc=function(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
    var _html=_items.map(function(it,_i){
      var isPago= it.status==='pago';
      var stCls = isPago?'pago':(it.status==='aberto'?'aberto':'neutro');
      var trein = _esc(String(it.cod||'—').toUpperCase());
      var forma = _esc(String(it.formaPagamento||'').toUpperCase());
      var parc  = it.parcelas || 1;
      var stBd  = isPago?'Pago':(it.status==='aberto'?'Aberto':_esc((it.status||'').toUpperCase()));
      var valStr= _fmt(it.valor);
      var entStr= _fmt(it.entrada);
      var dsArr = (it.arrIdx!=null) ? (' data-arr-idx="'+it.arrIdx+'"') : '';
      var openCls = ''; // todos os cards começam FECHADOS ao abrir o modal
      // Opções do dropdown FORMA DE PGTO
      var _formasPgto=['DINHEIRO','PIX','CARTÃO DE CRÉDITO','CARTÃO DE DÉBITO','BOLETO','TRANSFERÊNCIA','PARCELADO','APP / CARTEIRA','OUTROS'];
      var _formaOpts='<option value="">— SELECIONE —</option>'+_formasPgto.map(function(f){
        return '<option value="'+f+'"'+(forma===f?' selected':'')+'>'+f+'</option>';
      }).join('');
      // PIX, DÉBITO e TRANSFERÊNCIA são à vista → bloqueia parcelas em 1x
      var _semParc = window._ciFormaSemParcelas && window._ciFormaSemParcelas(forma);
      var _parcEfetivo = _semParc ? 1 : parc;
      // Opções do dropdown PARCELAS (1x a 12x)
      var _parcOpts='';
      for(var _p=1;_p<=12;_p++){
        _parcOpts+='<option value="'+_p+'"'+(_parcEfetivo===_p?' selected':'')+'>'+_p+'x</option>';
      }
      var _parcDisabledAttr = _semParc ? ' disabled' : '';
      // Status por sub-treinamento (essencial quando cliente tem múltiplos treinos: um pago, outro aberto)
      var _statusOpts = [
        {v:'aberto',l:'ABERTO'},{v:'pago',l:'PAGO'},{v:'entrada',l:'ENTRADA'},
        {v:'negociacao',l:'NEGOCIAÇÃO'},{v:'desistiu',l:'DESISTIU'},{v:'estorno',l:'ESTORNO'}
      ].map(function(s){return '<option value="'+s.v+'"'+(it.status===s.v?' selected':'')+'>'+s.l+'</option>';}).join('');
      return '<div class="ci-tcard '+stCls+openCls+'" data-ri="'+it.ri+'"'+dsArr+'>'
        +'<div class="ci-tcard-sum" onclick="window._ciToggleCard(this.parentNode)">'
          +'<span class="ci-tcard-cod '+stCls+'">'+trein+'</span>'
          +'<span class="ci-tcard-val '+stCls+'">'+valStr+'</span>'
          +'<span class="ci-tcard-st '+stCls+'">'+stBd+'</span>'
          +'<span class="ci-tcard-arrow">▶</span>'
        +'</div>'
        +'<div class="ci-tcard-det" onclick="event.stopPropagation()">'
          +'<div class="ci-tcard-form-row">'
            +'<div><label class="ci-tcard-l">Valor</label>'
              +'<input class="ci-tcard-v '+stCls+'" data-ri="'+it.ri+'"'+dsArr+' data-campo="valor" value="'+valStr+'" oninput="window._ciNumChange(this)"></div>'
            +'<div><label class="ci-tcard-l">Entrada</label>'
              +'<input class="ci-tcard-v entrada" data-ri="'+it.ri+'"'+dsArr+' data-campo="entrada" value="'+entStr+'" oninput="window._ciNumChange(this)" placeholder="R$ 0,00"></div>'
          +'</div>'
          +'<div class="ci-tcard-form-row">'
            +'<div><label class="ci-tcard-l">FORMA DE PGTO</label>'
              +'<select class="ci-tcard-v ci-tcard-sel" data-ri="'+it.ri+'"'+dsArr+' data-campo="formaPagamento" onchange="window._ciSelectChange(this)">'+_formaOpts+'</select></div>'
            +'<div><label class="ci-tcard-l">PARCELAS</label>'
              +'<select class="ci-tcard-v ci-tcard-sel parcelas" data-ri="'+it.ri+'"'+dsArr+' data-campo="parcelas" onchange="window._ciSelectChange(this)"'+_parcDisabledAttr+'>'+_parcOpts+'</select></div>'
          +'</div>'
          +'<div class="ci-tcard-form-row" style="grid-template-columns:1fr;">'
            +'<div><label class="ci-tcard-l">STATUS DESTE TREINAMENTO</label>'
              +'<select class="ci-tcard-v ci-tcard-sel status" data-ri="'+it.ri+'"'+dsArr+' data-campo="status" onchange="window._ciSelectChange(this)">'+_statusOpts+'</select></div>'
          +'</div>'
        +'</div>'
      +'</div>';
    }).join('');
    var _cntEl=document.getElementById('clientInfoCount');
    var _totEl=document.getElementById('clientInfoTotalPago');
    var _listEl=document.getElementById('clientInfoIvList');
    if(_cntEl) _cntEl.textContent=_items.length;
    if(_totEl) _totEl.textContent=_fmt(_totPago);
    if(_listEl) _listEl.innerHTML=_html;
    extratoBlock.style.display=_items.length?'':'none';
  }
  var _sessCI=_getSessao?_getSessao():null;
  var _perfilCI=_sessCI?_sessCI.perfil:'adm';
  var _soLeitura=_perfilCI==='consultor';
  var _isAdmCI=_perfilCI==='adm';
  var ta=document.getElementById('clientInfoText');
  ta.readOnly=_soLeitura;
  ta.style.opacity=_soLeitura?'0.7':'1';
  ta.style.cursor=_soLeitura?'default':'auto';
  var btnSalvar=document.querySelector('#clientInfoOverlay .modal-save');
  var btnLimpar=document.querySelector('#clientInfoOverlay .modal-del');
  if(btnSalvar) btnSalvar.style.display=_soLeitura?'none':'';
  if(btnLimpar) btnLimpar.style.display=_soLeitura?'none':'';
  // Campo nome: só ADM pode editar
  var campoNome=document.getElementById('clientInfoNomeCampo');
  var inpNome=document.getElementById('clientInfoNome');
  if(campoNome) campoNome.style.display=_isAdmCI?'':'none';
  if(inpNome) inpNome.value=d.cliente||'';
  document.getElementById('clientInfoOverlay').classList.add('open');
}
function closeClientInfo(){document.getElementById('clientInfoOverlay').classList.remove('open');_ciIdx=null;}
function saveClientInfo(){
  if(_ciIdx===null)return;
  data[_ciIdx].info=document.getElementById('clientInfoText').value.trim();
  // Forma de pagamento e parcelas agora vivem dentro de cada card de treinamento
  // (editados via _ciTextChange / _ciParcChange — já persistem ao digitar).
  var inpNome=document.getElementById('clientInfoNome');
  if(inpNome&&document.getElementById('clientInfoNomeCampo').style.display!=='none'){
    var novoNome=inpNome.value.trim().toUpperCase();
    if(novoNome) data[_ciIdx].cliente=novoNome;
  }
  closeClientInfo();markUnsaved();saveStorage();renderAll();renderConsultor();renderTreinador();
}
function clearClientInfo(){if(_ciIdx===null)return;data[_ciIdx].info='';closeClientInfo();markUnsaved();saveStorage();renderAll();}

/* ── Cards expansíveis no modal "Ver informações" (Opção 2 — Entrada editável) ── */
window._ciToggleCard=function(card){
  if(!card) return;
  card.classList.toggle('open');
};
window._ciNumChange=function(inp){
  var ri=parseInt(inp.getAttribute('data-ri'),10);
  var campo=inp.getAttribute('data-campo');
  var arrIdxAttr=inp.getAttribute('data-arr-idx');
  if(isNaN(ri)||!data[ri]||!campo) return;
  var raw=String(inp.value||'').trim().replace(/R\$\s*/gi,'').replace(/\./g,'').replace(',','.');
  var val=parseFloat(raw)||0;
  // Se há arrIdx e a linha tem treinamentos[], escreve dentro do sub correspondente
  if(arrIdxAttr!=null && arrIdxAttr!==''){
    var ai=parseInt(arrIdxAttr,10);
    if(Array.isArray(data[ri].treinamentos) && data[ri].treinamentos[ai]){
      data[ri].treinamentos[ai][campo]=val;
      // Para valor: recompor data[ri].valor como soma dos subs (para agregações)
      if(campo==='valor'){
        data[ri].valor=data[ri].treinamentos.reduce(function(s,t){return s+(t&&t.valor||0);},0);
      }
    } else {
      data[ri][campo]=val;
    }
  } else {
    // Sem arrIdx → linha simples, salva no nível da linha
    data[ri][campo]=val;
  }
  if(typeof markUnsaved==='function') markUnsaved();
  if(typeof saveStorage==='function') saveStorage();
};
window._ciTextChange=function(inp){
  var ri=parseInt(inp.getAttribute('data-ri'),10);
  var campo=inp.getAttribute('data-campo');
  if(isNaN(ri)||!data[ri]||!campo) return;
  data[ri][campo]=String(inp.value||'').trim().toUpperCase();
  if(typeof markUnsaved==='function') markUnsaved();
  if(typeof saveStorage==='function') saveStorage();
};
window._ciParcChange=function(inp){
  var ri=parseInt(inp.getAttribute('data-ri'),10);
  if(isNaN(ri)||!data[ri]) return;
  var v=String(inp.value||'').toLowerCase().replace('x','').trim();
  var n=parseInt(v,10);
  data[ri].parcelas=(n>0?n:1);
  if(typeof markUnsaved==='function') markUnsaved();
  if(typeof saveStorage==='function') saveStorage();
};
/* Formas de pagamento que NÃO permitem parcelamento (sempre à vista 1x) */
window._ciFormaSemParcelas=function(forma){
  var f=String(forma||'').toUpperCase().trim();
  return f==='PIX' || f==='CARTÃO DE DÉBITO' || f==='TRANSFERÊNCIA';
};
window._ciSelectChange=function(sel){
  var ri=parseInt(sel.getAttribute('data-ri'),10);
  var campo=sel.getAttribute('data-campo');
  var arrIdxAttr=sel.getAttribute('data-arr-idx');
  if(isNaN(ri)||!data[ri]||!campo) return;
  // Resolve alvo: sub se houver arrIdx + treinamentos[], senão linha
  var alvo=data[ri];
  var ehSub=false;
  if(arrIdxAttr!=null && arrIdxAttr!==''){
    var ai=parseInt(arrIdxAttr,10);
    if(Array.isArray(data[ri].treinamentos) && data[ri].treinamentos[ai]){
      if(!data[ri].treinamentos[ai]) data[ri].treinamentos[ai]={};
      alvo=data[ri].treinamentos[ai];
      ehSub=true;
    }
  }
  if(campo==='parcelas'){
    alvo.parcelas=parseInt(sel.value,10)||1;
  } else if(campo==='formaPagamento'){
    var novaForma=String(sel.value||'').toUpperCase();
    alvo.formaPagamento=novaForma;
    var card=sel.closest('.ci-tcard');
    var selParc=card?card.querySelector('select[data-campo="parcelas"]'):null;
    if(selParc){
      if(window._ciFormaSemParcelas(novaForma)){
        selParc.value='1';
        selParc.disabled=true;
        alvo.parcelas=1;
      } else {
        selParc.disabled=false;
      }
    }
  } else if(campo==='status'){
    alvo.status=sel.value;
    // Re-render do extrato inteiro para refletir status (mudança de cor de borda/badge)
    if(typeof _ciIdx==='number' && _ciIdx!==null && typeof openClientInfo==='function'){
      // Re-render apenas o bloco extrato (não reabre modal todo)
      var d=data[_ciIdx];
      if(d){
        // Forçar reprocessar bloco extrato com o novo status
        setTimeout(function(){
          var card2=document.querySelector('.ci-tcard[data-ri="'+ri+'"]'+(ehSub?'[data-arr-idx="'+arrIdxAttr+'"]':''));
          if(card2){
            var stCls = alvo.status==='pago'?'pago':(alvo.status==='aberto'?'aberto':'neutro');
            card2.classList.remove('pago','aberto','neutro');
            card2.classList.add(stCls);
            var cod = card2.querySelector('.ci-tcard-cod');
            var val = card2.querySelector('.ci-tcard-val');
            var bd  = card2.querySelector('.ci-tcard-st');
            [cod,val,bd].forEach(function(el){ if(el){ el.classList.remove('pago','aberto','neutro'); el.classList.add(stCls); }});
            if(bd) bd.textContent = alvo.status==='pago'?'Pago':(alvo.status==='aberto'?'Aberto':String(alvo.status||'').toUpperCase());
          }
        },0);
      }
    }
  } else {
    alvo[campo]=sel.value;
  }
  if(typeof markUnsaved==='function') markUnsaved();
  if(typeof saveStorage==='function') saveStorage();
};

/* ═══════════════════════════════════════════
   TÍTULO / INFO / PERÍODO
═══════════════════════════════════════════ */
function openTitleModal(){document.getElementById('titleInput').value=document.getElementById('dashTitle').textContent;document.getElementById('titleModalOverlay').classList.add('open');}
function closeTitleModal(){document.getElementById('titleModalOverlay').classList.remove('open');}
function saveTitleModal(){document.getElementById('dashTitle').textContent=document.getElementById('titleInput').value.trim()||"CI'S POR RESPONSÁVEL";closeTitleModal();markUnsaved('titulo');saveStorage();}
function openPeriodModal(){document.getElementById('periodStart').value=_periodStart;document.getElementById('periodEnd').value=_periodEnd;document.getElementById('periodModalOverlay').classList.add('open');}
function closePeriodModal(){document.getElementById('periodModalOverlay').classList.remove('open');}
function savePeriodModal(){
  const s=document.getElementById('periodStart').value,e=document.getElementById('periodEnd').value;
  _periodStart=s;_periodEnd=e;
  if(s&&e)_periodText=formatDate(s)+'  →  '+formatDate(e);
  else if(s)_periodText='A partir de '+formatDate(s);
  else if(e)_periodText='Até '+formatDate(e);
  else _periodText='';
  document.getElementById('periodBarText').textContent=_periodText;
  document.getElementById('periodBarInner').style.display=_periodText?'flex':'none';
  closePeriodModal();markUnsaved('period');saveStorage();
}
function clearPeriod(){_periodStart='';_periodEnd='';_periodText='';document.getElementById('periodStart').value='';document.getElementById('periodEnd').value='';document.getElementById('periodBarText').textContent='';document.getElementById('periodBarInner').style.display='none';closePeriodModal();markUnsaved('period');saveStorage();}
function openInfoModal(){document.getElementById('infoInput').value=document.getElementById('infoBarText').textContent;document.getElementById('infoModalOverlay').classList.add('open');}
function closeInfoModal(){document.getElementById('infoModalOverlay').classList.remove('open');}
function saveInfoModal(){const info=document.getElementById('infoInput').value.trim();document.getElementById('infoBarText').textContent=info;document.getElementById('infoBar').style.display=info?'block':'none';closeInfoModal();markUnsaved('info');saveStorage();}

/* ═══════════════════════════════════════════
   FOGO CANVAS
═══════════════════════════════════════════ */
window._fireRAF=null;window._particles=[];window._fireStartPct=66;window._fireEndPct=100;
function startFireCanvas(sp,ep){window._fireStartPct=sp;window._fireEndPct=ep;if(window._fireRAF)return;_animateFire();}
function stopFireCanvas(){if(window._fireRAF){cancelAnimationFrame(window._fireRAF);window._fireRAF=null;}window._particles=[];const cv=document.getElementById('fireCanvas');if(cv){const ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,cv.height);}}
function _animateFire(){
  const cv=document.getElementById('fireCanvas');if(!cv){window._fireRAF=null;return;}
  const pw=cv.parentElement?cv.parentElement.getBoundingClientRect().width:800;
  cv.width=pw;cv.height=65;const ctx=cv.getContext('2d');ctx.clearRect(0,0,pw,65);
  const zone=pw*(window._fireEndPct/100-window._fireStartPct/100),startX=pw*(window._fireStartPct/100);
  for(let i=0;i<Math.max(1,Math.round(zone/6));i++){window._particles.push({x:startX+Math.random()*zone,y:65,vy:-(0.6+Math.random()*1.4),vx:(Math.random()-.5)*.6,size:0.8+Math.random()*4.2,life:1,decay:0.030+Math.random()*0.020});}
  window._particles=window._particles.filter(p=>p.life>0);
  window._particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life-=p.decay;const a=p.life,r=Math.floor(255*Math.min(1,a*2)),g=Math.floor(180*Math.max(0,a-.3)),grad=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size);grad.addColorStop(0,`rgba(255,255,${Math.floor(200*a)},${a})`);grad.addColorStop(.4,`rgba(${r},${g},0,${a*.8})`);grad.addColorStop(1,'rgba(255,50,0,0)');ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fillStyle=grad;ctx.fill();});
  if(window._particles.length>500)window._particles=window._particles.slice(-500);
  window._fireRAF=requestAnimationFrame(_animateFire);
}



