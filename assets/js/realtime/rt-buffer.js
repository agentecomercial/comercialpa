/* ════════════════════════════════════════════════════════════════
   RT-BUFFER — Debounce/coalesce de operações realtime
   ════════════════════════════════════════════════════════════════
   Hoje cada edição inline (cardCellChange) faz:
     1. data[ri][campo] = val
     2. markUnsaved()
     3. saveStorage()    → Firebase write
     4. renderAll()      → re-render full

   Se usuário digita 5 dígitos seguidos, isso roda 5 vezes em <500ms.

   RTBuffer coalesce operações iguais dentro de uma janela:
     RTBuffer.schedule('save', fn, 300)   — agenda fn p/ rodar daqui 300ms
                                            se nada novo chegar
     RTBuffer.flush('save')               — força execução imediata
     RTBuffer.cancel('save')              — cancela pendente

   Padrão: a última chamada vence (debounce trailing). Eventos
   intermediários são descartados.
═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  // chave → { timer, fn, ts, count }
  var _pending = Object.create(null);

  var RTBuffer = {
    /* Agenda fn p/ rodar em delayMs (default 300).
       Se já há pendente com a mesma chave, substitui e reseta timer.
       Retorna o número de operações coalescidas (debug). */
    schedule: function(key, fn, delayMs){
      if(typeof fn !== 'function') return 0;
      delayMs = (typeof delayMs === 'number') ? delayMs : 300;
      var existing = _pending[key];
      if(existing){
        clearTimeout(existing.timer);
        existing.count++;
        existing.fn = fn; // a última fn vence
        existing.ts = Date.now();
        existing.timer = setTimeout(function(){
          var p = _pending[key];
          delete _pending[key];
          if(window.RTLog) window.RTLog.event('buffer:flush', { key: key, coalesced: p.count });
          try { p.fn(); }
          catch(e){ if(window.RTLog) window.RTLog.error('buffer.fn:'+key, e); }
        }, delayMs);
        return existing.count;
      }
      _pending[key] = {
        timer: setTimeout(function(){
          var p = _pending[key];
          delete _pending[key];
          if(window.RTLog) window.RTLog.event('buffer:flush', { key: key, coalesced: p.count });
          try { p.fn(); }
          catch(e){ if(window.RTLog) window.RTLog.error('buffer.fn:'+key, e); }
        }, delayMs),
        fn: fn,
        ts: Date.now(),
        count: 1
      };
      return 1;
    },

    /* Força execução imediata da fn pendente (síncrona) */
    flush: function(key){
      var p = _pending[key];
      if(!p) return false;
      clearTimeout(p.timer);
      delete _pending[key];
      try { p.fn(); return true; }
      catch(e){ if(window.RTLog) window.RTLog.error('buffer.flush:'+key, e); return false; }
    },

    /* Cancela pendente sem executar */
    cancel: function(key){
      var p = _pending[key];
      if(!p) return false;
      clearTimeout(p.timer);
      delete _pending[key];
      if(window.RTLog) window.RTLog.event('buffer:cancel', { key: key });
      return true;
    },

    /* Flush de TODOS os pendentes (ex: ao sair da página, salvar tudo) */
    flushAll: function(){
      var keys = Object.keys(_pending);
      keys.forEach(function(k){ RTBuffer.flush(k); });
      return keys.length;
    },

    /* Lista pendentes (debug) */
    list: function(){
      var out = {};
      Object.keys(_pending).forEach(function(k){
        var p = _pending[k];
        out[k] = { idadeMs: Date.now()-p.ts, coalesced: p.count };
      });
      return out;
    },

    /* Util: throttle leading-edge (1ª chamada roda já, demais ignoradas por X ms) */
    _throttleLeading: Object.create(null),
    throttle: function(key, fn, ms){
      ms = ms || 200;
      var last = this._throttleLeading[key] || 0;
      var now = Date.now();
      if(now - last >= ms){
        this._throttleLeading[key] = now;
        try { fn(); }
        catch(e){ if(window.RTLog) window.RTLog.error('throttle.fn:'+key, e); }
        return true;
      }
      return false;
    }
  };

  window.RTBuffer = RTBuffer;

  /* Antes do user fechar a aba, flush de tudo pendente para não perder edição */
  window.addEventListener('beforeunload', function(){
    RTBuffer.flushAll();
  });

  /* Quando troca de turma, flush de tudo (não acumular pendentes da turma antiga) */
  if(window.RTBus){
    window.RTBus.on('turma:leave', function(){
      RTBuffer.flushAll();
    });
  }

  if(window.RTLog) window.RTLog.event('rt-buffer', { ready: true });
})();
