/* ═══════════════════════════════════════════════════════════
   MODO CONSULTOR DESKTOP
   Detecção + filtro central para o perfil consultor em desktop.

   - Mobile consultor: comportamento atual preservado (todas as
     funções desse módulo são no-op em mobile).
   - ADM: nenhum efeito (filtro só aplica quando perfil=consultor).
   - Decisão de "desktop" é fixada uma vez por sessão para evitar
     reflows em rotação.
═══════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var _modoCache = null; /* cache do _eConsultorDesktop() */

  /* Detecta modo no momento. Considera ≥769px = desktop. */
  function _detectar(){
    var sess = (typeof _getSessao === 'function') ? _getSessao() : null;
    if(!sess || sess.perfil !== 'consultor') return false;
    var w = (typeof window !== 'undefined' && window.innerWidth) || 0;
    return w >= 769;
  }

  /* Helper público — cache para evitar recálculo em hot paths */
  window._eConsultorDesktop = function(){
    if(_modoCache === null) _modoCache = _detectar();
    return _modoCache;
  };

  /* Reset (chamar no logout para não vazar entre sessões) */
  window._resetModoConsultorDesktop = function(){
    _modoCache = null;
  };

  /* Filtro centralizado de vendas: remove vendas alheias quando
     perfil=consultor. Compara por nome (uppercase) — mesma estratégia
     já usada em _npFiltrar.
     IMPORTANTE: aplica para perfil=consultor em qualquer dispositivo
     (não só desktop), pois a regra de negócio "ver só os próprios
     dados" vale também no mobile. */
  window._npFiltrarPorPerfil = function(lista){
    if(!Array.isArray(lista)) return [];
    var sess = (typeof _getSessao === 'function') ? _getSessao() : null;
    if(!sess || sess.perfil !== 'consultor') return lista;
    var meuNome = String(sess.nome || sess.login || '').toUpperCase().trim();
    if(!meuNome) return lista;
    return lista.filter(function(v){
      if(!v) return false;
      var cons = String(v.consultor || v.consultorNome || '').toUpperCase().trim();
      return cons === meuNome;
    });
  };

  /* Helper: nome de exibição do consultor logado */
  window._nomeConsultorLogado = function(){
    var sess = (typeof _getSessao === 'function') ? _getSessao() : null;
    if(!sess || sess.perfil !== 'consultor') return '';
    return sess.nome || sess.login || '';
  };
})();
