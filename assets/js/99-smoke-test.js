/* ═══════════════════════════════════════════════════════════════
   99-smoke-test.js — Bateria de testes end-to-end (auto + manual)
   ═══════════════════════════════════════════════════════════════
   Funciona em 3 modos:

   1. AUTOMÁTICO no load:
      Dispara ~3s após a 1ª `data:applied`. Roda em background e
      mostra toast vermelho se algo falhar. Não atrapalha UX.

   2. AUTOMÁTICO antes de relatório/PDF:
      `_smoke.gate('label')` é chamado por geradores críticos. Se
      detectar falha grave, mostra confirm() perguntando se quer
      gerar mesmo assim. Se passar, segue silencioso.

   3. MANUAL no console:
      _smoke.run()    — roda toda a bateria e cospe relatório
      _smoke.ajuda()  — lista os testes
      _smoke.relatorio() — último resultado em window._lastSmoke

   Testes cobrem:
     - Helpers canônicos carregados
     - KPIs do DOM batem com cálculo
     - Status efetivo consistente em todos clientes
     - Subs com valor coerente
     - Entradas refletidas em ambos os lados (scalar/sub)
     - APP_CONST.TREINAMENTOS populado
     - Funções globais essenciais existem
     - Cards renderizados no DOM
     - Modais não vazaram (overlay ativo sem modal visível)
═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var EPS = 0.02;

  function _has(name){ return typeof window[name] === 'function'; }
  function _num(v){ return Number(v) || 0; }
  function _fmt(v){
    return (Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  }
  function _kpi(id){
    var el = document.getElementById(id);
    if(!el) return NaN;
    var txt = String(el.textContent||'').replace(/[^\d,]/g,'').replace(',','.');
    return parseFloat(txt);
  }

  /* ── Cada teste retorna {ok, msg, severity}. severity: 'info'|'warn'|'error' */
  var TESTES = [
    {
      nome: 'helpers',
      label: 'Helpers canônicos carregados',
      fn: function(){
        var fns = ['_faturadoDoCliente','_abertoDoCliente','_negociacaoDoCliente',
          '_entradaPendenteDoCliente','_entradaParaSub','_statusEfetivoCliente',
          '_valorPorStatus'];
        var faltam = fns.filter(function(f){ return !_has(f); });
        return faltam.length === 0
          ? { ok:true, msg:fns.length+' helpers OK' }
          : { ok:false, severity:'error', msg:'Faltam: '+faltam.join(', ') };
      }
    },
    {
      nome: 'app_const',
      label: 'APP_CONST.TREINAMENTOS populado',
      fn: function(){
        var lista = window.APP_CONST && window.APP_CONST.TREINAMENTOS;
        if(!Array.isArray(lista) || !lista.length){
          return { ok:false, severity:'error', msg:'APP_CONST.TREINAMENTOS vazio ou ausente' };
        }
        return { ok:true, msg:lista.length+' treinamentos canônicos' };
      }
    },
    {
      nome: 'data_loaded',
      label: 'window.data populado',
      fn: function(){
        if(!Array.isArray(window.data)){
          return { ok:false, severity:'info', msg:'window.data não é array (turma não aberta?)' };
        }
        if(!window.data.length){
          return { ok:true, severity:'info', msg:'turma vazia (0 clientes) — pulando testes dependentes' };
        }
        return { ok:true, msg:window.data.length+' clientes em data' };
      }
    },
    {
      nome: 'kpi_faturado',
      label: 'KPI Faturado bate com cálculo',
      requires: 'data_loaded',
      fn: function(){
        if(!_has('_faturadoDoCliente')) return { ok:false, severity:'warn', msg:'helper ausente' };
        var calc = window.data.reduce(function(a,d){ return a + window._faturadoDoCliente(d); }, 0);
        var dom = _kpi('mPago');
        if(isNaN(dom)) return { ok:true, severity:'info', msg:'KPI não está no DOM (outra aba ativa)' };
        var dif = Math.abs(calc - dom);
        return dif < EPS
          ? { ok:true, msg:'calc='+_fmt(calc)+' = DOM' }
          : { ok:false, severity:'error', msg:'calc='+_fmt(calc)+' vs DOM='+_fmt(dom)+' (diff '+_fmt(dif)+')' };
      }
    },
    {
      nome: 'kpi_aberto',
      label: 'KPI Em aberto bate com cálculo',
      requires: 'data_loaded',
      fn: function(){
        if(!_has('_abertoDoCliente')) return { ok:false, severity:'warn', msg:'helper ausente' };
        var calc = window.data.reduce(function(a,d){ return a + window._abertoDoCliente(d); }, 0);
        var dom = _kpi('mAberto');
        if(isNaN(dom)) return { ok:true, severity:'info', msg:'KPI não está no DOM' };
        var dif = Math.abs(calc - dom);
        return dif < EPS
          ? { ok:true, msg:'calc='+_fmt(calc)+' = DOM' }
          : { ok:false, severity:'error', msg:'calc='+_fmt(calc)+' vs DOM='+_fmt(dom) };
      }
    },
    {
      nome: 'kpi_negociacao',
      label: 'KPI Negociação bate com cálculo',
      requires: 'data_loaded',
      fn: function(){
        if(!_has('_negociacaoDoCliente')) return { ok:false, severity:'warn', msg:'helper ausente' };
        var calc = window.data.reduce(function(a,d){ return a + window._negociacaoDoCliente(d); }, 0);
        var dom = _kpi('mTotal');
        if(isNaN(dom)) return { ok:true, severity:'info', msg:'KPI não está no DOM' };
        var dif = Math.abs(calc - dom);
        return dif < EPS
          ? { ok:true, msg:'calc='+_fmt(calc)+' = DOM' }
          : { ok:false, severity:'error', msg:'calc='+_fmt(calc)+' vs DOM='+_fmt(dom) };
      }
    },
    {
      nome: 'kpi_entradas',
      label: 'KPI Entradas bate com cálculo',
      requires: 'data_loaded',
      fn: function(){
        if(!_has('_entradaPendenteDoCliente')) return { ok:false, severity:'warn', msg:'helper ausente' };
        var calc = window.data.reduce(function(a,d){ return a + window._entradaPendenteDoCliente(d); }, 0);
        var dom = _kpi('mEntradas');
        if(isNaN(dom)) return { ok:true, severity:'info', msg:'KPI não está no DOM' };
        var dif = Math.abs(calc - dom);
        return dif < EPS
          ? { ok:true, msg:'calc='+_fmt(calc)+' = DOM' }
          : { ok:false, severity:'error', msg:'calc='+_fmt(calc)+' vs DOM='+_fmt(dom) };
      }
    },
    {
      nome: 'status_efetivo',
      label: 'Status scalar bate com efetivo em todos os clientes',
      requires: 'data_loaded',
      fn: function(){
        if(!_has('_statusEfetivoCliente')) return { ok:false, severity:'warn', msg:'helper ausente' };
        var divs = 0;
        window.data.forEach(function(d){
          var subs = Array.isArray(d.treinamentos) ? d.treinamentos.filter(Boolean) : [];
          if(!subs.length) return;
          var ef = window._statusEfetivoCliente(d);
          var sc = String(d.status||'').toLowerCase();
          if(ef && ef !== sc && sc !== '-' && sc !== '') divs++;
        });
        return divs === 0
          ? { ok:true, msg:'todos consistentes' }
          : { ok:false, severity:'warn', msg:divs+' cliente(s) com status divergente' };
      }
    },
    {
      nome: 'orfaos_valor',
      label: 'Subs órfãos (cliente.valor>0 mas sub.valor=0)',
      requires: 'data_loaded',
      fn: function(){
        var orf = 0;
        window.data.forEach(function(d){
          var subs = Array.isArray(d.treinamentos) ? d.treinamentos.filter(Boolean) : [];
          if(_num(d.valor) > 0 && subs.length > 0){
            if(!subs.some(function(s){ return _num(s.valor) > 0; })) orf++;
          }
        });
        return orf === 0
          ? { ok:true, msg:'nenhum órfão' }
          : { ok:false, severity:'error', msg:orf+' sub(s) órfão(s) — auto-heal deveria ter corrigido' };
      }
    },
    {
      nome: 'entradas_coerentes',
      label: 'Entradas scalar/sub coerentes (1 sub)',
      requires: 'data_loaded',
      fn: function(){
        var divs = 0;
        window.data.forEach(function(d){
          var subs = Array.isArray(d.treinamentos) ? d.treinamentos.filter(Boolean) : [];
          if(subs.length === 1 && _num(d.entrada) > 0 && _num(subs[0].entrada) === 0) divs++;
        });
        return divs === 0
          ? { ok:true, msg:'todas entradas refletidas no sub' }
          : { ok:false, severity:'warn', msg:divs+' entrada(s) só no scalar' };
      }
    },
    {
      nome: 'cards_renderizados',
      label: 'Cards de clientes renderizados no DOM',
      requires: 'data_loaded',
      fn: function(){
        var cards = document.querySelectorAll('.cli-card, .card-cliente, .ccl-row');
        if(!cards.length) return { ok:true, severity:'info', msg:'aba sem cards visíveis (ok se outra aba ativa)' };
        return { ok:true, msg:cards.length+' card(s) no DOM' };
      }
    },
    {
      nome: 'modais_limpos',
      label: 'Sem overlay fantasma de modal',
      fn: function(){
        var overlays = document.querySelectorAll('.modal-overlay.active, .modal-overlay[style*="display: flex"], .modal-overlay[style*="display:flex"]');
        if(!overlays.length) return { ok:true, msg:'nenhum overlay ativo' };
        var visiveis = 0;
        overlays.forEach(function(o){
          var modal = o.querySelector('.modal, .modal-content');
          if(!modal || modal.offsetParent === null) visiveis++;
        });
        return visiveis === 0
          ? { ok:true, msg:overlays.length+' modal aberto, consistente' }
          : { ok:false, severity:'warn', msg:visiveis+' overlay sem modal visível dentro' };
      }
    },
    {
      nome: 'firebase_conectado',
      label: 'Firebase _fbGet/_fbSave disponíveis',
      fn: function(){
        var faltam = [];
        if(!_has('_fbGet'))    faltam.push('_fbGet');
        if(!_has('_fbSave'))   faltam.push('_fbSave');
        if(!_has('_fbChange')) faltam.push('_fbChange');
        return faltam.length === 0
          ? { ok:true, msg:'todas funções FB disponíveis' }
          : { ok:false, severity:'error', msg:'faltam: '+faltam.join(', ') };
      }
    },
    {
      nome: 'sessao_ativa',
      label: 'Sessão de usuário ativa',
      fn: function(){
        if(!_has('_getSessao')) return { ok:true, severity:'info', msg:'_getSessao não exposta' };
        var s = window._getSessao();
        if(!s) return { ok:true, severity:'info', msg:'sem sessão (ok no login)' };
        return s.uid
          ? { ok:true, msg:'logado: '+(s.nome||s.login||'?')+' ('+(s.perfil||'?')+')' }
          : { ok:false, severity:'warn', msg:'sessão sem uid' };
      }
    },
    {
      nome: 'turma_ativa',
      label: 'Turma ativa coerente',
      fn: function(){
        if(!window._turmaAtiva) return { ok:true, severity:'info', msg:'nenhuma turma ativa (ok no lobby)' };
        if(!window._turmaAtiva.id) return { ok:false, severity:'error', msg:'_turmaAtiva sem id' };
        return { ok:true, msg:'turma "'+(window._turmaAtiva.nome||window._turmaAtiva.codigo)+'"' };
      }
    }
  ];

  function _run(opts){
    opts = opts || {};
    var t0 = performance.now();
    var resultados = [];
    var passados = {};

    TESTES.forEach(function(t){
      if(t.requires && !passados[t.requires]){
        resultados.push({ nome:t.nome, label:t.label, ok:true, skipped:true, msg:'pulado (depende de '+t.requires+')' });
        return;
      }
      var r;
      try { r = t.fn() || { ok:false, msg:'sem retorno' }; }
      catch(e){ r = { ok:false, severity:'error', msg:'erro: '+(e&&e.message||e) }; }
      r.nome = t.nome; r.label = t.label;
      resultados.push(r);
      if(r.ok) passados[t.nome] = true;
    });

    var ms = Math.round(performance.now() - t0);
    var falhas = resultados.filter(function(r){ return !r.ok && !r.skipped; });
    var erros = falhas.filter(function(r){ return r.severity === 'error'; });

    var resumo = {
      total: resultados.length,
      ok: resultados.filter(function(r){ return r.ok && !r.skipped; }).length,
      skipped: resultados.filter(function(r){ return r.skipped; }).length,
      falhas: falhas.length,
      erros: erros.length,
      ms: ms,
      resultados: resultados,
      timestamp: new Date().toISOString()
    };
    window._lastSmoke = resumo;

    if(!opts.silent) _imprimirRelatorio(resumo);
    if(falhas.length && !opts.suppressToast) _toast(resumo);

    return resumo;
  }

  function _imprimirRelatorio(r){
    console.group('%c[smoke] '+r.ok+'/'+r.total+' OK '+(r.skipped?'('+r.skipped+' pulados) ':'')
      +(r.falhas?'• '+r.falhas+' falha(s)':'• tudo verde')
      +' • '+r.ms+'ms',
      r.falhas
        ? 'background:#ef4444;color:#fff;padding:3px 10px;font-weight:700;'
        : 'background:#c8f05a;color:#000;padding:3px 10px;font-weight:700;');
    r.resultados.forEach(function(x){
      var prefix = x.skipped ? '○ ' : (x.ok ? '✓ ' : '✗ ');
      var color = x.skipped ? '#888' : (x.ok ? '#c8f05a' : (x.severity==='error'?'#ef4444':'#f59e0b'));
      console.log('%c'+prefix+x.label+': '+x.msg, 'color:'+color+';');
    });
    console.log('%cAcesso: window._lastSmoke', 'color:#aaa;font-style:italic;');
    console.groupEnd();
  }

  function _toast(resumo){
    if(typeof document === 'undefined') return;
    var prev = document.getElementById('smoke-toast');
    if(prev) prev.remove();
    var div = document.createElement('div');
    div.id = 'smoke-toast';
    div.style.cssText = [
      'position:fixed','bottom:80px','right:20px','z-index:99999',
      'background:rgba(239,68,68,0.96)','color:#fff','padding:12px 18px',
      'border-radius:8px','font:600 12px system-ui,sans-serif',
      'box-shadow:0 4px 20px rgba(0,0,0,0.4)','cursor:pointer',
      'max-width:360px','line-height:1.4'
    ].join(';');
    div.innerHTML = '⚠ Smoke test: '+resumo.falhas+' falha'+(resumo.falhas>1?'s':'')+'<br>'
      +'<span style="font-weight:400;font-size:11px;opacity:0.9">'
      +'Console (F12) ou <code style="background:rgba(0,0,0,0.3);padding:1px 5px;border-radius:3px">window._lastSmoke</code></span>';
    div.title = 'Clique para fechar';
    div.onclick = function(){ div.remove(); };
    document.body.appendChild(div);
    setTimeout(function(){ if(div && div.parentNode) div.remove(); }, 10000);
  }

  /* Gate: usado por geradores de relatório/PDF antes de gerar. Bloqueia
     se houver falha de severidade 'error', perguntando ao usuário. */
  function _gate(label){
    var r = _run({silent:true, suppressToast:true});
    var erros = r.resultados.filter(function(x){ return !x.ok && !x.skipped && x.severity==='error'; });
    if(!erros.length) return true;
    var lista = erros.map(function(x){ return '• '+x.label+': '+x.msg; }).join('\n');
    return confirm('⚠ '+erros.length+' problema(s) crítico(s) antes de '+(label||'gerar relatório')+':\n\n'
      +lista+'\n\nDeseja continuar mesmo assim?');
  }

  function _ajuda(){
    console.group('%c[_smoke] testes da bateria',
      'background:#a78bfa;color:#fff;padding:3px 10px;font-weight:700;');
    TESTES.forEach(function(t){
      console.log('• '+t.nome+' — '+t.label+(t.requires?' (requer '+t.requires+')':''));
    });
    console.log('\nUso:');
    console.log('  _smoke.run()       — roda toda bateria');
    console.log('  _smoke.run({silent:true}) — sem log');
    console.log('  _smoke.gate("PDF") — usado por geradores; pede confirm se falhar');
    console.log('  _smoke.relatorio() — último resultado (window._lastSmoke)');
    console.groupEnd();
  }

  window._smoke = {
    run: _run,
    gate: _gate,
    ajuda: _ajuda,
    relatorio: function(){ return window._lastSmoke; }
  };

  /* AUTO 1: roda 3s após cada data:applied. Sem log no console e SEM toast
     vermelho na tela — falhas ficam só em window._lastSmoke pra inspeção
     manual via _smoke.relatorio(). */
  var _autoRunPending = null;
  document.addEventListener('data:applied', function(){
    clearTimeout(_autoRunPending);
    _autoRunPending = setTimeout(function(){
      _run({silent:true, suppressToast:true});
    }, 3000);
  });

  /* Banner inicial */
  setTimeout(function(){
    console.log('%c[smoke] ativo — auto-run após cada turma carregada. Manual: _smoke.run() / _smoke.ajuda()',
      'color:#a78bfa;font-weight:600;');
  }, 1900);

})();
