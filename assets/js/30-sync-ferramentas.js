/* ═══════════════════════════════════════════
   SAVE / DISCARD
═══════════════════════════════════════════ */
function markUnsaved(categoria){
  document.getElementById('saveBar').classList.add('visible');
  if(categoria&&_dashDirty.hasOwnProperty(categoria)) _dashDirty[categoria]=true;
  else _dashDirty.clientes=true; // padrão: edição de dados de cliente
}
function confirmSave(){
  if(_turmaAtiva&&(window._fbUpdate||window._fbSave)){
    var patch=_buildPatch();
    var _before=_snapshotBefore();
    _setSaveStatus('saving');
    var op=window._fbUpdate
      ? window._fbUpdate(TURMAS_NODE+'/'+_turmaAtiva.id, patch)
      : window._fbSave(TURMAS_NODE+'/'+_turmaAtiva.id, patch);
    op.then(function(){
      savedData=JSON.stringify(data);
      document.getElementById('saveBar').classList.remove('visible');
      _resetDirty();
      _setSaveStatus('saved');
      if(typeof window._audit==='function') window._audit('turma.update',{type:'turma',id:_turmaAtiva.id},_buildAuditDiff(_before,patch));
      _showToast('🔥 Salvo no Firebase!','success');
    }).catch(function(e){
      _setSaveStatus('error');
      _showToast('❌ Erro ao salvar: '+(e&&e.message?e.message:e),'error');
    });
  } else {
    saveStorage();
    savedData=JSON.stringify(data);
    document.getElementById('saveBar').classList.remove('visible');
    _resetDirty();
    _setSaveStatus('saved');
    _showToast('💾 Salvo localmente!','success');
  }
}
// ═══════════════════════════════════════════════════════════
// MÓDULO MAPEAMENTO — Análise consolidada cross-turmas
// ═══════════════════════════════════════════════════════════
var _mapDados = null;       // cache de dados do Firebase
var _mapAnoSel = 0;         // ano selecionado (0 = todos)
var _mapMesesSel = [new Date().getMonth() + 1];  // default = mês corrente (era [] = todos)
var _mapProdSortCol = 'total';   // sort da tabela Consultor × Treinamento
var _mapProdSortDir = -1;        // -1 desc, 1 asc

function _setMapProdSort(col){
  if(_mapProdSortCol===col){ _mapProdSortDir *= -1; }
  else { _mapProdSortCol = col; _mapProdSortDir = -1; }
  _mapFiltrar();
}

function abrirTelaTurmas(){
  var _sT=_getSessao?_getSessao():null;
  var _pT=_sT?_sT.perfil:'adm';
  /* Bloqueio antigo era para todos não-ADM. Liberamos consultor para que ele possa
     ver a grade de turmas em "Gerenciar Turmas" e entrar em uma para acessar o dashboard.
     Ações destrutivas (criar/editar/excluir) continuam protegidas individualmente. */
  if(_pT!=='adm'&&_pT!=='ministrante'&&_pT!=='consultor'){_showToast('❌ Acesso restrito.','var(--red)');return;}
  _mostrarTela('telaTurmasScreen');
  renderTurmasGrid();
  // Restaurar layout persistido após renderizar
  if(_tturmasView!=='cards') setTimeout(function(){_tturmasSetView(_tturmasView);},50);
}
function fecharTelaTurmas(){
  _mostrarTela('turmasScreen');
  renderTurmasGrid();
}

function abrirMapeamento(btn){
  var _sM=_getSessao?_getSessao():null;
  var _pM=_sM?_sM.perfil:'adm';
  if(_pM!=='adm'){
    /* Marca o card como restrito (visualmente atenuado + ícone 🔒) sem
       precisar de toast a cada clique. Quem está logado como consultor
       já vê que não pode entrar antes mesmo de tentar. */
    var card = btn || document.getElementById('btnMapHome');
    if(card){
      card.classList.add('is-restricted');
      card.setAttribute('aria-disabled','true');
      card.removeAttribute('role');
    }
    _showToast('🔒 Acesso restrito ao ADM.','var(--amber)');
    return;
  }
  /* Feedback visual: troca seta por spinner enquanto a tela carrega */
  var card = btn || document.getElementById('btnMapHome');
  if(card) card.classList.add('is-loading');
  /* Usa rAF + microtimeout para garantir paint do spinner antes do work pesado */
  requestAnimationFrame(function(){
    setTimeout(function(){
      try { _mostrarTela('mapeamentoScreen'); _mapCarregar(false); }
      finally { if(card) card.classList.remove('is-loading'); }
    }, 30);
  });
}
/* Ao terminar de carregar a sessão, se o usuário não é ADM, já marca o card
   como restrito (não precisa esperar o clique para mostrar o estado). */
window.addEventListener('DOMContentLoaded', function(){
  setTimeout(function(){
    var s = (typeof _getSessao==='function') ? _getSessao() : null;
    if(!s) return;
    if(s.perfil !== 'adm'){
      var card = document.getElementById('btnMapHome');
      if(card){
        card.classList.add('is-restricted');
        card.setAttribute('aria-disabled','true');
      }
    }
  }, 800);
});
function fecharMapeamento(){
  _mapFiltroCruz=null;
  _mostrarTela('turmasScreen');
}

/* ─── Filtro cruzado entre os 3 painéis da tela Inteligência Comercial ─────
   Clicar num consultor (Faturamento), num treinamento (Ranking) ou numa célula
   da matriz (Cruzamento) filtra os outros dois painéis em torno dessa seleção.
   Re-clicar o mesmo item limpa o filtro. */
var _mapFiltroCruz = null; // { tipo:'consultor'|'treinamento'|'cruz', cons?, trein? }

function _mapToggleConsultor(c){
  if(_mapFiltroCruz && _mapFiltroCruz.tipo==='consultor' && _mapFiltroCruz.cons===c) _mapFiltroCruz=null;
  else _mapFiltroCruz = { tipo:'consultor', cons:c };
  _mapFiltrar();
}
function _mapToggleTreinamento(t){
  if(_mapFiltroCruz && _mapFiltroCruz.tipo==='treinamento' && _mapFiltroCruz.trein===t) _mapFiltroCruz=null;
  else _mapFiltroCruz = { tipo:'treinamento', trein:t };
  _mapFiltrar();
}
function _mapToggleCruz(c, t){
  var f=_mapFiltroCruz;
  if(f && f.tipo==='cruz' && f.cons===c && f.trein===t) _mapFiltroCruz=null;
  else _mapFiltroCruz = { tipo:'cruz', cons:c, trein:t };
  _mapFiltrar();
}
function _mapLimparFiltroCruz(){
  _mapFiltroCruz=null;
  _mapFiltrar();
}
window._mapToggleConsultor=_mapToggleConsultor;
window._mapToggleTreinamento=_mapToggleTreinamento;
window._mapToggleCruz=_mapToggleCruz;
window._mapLimparFiltroCruz=_mapLimparFiltroCruz;

