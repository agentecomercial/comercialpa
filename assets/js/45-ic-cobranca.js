/* ══════════════════════════════════════════════════════════════
   INTELIGÊNCIA COMERCIAL — Cobrança Saudável (Fase 8)
   Vive APENAS dentro de #mapeamentoScreen (pane "cobranca").
   Não toca Gerenciar Turmas nem Pipeline Comercial.

   Modelo:
     - Vendedor registra promessas de pagamento à mão
     - Estados: pendente | vencida (auto, baseado em data) | honrada | quebrada | reagendada
     - Cada consultor vê só as suas; ADM/EXTRACLASSE vê todas

   Firebase paths:
     icCobrancas/{consultor}/{id} → {cliente, produto, valor, dataPrometida, canal, obs,
                                     estado, criadoEm, criadoPor, atualizadoEm,
                                     reagendamentos[], honradoEm}
══════════════════════════════════════════════════════════════ */
(function(){

  /* ── Estado ────────────────────────────────────────── */
  var _cbDados = {};            /* {consultor: {id: {...}}} */
  var _cbEstFiltro = 'todos';
  var _cbPerFiltro = '3m';      /* 3m | 6m | tudo */
  var _cbBuscaTxt = '';
  var _cbConsFiltro = '';
  var _cbEditId = null;
  var _cbEditCons = null;
  var _cbAcaoCtx = null;        /* {id, cons, tipo} */

  /* ── Permissões ────────────────────────────────────── */
  function _cbAdmin(){
    var sess = (typeof window._getSessao === 'function') ? window._getSessao() : null;
    if(!sess) return false;
    if(sess.perfil === 'adm') return true;
    var n = String(sess.nome||sess.login||'').toUpperCase().trim();
    return n === 'EXTRACLASSE';
  }
  function _cbMeuNome(){
    var sess = (typeof window._getSessao === 'function') ? window._getSessao() : null;
    if(!sess) return '—';
    return String(sess.nome||sess.login||'—').toUpperCase().trim();
  }

  /* ── Helpers ───────────────────────────────────────── */
  function _toast(msg, color){
    if(typeof window._showToast === 'function'){ window._showToast(msg, color); return; }
    alert(msg);
  }
  function _fmtR(v){ return 'R$ '+(+v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function _parseValor(s){
    if(typeof s === 'number') return s;
    if(!s) return 0;
    s = String(s).replace(/[^0-9,\.]/g,'').replace(/\./g,'').replace(',','.');
    return parseFloat(s) || 0;
  }
  function _fmtData(iso){
    if(!iso) return '—';
    try{ var d = new Date(iso); if(isNaN(d.getTime())) return iso;
      return d.toLocaleDateString('pt-BR'); }catch(e){ return iso; }
  }
  function _diasAte(iso){
    if(!iso) return null;
    try{
      var alvo = new Date(iso+'T12:00:00');
      var hoje = new Date(); hoje.setHours(12,0,0,0);
      return Math.round((alvo.getTime() - hoje.getTime())/86400000);
    }catch(e){ return null; }
  }
  function _estadoEfetivo(p){
    if(!p) return 'pendente';
    if(p.estado === 'honrada' || p.estado === 'quebrada' || p.estado === 'reagendada') return p.estado;
    var dias = _diasAte(p.dataPrometida);
    if(dias != null && dias < 0) return 'vencida';
    return 'pendente';
  }

  /* ── Lista achatada de promessas (com consultor injetado) ── */
  function _cbAchatar(){
    var lista = [];
    Object.keys(_cbDados).forEach(function(cons){
      var promessas = _cbDados[cons] || {};
      Object.keys(promessas).forEach(function(id){
        var p = promessas[id] || {};
        lista.push(Object.assign({id:id, consultor:cons}, p));
      });
    });
    return lista;
  }

  /* ── Carga: lê só os próprios; ADM/EXTRACLASSE lê tudo ── */
  function _cbCarregar(cb){
    if(typeof window._fbGet !== 'function'){ if(cb) cb(); return; }
    if(_cbAdmin()){
      window._fbGet('icCobrancas').then(function(d){
        _cbDados = d || {};
        if(cb) cb();
      }).catch(function(){ _cbDados = {}; if(cb) cb(); });
    } else {
      var n = _cbMeuNome();
      window._fbGet('icCobrancas/'+n).then(function(d){
        _cbDados = {}; _cbDados[n] = d || {};
        if(cb) cb();
      }).catch(function(){ _cbDados = {}; if(cb) cb(); });
    }
  }

  /* ── Render KPIs ───────────────────────────────────── */
  function _cbRenderKpis(){
    var box = document.getElementById('cbKpis');
    if(!box) return;
    var lista = _cbAplicarPeriodo(_cbAchatar());
    var total = lista.length;
    var pendentes = lista.filter(function(p){return _estadoEfetivo(p)==='pendente';}).length;
    var vencidas  = lista.filter(function(p){return _estadoEfetivo(p)==='vencida';}).length;
    var honradas  = lista.filter(function(p){return p.estado==='honrada';}).length;
    var quebradas = lista.filter(function(p){return p.estado==='quebrada';}).length;
    var totFinal = honradas + quebradas;
    var pctHonra = totFinal ? Math.round(honradas/totFinal*100) : null;
    var valorAberto = lista
      .filter(function(p){ var e=_estadoEfetivo(p); return e==='pendente'||e==='vencida'; })
      .reduce(function(s,p){return s + (+p.valor||0);}, 0);

    box.innerHTML =
      '<div class="cb-kpi"><div class="cb-kpi-lbl">Promessas no período</div><div class="cb-kpi-val">'+total+'</div></div>'+
      '<div class="cb-kpi"><div class="cb-kpi-lbl">🟡 Pendentes</div><div class="cb-kpi-val pendente">'+pendentes+'</div></div>'+
      '<div class="cb-kpi"><div class="cb-kpi-lbl">🔴 Vencidas</div><div class="cb-kpi-val vencida">'+vencidas+'</div></div>'+
      '<div class="cb-kpi"><div class="cb-kpi-lbl">💸 Valor em aberto</div><div class="cb-kpi-val">'+_fmtR(valorAberto)+'</div></div>'+
      '<div class="cb-kpi"><div class="cb-kpi-lbl">✅ % Honradas</div><div class="cb-kpi-val '+(pctHonra==null?'':(pctHonra>=70?'ok':(pctHonra>=40?'warn':'bad')))+'">'+(pctHonra==null?'—':pctHonra+'%')+'</div><div class="cb-kpi-sub">'+honradas+' honradas / '+quebradas+' quebradas</div></div>';
  }

  /* ── Filtros ───────────────────────────────────────── */
  function _cbAplicarPeriodo(lista){
    if(_cbPerFiltro === 'tudo') return lista;
    var meses = _cbPerFiltro === '6m' ? 6 : 3;
    var corte = new Date(); corte.setMonth(corte.getMonth() - meses);
    return lista.filter(function(p){
      var d = p.criadoEm ? new Date(p.criadoEm) : (p.dataPrometida ? new Date(p.dataPrometida) : null);
      return !d || d >= corte;
    });
  }

  /* ── Render lista ──────────────────────────────────── */
  function _cbRender(){
    var box = document.getElementById('cbLista');
    var vazio = document.getElementById('cbVazio');
    if(!box) return;

    var lista = _cbAplicarPeriodo(_cbAchatar());

    if(_cbEstFiltro !== 'todos'){
      lista = lista.filter(function(p){ return _estadoEfetivo(p) === _cbEstFiltro; });
    }
    if(_cbConsFiltro){
      lista = lista.filter(function(p){ return p.consultor === _cbConsFiltro; });
    }
    if(_cbBuscaTxt){
      var q = _cbBuscaTxt.toLowerCase();
      lista = lista.filter(function(p){
        return (p.cliente||'').toLowerCase().indexOf(q) >= 0
            || (p.produto||'').toLowerCase().indexOf(q) >= 0
            || (p.consultor||'').toLowerCase().indexOf(q) >= 0
            || (p.obs||'').toLowerCase().indexOf(q) >= 0;
      });
    }

    /* Ordena: vencidas primeiro, depois pendentes (por data + próxima), depois finalizadas (mais recente) */
    lista.sort(function(a,b){
      var ea = _estadoEfetivo(a), eb = _estadoEfetivo(b);
      var ordem = {vencida:0, pendente:1, reagendada:2, honrada:3, quebrada:4};
      if(ordem[ea] !== ordem[eb]) return ordem[ea] - ordem[eb];
      if(ea === 'pendente' || ea === 'vencida'){
        return (a.dataPrometida||'').localeCompare(b.dataPrometida||'');
      }
      return (b.atualizadoEm||0) - (a.atualizadoEm||0);
    });

    if(!lista.length){
      box.innerHTML = '';
      if(vazio) vazio.style.display = 'flex';
      return;
    }
    if(vazio) vazio.style.display = 'none';

    var adm = _cbAdmin();
    var meuNome = _cbMeuNome();
    box.innerHTML = lista.map(function(p){
      var e = _estadoEfetivo(p);
      var dias = _diasAte(p.dataPrometida);
      var diasLbl = '';
      if(e === 'pendente'){
        if(dias === 0) diasLbl = '⏰ Vence HOJE';
        else if(dias > 0) diasLbl = '⏳ Em '+dias+' dia'+(dias>1?'s':'');
      } else if(e === 'vencida'){
        diasLbl = '⚠ '+Math.abs(dias)+' dia'+(Math.abs(dias)>1?'s':'')+' em atraso';
      }
      var podeEditar = adm || p.consultor === meuNome;

      var acoes = '';
      if(e === 'pendente' || e === 'vencida'){
        acoes = '<button class="cb-btn ok" onclick="_cbAcao(\''+p.id+'\',\''+p.consultor+'\',\'honrada\')">✅ Honrada</button>'
              + '<button class="cb-btn warn" onclick="_cbAcao(\''+p.id+'\',\''+p.consultor+'\',\'reagendada\')">↻ Reagendar</button>'
              + '<button class="cb-btn danger" onclick="_cbAcao(\''+p.id+'\',\''+p.consultor+'\',\'quebrada\')">❌ Quebrada</button>';
      } else if(e === 'reagendada'){
        acoes = '<span class="cb-acao-info">Reagendada — nova promessa criada</span>';
      } else {
        acoes = '<span class="cb-acao-info">Finalizada em '+_fmtData(p.honradoEm||p.atualizadoEm)+'</span>';
      }

      var scriptBtn = '<button class="cb-btn ghost" onclick="_cbScript(\''+e+'\')" title="Copia script sugerido do Playbook">📋 Script</button>';

      return '<div class="cb-card est-'+e+'" data-id="'+p.id+'">'
        + '<div class="cb-card-h">'
        +   '<div class="cb-card-est">'+_cbBadgeEstado(e)+(diasLbl?'<span class="cb-card-dias">'+diasLbl+'</span>':'')+'</div>'
        +   (podeEditar ? '<button class="pb-card-edit" title="Editar" onclick="_cbAbrirEdit(\''+p.id+'\',\''+p.consultor+'\')">✎</button>' : '')
        + '</div>'
        + '<div class="cb-card-cliente">'+(p.cliente||'—')
        +   (p.produto?' <span class="cb-card-prod">'+p.produto+'</span>':'')
        + '</div>'
        + '<div class="cb-card-meta">'
        +   '<div><b>'+_fmtR(p.valor)+'</b></div>'
        +   '<div>Prometido: <b>'+_fmtData(p.dataPrometida)+'</b></div>'
        +   '<div>Canal: <b>'+(p.canal||'—')+'</b></div>'
        +   (adm?'<div>Consultor: <b>'+p.consultor+'</b></div>':'')
        + '</div>'
        + (p.obs ? '<div class="cb-card-obs">"'+p.obs+'"</div>' : '')
        + (p.reagendamentos && p.reagendamentos.length ? '<div class="cb-card-hist">↻ Reagendada '+p.reagendamentos.length+'x</div>' : '')
        + '<div class="cb-card-acoes">'+scriptBtn+(podeEditar?acoes:'')+'</div>'
        + '</div>';
    }).join('');
  }

  function _cbBadgeEstado(e){
    var mapa = {
      pendente:  '<span class="cb-badge pendente">🟡 Pendente</span>',
      vencida:   '<span class="cb-badge vencida">🔴 Vencida</span>',
      honrada:   '<span class="cb-badge honrada">✅ Honrada</span>',
      quebrada:  '<span class="cb-badge quebrada">❌ Quebrada</span>',
      reagendada:'<span class="cb-badge reagendada">↻ Reagendada</span>'
    };
    return mapa[e] || mapa.pendente;
  }

  /* ── Atualiza select consultor (só ADM) ───────────── */
  function _cbAtualizarSelectCons(){
    var sel = document.getElementById('cbConsultorFiltro');
    if(!sel) return;
    if(!_cbAdmin()){ sel.style.display = 'none'; return; }
    sel.style.display = '';
    var atual = sel.value;
    var cons = Object.keys(_cbDados).sort();
    sel.innerHTML = '<option value="">Todos os consultores</option>' +
      cons.map(function(c){return '<option value="'+c+'">'+c+'</option>';}).join('');
    if(cons.indexOf(atual) >= 0) sel.value = atual;
  }

  /* ── Atualiza select produtos no form ─────────────── */
  function _cbAtualizarSelectProd(){
    var sel = document.getElementById('cbFormProduto');
    if(!sel) return;
    var atual = sel.value;
    var prods = [];
    if(typeof window._PRODUTOS_PROPOSTA === 'object' && window._PRODUTOS_PROPOSTA){
      prods = Object.keys(window._PRODUTOS_PROPOSTA);
    } else if(Array.isArray(window.allTreinamentos)){
      prods = window.allTreinamentos.slice();
    }
    sel.innerHTML = '<option value="">— Escolha o produto —</option>' +
      prods.map(function(p){return '<option value="'+p+'">'+p+'</option>';}).join('') +
      '<option value="OUTRO">Outro</option>';
    if(prods.indexOf(atual) >= 0) sel.value = atual;
  }

  /* ── Handlers de filtro ───────────────────────────── */
  window._cbSetEstado = function(e){
    _cbEstFiltro = e;
    document.querySelectorAll('.cb-est-chip').forEach(function(b){
      b.classList.toggle('active', b.dataset.est === e);
    });
    _cbRender();
  };
  window._cbSetPer = function(p){
    _cbPerFiltro = p;
    document.querySelectorAll('.cb-per-chip').forEach(function(b){
      b.classList.toggle('active', b.dataset.per === p);
    });
    _cbRenderKpis();
    _cbRender();
  };
  window._cbBuscar = function(){
    var inp = document.getElementById('cbBusca');
    var sel = document.getElementById('cbConsultorFiltro');
    _cbBuscaTxt = inp ? inp.value.trim() : '';
    _cbConsFiltro = sel ? sel.value : '';
    _cbRender();
  };

  /* ── Criar / editar promessa ──────────────────────── */
  window._cbNovaPromessa = function(){
    _cbEditId = null;
    _cbEditCons = _cbMeuNome();
    document.getElementById('cbEditTitulo').textContent = 'Nova promessa';
    document.getElementById('cbFormCliente').value = '';
    document.getElementById('cbFormProduto').value = '';
    document.getElementById('cbFormValor').value = '';
    document.getElementById('cbFormData').value = '';
    document.getElementById('cbFormCanal').value = 'WhatsApp';
    document.getElementById('cbFormObs').value = '';
    document.getElementById('cbBtnExcluir').style.display = 'none';
    _cbAtualizarSelectProd();
    document.getElementById('cbEditModal').classList.add('show');
  };

  window._cbAbrirEdit = function(id, cons){
    var p = (_cbDados[cons]||{})[id];
    if(!p){ _toast('Promessa não encontrada', 'var(--red)'); return; }
    _cbEditId = id;
    _cbEditCons = cons;
    document.getElementById('cbEditTitulo').textContent = 'Editar promessa';
    document.getElementById('cbFormCliente').value = p.cliente||'';
    _cbAtualizarSelectProd();
    document.getElementById('cbFormProduto').value = p.produto||'';
    document.getElementById('cbFormValor').value = p.valor ? String(p.valor).replace('.',',') : '';
    document.getElementById('cbFormData').value = p.dataPrometida||'';
    document.getElementById('cbFormCanal').value = p.canal||'WhatsApp';
    document.getElementById('cbFormObs').value = p.obs||'';
    document.getElementById('cbBtnExcluir').style.display = '';
    document.getElementById('cbEditModal').classList.add('show');
  };

  window._cbEditFechar = function(){
    document.getElementById('cbEditModal').classList.remove('show');
    _cbEditId = null; _cbEditCons = null;
  };

  window._cbSalvar = function(){
    var cliente = document.getElementById('cbFormCliente').value.trim();
    var produto = document.getElementById('cbFormProduto').value;
    var valor = _parseValor(document.getElementById('cbFormValor').value);
    var data = document.getElementById('cbFormData').value;
    var canal = document.getElementById('cbFormCanal').value;
    var obs = document.getElementById('cbFormObs').value.trim();

    if(!cliente){ _toast('Cliente é obrigatório', 'var(--red)'); return; }
    if(!data){ _toast('Data prometida é obrigatória', 'var(--red)'); return; }
    if(valor <= 0){ _toast('Valor deve ser maior que zero', 'var(--red)'); return; }

    var sess = (typeof window._getSessao === 'function') ? window._getSessao() : null;
    var quem = sess ? String(sess.nome||sess.login||'—').toUpperCase().trim() : '—';
    var cons = _cbEditCons || quem;

    /* Não-admin não pode editar promessa de outro */
    if(!_cbAdmin() && cons !== quem){
      _toast('Você só pode editar suas próprias promessas', 'var(--red)'); return;
    }

    var now = Date.now();
    var id = _cbEditId || ('cb_'+now+'_'+Math.random().toString(36).slice(2,7));
    var ant = (_cbDados[cons]||{})[id] || {};
    var payload = {
      cliente: cliente,
      produto: produto || '',
      valor: valor,
      dataPrometida: data,
      canal: canal,
      obs: obs,
      estado: ant.estado || 'pendente',
      criadoEm: ant.criadoEm || now,
      criadoPor: ant.criadoPor || quem,
      atualizadoEm: now,
      atualizadoPor: quem,
      reagendamentos: ant.reagendamentos || []
    };
    if(ant.honradoEm) payload.honradoEm = ant.honradoEm;

    if(typeof window._fbSave !== 'function'){ _toast('Firebase indisponível', 'var(--red)'); return; }
    window._fbSave('icCobrancas/'+cons+'/'+id, payload).then(function(){
      if(!_cbDados[cons]) _cbDados[cons] = {};
      _cbDados[cons][id] = payload;
      _cbEditFechar();
      _cbAtualizarSelectCons();
      _cbRenderKpis();
      _cbRender();
      _toast(_cbEditId ? '✏ Promessa atualizada' : '💾 Promessa registrada', 'success');
    }).catch(function(e){
      _toast('Erro ao salvar: ' + (e&&e.message?e.message:e), 'var(--red)');
    });
  };

  window._cbExcluir = function(){
    if(!_cbEditId || !_cbEditCons) return;
    if(!confirm('Excluir esta promessa?')) return;
    if(typeof window._fbSave !== 'function'){ _toast('Firebase indisponível', 'var(--red)'); return; }
    window._fbSave('icCobrancas/'+_cbEditCons+'/'+_cbEditId, null).then(function(){
      if(_cbDados[_cbEditCons]) delete _cbDados[_cbEditCons][_cbEditId];
      _cbEditFechar();
      _cbAtualizarSelectCons();
      _cbRenderKpis();
      _cbRender();
      _toast('🗑 Promessa excluída', 'success');
    }).catch(function(e){
      _toast('Erro ao excluir: ' + (e&&e.message?e.message:e), 'var(--red)');
    });
  };

  /* ── Ações: honrada / quebrada / reagendar ────────── */
  window._cbAcao = function(id, cons, tipo){
    _cbAcaoCtx = {id:id, cons:cons, tipo:tipo};
    var titulos = {
      honrada: '✅ Marcar como Honrada',
      quebrada:'❌ Marcar como Quebrada',
      reagendada:'↻ Reagendar promessa'
    };
    document.getElementById('cbAcaoTitulo').textContent = titulos[tipo] || tipo;
    var corpo = '';
    if(tipo === 'honrada'){
      corpo = '<div style="font-size:12px;color:#ddd;line-height:1.6;margin-bottom:10px;">Confirmar que o cliente pagou conforme prometido. Isso vai contar como <b>+1 promessa honrada</b> no seu KPI.</div>'
            + '<label class="pb-lbl">Data efetiva do pagamento</label>'
            + '<input type="date" id="cbAcaoData" class="pb-input" value="'+(new Date().toISOString().slice(0,10))+'">'
            + '<label class="pb-lbl">Observação <small style="color:var(--muted);font-weight:400;">(opcional)</small></label>'
            + '<textarea id="cbAcaoObs" class="pb-input" rows="2" placeholder="Pagamento na hora marcada, sem atrito"></textarea>';
    } else if(tipo === 'quebrada'){
      corpo = '<div style="font-size:12px;color:#ddd;line-height:1.6;margin-bottom:10px;">Cliente não pagou e não vai pagar mais. Conta como <b>-1</b> no KPI de honradas — sinal pra ajustar abordagem.</div>'
            + '<label class="pb-lbl">Motivo</label>'
            + '<textarea id="cbAcaoObs" class="pb-input" rows="3" placeholder="O que ele disse / o que aconteceu"></textarea>';
    } else if(tipo === 'reagendada'){
      corpo = '<div style="font-size:12px;color:#ddd;line-height:1.6;margin-bottom:10px;">Cria uma <b>nova promessa</b> a partir desta. A anterior fica marcada como reagendada (não é honrada nem quebrada).</div>'
            + '<label class="pb-lbl">Nova data prometida</label>'
            + '<input type="date" id="cbAcaoData" class="pb-input">'
            + '<label class="pb-lbl">Novo valor <small style="color:var(--muted);font-weight:400;">(deixe vazio pra repetir o anterior)</small></label>'
            + '<input type="text" id="cbAcaoValor" class="pb-input" placeholder="Ex: 1.500,00" inputmode="decimal">'
            + '<label class="pb-lbl">Motivo do reagendamento</label>'
            + '<textarea id="cbAcaoObs" class="pb-input" rows="2" placeholder="Por que ele pediu mais prazo"></textarea>';
    }
    document.getElementById('cbAcaoCorpo').innerHTML = corpo;
    document.getElementById('cbAcaoModal').classList.add('show');
  };

  window._cbAcaoFechar = function(){
    document.getElementById('cbAcaoModal').classList.remove('show');
    _cbAcaoCtx = null;
  };

  window._cbAcaoConfirmar = function(){
    if(!_cbAcaoCtx) return;
    var ctx = _cbAcaoCtx;
    var p = (_cbDados[ctx.cons]||{})[ctx.id];
    if(!p){ _toast('Promessa não encontrada', 'var(--red)'); return; }

    var sess = (typeof window._getSessao === 'function') ? window._getSessao() : null;
    var quem = sess ? String(sess.nome||sess.login||'—').toUpperCase().trim() : '—';
    if(!_cbAdmin() && ctx.cons !== quem){
      _toast('Você só pode alterar suas próprias promessas', 'var(--red)'); return;
    }

    var obs = (document.getElementById('cbAcaoObs')||{}).value || '';
    var now = Date.now();

    if(ctx.tipo === 'honrada'){
      var dataEf = (document.getElementById('cbAcaoData')||{}).value;
      p.estado = 'honrada';
      p.honradoEm = dataEf || new Date().toISOString().slice(0,10);
      if(obs) p.obsHonrada = obs;
      p.atualizadoEm = now;
      p.atualizadoPor = quem;
      _cbPersistir(ctx.cons, ctx.id, p, '✅ Promessa honrada — bom trabalho');
    } else if(ctx.tipo === 'quebrada'){
      p.estado = 'quebrada';
      if(obs) p.obsQuebrada = obs;
      p.atualizadoEm = now;
      p.atualizadoPor = quem;
      _cbPersistir(ctx.cons, ctx.id, p, '❌ Promessa marcada como quebrada');
    } else if(ctx.tipo === 'reagendada'){
      var novaData = (document.getElementById('cbAcaoData')||{}).value;
      if(!novaData){ _toast('Data nova é obrigatória', 'var(--red)'); return; }
      var novoValor = _parseValor((document.getElementById('cbAcaoValor')||{}).value);
      if(!novoValor) novoValor = +p.valor || 0;

      /* Marca a antiga como reagendada e cria nova */
      p.estado = 'reagendada';
      p.atualizadoEm = now;
      p.atualizadoPor = quem;

      var novoId = 'cb_'+now+'_'+Math.random().toString(36).slice(2,7);
      var nova = {
        cliente: p.cliente,
        produto: p.produto || '',
        valor: novoValor,
        dataPrometida: novaData,
        canal: p.canal || 'WhatsApp',
        obs: obs || ('Reagendamento da promessa de '+_fmtData(p.dataPrometida)),
        estado: 'pendente',
        criadoEm: now,
        criadoPor: quem,
        atualizadoEm: now,
        atualizadoPor: quem,
        reagendamentos: (p.reagendamentos||[]).concat([{de: ctx.id, deData: p.dataPrometida, em: now}])
      };

      Promise.all([
        window._fbSave('icCobrancas/'+ctx.cons+'/'+ctx.id, p),
        window._fbSave('icCobrancas/'+ctx.cons+'/'+novoId, nova)
      ]).then(function(){
        if(!_cbDados[ctx.cons]) _cbDados[ctx.cons] = {};
        _cbDados[ctx.cons][ctx.id] = p;
        _cbDados[ctx.cons][novoId] = nova;
        _cbAcaoFechar();
        _cbRenderKpis();
        _cbRender();
        _toast('↻ Reagendada — nova promessa criada', 'success');
      }).catch(function(e){
        _toast('Erro ao reagendar: ' + (e&&e.message?e.message:e), 'var(--red)');
      });
    }
  };

  function _cbPersistir(cons, id, payload, msg){
    if(typeof window._fbSave !== 'function'){ _toast('Firebase indisponível', 'var(--red)'); return; }
    window._fbSave('icCobrancas/'+cons+'/'+id, payload).then(function(){
      if(!_cbDados[cons]) _cbDados[cons] = {};
      _cbDados[cons][id] = payload;
      _cbAcaoFechar();
      _cbRenderKpis();
      _cbRender();
      _toast(msg, 'success');
    }).catch(function(e){
      _toast('Erro: ' + (e&&e.message?e.message:e), 'var(--red)');
    });
  }

  /* ── Sugestão de script (integração com Playbook) ── */
  window._cbScript = function(estado){
    if(typeof window._fbGet !== 'function'){ _toast('Playbook indisponível', 'var(--amber)'); return; }
    window._fbGet('icPlaybook').then(function(d){
      d = d || {};
      /* Procura script seed da categoria 'cobranca' com tag específica do estado */
      var prefer = {
        pendente:'pré-vencimento', vencida:'atraso',
        honrada:'confirmação', quebrada:'renegociação', reagendada:'promessa'
      };
      var alvo = prefer[estado] || '';
      var lista = Object.values(d).filter(function(s){return s && s.categoria === 'cobranca';});
      if(!lista.length){ _toast('Nenhum script de cobrança no Playbook ainda', 'var(--amber)'); return; }
      var match = lista.find(function(s){
        var tags = s.tags || [];
        if(!Array.isArray(tags)) tags = String(tags).split(',');
        return tags.some(function(t){return String(t).toLowerCase().indexOf(alvo) >= 0;});
      }) || lista[0];
      try{
        navigator.clipboard.writeText(match.script||'').then(function(){
          _toast('📋 Script "'+(match.titulo||'cobrança')+'" copiado', 'success');
        });
      }catch(e){ _toast('Erro ao copiar', 'var(--red)'); }
    });
  };

  /* ── Inicialização da aba ─────────────────────────── */
  function _cbInit(){
    _cbCarregar(function(){
      _cbAtualizarSelectCons();
      _cbRenderKpis();
      _cbRender();
    });
  }

  /* Hook em _icShowPane */
  var _origIcShow = window._icShowPane;
  window._icShowPane = function(name){
    if(typeof _origIcShow === 'function') _origIcShow(name);
    if(name === 'cobranca') _cbInit();
  };

  document.addEventListener('DOMContentLoaded', function(){
    var ativo = document.querySelector('.ic-pane.show');
    if(ativo && ativo.getAttribute('data-icpane') === 'cobranca') _cbInit();
  });

})();
