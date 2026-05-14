/* ═══════════════════════════════════════════════════════════
   MODO CONSULTOR DESKTOP — V2
   ──────────────────────────────────────────────────────────
   Desktop consultor:
     - landing page com 2 botões: "Gerenciar Turmas" e "Pipeline Comercial"
     - dashboard da Pipeline filtra por consultor
     - Atingimento por Turma com breakdown por status
   Mobile consultor: comportamento atual preservado (todos os hooks
     são no-op quando innerWidth < 769).
   ADM: nenhum efeito.
   ──────────────────────────────────────────────────────────
   Feature flag de segurança:
     - Default: ATIVO
     - Para desligar via console:
         localStorage.setItem('consultor_desktop_v2_disabled','1'); location.reload();
     - Para reativar:
         localStorage.removeItem('consultor_desktop_v2_disabled'); location.reload();
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
  /* Reusa estratégia já existente em _npFiltrar (comparação por nome
     uppercase). Vale para perfil=consultor independente do dispositivo. */
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

  /* Helper: nome do consultor para exibição */
  window._nomeConsultorLogado = function(){
    var sess = (typeof _getSessao === 'function') ? _getSessao() : null;
    if(!sess || sess.perfil !== 'consultor') return '';
    return sess.nome || sess.login || '';
  };

  /* ── Landing screen para consultor desktop ─────────────── */
  function _injetarLandingHTML(){
    if(document.getElementById('consultorLandingScreen')) return;
    var div = document.createElement('div');
    div.id = 'consultorLandingScreen';
    div.style.display = 'none';
    div.innerHTML = ''
      + '<div class="cld-wrap">'
        + '<div class="cld-header">'
          + '<div class="cld-title-row">'
            + '<div>'
              + '<div class="cld-saudacao" id="cldSaudacao">Olá!</div>'
              + '<div class="cld-sub">O que você quer fazer agora?</div>'
            + '</div>'
            + '<button class="cld-logout" onclick="logout()">Sair</button>'
          + '</div>'
        + '</div>'
        + '<div class="cld-cards">'
          + '<button class="cld-card" onclick="window._cldAbrirTurmas()">'
            + '<div class="cld-card-icon">🏫</div>'
            + '<div class="cld-card-titulo">Gerenciar Turmas</div>'
            + '<div class="cld-card-desc">Veja suas turmas ativas, alunos e detalhes de cada uma.</div>'
          + '</button>'
          + '<button class="cld-card cld-card-accent" onclick="window._cldAbrirPipeline()">'
            + '<div class="cld-card-icon">📈</div>'
            + '<div class="cld-card-titulo">Pipeline Comercial</div>'
            + '<div class="cld-card-desc">Sua pipeline com leads, vendas, metas e ranking.</div>'
          + '</button>'
        + '</div>'
      + '</div>';
    document.body.appendChild(div);

    /* Registrar na lista global de telas para que _mostrarTela trate corretamente */
    if(window._TELAS && window._TELAS.indexOf('consultorLandingScreen') < 0){
      window._TELAS.push('consultorLandingScreen');
    }
  }

  function _atualizarSaudacao(){
    var el = document.getElementById('cldSaudacao');
    if(!el) return;
    var nome = window._nomeConsultorLogado() || 'Consultor';
    var h = new Date().getHours();
    var saud = h < 12 ? 'Bom dia' : (h < 18 ? 'Boa tarde' : 'Boa noite');
    el.textContent = saud + ', ' + nome.split(' ')[0] + '!';
  }

  /* Mostrar landing (chamado pelo hook em 29-login.js).
     Retorna true se assumiu o fluxo; false se não. */
  window._mostrarLandingConsultorDesktop = function(/* user */){
    if(!window._eConsultorDesktop()) return false;
    _injetarLandingHTML();
    if(typeof _mostrarTela === 'function'){
      _mostrarTela('consultorLandingScreen', true);
    } else {
      var el = document.getElementById('consultorLandingScreen');
      if(el) el.style.display = 'flex';
    }
    _atualizarSaudacao();
    return true;
  };

  /* Navegação da landing → Gerenciar Turmas */
  window._cldAbrirTurmas = function(){
    if(typeof _mostrarTela === 'function') _mostrarTela('turmasScreen');
    if(typeof _mostrarTurmas === 'function') _mostrarTurmas();
  };

  /* Navegação da landing → Pipeline Comercial.
     A pipeline funciona standalone (lê pipelineSales global por mês),
     não exige _turmaAtiva carregada. */
  window._cldAbrirPipeline = function(){
    if(typeof window.abrirNovaPipeline === 'function') window.abrirNovaPipeline();
  };

  /* ── Hook em fecharNovaPipeline: consultor desktop volta pra landing
     em vez de voltar pra turmasScreen ─────────────────────────────── */
  function _patchFecharPipeline(){
    if(typeof window.fecharNovaPipeline !== 'function') return false;
    var _orig = window.fecharNovaPipeline;
    if(window.fecharNovaPipeline.__cldPatched) return true;
    window.fecharNovaPipeline = function(){
      var r = _orig.apply(this, arguments);
      if(window._eConsultorDesktop()){
        if(typeof _mostrarTela === 'function') _mostrarTela('consultorLandingScreen', true);
        _atualizarSaudacao();
      }
      return r;
    };
    window.fecharNovaPipeline.__cldPatched = true;
    return true;
  }

  /* ── Hook em voltarTurmas para consultor desktop volta pra landing ── */
  function _patchVoltarTurmas(){
    if(typeof window.voltarTurmas !== 'function') return false;
    if(window.voltarTurmas.__cldPatched) return true;
    var _orig = window.voltarTurmas;
    window.voltarTurmas = function(){
      if(window._eConsultorDesktop()){
        if(typeof _mostrarTela === 'function') _mostrarTela('consultorLandingScreen', true);
        _atualizarSaudacao();
        return;
      }
      return _orig.apply(this, arguments);
    };
    window.voltarTurmas.__cldPatched = true;
    return true;
  }

  /* Patches podem precisar aguardar os módulos carregarem.
     Tentamos algumas vezes em sequência. */
  function _aplicarPatchesQuandoPronto(){
    var tries = 0;
    var iv = setInterval(function(){
      var ok1 = _patchFecharPipeline();
      var ok2 = _patchVoltarTurmas();
      tries++;
      if((ok1 && ok2) || tries > 50){ clearInterval(iv); }
    }, 100);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', _aplicarPatchesQuandoPronto);
  } else {
    _aplicarPatchesQuandoPronto();
  }
})();