/* Escapa nome para uso dentro de onclick="...'X'..." */
function _mapEscAttr(s){ return String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;'); }

function _atualizarBannerCruz(){
  var el=document.getElementById('mapFiltroCruzBanner');
  if(!el) return;
  if(!_mapFiltroCruz){ el.style.display='none'; el.innerHTML=''; return; }
  var f=_mapFiltroCruz;
  var label='';
  if(f.tipo==='consultor')   label='<span style="color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.07em;margin-right:6px;">Consultor</span><b style="color:var(--accent);">'+f.cons+'</b>';
  if(f.tipo==='treinamento') label='<span style="color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.07em;margin-right:6px;">Treinamento</span><b style="color:var(--accent);">'+f.trein+'</b>';
  if(f.tipo==='cruz')        label='<span style="color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.07em;margin-right:6px;">Consultor</span><b style="color:var(--accent);">'+f.cons+'</b><span style="color:var(--muted);margin:0 8px;">×</span><span style="color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.07em;margin-right:6px;">Treinamento</span><b style="color:var(--accent);">'+f.trein+'</b>';
  el.innerHTML='<span style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;background:var(--surface2);padding:3px 8px;border-radius:4px;">Filtro cruzado</span>'
    + '<span style="display:flex;align-items:center;gap:6px;">' + label + '</span>'
    + '<button onclick="_mapLimparFiltroCruz()" style="margin-left:auto;background:none;border:1px solid var(--border2);color:var(--muted);padding:4px 12px;border-radius:4px;font-size:11px;cursor:pointer;font-weight:600;">× Limpar</button>';
  el.style.display='flex';
}


function _mapCarregar(forcar) {
  if (!window._fbGet) { _showToast('❌ Firebase não disponível.', 'var(--red)'); return; }
  // Se já tem cache e não está forçando atualização, apenas filtra
  if (_mapDados && !forcar) { _mapFiltrar(); return; }

  /* Preserva a seleção atual de ano/meses do usuário para restaurar
     após o reload — ao clicar "Atualizar dados" não deve resetar filtros. */
  var _anoAnt   = _mapAnoSel;
  var _mesesAnt = Array.isArray(_mapMesesSel) ? _mapMesesSel.slice() : [];

  var loading = document.getElementById('mapLoading');
  var vazio   = document.getElementById('mapVazio');
  if (loading) loading.style.display = 'block';
  if (vazio)   vazio.style.display   = 'none';
  _mapLimparUI();

  /* REGRA GRANULAR — soma APENAS sub-treinamentos com status='pago'.
     Cliente em negociação com 1 sub pago entra com o valor desse sub.
     Mesma regra do KPI Faturado, filtro PAGO do card Clientes e tela Turmas.
     Cada SUB pago vira 1 registro: { consultor, treinamento, valor, ano, mes, turmaId, _src }

     UNIFICAÇÃO COM PIPELINE COMERCIAL (fonte da verdade):
     - turmas/* → registros com _src='turma'
     - pipelineSales/* → vendas avulsas com status='pago' viram registros com _src='avulso'
     - Schema idêntico entre as duas origens, garantindo que KPIs, Pareto, alertas
       e dashboard executivo reflitam o total real do funil (Pipeline). */
  Promise.all([
    window._fbGet(TURMAS_NODE).catch(function(){return {};}),
    window._fbGet('pipelineSales').catch(function(){return {};}),
    window._fbGet('pipelineGoals').catch(function(){return {};})
  ]).then(function(res){
    var fbTurmas       = res[0] || {};
    var fbPipelineSales = res[1] || {};
    var fbPipelineGoals = res[2] || {};
    /* Expõe global para o _mapRenderConsultores ler metas */
    window._mapGoalsPorMes = fbPipelineGoals;
    if (loading) loading.style.display = 'none';
    if ((!fbTurmas || !Object.keys(fbTurmas).length) &&
        (!fbPipelineSales || !Object.keys(fbPipelineSales).length)) {
      if (vazio) vazio.style.display = 'block';
      return;
    }

    var registros = [];
    var anosSet   = new Set();

    /* ── FONTE A: Turmas ─────────────────────────────── */
    Object.keys(fbTurmas).forEach(function(tid) {
      var t = fbTurmas[tid];
      if (!t) return;
      var periodStart = t.periodStart || '';
      var ano = 0, mes = 0;
      if (periodStart) {
        var partes = periodStart.split('-');
        ano = parseInt(partes[0]) || 0;
        mes = parseInt(partes[1]) || 0;
      }
      if (ano > 0) anosSet.add(ano);

      var clientes = t.clientes;
      if (clientes && !Array.isArray(clientes) && typeof clientes === 'object')
        clientes = Object.values(clientes).filter(Boolean);
      clientes = clientes || [];

      clientes.forEach(function(c) {
        if (!c || !c.cliente) return;
        var consultor = String(c.consultor || '—').trim().toUpperCase();
        if (Array.isArray(c.treinamentos) && c.treinamentos.length) {
          /* Cliente com array de subs: itera, conta só os pagos individualmente */
          c.treinamentos.forEach(function(sub){
            if (!sub) return;
            var st = sub.status || c.status || 'aberto';
            if (st !== 'pago') return;
            registros.push({
              consultor:   consultor,
              treinamento: String(sub.cod || c.treinamento || '—').trim().toUpperCase(),
              valor:       Number(sub.valor || 0) || 0,
              ano:         ano,
              mes:         mes,
              turmaId:     tid,
              _src:        'turma'
            });
          });
        } else {
          /* Cliente legado (sem array): cai no scalar */
          if (c.status !== 'pago') return;
          registros.push({
            consultor:   consultor,
            treinamento: String(c.treinamento || '—').trim().toUpperCase(),
            valor:       Number(c.valor || 0) || 0,
            ano:         ano,
            mes:         mes,
            turmaId:     tid,
            _src:        'turma'
          });
        }
      });
    });

    /* ── FONTE B: Vendas avulsas (pipelineSales/{ym}/{id}) ── */
    Object.keys(fbPipelineSales).forEach(function(ymKey){
      var bucket = fbPipelineSales[ymKey];
      if (!bucket || typeof bucket !== 'object') return;
      Object.keys(bucket).forEach(function(vid){
        var v = bucket[vid];
        if (!v) return;
        var status = String(v.status || '').toLowerCase().trim();
        if (status !== 'pago') return;

        /* ano/mes — prioridade: v.data (YYYY-MM-DD) → v.mes (YYYY-MM) → key ymKey */
        var ano = 0, mes = 0;
        var src = String(v.data || v.mes || ymKey || '');
        if (src){
          var p = src.split('-');
          ano = parseInt(p[0]) || 0;
          mes = parseInt(p[1]) || 0;
        }
        if (ano > 0) anosSet.add(ano);

        var consultor = String(v.consultorNome || v.consultor || '—').trim().toUpperCase();
        var produto   = String(v.produto || v.treinamento || '—').trim().toUpperCase();
        registros.push({
          consultor:   consultor,
          treinamento: produto,
          valor:       Number(v.valor || 0) || 0,
          ano:         ano,
          mes:         mes,
          turmaId:     null,
          vendaId:     vid,
          _src:        'avulso'
        });
      });
    });

    _mapDados = registros;
    /* Expõe pro IC (43-ic-alertas, 47-ic-executivo) */
    window._mapDados = registros;

    /* Diagnóstico — conferência rápida com Turmas e Pipeline Comercial */
    var qTurma  = registros.filter(function(r){return r._src==='turma';}).length;
    var qAvulso = registros.filter(function(r){return r._src==='avulso';}).length;
    var sTurma  = registros.filter(function(r){return r._src==='turma';}).reduce(function(a,r){return a+r.valor;},0);
    var sAvulso = registros.filter(function(r){return r._src==='avulso';}).reduce(function(a,r){return a+r.valor;},0);
    console.group('%c[Mapeamento] _mapCarregar — turmas + avulsas (Pipeline = fonte da verdade)', 'background:#c8f05a;color:#000;padding:2px 8px;font-weight:700;');
    console.log('Total de registros pagos:', registros.length, '(turma: '+qTurma+' · avulso: '+qAvulso+')');
    console.log('Soma turmas:  R$ ' + sTurma.toFixed(2));
    console.log('Soma avulsas: R$ ' + sAvulso.toFixed(2));
    console.log('Soma total:   R$ ' + (sTurma + sAvulso).toFixed(2));
    console.groupEnd();

    // Popular select de anos (2026 em diante)
    var anos = Array.from(anosSet).filter(function(a) { return a >= 2026; }).sort();
    if (anos.length === 0) anos = [new Date().getFullYear()];
    var sel = document.getElementById('mapAno');
    if (sel) {
      sel.innerHTML = '<option value="0">Todos</option>' +
        anos.map(function(a) { return '<option value="' + a + '">' + a + '</option>'; }).join('');
      /* Restaura o ano que o usuário tinha selecionado, se ainda existir;
         senão usa o ano mais recente como fallback. */
      var _anoRestaurar = (_anoAnt === 0 || anos.indexOf(_anoAnt) !== -1)
        ? _anoAnt
        : anos[anos.length - 1];
      sel.value = String(_anoRestaurar);
      _mapAnoSel = _anoRestaurar;
    }
    /* Restaura a seleção de meses anterior do usuário */
    _mapMesesSel = _mesesAnt;
    _mapAtualizarBotoesMes();

    _mapFiltrar();
  }).catch(function(e) {
    if (loading) loading.style.display = 'none';
    _showToast('❌ Erro ao carregar: ' + (e && e.message ? e.message : e), 'var(--red)');
  });
}

function _mapFiltrar() {
  if (!_mapDados) return;
  var sel = document.getElementById('mapAno');
  _mapAnoSel = sel ? parseInt(sel.value) || 0 : 0;

  // Filtrar registros apenas pelo período (sem sanitização — espelha a tela Turmas)
  var registros = _mapDados.filter(function(r) {
    if (_mapAnoSel > 0 && r.ano !== _mapAnoSel) return false;
    if (_mapMesesSel.length > 0 && !_mapMesesSel.includes(r.mes)) return false;
    return true;
  });

  _mapRenderKpis(registros);
  _mapRenderConsultores(registros);
  _mapRenderCorrelacao(registros);
  _mapRenderTreinamentos(registros);
  _atualizarBannerCruz();

  // Atualizar label de período
  var el = document.getElementById('mapFatPeriodo');
  if (el) {
    var label = _mapAnoSel > 0 ? String(_mapAnoSel) : 'Todos os anos';
    if (_mapMesesSel.length > 0) {
      var nomes = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      label += ' · ' + _mapMesesSel.map(function(m) { return nomes[m]; }).join(', ');
    }
    el.textContent = label;
  }

  var vazio = document.getElementById('mapVazio');
  if (vazio) vazio.style.display = registros.length === 0 ? 'block' : 'none';
}

function _mapToggleMes(m) {
  var idx = _mapMesesSel.indexOf(m);
  if (idx >= 0) _mapMesesSel.splice(idx, 1);
  else          _mapMesesSel.push(m);
  _mapAtualizarBotoesMes();
  _mapFiltrar();
}

function _mapToggleMesTodos() {
  _mapMesesSel = [];
  _mapAtualizarBotoesMes();
  _mapFiltrar();
}

/* ── Atalhos rápidos de período ─────────────────────────
   modo: 'mes' | 'trim' | 'sem' | 'ytd' | 'ano' | 'tudo'  */
function _mapAtalho(modo){
  var hoje = new Date();
  var anoAtual = hoje.getFullYear();
  var mesAtual = hoje.getMonth() + 1;
  var meses = [];
  var ano = anoAtual;

  if(modo === 'mes'){
    meses = [mesAtual];
  } else if(modo === 'trim'){
    var trimIni = Math.floor((mesAtual-1)/3)*3 + 1;
    meses = [trimIni, trimIni+1, trimIni+2];
  } else if(modo === 'sem'){
    var semIni = mesAtual <= 6 ? 1 : 7;
    meses = [];
    for(var i=0; i<6; i++) meses.push(semIni + i);
  } else if(modo === 'ytd'){
    meses = [];
    for(var m=1; m<=mesAtual; m++) meses.push(m);
  } else if(modo === 'ano'){
    meses = []; /* todos os meses do ano */
  } else if(modo === 'tudo'){
    ano = 0; meses = [];
  }

  /* Aplica ano */
  var sel = document.getElementById('mapAno');
  if(sel){
    /* Se o ano selecionado não existe no select, mantém o atual */
    var temAno = Array.prototype.some.call(sel.options, function(o){ return parseInt(o.value) === ano; });
    if(temAno || ano === 0){
      sel.value = String(ano);
      _mapAnoSel = ano;
    } else {
      _mapAnoSel = parseInt(sel.value) || 0;
    }
  } else {
    _mapAnoSel = ano;
  }

  _mapMesesSel = meses;
  _mapAtualizarBotoesMes();

  /* Highlight visual do atalho ativo */
  document.querySelectorAll('.ic-atalho').forEach(function(b){
    var on = (b.getAttribute('onclick')||'').indexOf("'"+modo+"'") >= 0;
    b.classList.toggle('active', on);
  });

  _mapFiltrar();
}

function _mapAtualizarBotoesMes() {
  var todos = document.getElementById('mapMTodos');
  if (todos) todos.className = 'fbtn' + (_mapMesesSel.length === 0 ? ' active' : '');
  for (var m = 1; m <= 12; m++) {
    var btn = document.getElementById('mapM' + m);
    if (btn) btn.className = 'fbtn' + (_mapMesesSel.includes(m) ? ' active' : '');
  }
}

function _mapLimparUI() {
  ['mapKpis','mapConsultorRows','mapTreinamentoRows','mapTop3Podio'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.innerHTML = '';
  });
  var t = document.getElementById('mapCorrelacaoTable'); if (t) t.innerHTML = '';
}

