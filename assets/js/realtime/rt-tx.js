/* ════════════════════════════════════════════════════════════════
   RT-TX — Wrapper de transações Firebase RTDB
   ════════════════════════════════════════════════════════════════
   Hoje saveStorage() faz UPDATE direto, que pode sobrescrever
   silenciosamente edição de outro usuário. Exemplo:

     T+0ms:  User A lê data, edita cliente X status → 'pago'
     T+50ms: User B lê data, edita cliente Y status → 'pago'
     T+200ms: A salva (update sobrescreve TUDO no nó)
     T+300ms: B salva (sobrescreve a edição de A)
     → A perde a edição silenciosamente

   RTTx.update(path, mutator) usa runTransaction() do RTDB:
     - Lê valor atual no servidor
     - Aplica mutator(atual) → novo
     - Tenta gravar; se servidor mudou no meio, RE-EXECUTA mutator
     - Garante atomicidade

   API simples para hot paths que precisam de consistência forte.
═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* Verifica se o SDK Firebase v9 modular está exposto */
  function _hasTxAPI(){
    return !!(window._fbDB && window._fbRunTransaction);
  }

  /* Roda uma transação no path:
       mutator(atual) → novo (ou undefined p/ abortar)
     Resolve com { committed, snapshot } ou rejeita.

     Se SDK não tiver runTransaction exposta, usa estratégia
     read-modify-write não-atômica (fallback).
  */
  function update(path, mutator){
    return new Promise(function(resolve, reject){
      if(_hasTxAPI()){
        try {
          window._fbRunTransaction(path, mutator).then(function(result){
            if(window.RTLog) window.RTLog.event('tx:committed', { path: path });
            resolve(result);
          }).catch(function(e){
            if(window.RTLog) window.RTLog.error('tx.runTx', e);
            reject(e);
          });
        } catch(e){
          if(window.RTLog) window.RTLog.error('tx.runTx-sync', e);
          reject(e);
        }
        return;
      }

      // Fallback não-atômico: get + apply + set
      if(typeof window._fbGet === 'function' && typeof window._fbSave === 'function'){
        window._fbGet(path).then(function(atual){
          var novo;
          try { novo = mutator(atual); }
          catch(e){ reject(e); return; }
          if(typeof novo === 'undefined'){
            if(window.RTLog) window.RTLog.event('tx:abort', { path: path });
            resolve({ committed: false, snapshot: atual });
            return;
          }
          return window._fbSave(path, novo).then(function(){
            if(window.RTLog) window.RTLog.event('tx:fallback-committed', { path: path });
            resolve({ committed: true, snapshot: novo });
          });
        }).catch(reject);
      } else {
        reject(new Error('Firebase API não disponível'));
      }
    });
  }

  /* Conveniência: atualiza apenas 1 campo de 1 objeto em path/{id}
     Ex: RTTx.field('turmas/turmaX/clientes/5', 'status', 'pago')
  */
  function field(path, key, valor){
    return update(path, function(atual){
      var novo = atual || {};
      novo[key] = valor;
      return novo;
    });
  }

  /* Conveniência: append em array atômico (cria se não existe) */
  function arrayPush(path, item){
    return update(path, function(atual){
      var arr = Array.isArray(atual) ? atual.slice() : [];
      arr.push(item);
      return arr;
    });
  }

  /* Conveniência: remove item de array por índice atomic */
  function arrayRemove(path, predicate){
    return update(path, function(atual){
      if(!Array.isArray(atual)) return atual;
      return atual.filter(function(item, i){ return !predicate(item, i); });
    });
  }

  window.RTTx = {
    update: update,
    field: field,
    arrayPush: arrayPush,
    arrayRemove: arrayRemove,
    hasNativeTx: _hasTxAPI
  };

  if(window.RTLog) window.RTLog.event('rt-tx', { ready: true, nativo: _hasTxAPI() });
})();
