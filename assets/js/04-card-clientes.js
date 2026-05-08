/* ════════════════════════════════════════════════════════════════
   CARD CLIENTES — Edição inline via SELECT + checkbox massa v14
   Fonte de dados: allConsultors, allTrainers, allTreinamentos
   (mesmas fontes usadas pelo modal "Novo cliente")
════════════════════════════════════════════════════════════════ */

/* lcMoneyMask / cardMoneyMask — wrappers de fmtMoney (Fase 1.C)
   cardMoneyMask preserva comportamento original de esvaziar quando reais===0. */
function lcMoneyMask(valor){ return fmtMoney(valor, 'inputMask'); }
function cardMoneyMask(el){
  var f = fmtMoney(el.value, 'inputMask');
  el.value = (f === '0,00') ? '' : f;
}

/* Atualiza data[] ao mudar um SELECT (treinamento, treinador, consultor, status) */
function cardCellChange(el){
  var ri    = parseInt(el.dataset.ri);
  var campo = el.dataset.campo;
  var val   = el.value;
  if(!Array.isArray(data)||!data[ri]) return;
  data[ri][campo] = val;
  // Atualizar classe de cor do status se for o select de status
  if(campo==='status'){
    cardUpdateStatusClass(el);
    // FIX: atualizar border-left da <tr> e cor do nome ao mudar status
    var trEl = el.closest('tr');
    if(trEl){
      var isPago = val==='pago';
      trEl.style.borderLeft = isPago?'2px solid #39ff14':'2px solid transparent';
      var tdNome = trEl.cells[0];
      if(tdNome) tdNome.style.color = isPago?'#39ff14':'';
      // Atualizar cor do input de valor conforme novo status
      var inpValor = trEl.querySelector('.card-num-valor');
      if(inpValor) _cardCorValor(inpValor, data[ri].valor, isPago);
    }
    // FIX: re-renderizar barras e rankings de performance instantaneamente
    _cardAtualizarBarras();
    // FIX: atualizar consultorDetail se estiver aberto
    if(window._consultorAtivo && document.getElementById('consultorDetail') &&
       document.getElementById('consultorDetail').style.display!=='none'){
      if(typeof _renderConsultorDetail==='function') _renderConsultorDetail(window._consultorAtivo);
    }
  }
  if(typeof markUnsaved==='function') markUnsaved();
  if(typeof saveStorage==='function') saveStorage();
  // Re-render parcial: atualiza métricas sem redesenhar toda a tabela
  _cardAtualizarMetricas();
}

/* Atualiza data[] ao mudar um input numérico (valor, entrada) */
function cardNumChange(el){
  var ri    = parseInt(el.dataset.ri);
  var campo = el.dataset.campo;
  if(!Array.isArray(data)||!data[ri]) return;
  var raw   = el.value.trim().replace(/R\$\s*/,'').replace(/\./g,'').replace(',','.');
  var num   = parseFloat(raw)||0;
  data[ri][campo] = num;
  // FIX: atualizar cor do input de valor por faixa de ticket ao digitar
  if(campo==='valor'){
    var isPago = data[ri].status==='pago';
    _cardCorValor(el, num, isPago);
  }
  if(typeof markUnsaved==='function') markUnsaved();
  if(typeof saveStorage==='function') saveStorage();
  _cardAtualizarMetricas();
}

/* Cor do input de valor por faixa de ticket */
function _cardCorValor(inputEl, valor, isPago){
  if(!inputEl) return;
  var v = parseFloat(valor)||0;
  var cor;
  if(isPago){
    cor = '#39ff14';  // neon quando pago
  } else if(v <= 5000){
    cor = 'var(--blue)';
  } else if(v <= 10000){
    cor = 'var(--amber)';
  } else {
    cor = 'var(--green)';
  }
  inputEl.style.color = cor;
  inputEl.style.fontWeight = isPago ? '700' : '600';
}