function _mapRenderKpis(registros) {
  var totalFat   = registros.reduce(function(a, r) { return a + r.valor; }, 0);
  var consultoresArr = [...new Set(registros.map(function(r) { return r.consultor; }))];
  var treinamentos = [...new Set(registros.map(function(r) { return r.treinamento; }))];
  var avulsos = registros.filter(function(r){ return r._src === 'avulso'; });
  var turmaRegs = registros.filter(function(r){ return r._src === 'turma'; });
  var fatAvulso = avulsos.reduce(function(a,r){return a+r.valor;},0);
  var fatTurma  = turmaRegs.reduce(function(a,r){return a+r.valor;},0);
  var pctAvulso = totalFat > 0 ? Math.round((fatAvulso/totalFat)*100) : 0;
  var ticketMedio = registros.length > 0 ? totalFat / registros.length : 0;

  var kpis = [
    { label: 'Faturamento Total', val: formatVal(totalFat),     cor: 'accent', sub: registros.length + ' venda' + (registros.length===1?'':'s') },
    { label: 'Vendas pagas',      val: registros.length,         cor: 'blue',   sub: 'turma '+turmaRegs.length+' · avulso '+avulsos.length },
    { label: 'Ticket médio',      val: formatVal(ticketMedio),   cor: 'green',  sub: 'por venda paga' },
    { label: 'Consultores ativos',val: consultoresArr.length,    cor: 'amber',  sub: treinamentos.length + ' produto' + (treinamentos.length===1?'':'s') },
    { label: '% Vendas avulsas',  val: pctAvulso + '%',          cor: pctAvulso >= 30 ? 'green' : (pctAvulso >= 15 ? 'amber' : 'red'), sub: formatVal(fatAvulso) }
  ];

  var el = document.getElementById('mapKpis');
  if (!el) return;
  el.innerHTML = kpis.map(function(k) {
    return '<div class="ic-kpi ic-kpi--'+k.cor+'">'
      +   '<div class="ic-kpi-lbl">' + k.label + '</div>'
      +   '<div class="ic-kpi-val">' + k.val + '</div>'
      +   (k.sub ? '<div class="ic-kpi-sub">' + k.sub + '</div>' : '')
      + '</div>';
  }).join('');

  /* Top 3 Pódio (separado em sua própria função) */
  _mapRenderTop3(registros);
}

/* ── Top 3 Consultores em formato pódio (2º · 1º · 3º) ─── */
function _mapRenderTop3(registros){
  var el = document.getElementById('mapTop3Podio');
  if(!el) return;
  /* Agrega por consultor */
  var byCons = {};
  registros.forEach(function(r){
    if(!r || !r.consultor) return;
    if(!byCons[r.consultor]) byCons[r.consultor] = {nome:r.consultor, fat:0, qtd:0};
    byCons[r.consultor].fat += r.valor;
    byCons[r.consultor].qtd++;
  });
  var lista = Object.values(byCons).sort(function(a,b){return b.fat-a.fat;}).slice(0,3);
  if(lista.length < 1){ el.style.display = 'none'; return; }
  el.style.display = '';

  /* Iniciais do consultor (primeiras letras dos 2 primeiros nomes) */
  function iniciais(nome){
    var partes = String(nome||'').trim().split(/\s+/);
    if(!partes.length) return '?';
    if(partes.length === 1) return partes[0].slice(0,2).toUpperCase();
    return (partes[0][0]+partes[partes.length-1][0]).toUpperCase();
  }

  var totFat = lista.reduce(function(s,c){return s+c.fat;},0);
  /* Layout pódio: ordem visual = 2º · 1º · 3º */
  var ordemVisual = [];
  if(lista[1]) ordemVisual.push({pos:2, c:lista[1]});
  if(lista[0]) ordemVisual.push({pos:1, c:lista[0]});
  if(lista[2]) ordemVisual.push({pos:3, c:lista[2]});

  var medals = {1:'🥇',2:'🥈',3:'🥉'};

  el.innerHTML = '<div class="ic-podio-h">'
    + '<div class="ic-podio-titulo">🏆 Pódio · Top 3 Consultores</div>'
    + '<div class="ic-podio-sub">Soma do trio: '+formatVal(totFat)+'</div>'
    + '</div>'
    + '<div class="ic-podio-grid">'
    + ordemVisual.map(function(o){
        var c = o.c;
        var pct = totFat > 0 ? Math.round((c.fat/totFat)*100) : 0;
        return '<div class="ic-podio-card pos-'+o.pos+'" onclick="_mapToggleConsultor(\''+_mapEscAttr(c.nome)+'\')" title="Filtrar por '+c.nome+'">'
          + '<div class="ic-podio-medal">'+medals[o.pos]+'</div>'
          + '<div class="ic-podio-aval">'+iniciais(c.nome)+'</div>'
          + '<div class="ic-podio-nome">'+c.nome+'</div>'
          + '<div class="ic-podio-fat">'+formatVal(c.fat)+'</div>'
          + '<div class="ic-podio-meta">'+c.qtd+' venda'+(c.qtd===1?'':'s')+' · '+pct+'% do trio</div>'
          + '</div>';
      }).join('')
    + '</div>';
}

