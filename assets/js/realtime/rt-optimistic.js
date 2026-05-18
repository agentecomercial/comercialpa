/* ════════════════════════════════════════════════════════════════
   RT-OPTIMISTIC — Optimistic updates com rollback automático
   ════════════════════════════════════════════════════════════════
   Hoje quando user edita uma célula:
     1. data[ri][campo] = novo  (otimista — assume sucesso)
     2. saveStorage() async ao Firebase
     3. Se Firebase falhar → o valor antigo se perde, mas user vê novo

   RTOptimistic envolve mutações em transação local:
     RTOptimistic.apply(ri, campo, novo)
       → guarda valor antigo
       → aplica novo (otimista)
       → quando 'save:fail' chegar → reverte + toast erro
       → quando 'save:ok' chegar → confirma (limpa pending)

   Funciona em conjunto com o RTBuffer (F2) e o sistema de save.
═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  // Map de operações pendentes: key → { ri, campo, antigo, novo, ts }
  var _pending = Object.create(null);
  var _idCounter = 0;

  function _key(ri, campo){
    return 'opt:' + ri + ':' + campo + ':' + (++_idCounter);
  }

  /* Aplica mudança otimista. Retorna handle para revert manual. */
  function apply(ri, campo, novoValor){
    if(typeof data === 'undefined' || !data[ri]){
      if(window.RTLog) window.RTLog.error('opt.apply', new Error('ri='+ri+' não existe em data'));
      return null;
    }
    var valorAntigo = data[ri][campo];
    var k = _key(ri, campo);
    _pending[k] = {
      ri: ri, campo: campo,
      antigo: valorAntigo, novo: novoValor,
      ts: Date.now()
    };
    data[ri][campo] = novoValor;
    if(window.RTLog) window.RTLog.event('opt:apply', { key: k, ri: ri, campo: campo });
    if(window.RTBus) window.RTBus.emit('data:mutate', { ri: ri, campo: campo, val: novoValor, source: 'optimistic' });
    return k;
  }

  /* Confirma operação (chamado em save:ok) */
  function confirm(k){
    if(!_pending[k]) return false;
    if(window.RTLog) window.RTLog.event('opt:confirm', { key: k });
    delete _pending[k];
    return true;
  }

  /* Reverte operação específica */
  function revert(k){
    var p = _pending[k];
    if(!p) return false;
    if(typeof data !== 'undefined' && data[p.ri]){
      data[p.ri][p.campo] = p.antigo;
      if(window.RTBus) window.RTBus.emit('data:mutate', { ri: p.ri, campo: p.campo, val: p.antigo, source: 'rollback' });
    }
    delete _pending[k];
    if(window.RTLog) window.RTLog.event('opt:revert', { key: k });
    return true;
  }

  /* Reverte TODAS as pendentes (ex: save:fail global) */
  function revertAll(){
    var keys = Object.keys(_pending);
    keys.forEach(function(k){ revert(k); });
    if(keys.length && typeof renderAll === 'function') renderAll();
    return keys.length;
  }

  /* Confirma TODAS as pendentes (ex: save:ok global) */
  function confirmAll(){
    var keys = Object.keys(_pending);
    keys.forEach(function(k){ confirm(k); });
    return keys.length;
  }

  /* Listagem para debug */
  function list(){
    var out = {};
    Object.keys(_pending).forEach(function(k){
      var p = _pending[k];
      out[k] = { ri: p.ri, campo: p.campo, antigo: p.antigo, novo: p.novo, idadeMs: Date.now()-p.ts };
    });
    return out;
  }

  window.RTOptimistic = {
    apply: apply,
    confirm: confirm,
    revert: revert,
    revertAll: revertAll,
    confirmAll: confirmAll,
    list: list,
    pendingCount: function(){ return Object.keys(_pending).length; }
  };

  /* Hooks no Bus: save:ok → confirma tudo; save:fail → reverte tudo + toast */
  if(window.RTBus){
    window.RTBus.on('save:ok', function(){
      confirmAll();
    });
    window.RTBus.on('save:fail', function(payload){
      var n = revertAll();
      if(n > 0 && typeof _showToast === 'function'){
        _showToast('⚠ Falha ao salvar — '+n+' alteraç' + (n>1?'ões':'ão') + ' revertida' + (n>1?'s':'') + '.', 'var(--red)');
      }
      if(window.RTLog) window.RTLog.error('opt.rollback', payload && payload.err);
    });
  }

  if(window.RTLog) window.RTLog.event('rt-optimistic', { ready: true });
})();