/* Re-renderiza apenas barras de performance e rankings — sem redesenhar tabela */
function _cardAtualizarBarras(){
  try{
    if(typeof renderAll==='function'){
      // renderAll redesenha a tabela o que perturba selects abertos
      // Chamar renderTreinador e renderConsultor que atualizam painéis laterais
      if(typeof renderTreinador==='function') renderTreinador();
      if(typeof renderConsultor==='function') renderConsultor();
    }
  } catch(e){ console.warn('[cardBarras]',e); }
}

/* Atualiza a classe de cor do select de status */
function cardUpdateStatusClass(el){
  var CLASSES=['cs-status-pago','cs-status-aberto','cs-status-negociacao',
               'cs-status-desistiu','cs-status-estorno','cs-status-entrada'];
  CLASSES.forEach(function(c){ el.classList.remove(c); });
  var s = el.value||'aberto';
  el.classList.add('cs-status-'+s);
}

/* Atualiza métricas do topo sem redesenhar a tabela inteira */
function _cardAtualizarMetricas(){
  // Atualiza apenas os cards de métricas (mTotal, mPago, etc.)
  // SEM redesenhar a tabela, para preservar o estado dos selects abertos
  try {
    if(typeof formatVal!=='function') return;
    var _sess = typeof _getSessao==='function'?_getSessao():null;
    var _perfil = _sess?_sess.perfil:'adm';
    var _vinculo = _sess?(_sess.vinculo||'').toUpperCase():'';
    var _base = (_perfil==='consultor'&&_vinculo)
      ? data.filter(function(d){ return (d.consultor||'').toUpperCase()===_vinculo; })
      : data;
    var totalPago   = _base.filter(function(d){return d.status==='pago';}).reduce(function(a,d){return a+d.valor;},0);
    var totalAberto = _base.filter(function(d){return d.status==='aberto';}).reduce(function(a,d){return a+d.valor;},0);
    var totalEnt    = _base.filter(function(d){return d.entrada>0;}).reduce(function(a,d){return a+d.entrada;},0);
    var nEnt        = _base.filter(function(d){return d.entrada>0;}).length;
    var _META       = typeof META!=='undefined'?META:0;
    var faltam      = Math.max(_META-totalPago,0);
    var pctGeral    = _META>0?Math.round((totalPago/_META)*100):0;
    var e;
    e=document.getElementById('mTotal');      if(e)e.textContent=formatVal(totalPago+totalAberto);
    e=document.getElementById('mTotalSub');   if(e)e.textContent=_base.length+' clientes';
    e=document.getElementById('mAberto');     if(e)e.textContent=formatVal(totalAberto);
    e=document.getElementById('mAbertoSub');  if(e)e.textContent=_base.filter(function(d){return d.status==='aberto';}).length+' clientes';
    e=document.getElementById('mPago');       if(e)e.textContent=formatVal(totalPago);
    e=document.getElementById('mPagoSub');    if(e)e.textContent=_base.filter(function(d){return d.status==='pago';}).length+' pago(s)';
    e=document.getElementById('mEntradas');   if(e)e.textContent=formatVal(totalEnt);
    e=document.getElementById('mEntradasSub');if(e)e.textContent=nEnt===0?'Nenhuma entrada':nEnt+' com entrada';
    e=document.getElementById('mFaltam');     if(e){e.textContent=faltam>0?formatVal(faltam):'META ATINGIDA! 🏆';e.style.color=faltam>0?'var(--red)':'#c8f05a';}
    e=document.getElementById('mPctSub');     if(e)e.innerHTML=pctGeral+'% ATINGIDO';
    e=document.getElementById('geralPct');
    if(e){ var _colG=typeof getCol==='function'?getCol(pctGeral):{text:'var(--red)'}; e.textContent=pctGeral+'%'; e.style.color=_colG.text; }
    e=document.getElementById('tableCount');  if(e)e.textContent=_base.length+' de '+data.length+' cliente'+(data.length!==1?'s':'');
    e=document.getElementById('tableTotal');  if(e)e.innerHTML='Total visível: <span>'+formatVal(totalPago+totalAberto)+'</span>';
    // FIX: barra de performance + FATURADO + FALTAM + cards treinadores
    if(typeof getCol==='function'){
      var _colP  = getCol(pctGeral);
      var _barW  = _META>0?Math.min(Math.round((totalPago/(_META*1.5))*100),100):0;
      var _ndlW  = _META>0?Math.round((_META/(_META*1.5))*100):67;
      e=document.getElementById('geralFill');
      if(e){ e.style.width=_barW+'%'; e.className='meta-fill '+(pctGeral>=100?'neon-green':pctGeral>=50?'neon-amber':'neon-red'); }
      e=document.getElementById('geralNeedle'); if(e) e.style.left=_ndlW+'%';
      e=document.getElementById('geralFat');    if(e) e.textContent='FATURADO: '+formatVal(totalPago);
      e=document.getElementById('geralFalta');
      if(e){ if(faltam>0){e.textContent='FALTAM: '+formatVal(faltam);e.style.color='var(--red)';}
             else{e.textContent='META ATINGIDA!';e.style.color='#c8f05a';} }
      e=document.getElementById('trainerMetaRows');
      if(e && typeof allTrainers!=='undefined' && allTrainers.length){
        var _miniG=typeof _getTurmaMinistante==='function'?_getTurmaMinistante():null;
        e.innerHTML=allTrainers.map(function(t){
          var tP=data.filter(function(d){return d.treinador===t&&d.status==='pago';}).reduce(function(a,d){return a+d.valor;},0);
          var tT=data.filter(function(d){return d.treinador===t;}).reduce(function(a,d){return a+d.valor;},0);
          var tA=data.filter(function(d){return d.treinador===t&&d.status==='aberto';}).reduce(function(a,d){return a+d.valor;},0);
          var tC=data.filter(function(d){return d.treinador===t;}).length;
          var tPct=_META>0?Math.round((tP/_META)*100):0;
          var tBw=Math.min(Math.round((tP/(_META*1.5))*100),100);
          var tCol=getCol(tPct);
          var tFat=Math.max(_META-tP,0);
          var _tBorder=(typeof tBorder!=='undefined'&&tBorder[t])||'#888';
          var isMini=_miniG===t;
          return '<div class="tc" style="border-left-color:'+_tBorder+';">'+'<div class="tc-header"><div>'
            +'<div class="tc-name">'+t.toUpperCase()+'</div>'
            +'<div class="tc-clients">'+tC+' cliente'+(tC!==1?'s':'')+'</div></div>'
            +(isMini?'<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:var(--blue-bg);color:var(--blue);">Ministrante</span>':'')
            +'<span class="tc-badge" style="background:'+tCol.bar+'22;color:'+tCol.text+';border:1px solid '+tCol.bar+'55;">'
            +(tPct>=100?'Meta!':tPct>=75?'Quase la!':tPct>=50?'Em progresso':tPct>=25?'Atencao':'Critico')+'</span>'
            +'</div>'
            +'<div class="tc-pct" style="color:'+tCol.text+';">'+tPct+'%</div>'
            +'<div class="tc-track"><div class="tc-fill" style="width:'+tBw+'%;background:'+tCol.bar+';"></div></div>'
            +'<div class="tc-stats">'
            +'<div class="tc-stat"><span class="tc-stat-label">Faturado</span><span class="tc-stat-val" style="color:var(--green);">'+formatVal(tP)+'</span></div>'
            +'<div class="tc-stat"><span class="tc-stat-label">Potencial</span><span class="tc-stat-val">'+formatVal(tT)+'</span></div>'
            +'<div class="tc-stat"><span class="tc-stat-label">Em aberto</span><span class="tc-stat-val" style="color:var(--amber);">'+formatVal(tA)+'</span></div>'
            +'<div class="tc-stat"><span class="tc-stat-label">Da meta</span><span class="tc-stat-val" style="color:'+tCol.text+';">'+tPct+'%</span></div>'
            +'</div>'
            +'<div style="margin-top:6px;"><span style="font-size:10px;color:var(--muted);">Faltam para meta</span> '
            +'<span style="font-size:11px;font-weight:700;color:'+tCol.text+';">'+formatVal(tFat)+'</span></div>'
            +'</div>';
        }).join('');
      }
    }
  } catch(err){ console.warn('[cardMetricas]',err); }
}

