/* ══════════════════════════════════════════════════════════════
   INTELIGÊNCIA COMERCIAL — Manual embutido (Fase final)
   Vive APENAS dentro de #mapeamentoScreen (pane "manual").
   Restrito a ADM + EXTRACLASSE.

   Responsabilidades:
     - Mostra/esconde a aba "📚 Manual" conforme perfil
     - Navegação suave por seções (anchor links)
     - Destaca seção ativa enquanto o usuário rola
══════════════════════════════════════════════════════════════ */
(function(){

  function _mnPermitido(){
    var sess = (typeof window._getSessao === 'function') ? window._getSessao() : null;
    if(!sess) return false;
    if(sess.perfil === 'adm') return true;
    var n = String(sess.nome||sess.login||'').toUpperCase().trim();
    return n === 'EXTRACLASSE';
  }

  /* Mostra/esconde a aba conforme perfil — espelha o padrão da aba IA */
  function _mnAtualizarVisibilidade(){
    var tab = document.getElementById('icTabManual');
    if(!tab) return;
    tab.style.display = _mnPermitido() ? '' : 'none';
  }

  /* Navegação suave por seções */
  window._mnNav = function(ev, id){
    if(ev) ev.preventDefault();
    var alvo = document.getElementById(id);
    if(!alvo) return;
    alvo.scrollIntoView({behavior:'smooth', block:'start'});
    _mnMarcarAtivo(id);
  };

  function _mnMarcarAtivo(id){
    document.querySelectorAll('.mn-sb-link').forEach(function(a){
      var href = a.getAttribute('href')||'';
      a.classList.toggle('active', href === '#'+id);
    });
  }

  /* Scroll-spy: destaca o item da sidebar quando a seção entra na viewport */
  function _mnObservar(){
    var conteudo = document.getElementById('mnConteudo');
    if(!conteudo) return;
    var secoes = conteudo.querySelectorAll('.mn-sec');
    if(!secoes.length) return;

    if('IntersectionObserver' in window){
      var obs = new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if(e.isIntersecting){
            _mnMarcarAtivo(e.target.id);
          }
        });
      }, {root: conteudo, rootMargin:'-30% 0px -50% 0px', threshold: 0});
      secoes.forEach(function(s){ obs.observe(s); });
    }
  }

  /* Inicialização */
  function _mnInit(){
    if(!_mnPermitido()) return;
    _mnObservar();
    /* Marca o primeiro como ativo */
    var primeira = document.querySelector('.mn-sec');
    if(primeira) _mnMarcarAtivo(primeira.id);
  }

  /* Hook em _icShowPane */
  var _origIcShow = window._icShowPane;
  window._icShowPane = function(name){
    if(typeof _origIcShow === 'function') _origIcShow(name);
    if(name === 'manual') _mnInit();
  };

  /* Visibilidade da aba: tenta logo e depois de login completar */
  _mnAtualizarVisibilidade();
  document.addEventListener('DOMContentLoaded', _mnAtualizarVisibilidade);
  /* Repetir após login (sessão pode não estar pronta no primeiro check) */
  setTimeout(_mnAtualizarVisibilidade, 500);
  setTimeout(_mnAtualizarVisibilidade, 1500);
  setTimeout(_mnAtualizarVisibilidade, 3000);

})();