function _mapRenderConsultores(registros) {
  /* Filtro cruzado: se há treinamento selecionado, restringe os valores a esse treinamento.
     O painel próprio do consultor permanece mostrando todos (highlight no selecionado). */
  var f = _mapFiltroCruz;
  var regs = registros;
  if(f && f.trein) regs = registros.filter(function(r){ return r.treinamento === f.trein; });

  var totalGeral = regs.reduce(function(a, r) { return a + r.valor; }, 0);
  var map = {};
  regs.forEach(function(r) {
    if (!map[r.consultor]) map[r.consultor] = { total: 0, qtd: 0 };
    map[r.consultor].total += r.valor;
    map[r.consultor].qtd++;
  });
  var lista = Object.keys(map).map(function(c) {
    return { nome: c, total: map[c].total, qtd: map[c].qtd };
  }).sort(function(a, b) { return b.total - a.total; });

  var el = document.getElementById('mapConsultorRows');
  if (!el) return;
  if (!lista.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:12px;">Nenhum dado no período.</div>'; return; }

  var maxVal = lista[0].total || 1;
  var medals = ['🥇', '🥈', '🥉'];
  var coresBarra = ['#22d3ee','#fb923c','#facc15','#ff5f57','#a78bfa','#34d399','#60a5fa','#c8f05a'];

  /* Puxa metas do Pipeline. Estrutura: pipelineGoals/{YYYY-MM}/{consultor}{metaMinima,...}
     - Se houver 1 mês selecionado no filtro IC, usa esse mês.
     - Se "Todos" ou mais de 1 mês: SOMA as metas dos meses selecionados.
     - Fallback: mês corrente. */
  function _goalsParaPeriodo(){
    var porMes = window._mapGoalsPorMes || window._npGoals || {};
    /* Se window._npGoals for "achatado" (sem ym), considera mês corrente */
    if(porMes && porMes.metaMinima){ return porMes; }
    var hoje = new Date();
    var meses = (Array.isArray(_mapMesesSel) && _mapMesesSel.length) ? _mapMesesSel : [hoje.getMonth()+1];
    var ano = _mapAnoSel > 0 ? _mapAnoSel : hoje.getFullYear();
    var soma = {};
    meses.forEach(function(m){
      var ym = ano + '-' + String(m).padStart(2,'0');
      var bucket = porMes[ym];
      if(!bucket) return;
      Object.keys(bucket).forEach(function(nome){
        var g = bucket[nome] || {};
        if(!soma[nome]) soma[nome] = {metaMinima:0, metaBasica:0, metaMaster:0, metaValor:0};
        soma[nome].metaMinima += +(g.metaMinima||0);
        soma[nome].metaBasica += +(g.metaBasica||0);
        soma[nome].metaMaster += +(g.metaMaster||0);
        soma[nome].metaValor  += +(g.metaValor||0);
      });
    });
    return soma;
  }
  var goals = _goalsParaPeriodo();

  var html = '<table class="fpc-tbl">'
    + '<thead><tr>'
    +   '<th class="c">#</th>'
    +   '<th class="c">Consultor</th>'
    +   '<th class="c">Progresso</th>'
    +   '<th class="c">Faturado</th>'
    +   '<th class="c">%</th>'
    +   '<th class="c">Meta</th>'
    +   '<th class="c">Falta Mínima</th>'
    +   '<th class="c">Falta Básica</th>'
    +   '<th class="c">Falta Master</th>'
    + '</tr></thead><tbody>';

  function _faltaCell(metaVal, total){
    if(!metaVal || metaVal <= 0) return '<td class="fpc-falta muted">—</td>';
    var diff = metaVal - total;
    if(diff <= 0) return '<td class="fpc-falta txt-green">✓ batida</td>';
    return '<td class="fpc-falta txt-amber">' + formatVal(diff) + '</td>';
  }

  lista.forEach(function(c, i){
    var ativo = f && f.cons === c.nome;
    var medal = medals[i] || '';
    var cor = coresBarra[i % coresBarra.length];
    var pctTotal = totalGeral > 0 ? Math.round((c.total / totalGeral) * 100) : 0;

    /* Metas do Pipeline (3 tiers) */
    var g = goals[c.nome] || {};
    var metaMin = +(g.metaMinima || 0);
    var metaBas = +(g.metaBasica || g.metaValor || 0);
    var metaMas = +(g.metaMaster || 0);
    /* Meta de referência = MASTER (objetivo máximo). Barra 100% = bateu o teto.
       Fallback: básica > mínima quando o tier maior não está configurado. */
    var metaRef = metaMas || metaBas || metaMin || 0;
    var temMeta = metaRef > 0;
    var pctMeta = temMeta ? Math.round((c.total / metaRef) * 100) : null;
    var pctClass = !temMeta ? 'muted' : pctMeta >= 100 ? 'txt-green' : pctMeta >= 70 ? 'txt-amber' : 'txt-red';
    var pctDisp = !temMeta ? (pctTotal + '%') : (pctMeta + '%');
    /* Barra e % usam mesmo denominador (metaRef = master) → barra 90% ⇔ "90%" */
    var bw = temMeta ? Math.min(100, pctMeta) : Math.round((c.total / maxVal) * 100);

    html += '<tr class="fpc-row'+(ativo?' ativo':'')+'" onclick="_mapToggleConsultor(\''+_mapEscAttr(c.nome)+'\')" title="Filtrar por '+c.nome+'">'
      + '<td class="fpc-rk">' + (i+1) + '</td>'
      + '<td class="fpc-nome">' + (medal ? '<span class="fpc-medal">'+medal+'</span> ' : '') + c.nome + '</td>'
      + '<td class="fpc-prog"><div class="fpc-bar"><div class="fpc-bar-fill" style="width:'+bw+'%;background:'+cor+';"></div></div></td>'
      + '<td class="fpc-val txt-green">' + formatVal(c.total) + '</td>'
      + '<td class="fpc-pct ' + pctClass + '">' + pctDisp + '</td>'
      + '<td class="fpc-meta">' + (temMeta ? formatVal(metaRef) : 'sem meta') + '</td>'
      + _faltaCell(metaMin, c.total)
      + _faltaCell(metaBas, c.total)
      + _faltaCell(metaMas, c.total)
      + '</tr>';
  });
  html += '</tbody></table>';
  el.innerHTML = html;
}

function _mapRenderCorrelacao(registros) {
  /* Espelha a estrutura do card "Consultor × Produto — Clientes Pagos"
     da aba Produto (renderProduto em 24-aba-produto.js):
     - Colunas = lista FIXA dos 15 treinamentos oficiais (allTreinamentos)
     - Cada célula = QTD (grande) + R$ (pequeno)
     - Colunas extras: "Total trein." (qtd) + "Total pago" (R$)
     - Cabeçalhos clicáveis para sort (consultor / qtd / total / produto)
     - Linha de totais por coluna no rodapé */
  var el = document.getElementById('mapCorrelacaoTable');
  if (!el) return;
  if (!registros.length) { el.innerHTML = ''; return; }

  var produtos = (typeof window.allTreinamentos !== 'undefined' && Array.isArray(window.allTreinamentos))
    ? window.allTreinamentos.slice()
    : [];
  /* Fallback: se allTreinamentos não está disponível, usa o que aparece nos registros */
  if (!produtos.length) {
    produtos = Array.from(new Set(registros.map(function(r){ return r.treinamento; }))).sort();
  }
  var consultores = Array.from(new Set(registros.map(function(r){ return r.consultor; }))).sort();

  function _sortArrow(col){
    if (_mapProdSortCol !== col) return '<span class="map-mtx-arrow inactive">↕</span>';
    return _mapProdSortDir === -1
      ? '<span class="map-mtx-arrow active">↓</span>'
      : '<span class="map-mtx-arrow active">↑</span>';
  }

  /* Marca a tabela com a classe para o CSS */
  el.className = 'map-mtx';
  var html = '<thead><tr>'
    + '<th class="map-mtx-th-cons" onclick="_setMapProdSort(\'consultor\')">Consultor ' + _sortArrow('consultor') + '</th>';
  produtos.forEach(function(p){
    var key = 'prod_' + p;
    html += '<th class="map-mtx-th-prod" onclick="_setMapProdSort(\'' + key + '\')">' + p + ' ' + _sortArrow(key) + '</th>';
  });
  html += '<th class="map-mtx-th-total" onclick="_setMapProdSort(\'qtd\')">Total trein. ' + _sortArrow('qtd') + '</th>';
  html += '<th class="map-mtx-th-total" onclick="_setMapProdSort(\'total\')">Total pago ' + _sortArrow('total') + '</th>';
  html += '</tr></thead><tbody>';

  /* Pré-cálculo das linhas por consultor */
  var linhas = consultores.map(function(c){
    var linhaTotal = registros.filter(function(r){ return r.consultor === c; }).reduce(function(a,r){ return a + r.valor; }, 0);
    var linhaQtd   = registros.filter(function(r){ return r.consultor === c; }).length;
    var prodVals   = {};
    produtos.forEach(function(p){
      var rows = registros.filter(function(r){ return r.consultor === c && r.treinamento === p; });
      prodVals['prod_' + p]         = rows.reduce(function(a,r){ return a + r.valor; }, 0);
      prodVals['prod_' + p + '_qtd'] = rows.length;
    });
    return { c: c, linhaTotal: linhaTotal, linhaQtd: linhaQtd, prodVals: prodVals };
  }).filter(function(l){ return l.linhaTotal > 0; });

  /* Ordenação */
  linhas.sort(function(a,b){
    var av, bv;
    if (_mapProdSortCol === 'consultor') { return a.c.localeCompare(b.c, 'pt-BR') * _mapProdSortDir; }
    if (_mapProdSortCol === 'total')     { av = a.linhaTotal; bv = b.linhaTotal; }
    else if (_mapProdSortCol === 'qtd')  { av = a.linhaQtd;   bv = b.linhaQtd;   }
    else                                 { av = a.prodVals[_mapProdSortCol] || 0; bv = b.prodVals[_mapProdSortCol] || 0; }
    return (av - bv) * _mapProdSortDir;
  });

  /* Totais por coluna */
  var totaisProd = {}, totaisQtd = {};
  produtos.forEach(function(p){ totaisProd[p] = 0; totaisQtd[p] = 0; });
  var totalGeral = 0, totalQtdGeral = 0;

  var f = _mapFiltroCruz;
  linhas.forEach(function(l){
    var rowAtivo = f && f.cons === l.c;
    var corNome = _mapEscAttr(l.c);
    html += '<tr class="map-mtx-row'+(rowAtivo?' map-mtx-row--ativo':'')+'">'
      + '<td onclick="_mapToggleConsultor(\''+corNome+'\')" title="Filtrar por '+l.c+'" class="map-mtx-td-cons">' + l.c + '</td>';
    produtos.forEach(function(p){
      var v   = l.prodVals['prod_' + p] || 0;
      var qtd = l.prodVals['prod_' + p + '_qtd'] || 0;
      totaisProd[p] += v;
      totaisQtd[p]  += qtd;
      if (qtd > 0) {
        var cellAtivo = f && f.tipo==='cruz' && f.cons===l.c && f.trein===p;
        var colAtivo  = f && f.trein===p && !cellAtivo;
        var cls = 'map-mtx-cell' + (cellAtivo ? ' map-mtx-cell--ativa' : colAtivo ? ' map-mtx-cell--col-ativa' : '');
        var prodEsc = _mapEscAttr(p);
        html += '<td class="'+cls+'" onclick="_mapToggleCruz(\''+corNome+'\',\''+prodEsc+'\')" title="'+l.c+' × '+p+'">'
          + '<span class="map-mtx-qtd">' + qtd + '</span>'
          + '<span class="map-mtx-val">' + formatVal(v) + '</span>'
          + '</td>';
      } else {
        html += '<td class="map-mtx-cell map-mtx-cell--empty">—</td>';
      }
    });
    totalGeral    += l.linhaTotal;
    totalQtdGeral += l.linhaQtd;
    html += '<td class="map-mtx-total-cell"><span class="map-mtx-total-num">' + l.linhaQtd + '</span></td>';
    html += '<td class="map-mtx-total-cell"><span class="map-mtx-total-val">' + formatVal(l.linhaTotal) + '</span></td>';
    html += '</tr>';
  });

  /* Linha de totais */
  html += '<tr class="map-mtx-row map-mtx-row--total">'
    + '<td class="map-mtx-td-cons map-mtx-total-label">Total</td>';
  produtos.forEach(function(p){
    if (totaisQtd[p] > 0) {
      html += '<td class="map-mtx-cell">'
        + '<span class="map-mtx-qtd">' + totaisQtd[p] + '</span>'
        + '<span class="map-mtx-val">' + formatVal(totaisProd[p]) + '</span>'
        + '</td>';
    } else {
      html += '<td class="map-mtx-cell map-mtx-cell--empty">—</td>';
    }
  });
  html += '<td class="map-mtx-total-cell"><span class="map-mtx-total-num">' + totalQtdGeral + '</span></td>';
  html += '<td class="map-mtx-total-cell"><span class="map-mtx-total-val">' + formatVal(totalGeral) + '</span></td>';
  html += '</tr></tbody>';
  el.innerHTML = html;
}

function _mapRenderTreinamentos(registros) {
  /* Filtro cruzado: se há consultor selecionado, restringe a esse consultor.
     O painel próprio do treinamento mantém todos (highlight no selecionado). */
  var f = _mapFiltroCruz;
  var regs = registros;
  if(f && f.cons) regs = registros.filter(function(r){ return r.consultor === f.cons; });

  var map = {};
  regs.forEach(function(r) {
    if (!map[r.treinamento]) map[r.treinamento] = { total: 0, qtd: 0 };
    map[r.treinamento].total += r.valor;
    map[r.treinamento].qtd++;
  });
  var lista = Object.keys(map).map(function(t) {
    return { nome: t, total: map[t].total, qtd: map[t].qtd };
  }).sort(function(a, b) { return b.total - a.total; });

  var el = document.getElementById('mapTreinamentoRows');
  if (!el) return;
  if (!lista.length) { el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:12px;">Nenhum dado no período.</div>'; return; }

  var totalGeral = lista.reduce(function(a, t) { return a + t.total; }, 0);
  var maxVal = lista[0].total || 1;
  var coresBarra = ['#22d3ee','#fb923c','#facc15','#34d399','#a78bfa','#f472b6','#60a5fa','#c8f05a'];
  el.innerHTML = lista.map(function(t, i) {
    var pct = totalGeral > 0 ? Math.round((t.total / totalGeral) * 100) : 0;
    var bw  = Math.round((t.total / maxVal) * 100);
    var cor = coresBarra[i % coresBarra.length];
    var ativo = f && f.trein === t.nome;
    var classe = 'np-cons-row' + (ativo ? ' ativo' : '');
    var pctClass = pct >= 20 ? 'txt-green' : pct >= 10 ? 'txt-amber' : 'txt-red';
    return '<div class="'+classe+'" onclick="_mapToggleTreinamento(\''+_mapEscAttr(t.nome)+'\')" title="Filtrar por '+t.nome+'">'
      + '<div class="np-cons-nome">' + (i+1) + '. ' + t.nome + '</div>'
      + '<div class="np-cons-bar"><div class="np-cons-bar-fill" style="width:'+bw+'%;background:'+cor+';"></div></div>'
      + '<div class="np-cons-val">' + formatVal(t.total) + '</div>'
      + '<div class="np-cons-pct ' + pctClass + '">' + pct + '%</div>'
      + '<div class="np-cons-meta">' + t.qtd + ' venda' + (t.qtd !== 1 ? 's' : '') + '</div>'
      + '</div>';
  }).join('');
}

function abrirSalvarTreinamentos(){
  document.getElementById('salvarTreinamentosOverlay').classList.add('open');
}
function fecharSalvarTreinamentos(){
  document.getElementById('salvarTreinamentosOverlay').classList.remove('open');
}

function salvarTodasTurmas(){
  if(!window._fbGet||!window._fbSave){_showToast('❌ Firebase não disponível.','var(--red)');return;}
  _showToast('🔄 Salvando treinamentos...','var(--muted)');
  window._fbGet(TURMAS_NODE).then(function(fbTurmas){
    if(!fbTurmas||!Object.keys(fbTurmas).length){_showToast('⚠️ Nenhum treinamento encontrado.','var(--amber)');return;}
    var ids=Object.keys(fbTurmas);
    var salvos=0,erros=0;
    var promises=ids.map(function(id){
      var t=fbTurmas[id];if(!t) return Promise.resolve();
      var clientes=t.clientes;
      if(clientes&&!Array.isArray(clientes)&&typeof clientes==='object') clientes=Object.values(clientes).filter(Boolean);
      var turmaCompleta=Object.assign({},t,{
        id:id,
        clientes:clientes||[],
        consultores:Array.isArray(t.consultores)?t.consultores:(t.consultores?Object.values(t.consultores):[]),
        treinadores:Array.isArray(t.treinadores)?t.treinadores:(t.treinadores?Object.values(t.treinadores):[])
      });
      return window._fbSave(TURMAS_NODE+'/'+id,turmaCompleta)
        .then(function(){salvos++;})
        .catch(function(e){erros++;console.error('[salvarTodasTurmas] erro '+id,e);});
    });
    return Promise.all(promises).then(function(){
      if(erros===0) _showToast('🔥 '+salvos+' treinamento'+(salvos!==1?'s':'')+ ' salvo'+(salvos!==1?'s':'')+ ' no Firebase!','var(--accent)');
      else _showToast('⚠️ '+salvos+' salvos, '+erros+' com erro.','var(--amber)');
    });
  }).catch(function(e){_showToast('❌ Erro: '+(e&&e.message?e.message:e),'var(--red)');});
}

function salvarTodasTurmasLocal(){
  if(!window._fbGet){_showToast('❌ Firebase não disponível.','var(--red)');return;}
  _showToast('🔄 Preparando backup...','var(--muted)');
  window._fbGet(TURMAS_NODE).then(function(fbTurmas){
    if(!fbTurmas||!Object.keys(fbTurmas).length){_showToast('⚠️ Nenhum treinamento encontrado.','var(--amber)');return;}
    var exportObj={};
    Object.keys(fbTurmas).forEach(function(id){
      var t=fbTurmas[id];if(!t) return;
      var clientes=t.clientes;
      if(clientes&&!Array.isArray(clientes)&&typeof clientes==='object') clientes=Object.values(clientes).filter(Boolean);
      exportObj[id]=Object.assign({},t,{
        clientes:clientes||[],
        consultores:Array.isArray(t.consultores)?t.consultores:(t.consultores?Object.values(t.consultores):[]),
        treinadores:Array.isArray(t.treinadores)?t.treinadores:(t.treinadores?Object.values(t.treinadores):[])
      });
    });
    var blob=new Blob([JSON.stringify(exportObj,null,2)],{type:'application/json'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='treinamentos_backup_'+new Date().toISOString().slice(0,10)+'.json';
    a.click();
    _showToast('💾 Backup baixado com sucesso!','var(--accent)');
  }).catch(function(e){_showToast('❌ Erro: '+(e&&e.message?e.message:e),'var(--red)');});
}

function atualizarDados(){
  if(!_turmaAtiva){_showToast('❌ Nenhuma turma ativa.','var(--red)');return;}
  var id=_turmaAtiva.id;
  _showToast('🔄 Buscando dados do Firebase...','var(--muted)');
  if(window._fbGet){
    window._fbGet('turma_dados/'+id).then(function(fbData){
      if(!fbData){
        _showToast('⚠️ Nenhum dado encontrado no Firebase para esta turma.','var(--amber)');
        return;
      }
      // Firebase pode retornar data como objeto {0:{...},1:{...}} em vez de array
      var fbArray=fbData.data;
      if(fbArray&&!Array.isArray(fbArray)){
        fbArray=Object.values(fbArray);
      }
      if(!fbArray||!fbArray.length){
        _showToast('⚠️ Firebase retornou estrutura vazia. Verifique o caminho: turma_dados/'+id,'var(--amber)');
        return;
      }
      // Salvar e aplicar
      fbData.data=fbArray;
      localStorage.setItem('ci_turma_'+id,JSON.stringify(fbData));
      data=fbArray;
      if(typeof _migrarTreinamentosHibrido==='function') _migrarTreinamentosHibrido(data);
      if(fbData.titulo) document.getElementById('dashTitle').textContent=fbData.titulo;
      if(fbData.periodText){
        _periodText=fbData.periodText;_periodStart=fbData.periodStart||'';_periodEnd=fbData.periodEnd||'';
        document.getElementById('periodBarText').textContent=fbData.periodText;
        document.getElementById('periodBarInner').style.display='flex';
      }
      savedData=JSON.stringify(data);
      buildSelects();buildFilterBtns();renderAll();renderConsultor();renderTreinador();renderProduto();
      /* Recarregar pipeline comercial (vendas + goals do mês) */
      if(typeof window._npColetarVendasTurma==='function') window._npColetarVendasTurma();
      else if(typeof window._npRenderTudo==='function') window._npRenderTudo();
      _showToast('✅ '+fbArray.length+' clientes carregados do Firebase!','var(--accent)');
    }).catch(function(e){
      _showToast('❌ Erro ao buscar: '+(e&&e.message?e.message:String(e)),'var(--red)');
    });
  } else {
    buildSelects();buildFilterBtns();renderAll();renderConsultor();renderTreinador();renderProduto();
    _showToast('✅ Tela atualizada!','var(--accent)');
  }
}
function fecharSyncModal(){document.getElementById('syncModalOverlay').classList.remove('open');}

/* ── P1: atualização leve da UI de turmas ──────────────────────────────────
   Chama renderTurmasGrid (a função real do sistema) se disponível.
   Pode ser invocada após qualquer alteração nos dados sem risco.
─────────────────────────────────────────────────────────────────────────── */
function atualizarTurmasUI(){
  try{
    if(typeof renderTurmasGrid==='function') renderTurmasGrid();
  }catch(e){ console.warn('[atualizarTurmasUI]',e); }
}

/* ── P2: atualização completa do sistema ───────────────────────────────────
   Wrapper seguro que chama as funções de render existentes.
   O botão "↻ Atualizar" já usa atualizarDados() que faz o fetch do Firebase.
   atualizarSistema() complementa com re-render das camadas visuais.
─────────────────────────────────────────────────────────────────────────── */
function atualizarSistema(){
  try{
    // Se está na tela de turmas — atualizar o grid de turmas
    if(typeof renderTurmasGrid==='function') renderTurmasGrid();
    // Se está no dashboard — re-renderizar tudo
    if(typeof buildSelects==='function')    buildSelects();
    if(typeof buildFilterBtns==='function') buildFilterBtns();
    if(typeof renderAll==='function')       renderAll();
    if(typeof renderConsultor==='function') renderConsultor();
    if(typeof renderTreinador==='function') renderTreinador();
    if(typeof renderProduto==='function')   renderProduto();
    if(typeof _showToast==='function')      _showToast('✅ Sistema atualizado!','var(--accent)');
  }catch(e){
    console.error('[atualizarSistema]',e);
    if(typeof _showToast==='function') _showToast('⚠️ Erro ao atualizar: '+e.message,'var(--amber)');
  }
}

function sincronizar(){
  if(!_turmaAtiva){_showToast('❌ Nenhuma turma ativa.','var(--red)');return;}
  saveStorage();
  savedData=JSON.stringify(data);
  document.getElementById('saveBar').classList.remove('visible');

  if(!window._fbGet){
    _showToast('❌ Firebase não disponível.','var(--red)');return;
  }

  // Abrir modal e mostrar carregando
  document.getElementById('syncModalOverlay').classList.add('open');
  document.getElementById('syncModalSub').textContent='Comparando dados locais com Firebase...';
  document.getElementById('syncModalBody').innerHTML='<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px;">Buscando dados do Firebase...</div>';
  document.getElementById('syncModalActions').innerHTML='<button class="modal-cancel" onclick="fecharSyncModal()">Cancelar</button>';

  // Buscar dados do Firebase para comparar
  var fbDados=null;
  var fbTurmas=null;
  var fbUsuarios=null;

  Promise.all([
    window._fbGet(TURMAS_NODE+'/'+_turmaAtiva.id).catch(function(){return null;}),
    window._fbGet('turma_dados/'+_turmaAtiva.id).catch(function(){return null;}),
    window._fbGet('usuarios').catch(function(){return null;})
  ]).then(function(results){
    // Usar nó unificado se disponível, senão fallback
    var fbTurmaUnif=results[0];
    var fbDadosAntigo=results[1];
    fbUsuarios=results[2]||{};

    if(fbTurmaUnif&&fbTurmaUnif.clientes){
      var c=fbTurmaUnif.clientes;
      if(!Array.isArray(c)&&typeof c==='object') c=Object.values(c).filter(Boolean);
      fbDados={data:c,titulo:fbTurmaUnif.titulo||'',meta:fbTurmaUnif.meta||0};
    } else {
      fbDados=fbDadosAntigo;
    }
    fbTurmas=null; // já não usamos índice separado
    _exibirComparacao(fbDados,fbTurmas,fbUsuarios);
  }).catch(function(e){
    document.getElementById('syncModalBody').innerHTML='<div style="color:var(--red);font-size:13px;text-align:center;padding:20px;">❌ Erro ao buscar dados do Firebase.</div>';
  });
}

function _exibirComparacao(fbDados,fbTurmas,fbUsuarios){
  var localClientes=data.length;
  var fbClientesArr=fbDados&&fbDados.data?fbDados.data:[];
  var fbClientes=fbClientesArr.length;
  var diffClientes=localClientes-fbClientes;

  // Derivar consultores/treinadores dos clientes do Firebase (não de campo separado)
  var localConsultores=allConsultors.length;
  var fbConsultoresSet=new Set(fbClientesArr.map(function(c){return c&&c.consultor;}).filter(Boolean));
  var fbConsultores=fbConsultoresSet.size;
  var diffConsultores=localConsultores-fbConsultores;

  var localTreinadores=allTrainers.length;
  var fbTreinadoresSet=new Set(fbClientesArr.map(function(c){return c&&c.treinador;}).filter(function(t){return t&&t!=='-';}));
  var fbTreinadores=fbTreinadoresSet.size;
  var diffTreinadores=localTreinadores-fbTreinadores;

  var localUsuarios=Object.keys(_getUsuariosLocal()).length;
  var fbUsuariosCount=Object.keys(fbUsuarios||{}).length;
  var diffUsuarios=localUsuarios-fbUsuariosCount;

  var temDiff=diffClientes!==0||diffTreinadores!==0||diffUsuarios!==0;

  function _row(label,local,fb,diff){
    var cor=diff>0?'var(--accent)':diff<0?'var(--red)':'var(--muted)';
    var sinal=diff>0?'+':'';
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--surface2);border-radius:var(--radius-sm);border:1px solid var(--border2);">'
      +'<span style="font-size:13px;font-weight:600;color:var(--text);">'+label+'</span>'
      +'<div style="display:flex;align-items:center;gap:16px;">'
      +'<span style="font-size:12px;color:var(--muted);">Local: <strong style="color:var(--text);">'+local+'</strong></span>'
      +'<span style="font-size:12px;color:var(--muted);">Firebase: <strong style="color:var(--text);">'+fb+'</strong></span>'
      +'<span style="font-size:12px;font-weight:700;color:'+cor+';">'+( diff!==0?sinal+diff:'✓ igual')+'</span>'
      +'</div>'
      +'</div>';
  }

  var sub=temDiff?'Foram encontradas diferenças entre local e Firebase:':'Dados locais e Firebase estão iguais.';
  document.getElementById('syncModalSub').textContent=sub;
  document.getElementById('syncModalBody').innerHTML=
    _row('Clientes',localClientes,fbClientes,diffClientes)+
    _row('Consultores',localConsultores,fbConsultores,diffConsultores)+
    _row('Treinadores',localTreinadores,fbTreinadores,diffTreinadores)+
    _row('Usuários',localUsuarios,fbUsuariosCount,diffUsuarios);

  document.getElementById('syncModalActions').innerHTML=
    '<button class="modal-cancel" onclick="fecharSyncModal()">Cancelar</button>'
    +'<button class="modal-save" style="background:var(--blue);border-color:var(--blue);flex:1;" onclick="fecharSyncModal();_executarPuxar()">⬇ Puxar Firebase → Local</button>'
    +'<button class="modal-save" style="flex:1;" onclick="fecharSyncModal();_executarEnviar()">⬆ Enviar Local → Firebase</button>';
}

function _executarEnviar(){
  if(!_turmaAtiva||(!window._fbUpdate&&!window._fbSave)){
    _showToast('❌ Firebase não disponível.','var(--red)');return;
  }
  _showToast('🔄 Enviando para Firebase...','var(--blue)');
  /* Envio completo: marcar tudo dirty para garantir que o patch inclua todos os campos */
  Object.keys(_dashDirty).forEach(function(k){_dashDirty[k]=true;});
  var patch=_buildPatch();
  var op=window._fbUpdate
    ? window._fbUpdate(TURMAS_NODE+'/'+_turmaAtiva.id, patch)
    : window._fbSave(TURMAS_NODE+'/'+_turmaAtiva.id, patch);
  var _t=setTimeout(function(){_showToast('❌ Firebase não respondeu.','var(--red)');},8000);
  op.then(function(){
    clearTimeout(_t);
    savedData=JSON.stringify(data);
    document.getElementById('saveBar').classList.remove('visible');
    _resetDirty();
    _showToast('✅ '+data.length+' clientes enviados ao Firebase!','var(--accent)');
  }).catch(function(e){
    clearTimeout(_t);
    _showToast('❌ Erro ao enviar: '+(e&&e.message?e.message:e),'var(--red)');
  });
}

function _executarPuxar(){
  if(!_turmaAtiva||!window._fbGet){
    _showToast('❌ Firebase não disponível.','var(--red)');return;
  }
  _showToast('🔄 Puxando do Firebase...','var(--blue)');
  var _t=setTimeout(function(){_showToast('❌ Firebase não respondeu.','var(--red)');},8000);

  // Lê nó unificado turmas/{id} + usuarios/ em paralelo
  Promise.all([
    window._fbGet(TURMAS_NODE+'/'+_turmaAtiva.id).catch(function(){return null;}),
    window._fbGet('turma_dados/'+_turmaAtiva.id).catch(function(){return null;}),
    window._fbGet('usuarios').catch(function(){return null;})
  ]).then(function(results){
    var fbTurma=results[0];
    var fbDadosAntigo=results[1];
    var fbUsuarios=results[2]||{};

    // ── Extrair clientes ──
    var clientes=[];
    if(fbTurma&&fbTurma.clientes){
      clientes=fbTurma.clientes;
      if(!Array.isArray(clientes)&&typeof clientes==='object'){
        clientes=Object.values(clientes).filter(Boolean);
      }
    } else if(fbDadosAntigo&&fbDadosAntigo.data){
      clientes=fbDadosAntigo.data;
      if(!Array.isArray(clientes)&&typeof clientes==='object'){
        clientes=Object.values(clientes).filter(Boolean);
      }
    }

    // ── Atualizar dados em memória ──
    data=clientes;
    savedData=JSON.stringify(data);

    // ── Atualizar metadados da turma ──
    if(fbTurma){
      var _treinadoresFB=Array.isArray(fbTurma.treinadores)?fbTurma.treinadores:(fbTurma.treinadores?Object.values(fbTurma.treinadores):[]);
      var _consultoresFB=Array.isArray(fbTurma.consultores)?fbTurma.consultores:(fbTurma.consultores?Object.values(fbTurma.consultores):[]);
      _turmaAtiva=Object.assign({},_turmaAtiva,{
        nome:fbTurma.nome||fbTurma.titulo||_turmaAtiva.nome,
        meta:fbTurma.meta||_turmaAtiva.meta,
        ministrante:fbTurma.ministrante||_turmaAtiva.ministrante,
        periodStart:fbTurma.periodStart||_turmaAtiva.periodStart,
        periodEnd:fbTurma.periodEnd||_turmaAtiva.periodEnd,
        periodText:fbTurma.periodText||_turmaAtiva.periodText,
        treinadores:_treinadoresFB.length?_treinadoresFB:_turmaAtiva.treinadores||[],
        consultores:_consultoresFB.length?_consultoresFB:_turmaAtiva.consultores||[]
      });
      META=(_turmaAtiva.meta!=null&&_turmaAtiva.meta!==undefined)?_turmaAtiva.meta:0;
      document.getElementById('turmaMetaLabel').innerHTML='META: <strong style="color:var(--text);">'+formatVal(META)+'</strong>';
      var _metaMobS=document.getElementById('turmaMetaLabelMobile'); if(_metaMobS) _metaMobS.textContent=formatVal(META);
      document.getElementById('metaValLabel').textContent=formatVal(META);
      if(_turmaAtiva.periodText){
        _periodText=_turmaAtiva.periodText;
        _periodStart=_turmaAtiva.periodStart||'';
        _periodEnd=_turmaAtiva.periodEnd||'';
        document.getElementById('periodBarText').textContent=_periodText;
        document.getElementById('periodBarInner').style.display='flex';
      }
      var titulo=fbTurma.titulo||fbTurma.nome||'';
      if(titulo) document.getElementById('dashTitle').textContent=titulo;
    }

    // ── Repopular consultores/treinadores do nó usuarios/ ──
    // BLOQUEIA apenas PAUSADOS (ativo:false). Congelados continuam visíveis
    // (só bloqueiam login).
    var consultoresDB=[];
    var treinadoresDB=[];
    var _bloqueadosNomes = new Set();
    var _registradosNomes = new Set();
    if(fbUsuarios&&typeof fbUsuarios==='object'){
      Object.values(fbUsuarios).forEach(function(u){
        if(!u||!u.nome) return;
        var nomeUp = String(u.nome).toUpperCase().trim();
        _registradosNomes.add(nomeUp);
        if(u.ativo === false){
          _bloqueadosNomes.add(nomeUp);
          return; // pausado → não entra no DB
        }
        var p=u.perfil||'';
        if(p==='consultor'&&!consultoresDB.includes(u.nome)) consultoresDB.push(u.nome);
        if((p==='treinador'||p==='ministrante')&&!treinadoresDB.includes(u.nome)) treinadoresDB.push(u.nome);
      });
    }
    // Complementar com dados dos clientes — só se o nome for REGISTRADO em usuarios/.
    // Bloqueados nunca voltam. Nomes fantasma (digitados sem cadastro) não entram.
    data.forEach(function(c){
      if(c.consultor){
        var n=String(c.consultor).toUpperCase().trim();
        if(!consultoresDB.includes(c.consultor) && !_bloqueadosNomes.has(n) && _registradosNomes.has(n))
          consultoresDB.push(c.consultor);
      }
      if(c.treinador && c.treinador!=='-'){
        var nt=String(c.treinador).toUpperCase().trim();
        if(!treinadoresDB.includes(c.treinador) && !_bloqueadosNomes.has(nt) && _registradosNomes.has(nt))
          treinadoresDB.push(c.treinador);
      }
    });
    allConsultors=consultoresDB.sort();
    allTrainers=treinadoresDB.sort();
    _buildColors();

    clearTimeout(_t);
    document.getElementById('saveBar').classList.remove('visible');
    buildSelects();buildFilterBtns();renderAll();renderConsultor();renderTreinador();renderProduto();
    _showToast('✅ '+data.length+' clientes puxados do Firebase!','var(--accent)');
  }).catch(function(e){
    clearTimeout(_t);
    _showToast('❌ Erro ao puxar: '+(e&&e.message?e.message:e),'var(--red)');
  });
}
function _showToast(msg,corOuTipo,ms){
  var _map={'var(--red)':'error','var(--accent)':'success','var(--green)':'success',
            'var(--amber)':'warn','var(--blue)':'info','var(--muted)':'info'};
  var tipo=/^(error|warn|success|info)$/.test(corOuTipo)?corOuTipo:(_map[corOuTipo]||'info');
  ms=ms||2800;
  var c=document.getElementById('toastContainer');
  if(!c){c=document.createElement('div');c.id='toastContainer';document.body.appendChild(c);}
  var t=document.createElement('div');
  t.className='toast '+tipo;
  t.textContent=msg;
  t.onclick=function(){_toastDismiss(t);};
  c.appendChild(t);
  setTimeout(function(){_toastDismiss(t);},ms);
}
function _toastDismiss(t){
  if(!t||t._leaving)return;
  t._leaving=true;t.classList.add('leaving');
  setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},220);
}
/* ── Skeleton helpers ── */
function _skelOn(el,template){
  if(typeof el==='string')el=document.getElementById(el);
  if(!el)return;
  el._skelPrev=el.innerHTML;
  el.innerHTML=template||'<div class="skeleton sk-line"></div><div class="skeleton sk-line" style="width:80%"></div><div class="skeleton sk-line-sm"></div>';
}
function _skelOff(el){
  if(typeof el==='string')el=document.getElementById(el);
  if(!el||el._skelPrev===undefined)return;
  el.innerHTML=el._skelPrev;delete el._skelPrev;
}
function _skelCards(n){
  var s='';for(var i=0;i<(n||3);i++)s+='<div class="skeleton sk-card"></div>';return s;
}
/* ── Save indicator ── */
var _saveIndTimer;
function _setSaveStatus(state,msg){
  var el=document.getElementById('saveIndicator');
  if(!el){el=document.createElement('div');el.id='saveIndicator';document.body.appendChild(el);}
  el.className='visible '+state;
  el.textContent=msg||(state==='saving'?'Salvando…':state==='saved'?'Salvo':'Erro ao salvar');
  clearTimeout(_saveIndTimer);
  if(state==='saved'||state==='error'){
    _saveIndTimer=setTimeout(function(){el.classList.remove('visible');},2000);
  }
}
/* ═══ AUDIT LOG — helpers ═══════════════════════════════ */
function _snapshotBefore(){
  if(!_turmaAtiva) return {};
  var clientesBefore=0;
  try{clientesBefore=JSON.parse(savedData||'[]').length;}catch(_){}
  return{titulo:_turmaAtiva.titulo||'',info:_turmaAtiva.info||'',
    periodStart:_turmaAtiva.periodStart||'',periodEnd:_turmaAtiva.periodEnd||'',
    _clientCount:clientesBefore};
}
function _buildAuditDiff(before,patch){
  var d={};
  ['titulo','info','periodStart','periodEnd'].forEach(function(k){
    if(k in patch&&JSON.stringify(before[k])!==JSON.stringify(patch[k])){
      d[k]=[_truncarAudit(before[k]),_truncarAudit(patch[k])];
    }
  });
  if('clientes' in patch){
    var depois=Array.isArray(patch.clientes)?patch.clientes.length:0;
    d.clientes=[before._clientCount+' reg.',depois+' reg.'];
  }
  return d;
}
function _truncarAudit(v){
  if(typeof v==='string'&&v.length>200) return v.slice(0,200)+'…';
  return v;
}
function abrirHistoricoTurma(){
  if(!_turmaAtiva||!window._fbGet) return;
  /* Helper local: _esc só está disponível dentro de IIFEs específicas. */
  function _esc(s){ return window._esc(s); }
  var id=_turmaAtiva.id;
  var modal=document.getElementById('auditModal');
  var body=document.getElementById('auditModalBody');
  if(!modal||!body) return;
  modal.style.display='flex';
  body.innerHTML=_skelCards(4);
  window._fbGet('audit_log_index/byTurma/'+id).then(function(idx){
    var keys=Object.keys(idx||{}).sort().reverse().slice(0,50);
    if(!keys.length){body.innerHTML='<div class="empty-state"><div class="empty-state-title">Nenhum registro ainda.</div></div>';return;}
    return Promise.all(keys.map(function(k){return window._fbGet('audit_log/'+k);})).then(function(eventos){
      body.innerHTML=eventos.filter(Boolean).map(function(ev){
        var d=new Date(ev.ts);
        var dt=d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
        var diffHtml='';
        if(ev.diff){
          diffHtml='<div class="audit-diff">'+Object.entries(ev.diff).map(function(e){
            var v=e[1];
            return '<span class="audit-field">'+e[0]+':</span> '+
              (Array.isArray(v)?'<s>'+_esc(String(v[0]))+'</s> → <b>'+_esc(String(v[1]))+'</b>':_esc(String(v)));
          }).join(' &nbsp;·&nbsp; ')+'</div>';
        }
        return '<div class="audit-row">'
          +'<div class="audit-meta"><span class="audit-user">'+_esc(ev.user||'—')+'</span><span class="audit-time">'+dt+'</span></div>'
          +'<div class="audit-action">'+_esc(ev.action||'—')+'</div>'
          +diffHtml+'</div>';
      }).join('');
    });
  }).catch(function(){body.innerHTML='<div class="empty-state"><div class="empty-state-title">Erro ao carregar histórico.</div></div>';});
}
function fecharAuditModal(){
  var m=document.getElementById('auditModal');if(m)m.style.display='none';
}
/* ═══════════════════════════════════════════════════════ */
function forcarSincFirebase(){
  if(!_turmaAtiva){_showToast('❌ Nenhuma turma ativa.','var(--red)');return;}
  if(!confirm('Isso vai limpar os dados locais e recarregar tudo do Firebase.\nContinuar?'))return;
  _showToast('🔄 Sincronizando com Firebase...','var(--blue)');
  var id=_turmaAtiva.id;
  localStorage.removeItem('ci_turma_'+id);
  window._fbGet('turma_dados/'+id).then(function(fbData){
    if(fbData&&fbData.data&&fbData.data.length){
      localStorage.setItem('ci_turma_'+id,JSON.stringify(fbData));
      data=fbData.data;
      if(typeof _migrarTreinamentosHibrido==='function') _migrarTreinamentosHibrido(data);
      if(fbData.titulo){document.getElementById('dashTitle').textContent=fbData.titulo;}
      if(fbData.info){document.getElementById('infoBarText').textContent=fbData.info;document.getElementById('infoBar').style.display='block';}
      if(fbData.periodText){
        _periodText=fbData.periodText;_periodStart=fbData.periodStart||'';_periodEnd=fbData.periodEnd||'';
        document.getElementById('periodBarText').textContent=fbData.periodText;
        document.getElementById('periodBarInner').style.display='flex';
      }
      savedData=JSON.stringify(data);
      buildSelects();buildFilterBtns();renderAll();
      _showToast('✅ Sincronizado! '+data.length+' clientes carregados.','var(--accent)');
      if(typeof _addPendLog==='function')_addPendLog('Força-sinc Firebase',''+data.length+' clientes','🔄');
    } else {
      _showToast('⚠️ Firebase vazio para esta turma. Faça um Salvar primeiro.','var(--amber)');
    }
  }).catch(function(e){
    _showToast('❌ Erro ao conectar ao Firebase: '+(e&&e.message?e.message:e),'var(--red)');
  });
}
function discardChanges(){try{data=JSON.parse(savedData);if(typeof _migrarTreinamentosHibrido==='function') _migrarTreinamentosHibrido(data);}catch(e){}document.getElementById('saveBar').classList.remove('visible');renderAll();}
function desfazerUltimo(){
  const b=localStorage.getItem(BACKUP_KEY);if(!b){alert('Nenhum backup disponível.');return;}
  if(!confirm('Desfazer último save?'))return;
  try{const s=JSON.parse(b);localStorage.setItem(STORAGE_KEY,b);if(s.data&&s.data.length)data=s.data;applyState(s);savedData=JSON.stringify(data);renderAll();alert('✅ Restaurado!');}catch(e){alert('Erro: '+e.message);}
}
function exportarUsuarios(){
  var local=_getUsuariosLocal();
  if(!local||Object.keys(local).length===0){
    var membros=_getMembros();
    var _ministrante=_getTurmaMinistante();
    membros.consultores.forEach(function(nome){
      var uid='consultor_'+_normalizeUid(nome);
      local[uid]={nome:nome,perfil:'consultor',login:'',senha:'',ativo:true};
    });
    membros.treinadores.forEach(function(nome){
      var uid='treinador_'+_normalizeUid(nome);
      var perfil=(_ministrante&&_ministrante.toUpperCase()===nome.toUpperCase())?'ministrante':'treinador';
      local[uid]={nome:nome,perfil:perfil,login:'',senha:'',ativo:true};
    });
  }
  var json=JSON.stringify(local,null,2);
  var overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML='<div style="background:var(--surface);border-radius:12px;padding:24px;width:90%;max-width:600px;display:flex;flex-direction:column;gap:12px;">'
    +'<div style="font-size:14px;font-weight:700;color:var(--text);">Copie o JSON e envie para o Claude:</div>'
    +'<textarea id="_exportTA" style="height:300px;background:var(--surface2);color:var(--text);border:1px solid var(--border2);border-radius:8px;padding:12px;font-size:11px;font-family:monospace;resize:none;width:100%;box-sizing:border-box;">'+json+'</textarea>'
    +'<div style="display:flex;gap:8px;">'
    +'<button onclick="document.getElementById(\'_exportTA\').select();document.execCommand(\'copy\');this.textContent=\'✅ Copiado!\';" style="flex:1;padding:10px;background:var(--accent);color:#0f0f0f;border:none;border-radius:8px;font-weight:700;cursor:pointer;">📋 Copiar tudo</button>'
    +'<button onclick="this.closest(\'div\').parentElement.parentElement.remove()" style="flex:1;padding:10px;background:var(--surface2);color:var(--text);border:1px solid var(--border2);border-radius:8px;font-weight:700;cursor:pointer;">Fechar</button>'
    +'</div>'
    +'</div>';
  document.body.appendChild(overlay);
}
function exportarBackup(){
  const state={data,titulo:document.getElementById('dashTitle').textContent,info:document.getElementById('infoBarText').textContent,periodStart:_periodStart,periodEnd:_periodEnd,periodText:_periodText,exportadoEm:new Date().toLocaleString('pt-BR')};
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(a.href);
}
function importarBackup(ev){
  const file=ev.target.files[0];if(!file)return;
  const r=new FileReader();r.onload=function(e){
    try{
      const s=JSON.parse(e.target.result);
      if(!s.data||!Array.isArray(s.data))throw new Error('Arquivo inválido — campo "data" ausente.');
      data=s.data;
      if(typeof _migrarTreinamentosHibrido==='function') _migrarTreinamentosHibrido(data);
      savedData=JSON.stringify(data);
      applyState(s);
      if(s.titulo){
        var _blqImp = window._bloqueadosNomesSet || window._pausadosNomesSet || new Set();
        var _regImp = window._usuariosRegistradosSet || null;
        var _np = function(n){
          var k = String(n||'').toUpperCase().trim();
          if(_blqImp.has(k)) return false;
          // Se temos lista de registrados, só aceita registrados; senão aceita todos
          return _regImp ? _regImp.has(k) : true;
        };
        allTrainers=[...new Set(data.map(d=>d.treinador).filter(t=>t&&t!=='-'&&_np(t)))];
        allConsultors=[...new Set(data.map(d=>d.consultor).filter(c=>c&&_np(c)))];
      }
      _buildColors();buildSelects();buildFilterBtns();
      renderAll();renderConsultor();renderTreinador();renderProduto();
      try{saveStorage();}catch(err){}
      // Fix 7+8: criar usuários no Firebase sem duplicar
      _sincronizarUsuariosImportacao(allConsultors,allTrainers);
      _showToast('\u2705 '+s.data.length+' clientes importados!','var(--accent)');
    }catch(err){
      _showToast('\u274c Erro ao importar: '+err.message,'var(--red)');
    }
    ev.target.value='';
  };r.readAsText(file);
}

/* Fix 7+8: Sincronizar consultores e treinadores no Firebase — sem duplicar */
function _sincronizarUsuariosImportacao(consultores,treinadores){
  if(!window._fbGet||!window._fbSave) return;
  window._fbGet('usuarios').then(function(existentes){
    var mapa={}; // nome.upper → uid
    if(existentes&&typeof existentes==='object'){
      Object.entries(existentes).forEach(function(e){
        var nome=(e[1].nome||'').toUpperCase();
        if(nome) mapa[nome]=e[0];
      });
    }
    var promessas=[];

    function _criarSeNaoExiste(nome,perfil){
      if(!nome||nome==='-') return;
      var nomeU=nome.toUpperCase();
      if(mapa[nomeU]) return; // já existe — não duplicar
      var uid=perfil+'_'+nomeU.toLowerCase().replace(/[^a-z0-9]/g,'_');
      var loginBase=nomeU.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
      var dados={
        nome:nomeU,login:loginBase,senha:loginBase,
        perfil:perfil,ativo:true,vinculo:nomeU,
        primeiroAcesso:true,createdAt:Date.now()
      };
      mapa[nomeU]=uid; // evitar duplicar na mesma importação
      // Salvar localmente
      var local=_getUsuariosLocal();
      if(!local[uid]){local[uid]=dados;_saveUsuariosLocal(local);}
      // Salvar no Firebase
      if(window._fbSave){
        promessas.push(
          window._fbSave('usuarios/'+uid,dados)
            .catch(function(e){console.warn('[import usuario]',e);})
        );
      }
    }

    (consultores||[]).forEach(function(n){_criarSeNaoExiste(n,'consultor');});
    (treinadores||[]).forEach(function(n){_criarSeNaoExiste(n,'treinador');});

    if(promessas.length>0){
      Promise.all(promessas).then(function(){
        _showToast('✅ '+promessas.length+' usuário(s) criado(s) no Firebase!','var(--accent)');
        _renderUsuariosGrid && _renderUsuariosGrid();
      });
    }
  }).catch(function(e){
    console.warn('[_sincronizarUsuariosImportacao]',e);
  });
}
window._sincronizarUsuariosImportacao=_sincronizarUsuariosImportacao;

/* ── Topbar kebab menu (mobile) ── */
window._toggleTopbarMenu=function(ev){
  if(ev) ev.stopPropagation();
  var menu=document.getElementById('topbarMenu');
  var btn=document.getElementById('btnTopbarKebab');
  if(!menu) return;
  var aberto=menu.classList.contains('open');
  if(aberto){
    menu.classList.remove('open');
    if(btn) btn.classList.remove('open');
  } else {
    menu.classList.add('open');
    if(btn) btn.classList.add('open');
    /* fechar ao clicar fora */
    setTimeout(function(){
      document.addEventListener('click',_fecharTopbarMenuFora,{once:true});
    },10);
  }
};
window._closeTopbarMenu=function(){
  var menu=document.getElementById('topbarMenu');
  var btn=document.getElementById('btnTopbarKebab');
  if(menu) menu.classList.remove('open');
  if(btn) btn.classList.remove('open');
};
function _fecharTopbarMenuFora(e){
  var menu=document.getElementById('topbarMenu');
  var btn=document.getElementById('btnTopbarKebab');
  if(!menu) return;
  if(menu.contains(e.target)||(btn&&btn.contains(e.target))) return;
  window._closeTopbarMenu();
}

/* ── Kebab "⋯" DESKTOP — agrupa ações (Sincronizar/Exportar/Importar/Atualizar/Histórico) ── */
window._toggleTopbarActionsMenu=function(ev){
  if(ev) ev.stopPropagation();
  var m=document.getElementById('topbarActionsMenu');
  if(!m) return;
  var abrindo=!m.classList.contains('open');
  m.classList.toggle('open',abrindo);
  if(abrindo){
    setTimeout(function(){
      document.addEventListener('click',_fecharTopbarActionsFora,{once:true});
    },10);
  }
};
window._closeTopbarActionsMenu=function(){
  var m=document.getElementById('topbarActionsMenu');
  if(m) m.classList.remove('open');
};
function _fecharTopbarActionsFora(e){
  var m=document.getElementById('topbarActionsMenu');
  if(!m) return;
  if(m.contains(e.target)) return;
  window._closeTopbarActionsMenu();
}