/* ── Checkbox do card Clientes ── */
function cardOnChkChange(){
  var todos    = document.querySelectorAll('.card-row-chk');
  var marcados = document.querySelectorAll('.card-row-chk:checked');
  // Visual das linhas
  document.querySelectorAll('#clientTable tr[data-ri]').forEach(function(tr){
    var chk = tr.querySelector('.card-row-chk');
    tr.classList.toggle('card-row-selected', !!(chk&&chk.checked));
  });
  // Sincronizar checkbox "selecionar todos"
  var chkAll = document.getElementById('cardChkAll');
  if(chkAll){
    chkAll.indeterminate = (marcados.length>0 && marcados.length<todos.length);
    chkAll.checked = (marcados.length===todos.length && todos.length>0);
  }
  // Exibir botão excluir dinâmico
  _cardAtualizarBtnExcluir(marcados.length, todos.length);
}

function cardToggleAll(checked){
  document.querySelectorAll('.card-row-chk').forEach(function(c){ c.checked=checked; });
  document.querySelectorAll('#clientTable tr[data-ri]').forEach(function(tr){
    tr.classList.toggle('card-row-selected', checked);
  });
  var todos = document.querySelectorAll('.card-row-chk').length;
  _cardAtualizarBtnExcluir(checked?todos:0, todos);
}

