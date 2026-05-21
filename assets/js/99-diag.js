/* ═══════════════════════════════════════════════════════════════
   99-diag.js — Ferramenta de diagnóstico no console (window._diag)
   ═══════════════════════════════════════════════════════════════
   Funções para QA rápido. Cole no console (F12 → Console):

     _diag.ajuda()         — lista todas as funções
     _diag.helpers()       — verifica que os helpers canônicos existem
     _diag.totais()        — totais granulares (Faturado/Aberto/Neg/Entrada)
     _diag.divergencias()  — compara cálculos com os KPIs do DOM
     _diag.cliente("nome") — diagnóstico completo de 1 cliente

   Útil quando algum número não bate ou para validar pós-mudança.
═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var _diag = window._diag = {};

  function _hasFn(name){ return typeof window[name] === 'function'; }
  function _semData(){
    if(!Array.isArray(window.data) || !window.data.length){
      console.warn('[_diag] window.data está vazio. Entre numa turma primeiro.');
      return true;
    }
    return false;
  }
  function _fmt(v){
    return (Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  }
  function _parseKpi(id){
    var el = document.getElementById(id);
    if(!el) return NaN;
    var txt = String(el.textContent||'').replace(/[^\d,]/g,'').replace(',','.');
    return parseFloat(txt);
  }

  /* ── 1. Disponibilidade dos helpers ─────────────────────────── */
  _diag.helpers = function(){
    var fns = [
      '_faturadoDoCliente', '_abertoDoCliente', '_negociacaoDoCliente',
      '_entradaPendenteDoCliente', '_entradaParaSub',
      '_statusEfetivoCliente', '_valorPorStatus', '_achatarItens'
    ];
    console.group('%c[_diag.helpers] disponibilidade dos helpers canônicos',
      'background:#60a5fa;color:#fff;padding:2px 8px;font-weight:700;');
    var faltam = [];
    fns.forEach(function(fn){
      var ok = _hasFn(fn);
      console.log((ok ? '✓ ' : '✗ ') + fn);
      if(!ok) faltam.push(fn);
    });
    if(faltam.length){
      console.warn('FALTAM:', faltam.join(', '));
      console.warn('→ Provavelmente algum script falhou ao carregar (ordem ou cache).');
    } else {
      console.log('%cTudo OK ✓','color:#c8f05a;font-weight:700;');
    }
    console.groupEnd();
    return { ok: faltam.length === 0, faltam: faltam };
  };

  /* ── 2. Totais granulares ───────────────────────────────────── */
  _diag.totais = function(){
    if(_semData()) return null;
    var fat = data.reduce(function(a,d){ return a + (_hasFn('_faturadoDoCliente')        ? window._faturadoDoCliente(d)        : 0); }, 0);
    var abr = data.reduce(function(a,d){ return a + (_hasFn('_abertoDoCliente')          ? window._abertoDoCliente(d)          : 0); }, 0);
    var neg = data.reduce(function(a,d){ return a + (_hasFn('_negociacaoDoCliente')      ? window._negociacaoDoCliente(d)      : 0); }, 0);
    var ent = data.reduce(function(a,d){ return a + (_hasFn('_entradaPendenteDoCliente') ? window._entradaPendenteDoCliente(d) : 0); }, 0);
    console.group('%c[_diag.totais] totais granulares (regra "sub a sub")',
      'background:#c8f05a;color:#000;padding:2px 8px;font-weight:700;');
    console.table({
      'Faturado':        { valor: fat, fmt: _fmt(fat) },
      'Em aberto':       { valor: abr, fmt: _fmt(abr) },
      'Potencial total': { valor: neg, fmt: _fmt(neg) },
      'Total entradas':  { valor: ent, fmt: _fmt(ent) }
    });
    console.log('Compare visualmente com os 4 KPIs do topo da tela.');
    console.log('Para checagem automática use: _diag.divergencias()');
    console.groupEnd();
    return { faturado: fat, aberto: abr, negociacao: neg, entrada: ent };
  };

  /* ── 3. Divergências: cálculos vs KPIs do DOM ──────────────── */
  _diag.divergencias = function(){
    if(_semData()) return null;
    console.group('%c[_diag.divergencias] cálculo × KPI do DOM',
      'background:#ef4444;color:#fff;padding:2px 8px;font-weight:700;');

    var calc = {
      faturado:   data.reduce(function(a,d){ return a + (_hasFn('_faturadoDoCliente')        ? window._faturadoDoCliente(d)        : 0); }, 0),
      aberto:     data.reduce(function(a,d){ return a + (_hasFn('_abertoDoCliente')          ? window._abertoDoCliente(d)          : 0); }, 0),
      negociacao: data.reduce(function(a,d){ return a + (_hasFn('_negociacaoDoCliente')      ? window._negociacaoDoCliente(d)      : 0); }, 0),
      entrada:    data.reduce(function(a,d){ return a + (_hasFn('_entradaPendenteDoCliente') ? window._entradaPendenteDoCliente(d) : 0); }, 0)
    };
    var kpi = {
      faturado:   _parseKpi('mPago'),
      aberto:     _parseKpi('mAberto'),
      negociacao: _parseKpi('mTotal'),
      entrada:    _parseKpi('mEntradas')
    };

    var EPS = 0.02;  // tolerância pra arredondamento
    var divs = [];
    function _check(nome, calcV, kpiV){
      if(isNaN(kpiV)){
        console.warn(nome+': KPI não encontrado no DOM (entre numa turma e abra a aba Geral)');
        divs.push({ nome: nome, calc: _fmt(calcV), kpi: 'N/A' });
        return;
      }
      var diff = Math.abs(calcV - kpiV);
      if(diff < EPS){
        console.log('%c✓ '+nome+': '+_fmt(calcV), 'color:#c8f05a;');
      } else {
        console.warn('✗ '+nome+': calc='+_fmt(calcV)+' vs KPI='+_fmt(kpiV)+' (diff '+_fmt(diff)+')');
        divs.push({ nome: nome, calc: _fmt(calcV), kpi: _fmt(kpiV), diff: _fmt(diff) });
      }
    }
    _check('Faturado',       calc.faturado,   kpi.faturado);
    _check('Em aberto',      calc.aberto,     kpi.aberto);
    _check('Potencial total',calc.negociacao, kpi.negociacao);
    _check('Total entradas', calc.entrada,    kpi.entrada);

    if(divs.length === 0){
      console.log('%c✓ TODOS OS KPIs BATEM',
        'background:#c8f05a;color:#000;padding:3px 10px;font-weight:700;');
    } else {
      console.warn('⚠ '+divs.length+' divergência(s):');
      console.table(divs);
    }
    console.groupEnd();
    return divs;
  };

  /* ── 4. Diagnóstico de um cliente ──────────────────────────── */
  _diag.cliente = function(nomeParcial){
    if(_semData()) return null;
    if(!nomeParcial){
      console.warn('Uso: _diag.cliente("nome ou parte do nome")');
      return null;
    }
    var alvo = String(nomeParcial).toUpperCase().trim();
    var encontrados = data.filter(function(d){
      return d && d.cliente && String(d.cliente).toUpperCase().indexOf(alvo) > -1;
    });
    if(!encontrados.length){
      console.warn('Nenhum cliente encontrado para "'+nomeParcial+'"');
      return null;
    }
    encontrados.forEach(function(d){
      var ri = data.indexOf(d);
      console.group('%c'+d.cliente+'  [ri='+ri+']',
        'background:#f59e0b;color:#000;padding:3px 10px;font-weight:700;');
      console.log('consultor:', d.consultor, '|  treinador:', d.treinador);
      console.log('SCALAR  → status:', d.status, '|  valor:', _fmt(d.valor), '|  entrada:', _fmt(d.entrada), '|  treinamento:', d.treinamento);
      if(_hasFn('_statusEfetivoCliente')) console.log('Status EFETIVO:', window._statusEfetivoCliente(d));
      console.log('--- valores granulares (regra do dinheiro real) ---');
      console.table({
        'Faturado':    _fmt(_hasFn('_faturadoDoCliente')        ? window._faturadoDoCliente(d)        : 0),
        'Em aberto':   _fmt(_hasFn('_abertoDoCliente')          ? window._abertoDoCliente(d)          : 0),
        'Negociação':  _fmt(_hasFn('_negociacaoDoCliente')      ? window._negociacaoDoCliente(d)      : 0),
        'Entrada pend':_fmt(_hasFn('_entradaPendenteDoCliente') ? window._entradaPendenteDoCliente(d) : 0)
      });
      if(Array.isArray(d.treinamentos) && d.treinamentos.length){
        console.log('--- subs ---');
        var subs = d.treinamentos.map(function(s, i){
          if(!s) return { ai:i, cod:'(vazio)' };
          return {
            ai: i,
            cod: s.cod,
            status: s.status || d.status || 'aberto',
            valor: _fmt(s.valor||0),
            sub_entrada_bruta: _fmt(s.entrada||0),
            entrada_visivel: _fmt(_hasFn('_entradaParaSub') ? window._entradaParaSub(d, i) : 0)
          };
        });
        console.table(subs);
      }
      console.groupEnd();
    });
    return encontrados;
  };

  /* ── 5. Snapshot de cálculos críticos (regressão entre versões) ──
     Captura os totais granulares de TODAS as turmas do Firebase num
     único JSON. Permite, depois de uma mudança, comparar e ver se
     algum total mudou sem motivo (regressão silenciosa). */
  _diag.snapshot = {
    gerar: function(opts){
      opts = opts || {};
      if(!window._fbGet){
        console.warn('[_diag.snapshot] Firebase não disponível.');
        return Promise.resolve(null);
      }
      var TN = (typeof TURMAS_NODE !== 'undefined') ? TURMAS_NODE : 'turmas';
      return window._fbGet(TN).then(function(fbTurmas){
        if(!fbTurmas){ console.warn('Nenhuma turma no Firebase.'); return null; }
        var snap = {
          schema: 1,
          timestamp: new Date().toISOString(),
          turmas: {}
        };
        Object.keys(fbTurmas).forEach(function(tid){
          var t = fbTurmas[tid];
          if(!t) return;
          var clientes = t.clientes;
          if(clientes && !Array.isArray(clientes) && typeof clientes === 'object'){
            clientes = Object.values(clientes).filter(Boolean);
          }
          clientes = clientes || [];
          var fat=0, abr=0, neg=0, ent=0, qtdPagos=0;
          clientes.forEach(function(c){
            if(!c || !c.cliente) return;
            var f = (_hasFn('_faturadoDoCliente')        ? window._faturadoDoCliente(c)        : 0);
            fat += f;
            abr += (_hasFn('_abertoDoCliente')          ? window._abertoDoCliente(c)          : 0);
            neg += (_hasFn('_negociacaoDoCliente')      ? window._negociacaoDoCliente(c)      : 0);
            ent += (_hasFn('_entradaPendenteDoCliente') ? window._entradaPendenteDoCliente(c) : 0);
            if(f > 0) qtdPagos++;
          });
          var _r = function(v){ return Math.round(v*100)/100; };
          snap.turmas[tid] = {
            nome: t.nome || t.codigo || tid,
            faturado:    _r(fat),
            aberto:      _r(abr),
            negociacao:  _r(neg),
            entrada:     _r(ent),
            qtdClientes: clientes.length,
            qtdPagos:    qtdPagos
          };
        });
        if(!opts.silent){
          console.group('%c[_diag.snapshot.gerar]',
            'background:#a78bfa;color:#fff;padding:2px 8px;font-weight:700;');
          console.log('Turmas processadas:', Object.keys(snap.turmas).length);
          console.log('Para salvar baseline use: _diag.snapshot.baixar()');
          console.log('Para comparar: _diag.snapshot.comparar(<obj ou string JSON>)');
          console.log(snap);
          console.groupEnd();
        }
        return snap;
      });
    },
    baixar: function(){
      return _diag.snapshot.gerar({silent:true}).then(function(snap){
        if(!snap) return;
        var blob = new Blob([JSON.stringify(snap, null, 2)], {type:'application/json'});
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        var ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
        a.download = 'snapshot-' + ts + '.json';
        a.click();
        URL.revokeObjectURL(a.href);
        console.log('%c[_diag.snapshot.baixar] arquivo baixado: snapshot-'+ts+'.json',
          'color:#c8f05a;font-weight:700;');
      });
    },
    comparar: function(antigo){
      if(typeof antigo === 'string'){
        try { antigo = JSON.parse(antigo); }
        catch(e){ console.warn('[_diag.snapshot.comparar] JSON inválido.'); return; }
      }
      if(!antigo || !antigo.turmas){
        console.warn('Uso: _diag.snapshot.comparar(<objeto ou string JSON>)');
        return;
      }
      return _diag.snapshot.gerar({silent:true}).then(function(novo){
        if(!novo) return;
        console.group('%c[_diag.snapshot.comparar]',
          'background:#a78bfa;color:#fff;padding:2px 8px;font-weight:700;');
        console.log('Antigo:', antigo.timestamp, '|  Atual:', novo.timestamp);
        var divs = [];
        var campos = ['faturado','aberto','negociacao','entrada','qtdClientes','qtdPagos'];
        Object.keys(antigo.turmas).forEach(function(tid){
          var a = antigo.turmas[tid];
          var n = novo.turmas[tid];
          if(!n){
            divs.push({turma: a.nome, campo: '(turma removida)', antes: '-', agora: '-', diff: '-'});
            return;
          }
          campos.forEach(function(campo){
            if(a[campo] !== n[campo]){
              divs.push({
                turma: a.nome,
                campo: campo,
                antes: a[campo],
                agora: n[campo],
                diff: (typeof n[campo] === 'number' && typeof a[campo] === 'number') ? (n[campo] - a[campo]) : '-'
              });
            }
          });
        });
        Object.keys(novo.turmas).forEach(function(tid){
          if(!antigo.turmas[tid]){
            divs.push({turma: novo.turmas[tid].nome, campo: '(turma nova)', antes: '-', agora: '-', diff: '-'});
          }
        });
        if(divs.length === 0){
          console.log('%c✓ NENHUMA MUDANÇA — todos os totais granulares batem',
            'background:#c8f05a;color:#000;padding:3px 10px;font-weight:700;');
        } else {
          console.warn('⚠ '+divs.length+' divergência(s) encontrada(s):');
          console.table(divs);
        }
        console.groupEnd();
        return divs;
      });
    }
  };

  /* ── 6. Ajuda ──────────────────────────────────────────────── */
  _diag.ajuda = function(){
    console.group('%c[_diag] funções disponíveis',
      'background:#c8f05a;color:#000;padding:3px 10px;font-weight:700;');
    console.log('%c_diag.helpers()       %c→ checa se os helpers canônicos estão carregados', 'font-weight:700;color:#60a5fa;','color:#aaa;');
    console.log('%c_diag.totais()        %c→ imprime os 4 totais granulares', 'font-weight:700;color:#60a5fa;','color:#aaa;');
    console.log('%c_diag.divergencias()  %c→ compara cálculos com os KPIs do DOM (auto-check)', 'font-weight:700;color:#60a5fa;','color:#aaa;');
    console.log('%c_diag.cliente("nome") %c→ inspeção completa de um cliente (busca parcial)', 'font-weight:700;color:#60a5fa;','color:#aaa;');
    console.log('%c_diag.snapshot.gerar()    %c→ totais granulares de TODAS as turmas (objeto)', 'font-weight:700;color:#a78bfa;','color:#aaa;');
    console.log('%c_diag.snapshot.baixar()   %c→ baixa snapshot atual como JSON (baseline)', 'font-weight:700;color:#a78bfa;','color:#aaa;');
    console.log('%c_diag.snapshot.comparar(j)%c→ compara baseline com totais atuais e lista divergências', 'font-weight:700;color:#a78bfa;','color:#aaa;');
    console.log('%c_diag.ajuda()         %c→ esta lista', 'font-weight:700;color:#60a5fa;','color:#aaa;');
    console.groupEnd();
  };

  /* Banner discreto no load */
  setTimeout(function(){
    console.log('%c[_diag] carregado. Digite _diag.ajuda() para ver as funções.',
      'color:#c8f05a;font-weight:700;');
  }, 1500);
})();
