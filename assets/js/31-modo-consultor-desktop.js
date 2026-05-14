/* ═══════════════════════════════════════════════════════════
   MODO CONSULTOR DESKTOP — V2.1
   ──────────────────────────────────────────────────────────
   Desktop consultor:
     - após login, vai para a turmasScreen original (home com cards)
     - card "Mapeamento" oculto (deixa só "Gerenciar Turmas" e "Pipeline Comercial")
     - Dashboard da Pipeline filtra por consultor
     - Atingimento por Turma com breakdown por status
   Mobile consultor: comportamento atual preservado.
   ADM: nenhum efeito.

   Feature flag (desliga sem reverter):
     localStorage.setItem('consultor_desktop_v2_disabled','1'); location.reload();
═══════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* ── Feature flag ──────────────────────────────────────── */
  var FLAG_OFF = (function(){
    try{ return localStorage.getItem('consultor_desktop_v2_disabled') === '1'; }
    catch(_){ return false; }
  })();
  if(FLAG_OFF){
    console.info('[consultor-desktop-v2] desativado por flag');
    return;
  }

  /* ── Detecção (fixada uma vez por sessão) ─────────────── */
  var _modoCache = null;
  function _detectar(){
    var sess = (typeof _getSessao === 'function') ? _getSessao() : null;
    if(!sess || sess.perfil !== 'consultor') return false;
    return (window.innerWidth || 0) >= 769;
  }
  window._eConsultorDesktop = function(){
    if(_modoCache === null) _modoCache = _detectar();
    return _modoCache;
  };
  window._resetModoConsultorDesktop = function(){ _modoCache = null; };

  /* ── Filtro central de vendas por consultor logado ────── */
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

  window._nomeConsultorLogado = function(){
    var sess = (typeof _getSessao === 'function') ? _getSessao() : null;
    if(!sess || sess.perfil !== 'consultor') return '';
    return sess.nome || sess.login || '';
  };

  /* ── Ajusta a turmasScreen original para consultor desktop:
        oculta o card "Mapeamento" (deixa só Gerenciar Turmas + Pipeline)
        muda o título do header para o nome do consultor ── */
  function _ajustarHomeParaConsultor(){
    if(!window._eConsultorDesktop()) return;
    var btnMap = document.getElementById('btnMapHome');
    if(btnMap) btnMap.style.display = 'none';
    /* Esconder também o botão de "Usuários" do header (ADM-only) */
    var navUsuarios = document.querySelector('#turmasScreen .home-nav button[onclick*="abrirPainelUsuarios"]');
    if(navUsuarios) navUsuarios.style.display = 'none';
    /* Personalizar saudação */
    var titulo = document.querySelector('#turmasScreen .home-nav-title');
    if(titulo){
      var nome = window._nomeConsultorLogado() || 'Consultor';
      titulo.textContent = 'Febracis · ' + nome.split(' ')[0];
    }
  }

  /* Mostrar home do consultor desktop (chamada pelo hook em _entrarDashboardEquipe).
     Retorna true se assumiu o fluxo; false se não. */
  window._mostrarLandingConsultorDesktop = function(/* user */){
    if(!window._eConsultorDesktop()) return false;
    _ajustarHomeParaConsultor();
    if(typeof _mostrarTela === 'function'){
      _mostrarTela('turmasScreen');
    }
    return true;
  };

  /* ── Hook em fecharNovaPipeline: consultor desktop volta para a home (turmasScreen)
     em vez do comportamento padrão ─────────────────────────────── */
  function _patchFecharPipeline(){
    if(typeof window.fecharNovaPipeline !== 'function') return false;
    if(window.fecharNovaPipeline.__cldPatched) return true;
    var _orig = window.fecharNovaPipeline;
    window.fecharNovaPipeline = function(){
      var r = _orig.apply(this, arguments);
      if(window._eConsultorDesktop()){
        _ajustarHomeParaConsultor();
        if(typeof _mostrarTela === 'function') _mostrarTela('turmasScreen');
      }
      return r;
    };
    window.fecharNovaPipeline.__cldPatched = true;
    return true;
  }

  /* Patches podem precisar aguardar os módulos carregarem. */
  function _aplicarPatchesQuandoPronto(){
    var tries = 0;
    var iv = setInterval(function(){
      var ok = _patchFecharPipeline();
      tries++;
      if(ok || tries > 50){ clearInterval(iv); }
    }, 100);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', _aplicarPatchesQuandoPronto);
  } else {
    _aplicarPatchesQuandoPronto();
  }
})();