function _cardAtualizarBtnExcluir(marcados, total){
  var btn   = document.getElementById('cardBtnExcluirSel');
  var label = document.getElementById('cardBtnExcluirLabel');
  if(!btn) return;
  if(marcados===0){
    btn.style.display='none';
    return;
  }
  btn.style.display='inline-flex';
  if(label){
    label.textContent = (marcados===total && total>0)
      ? 'Excluir Todos ('+total+')'
      : 'Excluir Selecionados ('+marcados+')';
  }
}

function cardExcluirSelecionados(){
  var sels = Array.from(document.querySelectorAll('.card-row-chk:checked')).map(function(c){ return parseInt(c.dataset.ri); });
  if(!sels.length) return;
  var todos = document.querySelectorAll('.card-row-chk').length;
  var msg = (sels.length===todos && todos>0)
    ? 'Excluir TODOS os '+todos+' clientes? Esta ação não pode ser desfeita.'
    : 'Excluir '+sels.length+' cliente'+(sels.length!==1?'s':'')+' selecionado'+(sels.length!==1?'s':'')+'? Esta ação não pode ser desfeita.';
  if(!confirm(msg)) return;
  sels.sort(function(a,b){return b-a;}); // maior para menor para não deslocar índices
  sels.forEach(function(ri){ if(Array.isArray(data)&&data[ri]) data.splice(ri,1); });
  if(typeof markUnsaved==='function') markUnsaved();
  if(typeof saveStorage==='function') saveStorage();
  if(typeof buildSelects==='function') buildSelects();
  if(typeof buildFilterBtns==='function') buildFilterBtns();
  if(typeof renderAll==='function') renderAll();
  _showToast && _showToast('🗑 '+sels.length+' cliente'+(sels.length!==1?'s':'')+' excluído'+(sels.length!==1?'s':'')+'!','var(--red)');
}

window.cardCellChange       = cardCellChange;
window.cardNumChange        = cardNumChange;
window.cardUpdateStatusClass= cardUpdateStatusClass;
window.cardOnChkChange      = cardOnChkChange;
window.cardMoneyMask        = cardMoneyMask;
window.lcMoneyMask = lcMoneyMask; // global dual-mode
window.cardToggleAll        = cardToggleAll;
window.cardExcluirSelecionados = cardExcluirSelecionados;
