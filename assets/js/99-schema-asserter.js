/* ═══════════════════════════════════════════════════════════════
   99-schema-asserter.js — Validação contínua de invariantes (auto)
   ═══════════════════════════════════════════════════════════════
   Roda sozinho toda vez que `data:applied` dispara (após cada carga
   de turma). Não corrige nada — só LOGA warnings quando detecta
   um estado inconsistente.

   Cada invariante = um caso real de bug que já aconteceu:
     INV-01: cliente.valor>0 mas todos os subs com valor=0 (Luana/Amanda)
     INV-02: cliente.status diverge de _statusEfetivoCliente() (ALEXANDRE)
     INV-03: cliente.entrada>0 mas único sub com entrada=0 (JOABE)
     INV-04: sub.cod fora do enum APP_CONST.TREINAMENTOS
     INV-05: cliente sem nome em data
     INV-06: soma de sub.valor diverge de cliente.valor em > 5%
     INV-07: entrada em treinamentos[] é null/undefined

   Saídas:
     • Console agrupado com cada inconsistência.
     • Toast vermelho discreto no canto (auto-some em 6s) SE houver
       qualquer falha — pra você não perder o aviso quando trabalhar
       sem o console aberto.
     • Retorna o array de falhas em window._lastAssert (consulta manual).

   Custo: ~50ms por carga de turma. Silencioso quando tudo OK.
═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var STATUSES_VALIDOS = ['aberto','pago','negociacao','cancelado','-',''];
  var TOLERANCIA_VALOR = 0.05;  // 5% de divergência tolerada (impostos, juros)

  function _has(name){ return typeof window[name] === 'function'; }
  function _num(v){ return Number(v) || 0; }
  function _statusValido(st){
    return STATUSES_VALIDOS.indexOf(String(st||'').toLowerCase()) > -1;
  }
  function _codValido(cod){
    if(!cod) return false;
    var lista = (window.APP_CONST && Array.isArray(window.APP_CONST.TREINAMENTOS))
      ? window.APP_CONST.TREINAMENTOS : [];
    if(!lista.length) return true;  // sem enum carregado → não valida
    return lista.indexOf(cod) > -1;
  }

  function _validar(data){
    var falhas = [];
    if(!Array.isArray(data) || !data.length) return falhas;

    data.forEach(function(d, ri){
      if(!d) return;

      /* INV-05: cliente sem nome */
      if(!d.cliente || !String(d.cliente).trim()){
        falhas.push({inv:'INV-05', ri:ri, msg:'Cliente sem nome', d:d});
      }

      var subs = Array.isArray(d.treinamentos) ? d.treinamentos.filter(Boolean) : [];

      /* INV-01: cliente.valor>0 mas TODOS os subs com valor=0 (órfão de migração) */
      if(_num(d.valor) > 0 && subs.length > 0){
        var algumSubComValor = subs.some(function(s){ return _num(s.valor) > 0; });
        if(!algumSubComValor){
          falhas.push({
            inv: 'INV-01',
            ri: ri,
            msg: (d.cliente||'?')+': cliente.valor='+_num(d.valor)+' mas todos os subs com valor=0',
            d: d
          });
        }
      }

      /* INV-02: status efetivo diverge do scalar */
      if(_has('_statusEfetivoCliente') && subs.length > 0){
        var stEf = window._statusEfetivoCliente(d);
        var stScalar = String(d.status||'').toLowerCase();
        if(stEf && stEf !== stScalar && stScalar !== '-' && stScalar !== ''){
          falhas.push({
            inv: 'INV-02',
            ri: ri,
            msg: (d.cliente||'?')+': status scalar="'+stScalar+'" mas efetivo="'+stEf+'"',
            d: d
          });
        }
      }

      /* INV-03: cliente.entrada>0 mas único sub com entrada=0 */
      if(_num(d.entrada) > 0 && subs.length === 1 && _num(subs[0].entrada) === 0){
        falhas.push({
          inv: 'INV-03',
          ri: ri,
          msg: (d.cliente||'?')+': cliente.entrada='+_num(d.entrada)+' mas sub.entrada=0',
          d: d
        });
      }

      /* INV-04: sub.cod fora do enum */
      subs.forEach(function(s, si){
        if(s.cod && !_codValido(s.cod)){
          falhas.push({
            inv: 'INV-04',
            ri: ri,
            msg: (d.cliente||'?')+': sub['+si+'].cod="'+s.cod+'" não está em APP_CONST.TREINAMENTOS',
            d: d
          });
        }
      });

      /* INV-06: soma dos subs diverge do scalar em > 5% */
      if(_num(d.valor) > 0 && subs.length > 0){
        var somaSubs = subs.reduce(function(a, s){ return a + _num(s.valor); }, 0);
        if(somaSubs > 0){
          var dif = Math.abs(somaSubs - _num(d.valor));
          var pct = dif / _num(d.valor);
          if(pct > TOLERANCIA_VALOR){
            falhas.push({
              inv: 'INV-06',
              ri: ri,
              msg: (d.cliente||'?')+': cliente.valor='+_num(d.valor)+' mas soma subs='+somaSubs+' (diff '+Math.round(pct*100)+'%)',
              d: d
            });
          }
        }
      }

      /* INV-07: posições nulas no array de treinamentos */
      if(Array.isArray(d.treinamentos)){
        d.treinamentos.forEach(function(s, si){
          if(s === null || s === undefined){
            falhas.push({
              inv: 'INV-07',
              ri: ri,
              msg: (d.cliente||'?')+': treinamentos['+si+'] é null/undefined',
              d: d
            });
          }
        });
      }

      /* status scalar inválido */
      if(d.status && !_statusValido(d.status)){
        falhas.push({
          inv: 'INV-STATUS',
          ri: ri,
          msg: (d.cliente||'?')+': status="'+d.status+'" não é valor reconhecido',
          d: d
        });
      }
    });

    return falhas;
  }

  function _logar(falhas){
    window._lastAssert = falhas;
    if(!falhas.length){
      console.log('%c[asserter] ✓ '+(window.data||[]).length+' clientes — todos os invariantes OK',
        'color:#c8f05a;font-weight:600;');
      return;
    }
    var porInv = {};
    falhas.forEach(function(f){
      (porInv[f.inv] = porInv[f.inv] || []).push(f);
    });
    console.group('%c[asserter] ⚠ '+falhas.length+' inconsistência(s) detectada(s) — turma "'
      +((window._turmaAtiva && (window._turmaAtiva.nome||window._turmaAtiva.codigo))||'?')+'"',
      'background:#ef4444;color:#fff;padding:3px 10px;font-weight:700;');
    Object.keys(porInv).forEach(function(inv){
      console.group('%c'+inv+' (×'+porInv[inv].length+')',
        'background:#f59e0b;color:#000;padding:2px 8px;font-weight:600;');
      porInv[inv].forEach(function(f){ console.warn(f.msg, f.d); });
      console.groupEnd();
    });
    console.log('%cAcesso programático: window._lastAssert',
      'color:#aaa;font-style:italic;');
    console.groupEnd();
  }

  function _toast(falhas){
    if(!falhas.length) return;
    if(typeof document === 'undefined') return;
    var prev = document.getElementById('asserter-toast');
    if(prev) prev.remove();
    var div = document.createElement('div');
    div.id = 'asserter-toast';
    div.style.cssText = [
      'position:fixed','bottom:20px','right:20px','z-index:99999',
      'background:rgba(239,68,68,0.96)','color:#fff','padding:10px 16px',
      'border-radius:8px','font:600 12px system-ui,sans-serif',
      'box-shadow:0 4px 20px rgba(0,0,0,0.4)','cursor:pointer',
      'max-width:340px','line-height:1.4'
    ].join(';');
    var n = falhas.length;
    div.innerHTML = '⚠ '+n+' inconsistência'+(n>1?'s':'')+' nos dados<br>'
      +'<span style="font-weight:400;font-size:11px;opacity:0.9">'
      +'Abra o console (F12) ou rode <code style="background:rgba(0,0,0,0.3);padding:1px 5px;border-radius:3px">window._lastAssert</code></span>';
    div.title = 'Clique para fechar';
    div.onclick = function(){ div.remove(); };
    document.body.appendChild(div);
    setTimeout(function(){ if(div && div.parentNode) div.remove(); }, 8000);
  }

  function _run(){
    try {
      var falhas = _validar(window.data || []);
      _logar(falhas);
      _toast(falhas);
    } catch(e){
      console.warn('[asserter] erro durante validação:', e);
    }
  }

  /* Hook principal: evento custom disparado pelo _aplicarDados */
  document.addEventListener('data:applied', function(){ setTimeout(_run, 50); });

  /* Acesso manual: window._asserter() força nova validação agora */
  window._asserter = _run;

  /* Banner discreto: confirma que está ativo */
  setTimeout(function(){
    console.log('%c[asserter] ativo — valida invariantes em toda carga de turma. Chamada manual: window._asserter()',
      'color:#a78bfa;font-weight:600;');
  }, 1800);

})();
