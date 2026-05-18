/* ════════════════════════════════════════════════════════════════
   RT-RENDER — Render granular (opt-in via flag)
   ════════════════════════════════════════════════════════════════
   Hoje cada edição inline na tabela de clientes dispara renderAll(),
   que reconstrói N rows + KPIs + cards de treinadores.

   Para edições pontuais (mudou status de 1 cliente, valor de 1 célula),
   não há motivo para re-render full. RTRender oferece operações
   granulares que tocam só o que mudou.

   API:
     RTRender.row(ri)            — re-renderiza apenas 1 linha (data[ri])
     RTRender.kpis()             — re-renderiza só KPIs do topo
     RTRender.scheduleRow(ri)    — schedule via RTBuffer (coalesce)
     RTRender.scheduleKpis()     — schedule via RTBuffer (coalesce)

   FLAG: window.RT_OPTS.granularRender (default false).
   Quando false, helpers caem em renderAll() (segurança).
═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  function _flag(){
    return !!(window.RT_OPTS && window.RT_OPTS.granularRender);
  }

  /* Re-renderiza 1 linha específica da tabela principal.
     Estratégia: chama o construtor da linha que já existe (renderAll
     produz HTML inline; reproduzir requer o mesmo template).
     Por segurança, se a linha não puder ser identificada via DOM,
     faz fallback p/ renderAll. */
  function renderRow(ri){
    if(!_flag()){
      if(typeof renderAll === 'function') renderAll();
      return;
    }
    try {
      var tbody = document.getElementById('clientTable');
      if(!tbody){
        if(typeof renderAll === 'function') renderAll();
        return;
      }
      // Para esta fase, o caminho granular ainda CHAMA renderAll
      // (construir 1 row exige extrair o template da renderAll, que é
      // grande — fica para uma F3.1 quando o template for extraído).
      // Aqui o ganho real vem da COALESCÊNCIA via RTBuffer abaixo.
      if(typeof renderAll === 'function') renderAll();
      if(window.RTLog) window.RTLog.event('render:row', { ri: ri });
    } catch(e){
      if(window.RTLog) window.RTLog.error('render.row', e);
      if(typeof renderAll === 'function') renderAll();
    }
  }

  /* Re-renderiza só os KPIs do topo (Faturado, Aberto, Negociação, etc).
     Quando granularRender está ON, evita renderAll completo. */
  function renderKpis(){
    if(!_flag()){
      if(typeof renderAll === 'function') renderAll();
      return;
    }
    try {
      // O recálculo de KPIs é feito dentro de renderAll. Para evitar
      // duplicação do código de KPIs aqui, chamamos a função interna
      // _cardAtualizarMetricas que já existe em 04-card-clientes.js
      // (ela atualiza só os números do topo).
      if(typeof window._cardAtualizarMetricas === 'function'){
        window._cardAtualizarMetricas();
        if(window.RTLog) window.RTLog.event('render:kpis-partial', {});
        return;
      }
      // Fallback
      if(typeof renderAll === 'function') renderAll();
    } catch(e){
      if(window.RTLog) window.RTLog.error('render.kpis', e);
      if(typeof renderAll === 'function') renderAll();
    }
  }

  /* Schedule render via RTBuffer — coalesce N requests em 1 dentro
     de 80ms (debounce curto para parecer instantâneo). */
  function scheduleRow(ri){
    if(window.RTBuffer){
      window.RTBuffer.schedule('render:row:'+ri, function(){ renderRow(ri); }, 80);
    } else {
      renderRow(ri);
    }
  }

  function scheduleKpis(){
    if(window.RTBuffer){
      window.RTBuffer.schedule('render:kpis', renderKpis, 80);
    } else {
      renderKpis();
    }
  }

  /* Schedule renderAll com debounce maior — usar quando muitas coisas
     mudaram (ex: snapshot inteiro do Firebase chegou). */
  function scheduleAll(){
    if(window.RTBuffer){
      window.RTBuffer.schedule('render:all', function(){
        if(typeof renderAll === 'function') renderAll();
      }, 120);
    } else if(typeof renderAll === 'function') {
      renderAll();
    }
  }

  window.RTRender = {
    row:          renderRow,
    kpis:         renderKpis,
    scheduleRow:  scheduleRow,
    scheduleKpis: scheduleKpis,
    scheduleAll:  scheduleAll,
    /* Ativa granular render em runtime: window.RTRender.enable() */
    enable: function(){
      window.RT_OPTS = window.RT_OPTS || {};
      window.RT_OPTS.granularRender = true;
      if(window.RTLog) window.RTLog.event('render:enabled', { granular: true });
    },
    disable: function(){
      window.RT_OPTS = window.RT_OPTS || {};
      window.RT_OPTS.granularRender = false;
      if(window.RTLog) window.RTLog.event('render:disabled', { granular: false });
    }
  };

  if(window.RTLog) window.RTLog.event('rt-render', { ready: true, granular: _flag() });
})();
