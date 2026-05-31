/* ═══════════════════════════════════════════════════════════════
   49-ic-analise-perfil.js — Dossiê Comportamental + Análise IA
   ═══════════════════════════════════════════════════════════════
   Modal acessível pelo botão "🧬 Dossiê" na aba Desenvolvimento.

   Captura DISC Natural+Adaptado, 3 dimensões cognitivas, 16 traços
   comportamentais e 6 valores motivacionais. Permite:

     • Anexar arquivos (PDF/imagem) do perfil
     • Preencher manualmente os campos
     • Gerar análise por REGRAS (instantâneo, sem IA)
     • Copiar prompt pronto pra colar em qualquer IA
     • Colar resposta JSON da IA e renderizar plano contextualizado

   Persistência: icPerfil/{consultorUid} no Firebase
   Anexos via base64 inline (sem Storage — mantém file:// funcional)
═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* ── Constantes ──────────────────────────────────────────────── */
  var COMPS_FEBRACIS = [
    'Prospecção','Qualificação','Apresentação','Negociação','Follow-up',
    'Constância','Mix de produto','Aproveitamento','Visão (Oportunidades)'
  ];

  var TRACOS_ORDEM = [
    {k:'ousadia',     l:'Ousadia'},
    {k:'comando',     l:'Comando'},
    {k:'objetividade',l:'Objetividade'},
    {k:'assertividade',l:'Assertividade'},
    {k:'persuasao',   l:'Persuasão'},
    {k:'extroversao', l:'Extroversão'},
    {k:'entusiasmo',  l:'Entusiasmo'},
    {k:'sociabilidade',l:'Sociabilidade'},
    {k:'empatia',     l:'Empatia'},
    {k:'paciencia',   l:'Paciência'},
    {k:'persistencia',l:'Persistência'},
    {k:'planejamento',l:'Planejamento'},
    {k:'organizacao', l:'Organização'},
    {k:'detalhismo',  l:'Detalhismo'},
    {k:'prudencia',   l:'Prudência'},
    {k:'concentracao',l:'Concentração'}
  ];

  var VALORES_ORDEM = [
    {k:'teorico',  l:'Conhecimento', sub:'Teórico'},
    {k:'estetico', l:'Harmonia',     sub:'Estético'},
    {k:'social',   l:'Altruísmo',    sub:'Social'},
    {k:'politico', l:'Poder',        sub:'Político'},
    {k:'economico',l:'Utilidade',    sub:'Econômico'},
    {k:'religioso',l:'Princípios',   sub:'Religioso'}
  ];

  /* Caminho do prompt versionado (carregado on-demand) */
  var PROMPT_PATH = 'assets/prompts/analise-perfil-consultor.md';

  /* ── Estado ──────────────────────────────────────────────────── */
  var _consultorAtual = null;  /* { uid, nome } */
  var _dossie = null;          /* objeto completo do dossiê */
  var _promptCache = null;     /* texto do prompt MD em cache */

  /* ── Helpers ─────────────────────────────────────────────────── */
  function _g(id){ return document.getElementById(id); }
  function _v(id){ var el=_g(id); return el ? el.value : ''; }
  function _n(id){ var x = parseFloat(_v(id)); return isNaN(x) ? null : x; }
  function _esc(s){
    return String(s==null?'':s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function _toast(msg, cor){
    if(typeof window._showToast === 'function') window._showToast(msg, cor||'var(--accent)');
    else console.log('[dossie]', msg);
  }

  /* ── Dossiê padrão (vazio) ───────────────────────────────────── */
  function _dossieVazio(){
    return {
      origem: 'Mapa Comportamental (DISC + Valores)',
      aplicadoEm: '',
      proxReavaliacao: '',
      tempoCasa: '',
      cargo: 'Consultor',
      disc: {
        natural:  { D:null, I:null, S:null, C:null },
        adaptado: { D:null, I:null, S:null, C:null }
      },
      dimensoes: {
        extroversao: null,  /* 0-100, lado extroversão */
        intuicao:    null,
        pensamento:  null
      },
      tracos: TRACOS_ORDEM.reduce(function(o,t){ o[t.k]=null; return o; }, {}),
      valores: VALORES_ORDEM.reduce(function(o,v){ o[v.k]=null; return o; }, {}),
      anexos: [],
      analiseIA: null,
      atualizadoEm: null
    };
  }

  /* ── Carregar dossiê do Firebase ─────────────────────────────── */
  function _carregar(consultorUid){
    if(typeof window._fbGet !== 'function'){
      _dossie = _dossieVazio();
      return Promise.resolve(_dossie);
    }
    return window._fbGet('icPerfil/'+consultorUid).then(function(d){
      _dossie = d || _dossieVazio();
      /* Garante shape completo (compat se vier de versão antiga) */
      if(!_dossie.disc) _dossie.disc = _dossieVazio().disc;
      if(!_dossie.disc.natural) _dossie.disc.natural = {D:null,I:null,S:null,C:null};
      if(!_dossie.disc.adaptado) _dossie.disc.adaptado = {D:null,I:null,S:null,C:null};
      if(!_dossie.dimensoes) _dossie.dimensoes = {extroversao:null,intuicao:null,pensamento:null};
      if(!_dossie.tracos) _dossie.tracos = {};
      if(!_dossie.valores) _dossie.valores = {};
      if(!Array.isArray(_dossie.anexos)) _dossie.anexos = [];
      return _dossie;
    }).catch(function(){
      _dossie = _dossieVazio();
      return _dossie;
    });
  }

  function _salvar(){
    if(!_consultorAtual || !_consultorAtual.uid) return Promise.resolve();
    _dossie.atualizadoEm = new Date().toISOString();
    if(typeof window._fbSave !== 'function') return Promise.resolve();
    return window._fbSave('icPerfil/'+_consultorAtual.uid, _dossie);
  }

  /* ── Coleta dados do form pra o objeto _dossie ───────────────── */
  function _coletarForm(){
    _dossie.aplicadoEm      = _v('icPerfAplicadoEm');
    _dossie.proxReavaliacao = _v('icPerfProxReav');
    _dossie.tempoCasa       = _v('icPerfTempoCasa');
    _dossie.cargo           = _v('icPerfCargo') || 'Consultor';

    ['D','I','S','C'].forEach(function(k){
      _dossie.disc.natural[k]  = _n('icPerfDN_'+k);
      _dossie.disc.adaptado[k] = _n('icPerfDA_'+k);
    });

    _dossie.dimensoes.extroversao = _n('icPerfDimExtr');
    _dossie.dimensoes.intuicao    = _n('icPerfDimIntu');
    _dossie.dimensoes.pensamento  = _n('icPerfDimPens');

    TRACOS_ORDEM.forEach(function(t){
      _dossie.tracos[t.k] = _n('icPerfTr_'+t.k);
    });

    VALORES_ORDEM.forEach(function(v){
      _dossie.valores[v.k] = _n('icPerfVa_'+v.k);
    });
  }

  /* ── Render do form com dados atuais ─────────────────────────── */
  function _renderForm(){
    if(!_dossie) _dossie = _dossieVazio();

    _g('icPerfNomeTit').textContent = _consultorAtual ? _consultorAtual.nome : '—';
    _g('icPerfAplicadoEm').value    = _dossie.aplicadoEm || '';
    _g('icPerfProxReav').value      = _dossie.proxReavaliacao || '';
    _g('icPerfTempoCasa').value     = _dossie.tempoCasa || '';
    _g('icPerfCargo').value         = _dossie.cargo || 'Consultor';

    ['D','I','S','C'].forEach(function(k){
      _g('icPerfDN_'+k).value = _dossie.disc.natural[k] == null ? '' : _dossie.disc.natural[k];
      _g('icPerfDA_'+k).value = _dossie.disc.adaptado[k] == null ? '' : _dossie.disc.adaptado[k];
    });

    _g('icPerfDimExtr').value = _dossie.dimensoes.extroversao == null ? '' : _dossie.dimensoes.extroversao;
    _g('icPerfDimIntu').value = _dossie.dimensoes.intuicao    == null ? '' : _dossie.dimensoes.intuicao;
    _g('icPerfDimPens').value = _dossie.dimensoes.pensamento  == null ? '' : _dossie.dimensoes.pensamento;

    TRACOS_ORDEM.forEach(function(t){
      var el = _g('icPerfTr_'+t.k);
      if(el) el.value = _dossie.tracos[t.k] == null ? '' : _dossie.tracos[t.k];
    });

    VALORES_ORDEM.forEach(function(v){
      var el = _g('icPerfVa_'+v.k);
      if(el) el.value = _dossie.valores[v.k] == null ? '' : _dossie.valores[v.k];
    });

    _renderAnexos();
    _renderAnaliseAtual();
    _calcularGaps();
  }

  function _renderAnexos(){
    var box = _g('icPerfAnexos');
    if(!box) return;
    if(!_dossie.anexos.length){
      box.innerHTML = '<div style="font-size:11px;color:var(--muted);padding:8px 0;">Nenhum anexo. Clique abaixo para adicionar PDF ou imagem.</div>';
      return;
    }
    box.innerHTML = _dossie.anexos.map(function(a, i){
      var icon = (a.tipo||'').indexOf('image') === 0 ? '🖼' : '📄';
      var sizeKb = a.tamanhoKb ? a.tamanhoKb+' KB' : '';
      return '<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;margin-bottom:4px;">'
        +'<span style="font-size:16px;">'+icon+'</span>'
        +'<div style="flex:1;min-width:0;">'
          +'<div style="font-size:11px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+_esc(a.nome)+'</div>'
          +'<div style="font-size:9px;color:var(--muted);">'+sizeKb+' · '+(a.em||'').slice(0,10)+'</div>'
        +'</div>'
        +'<button class="np-btn ghost" style="padding:3px 8px;font-size:10px;" onclick="window._icPerfilVerAnexo('+i+')">👁</button>'
        +'<button class="np-btn ghost" style="padding:3px 8px;font-size:10px;color:#ef4444;" onclick="window._icPerfilRemAnexo('+i+')">🗑</button>'
      +'</div>';
    }).join('');
  }

  window._icPerfilAddAnexo = function(input){
    var f = input.files && input.files[0];
    if(!f) return;
    if(f.size > 5 * 1024 * 1024){
      _toast('⚠ Arquivo > 5MB. Reduza ou anexe link externo.', 'var(--amber)');
      input.value = '';
      return;
    }
    var reader = new FileReader();
    reader.onload = function(e){
      _dossie.anexos.push({
        nome: f.name,
        tipo: f.type,
        tamanhoKb: Math.round(f.size/1024),
        em: new Date().toISOString(),
        dataUrl: e.target.result
      });
      _renderAnexos();
      _coletarForm();
      _salvar();
      _toast('✅ Anexo adicionado', 'var(--accent)');
    };
    reader.readAsDataURL(f);
    input.value = '';
  };

  window._icPerfilVerAnexo = function(i){
    var a = _dossie.anexos[i];
    if(!a || !a.dataUrl) return;
    var w = window.open('', '_blank');
    if(!w){ _toast('Permita pop-ups pra ver o anexo', 'var(--amber)'); return; }
    if((a.tipo||'').indexOf('image') === 0){
      w.document.write('<title>'+_esc(a.nome)+'</title><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="'+a.dataUrl+'" style="max-width:100%;max-height:100vh;"/></body>');
    } else {
      w.document.write('<title>'+_esc(a.nome)+'</title><body style="margin:0;"><iframe src="'+a.dataUrl+'" style="border:0;width:100vw;height:100vh;"></iframe></body>');
    }
  };

  window._icPerfilRemAnexo = function(i){
    if(!confirm('Remover anexo "'+(_dossie.anexos[i]||{}).nome+'"?')) return;
    _dossie.anexos.splice(i, 1);
    _renderAnexos();
    _coletarForm();
    _salvar();
  };

  /* ── Cálculos automáticos: gaps Natural × Adaptado ───────────── */
  function _calcularGaps(){
    var box = _g('icPerfGaps');
    if(!box) return;
    var alertas = [];
    ['D','I','S','C'].forEach(function(k){
      var n = _dossie.disc.natural[k];
      var a = _dossie.disc.adaptado[k];
      if(n == null || a == null) return;
      var gap = a - n;
      if(Math.abs(gap) >= 15){
        alertas.push({
          eixo: k,
          gap: gap,
          natural: n,
          adaptado: a,
          msg: 'Gap '+(gap>0?'+':'')+gap+' em '+k+' (Natural '+n+' → Adaptado '+a+')'
        });
      }
    });
    if(!alertas.length){
      box.innerHTML = '<div style="font-size:11px;color:var(--muted);padding:8px 12px;background:var(--surface2);border-radius:6px;">Sem gaps significativos entre Natural e Adaptado (variação < 15).</div>';
      return;
    }
    box.innerHTML = '<div style="font-size:11px;color:#f59e0b;padding:10px 12px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.3);border-radius:6px;">'
      +'<b>⚠ Sinais de adaptação significativa:</b><br>'
      +alertas.map(function(a){ return '• '+a.msg; }).join('<br>')
      +'<div style="margin-top:6px;font-size:10px;color:var(--muted);">→ O consultor pode estar se "forçando" a um papel diferente da natureza. Monitorar fadiga emocional em 6-12 meses.</div>'
      +'</div>';
  }

  /* ── Análise por REGRAS (sem IA) ─────────────────────────────── */
  function _analiseRegras(){
    var d = _dossie;
    var nat = d.disc.natural;
    if(!nat || nat.D == null){
      _toast('⚠ Preencha pelo menos DISC Natural', 'var(--amber)');
      return null;
    }

    /* Perfil dominante */
    var ordem = ['D','I','S','C'].sort(function(a,b){
      return (nat[b]||0) - (nat[a]||0);
    });
    var dominante = ordem[0];
    var secundario = ordem[1];

    /* Top traços e gaps */
    var tracos = TRACOS_ORDEM.map(function(t){
      return { l: t.l, v: d.tracos[t.k] };
    }).filter(function(t){ return t.v != null; });
    var topTracos = tracos.slice().sort(function(a,b){ return b.v - a.v; }).slice(0,5).filter(function(t){return t.v > 55;});
    var gapsTracos = tracos.slice().sort(function(a,b){ return a.v - b.v; }).slice(0,5).filter(function(t){return t.v < 45;});

    /* Valores motivacionais classificados */
    var motivadores = VALORES_ORDEM.map(function(v){
      return { l:v.l+' ('+v.sub+')', v:d.valores[v.k] };
    }).filter(function(v){ return v.v != null; });
    var significativos = motivadores.filter(function(v){ return v.v > 55; }).sort(function(a,b){return b.v-a.v;});
    var indiferentes = motivadores.filter(function(v){ return v.v < 30; });

    /* Framework por perfil dominante */
    var FRAMEWORK = {
      D: { nome: 'OKRs', razao: 'D dominante quer meta numérica, autonomia, desafio. OKR entrega isso.' },
      I: { nome: 'GROW', razao: 'I dominante responde a perguntas guiadas e autonomia, não a metas impostas.' },
      S: { nome: 'Balanced Scorecard', razao: 'S valoriza plano estável e equilíbrio entre frentes. BSC dá previsibilidade.' },
      C: { nome: 'Performance Gap', razao: 'C quer plano detalhado, métrica e lógica. Gap analítico é o que ressoa.' }
    };

    /* Tom de feedback por dominante */
    var TOM = {
      D: { estilo: 'Direto, curto, vai ao ponto', formato: 'Frente a frente, sem rodeios', duracao: '15-20 min' },
      I: { estilo: 'Empático, narrativo, com casos', formato: 'Frente a frente, conversado', duracao: '30-40 min' },
      S: { estilo: 'Paciente, estruturado, sem surpresa', formato: 'Calmo, com pauta enviada antes', duracao: '30-40 min' },
      C: { estilo: 'Detalhado, com dados e lógica', formato: 'Doc + reunião pra discutir', duracao: '40-50 min' }
    };

    /* Frase de abertura por dominante */
    var FRASE = {
      D: 'Me conta direto: qual foi sua maior vitória esse ciclo e o que você quer atacar agora?',
      I: 'Antes da gente olhar números — me conta o que te deixou mais entusiasmado nesse ciclo.',
      S: 'Vou te mostrar um panorama do ciclo. Me diz, com calma, como você se sentiu em cada parte.',
      C: 'Trouxe os números detalhados. Vamos analisar o que os dados estão dizendo sobre o ciclo?'
    };

    return {
      leitura_geral: {
        perfil_dominante: dominante,
        perfil_secundario: secundario,
        resumo_uma_frase: 'Perfil '+dominante+' dominante (Natural='+nat[dominante]+'), secundário '+secundario+' — '+
          (topTracos.length ? 'pontos fortes em '+topTracos.slice(0,2).map(function(t){return t.l;}).join(' e ') : 'sem traços altos preenchidos')+'.',
        alerta_principal: _alertaGap(),
        sinal_de_atencao_kpi: 'Análise por regras — para correlação fina entre traços e KPIs, use a opção IA.'
      },
      competencias_alvo_sugeridas: _compsSugeridasRegras(dominante, gapsTracos),
      framework_pdi_recomendado: {
        nome: FRAMEWORK[dominante].nome,
        razao: FRAMEWORK[dominante].razao,
        tradeoff: 'Análise por regras — cada framework tem tradeoffs; veja na aba PDI.'
      },
      tom_de_feedback: {
        estilo_geral: TOM[dominante].estilo,
        formato_ideal: TOM[dominante].formato,
        duracao_max: TOM[dominante].duracao,
        publico_vs_privado: 'Privado por padrão'
      },
      frase_de_abertura_1a1: FRASE[dominante],
      motivadores_para_usar: significativos.slice(0,3).map(function(m){
        return { motivador: m.l+' = '+m.v, como_usar: 'Vincule reconhecimento e metas a esse motivador.', exemplo_frase: '' };
      }),
      evitar_absolutamente: [].concat(
        indiferentes.slice(0,2).map(function(v){
          return { comportamento:'Argumentar com base em '+v.l, porque:'Score '+v.v+' (indiferente) — não funciona como alavanca.' };
        }),
        gapsTracos.slice(0,2).map(function(t){
          return { comportamento:'Exigir entregas que dependam de '+t.l+' sem apoio', porque:'Score '+t.v+' (baixo) — precisa estrutura externa.' };
        })
      ),
      perguntas_para_aprofundar_no_proximo_1a1: [
        'Em qual situação esse mês você se sentiu mais no seu elemento?',
        'O que você gostaria de fazer MENOS no próximo ciclo?'
      ],
      campos_pendentes: _camposVaziosLista(),
      _meta: { fonte:'regras', em: new Date().toISOString() }
    };
  }

  function _alertaGap(){
    var alertas = [];
    ['D','I','S','C'].forEach(function(k){
      var n = _dossie.disc.natural[k];
      var a = _dossie.disc.adaptado[k];
      if(n!=null && a!=null && Math.abs(a-n) >= 15){
        alertas.push('Gap '+(a-n>0?'+':'')+(a-n)+' em '+k);
      }
    });
    return alertas.length
      ? alertas.join(' · ')+' — adaptação significativa, monitorar fadiga'
      : 'Sem adaptação significativa entre Natural e Adaptado';
  }

  function _compsSugeridasRegras(dominante, gapsTracos){
    /* Mapa heurístico: dominante → competências naturais */
    var BASE = {
      D: ['Negociação','Prospecção','Aproveitamento'],
      I: ['Apresentação','Negociação','Prospecção'],
      S: ['Follow-up','Constância','Qualificação'],
      C: ['Qualificação','Mix de produto','Visão (Oportunidades)']
    };
    var bs = BASE[dominante] || ['Follow-up','Constância','Apresentação'];
    return bs.slice(0,3).map(function(c, i){
      return {
        competencia: c,
        prioridade: i+1,
        porque: 'Sugestão por regra a partir do perfil '+dominante+' dominante.',
        como_alavancar_perfil: 'Para análise correlacionada com seus traços fracos ('+
          (gapsTracos.length ? gapsTracos.slice(0,2).map(function(t){return t.l;}).join(', ') : 'preencher 16 traços')+
          '), use a opção IA.'
      };
    });
  }

  function _camposVaziosLista(){
    var pend = [];
    if(_dossie.disc.natural.D == null) pend.push('disc.natural');
    if(_dossie.disc.adaptado.D == null) pend.push('disc.adaptado');
    if(_dossie.dimensoes.extroversao == null) pend.push('dimensoes');
    var nTr = TRACOS_ORDEM.filter(function(t){ return _dossie.tracos[t.k] != null; }).length;
    if(nTr < 16) pend.push('tracos (faltam '+(16-nTr)+')');
    var nVa = VALORES_ORDEM.filter(function(v){ return _dossie.valores[v.k] != null; }).length;
    if(nVa < 6) pend.push('valores (faltam '+(6-nVa)+')');
    return pend;
  }

  /* ── Renderização da análise (regras OU IA) ──────────────────── */
  function _renderAnaliseAtual(){
    var box = _g('icPerfAnalise');
    if(!box) return;
    if(!_dossie.analiseIA){
      box.innerHTML = '<div style="font-size:11px;color:var(--muted);padding:14px;text-align:center;background:var(--surface2);border-radius:6px;">'
        +'Nenhuma análise gerada ainda.<br>Use os botões abaixo para gerar.'
        +'</div>';
      return;
    }
    var a = _dossie.analiseIA;
    var fonte = a._meta && a._meta.fonte === 'regras' ? '📐 Regras' : '✨ IA';
    var quando = a._meta && a._meta.em ? new Date(a._meta.em).toLocaleString('pt-BR') : '';

    var html = '<div style="font-size:10px;color:var(--muted);margin-bottom:10px;">Gerado por '+fonte+' · '+quando+'</div>';

    if(a.leitura_geral){
      html += '<div class="ic-perf-bloco">'
        +'<div class="ic-perf-bloco-tit">📋 Leitura geral</div>'
        +'<div style="font-size:12px;color:var(--text);line-height:1.55;">'
          +'<b>'+_esc(a.leitura_geral.perfil_dominante||'?')+'</b> dominante · <b>'+_esc(a.leitura_geral.perfil_secundario||'?')+'</b> secundário'
          +'<div style="margin-top:6px;">'+_esc(a.leitura_geral.resumo_uma_frase||'')+'</div>'
          +(a.leitura_geral.alerta_principal?'<div style="margin-top:8px;padding:6px 10px;background:rgba(245,158,11,.1);border-left:3px solid #f59e0b;border-radius:4px;color:#f59e0b;font-size:11px;">⚠ '+_esc(a.leitura_geral.alerta_principal)+'</div>':'')
          +(a.leitura_geral.sinal_de_atencao_kpi?'<div style="margin-top:6px;font-size:11px;color:var(--muted);">📊 '+_esc(a.leitura_geral.sinal_de_atencao_kpi)+'</div>':'')
        +'</div>'
      +'</div>';
    }

    if(Array.isArray(a.competencias_alvo_sugeridas)){
      html += '<div class="ic-perf-bloco">'
        +'<div class="ic-perf-bloco-tit">🎯 Competências-alvo sugeridas</div>'
        +a.competencias_alvo_sugeridas.map(function(c){
          return '<div style="padding:8px 10px;background:var(--surface2);border-radius:6px;margin-bottom:6px;">'
            +'<div style="font-size:11px;font-weight:700;color:var(--text);">#'+(c.prioridade||'?')+' '+_esc(c.competencia||'?')+'</div>'
            +'<div style="font-size:11px;color:var(--muted);margin-top:3px;line-height:1.5;">'+_esc(c.porque||'')+'</div>'
            +(c.como_alavancar_perfil?'<div style="font-size:11px;color:var(--accent);margin-top:3px;line-height:1.5;">💡 '+_esc(c.como_alavancar_perfil)+'</div>':'')
          +'</div>';
        }).join('')
      +'</div>';
    }

    if(a.framework_pdi_recomendado){
      html += '<div class="ic-perf-bloco">'
        +'<div class="ic-perf-bloco-tit">📐 Framework de PDI recomendado</div>'
        +'<div style="font-size:13px;font-weight:700;color:var(--accent);">'+_esc(a.framework_pdi_recomendado.nome||'?')+'</div>'
        +(a.framework_pdi_recomendado.razao?'<div style="font-size:11px;color:var(--text);margin-top:4px;line-height:1.55;">'+_esc(a.framework_pdi_recomendado.razao)+'</div>':'')
        +(a.framework_pdi_recomendado.tradeoff?'<div style="font-size:11px;color:var(--muted);margin-top:4px;line-height:1.5;font-style:italic;">⚠ Tradeoff: '+_esc(a.framework_pdi_recomendado.tradeoff)+'</div>':'')
      +'</div>';
    }

    if(a.tom_de_feedback){
      html += '<div class="ic-perf-bloco">'
        +'<div class="ic-perf-bloco-tit">🗣 Tom de feedback ideal</div>'
        +'<div style="font-size:11px;color:var(--text);line-height:1.7;">'
          +(a.tom_de_feedback.estilo_geral?'<b>Estilo:</b> '+_esc(a.tom_de_feedback.estilo_geral)+'<br>':'')
          +(a.tom_de_feedback.formato_ideal?'<b>Formato:</b> '+_esc(a.tom_de_feedback.formato_ideal)+'<br>':'')
          +(a.tom_de_feedback.duracao_max?'<b>Duração max:</b> '+_esc(a.tom_de_feedback.duracao_max)+'<br>':'')
          +(a.tom_de_feedback.publico_vs_privado?'<b>Modo:</b> '+_esc(a.tom_de_feedback.publico_vs_privado):'')
        +'</div>'
      +'</div>';
    }

    if(a.frase_de_abertura_1a1){
      html += '<div class="ic-perf-bloco">'
        +'<div class="ic-perf-bloco-tit">💬 Frase para abrir o 1:1</div>'
        +'<div style="font-size:13px;color:var(--text);font-style:italic;padding:10px 12px;background:rgba(96,165,250,.08);border-left:3px solid var(--blue);border-radius:4px;line-height:1.55;">"'+_esc(a.frase_de_abertura_1a1)+'"</div>'
      +'</div>';
    }

    if(Array.isArray(a.motivadores_para_usar) && a.motivadores_para_usar.length){
      html += '<div class="ic-perf-bloco">'
        +'<div class="ic-perf-bloco-tit">🚀 Motivadores para alavancar</div>'
        +a.motivadores_para_usar.map(function(m){
          return '<div style="padding:8px 10px;background:rgba(200,240,90,.06);border-left:3px solid var(--accent);border-radius:4px;margin-bottom:6px;">'
            +'<div style="font-size:11px;font-weight:700;color:var(--accent);">'+_esc(m.motivador||'?')+'</div>'
            +(m.como_usar?'<div style="font-size:11px;color:var(--text);margin-top:3px;line-height:1.5;">'+_esc(m.como_usar)+'</div>':'')
            +(m.exemplo_frase?'<div style="font-size:11px;color:var(--muted);margin-top:3px;line-height:1.5;font-style:italic;">"'+_esc(m.exemplo_frase)+'"</div>':'')
          +'</div>';
        }).join('')
      +'</div>';
    }

    if(Array.isArray(a.evitar_absolutamente) && a.evitar_absolutamente.length){
      html += '<div class="ic-perf-bloco">'
        +'<div class="ic-perf-bloco-tit">⛔ Evitar absolutamente</div>'
        +a.evitar_absolutamente.map(function(e){
          return '<div style="padding:6px 10px;background:rgba(239,68,68,.06);border-left:3px solid #ef4444;border-radius:4px;margin-bottom:4px;">'
            +'<div style="font-size:11px;color:var(--text);font-weight:600;">'+_esc(e.comportamento||'?')+'</div>'
            +(e.porque?'<div style="font-size:10px;color:var(--muted);margin-top:2px;line-height:1.45;">'+_esc(e.porque)+'</div>':'')
          +'</div>';
        }).join('')
      +'</div>';
    }

    if(Array.isArray(a.perguntas_para_aprofundar_no_proximo_1a1) && a.perguntas_para_aprofundar_no_proximo_1a1.length){
      html += '<div class="ic-perf-bloco">'
        +'<div class="ic-perf-bloco-tit">❓ Perguntas para o próximo 1:1</div>'
        +'<ul style="margin:0;padding-left:18px;font-size:11px;color:var(--text);line-height:1.7;">'
          +a.perguntas_para_aprofundar_no_proximo_1a1.map(function(p){ return '<li>'+_esc(p)+'</li>'; }).join('')
        +'</ul>'
      +'</div>';
    }

    if(Array.isArray(a.campos_pendentes) && a.campos_pendentes.length){
      html += '<div style="margin-top:10px;padding:6px 10px;background:var(--surface2);border-radius:6px;font-size:10px;color:var(--muted);">'
        +'⚠ Campos pendentes no input: '+a.campos_pendentes.map(_esc).join(', ')
      +'</div>';
    }

    box.innerHTML = html;
  }

  /* ── Carrega prompt do .md ───────────────────────────────────── */
  function _carregarPrompt(){
    if(_promptCache) return Promise.resolve(_promptCache);
    /* fetch() funciona em http://, falha em file:// — fallback embutido */
    return fetch(PROMPT_PATH).then(function(r){
      if(!r.ok) throw new Error('http '+r.status);
      return r.text();
    }).then(function(txt){
      _promptCache = txt;
      return _promptCache;
    }).catch(function(){
      /* Fallback: prompt mínimo embutido (caso fetch falhe — file://) */
      _promptCache = _promptFallback();
      return _promptCache;
    });
  }

  function _promptFallback(){
    return '# ANÁLISE COMPORTAMENTAL — FALLBACK\n\n'
      +'Você é consultor sênior em desenvolvimento de vendas (DISC + metodologias consultivas).\n'
      +'Analise o consultor abaixo e responda ESTRITAMENTE em JSON válido (sem markdown wrappers).\n\n'
      +'## INPUT\n\n'
      +'Nome: {{NOME_CONSULTOR}}\n'
      +'Tempo casa: {{TEMPO_CASA}}\n'
      +'Cargo: {{CARGO}}\n\n'
      +'KPIs: Faturado R$ {{FATURADO}} | Meta R$ {{META_BASICA}} ({{PCT_META}}%) | Conv {{CONVERSAO}}% | Ticket R$ {{TICKET_MEDIO}} | Posição {{POSICAO_RANKING}}/{{TOTAL_CONSULTORES}}\n\n'
      +'9 Competências Febracis (1-10): Prosp {{NOTA_PROSP}} · Qual {{NOTA_QUAL}} · Apres {{NOTA_APRES}} · Neg {{NOTA_NEG}} · Fup {{NOTA_FUP}} · Const {{NOTA_CONST}} · Mix {{NOTA_MIX}} · Apr {{NOTA_APR}} · Vis {{NOTA_VIS}}\n\n'
      +'DISC: D nat {{D_NAT}}/adap {{D_ADA}} · I nat {{I_NAT}}/adap {{I_ADA}} · S nat {{S_NAT}}/adap {{S_ADA}} · C nat {{C_NAT}}/adap {{C_ADA}}\n\n'
      +'Dimensões: Extr {{EXTR}}% · Intu {{INTU}}% · Pens {{PENS}}%\n\n'
      +'16 Traços: Ousadia {{T_OUS}} · Comando {{T_COM}} · Objetividade {{T_OBJ}} · Assertividade {{T_ASS}} · Persuasão {{T_PER}} · Extroversão {{T_EXT}} · Entusiasmo {{T_ENT}} · Sociabilidade {{T_SOC}} · Empatia {{T_EMP}} · Paciência {{T_PAC}} · Persistência {{T_PRS}} · Planejamento {{T_PLN}} · Organização {{T_ORG}} · Detalhismo {{T_DET}} · Prudência {{T_PRU}} · Concentração {{T_CON}}\n\n'
      +'6 Valores: Teórico {{V_TEO}} · Estético {{V_EST}} · Social {{V_SOC}} · Político {{V_POL}} · Econômico {{V_ECO}} · Religioso {{V_REL}}\n\n'
      +'## FORMATO DE SAÍDA (JSON puro)\n\n'
      +'{"leitura_geral":{"perfil_dominante":"","perfil_secundario":"","resumo_uma_frase":"","alerta_principal":"","sinal_de_atencao_kpi":""},'
      +'"competencias_alvo_sugeridas":[{"competencia":"","prioridade":1,"porque":"","como_alavancar_perfil":""}],'
      +'"framework_pdi_recomendado":{"nome":"GROW","razao":"","tradeoff":""},'
      +'"tom_de_feedback":{"estilo_geral":"","formato_ideal":"","duracao_max":"","publico_vs_privado":""},'
      +'"frase_de_abertura_1a1":"",'
      +'"motivadores_para_usar":[{"motivador":"","como_usar":"","exemplo_frase":""}],'
      +'"evitar_absolutamente":[{"comportamento":"","porque":""}],'
      +'"perguntas_para_aprofundar_no_proximo_1a1":[],'
      +'"campos_pendentes":[]}';
  }

  /* ── Monta prompt substituindo placeholders ──────────────────── */
  function _montarPrompt(prompt){
    _coletarForm();
    var d = _dossie;
    var kpis = _coletarKpis();
    var hist = _coletarHistorico();

    function gap(n,a){ return (n!=null && a!=null) ? (a-n) : ''; }
    function v(x){ return x==null?'':x; }

    return prompt
      .replace(/\{\{NOME_CONSULTOR\}\}/g, _consultorAtual ? _consultorAtual.nome : '—')
      .replace(/\{\{TEMPO_CASA\}\}/g, v(d.tempoCasa))
      .replace(/\{\{CARGO\}\}/g, v(d.cargo))
      .replace(/\{\{FATURADO\}\}/g, v(kpis.faturado))
      .replace(/\{\{META_BASICA\}\}/g, v(kpis.meta))
      .replace(/\{\{PCT_META\}\}/g, v(kpis.pctMeta))
      .replace(/\{\{CONVERSAO\}\}/g, v(kpis.conversao))
      .replace(/\{\{TICKET_MEDIO\}\}/g, v(kpis.ticket))
      .replace(/\{\{POSICAO_RANKING\}\}/g, v(kpis.pos))
      .replace(/\{\{TOTAL_CONSULTORES\}\}/g, v(kpis.total))
      .replace(/\{\{NOTA_PROSP\}\}/g, v(kpis.comps.prosp))
      .replace(/\{\{NOTA_QUAL\}\}/g, v(kpis.comps.qual))
      .replace(/\{\{NOTA_APRES\}\}/g, v(kpis.comps.apres))
      .replace(/\{\{NOTA_NEG\}\}/g, v(kpis.comps.neg))
      .replace(/\{\{NOTA_FUP\}\}/g, v(kpis.comps.fup))
      .replace(/\{\{NOTA_CONST\}\}/g, v(kpis.comps.const_))
      .replace(/\{\{NOTA_MIX\}\}/g, v(kpis.comps.mix))
      .replace(/\{\{NOTA_APR\}\}/g, v(kpis.comps.apr))
      .replace(/\{\{NOTA_VIS\}\}/g, v(kpis.comps.vis))
      .replace(/\{\{D_NAT\}\}/g, v(d.disc.natural.D)).replace(/\{\{D_ADA\}\}/g, v(d.disc.adaptado.D)).replace(/\{\{D_GAP\}\}/g, v(gap(d.disc.natural.D, d.disc.adaptado.D)))
      .replace(/\{\{I_NAT\}\}/g, v(d.disc.natural.I)).replace(/\{\{I_ADA\}\}/g, v(d.disc.adaptado.I)).replace(/\{\{I_GAP\}\}/g, v(gap(d.disc.natural.I, d.disc.adaptado.I)))
      .replace(/\{\{S_NAT\}\}/g, v(d.disc.natural.S)).replace(/\{\{S_ADA\}\}/g, v(d.disc.adaptado.S)).replace(/\{\{S_GAP\}\}/g, v(gap(d.disc.natural.S, d.disc.adaptado.S)))
      .replace(/\{\{C_NAT\}\}/g, v(d.disc.natural.C)).replace(/\{\{C_ADA\}\}/g, v(d.disc.adaptado.C)).replace(/\{\{C_GAP\}\}/g, v(gap(d.disc.natural.C, d.disc.adaptado.C)))
      .replace(/\{\{EXTR\}\}/g, v(d.dimensoes.extroversao)).replace(/\{\{INTRO\}\}/g, d.dimensoes.extroversao!=null?(100-d.dimensoes.extroversao):'')
      .replace(/\{\{INTU\}\}/g, v(d.dimensoes.intuicao)).replace(/\{\{SENS\}\}/g, d.dimensoes.intuicao!=null?(100-d.dimensoes.intuicao):'')
      .replace(/\{\{PENS\}\}/g, v(d.dimensoes.pensamento)).replace(/\{\{SENT\}\}/g, d.dimensoes.pensamento!=null?(100-d.dimensoes.pensamento):'')
      .replace(/\{\{T_OUS\}\}/g, v(d.tracos.ousadia)).replace(/\{\{T_COM\}\}/g, v(d.tracos.comando))
      .replace(/\{\{T_OBJ\}\}/g, v(d.tracos.objetividade)).replace(/\{\{T_ASS\}\}/g, v(d.tracos.assertividade))
      .replace(/\{\{T_PER\}\}/g, v(d.tracos.persuasao)).replace(/\{\{T_EXT\}\}/g, v(d.tracos.extroversao))
      .replace(/\{\{T_ENT\}\}/g, v(d.tracos.entusiasmo)).replace(/\{\{T_SOC\}\}/g, v(d.tracos.sociabilidade))
      .replace(/\{\{T_EMP\}\}/g, v(d.tracos.empatia)).replace(/\{\{T_PAC\}\}/g, v(d.tracos.paciencia))
      .replace(/\{\{T_PRS\}\}/g, v(d.tracos.persistencia)).replace(/\{\{T_PLN\}\}/g, v(d.tracos.planejamento))
      .replace(/\{\{T_ORG\}\}/g, v(d.tracos.organizacao)).replace(/\{\{T_DET\}\}/g, v(d.tracos.detalhismo))
      .replace(/\{\{T_PRU\}\}/g, v(d.tracos.prudencia)).replace(/\{\{T_CON\}\}/g, v(d.tracos.concentracao))
      .replace(/\{\{V_TEO\}\}/g, v(d.valores.teorico)).replace(/\{\{V_EST\}\}/g, v(d.valores.estetico))
      .replace(/\{\{V_SOC\}\}/g, v(d.valores.social)).replace(/\{\{V_POL\}\}/g, v(d.valores.politico))
      .replace(/\{\{V_ECO\}\}/g, v(d.valores.economico)).replace(/\{\{V_REL\}\}/g, v(d.valores.religioso))
      .replace(/\{\{HISTORICO_CICLOS\}\}/g, hist.ciclos || 'não disponível')
      .replace(/\{\{PDI_VIGENTE\}\}/g, hist.pdi || 'sem PDI vigente');
  }

  function _coletarKpis(){
    /* Tenta puxar KPIs do consultor das fontes que já existem na IC.
       Se nada estiver disponível, retorna placeholders vazios. */
    var nome = _consultorAtual && _consultorAtual.nome || '';
    var nomeUp = String(nome).toUpperCase();
    var kpis = {
      faturado:'', meta:'', pctMeta:'', conversao:'', ticket:'',
      pos:'', total:'',
      comps:{ prosp:'', qual:'', apres:'', neg:'', fup:'', const_:'', mix:'', apr:'', vis:'' }
    };
    /* KPIs do mês corrente (vindo do Pipeline _npPorConsultor) */
    if(typeof window._npTodasVendas === 'function' && typeof window._npPorConsultor === 'function'){
      try {
        var todas = window._npTodasVendas();
        var ranking = window._npPorConsultor(todas, '', 'pago');
        var idx = ranking.findIndex(function(r){ return String(r.nome).toUpperCase() === nomeUp; });
        if(idx >= 0){
          var r = ranking[idx];
          kpis.faturado = r.pago.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
          kpis.conversao = r.qtd ? Math.round(r.qtdPago/r.qtd*100) : '';
          kpis.ticket = r.qtdPago ? Math.round(r.pago/r.qtdPago).toLocaleString('pt-BR') : '';
          kpis.pos = idx+1;
          kpis.total = ranking.length;
          var goals = window._npGoals && window._npGoals[r.nome];
          if(goals){
            var mb = +(goals.metaBasica || goals.metaValor || 0);
            if(mb > 0){
              kpis.meta = mb.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
              kpis.pctMeta = Math.round(r.pago/mb*100);
            }
          }
        }
      } catch(e){ /* silencioso */ }
    }
    /* Competências do feedback mais recente do consultor */
    /* (Por ora deixa em branco — o gestor pode preencher manual antes de copiar) */
    return kpis;
  }

  function _coletarHistorico(){
    /* Por ora retorna placeholder. Pode ser expandido pra puxar
       feedbacks/PDI reais do consultor depois. */
    return { ciclos:'', pdi:'' };
  }

  /* ── Ações dos botões ────────────────────────────────────────── */
  window._icPerfilGerarRegras = function(){
    _coletarForm();
    var analise = _analiseRegras();
    if(!analise) return;
    _dossie.analiseIA = analise;
    _salvar().then(function(){
      _renderAnaliseAtual();
      _toast('✅ Análise por regras gerada', 'var(--accent)');
    });
  };

  window._icPerfilCopiarPrompt = function(){
    _coletarForm();
    _carregarPrompt().then(function(prompt){
      var full = _montarPrompt(prompt);
      var ta = document.createElement('textarea');
      ta.value = full;
      ta.style.cssText = 'position:fixed;top:-9999px;';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch(e) {}
      document.body.removeChild(ta);
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(full).then(function(){
          _toast('✅ Prompt copiado ('+Math.round(full.length/1024)+' KB) — cole no Claude/ChatGPT', 'var(--accent)');
        }).catch(function(){
          if(ok) _toast('✅ Prompt copiado', 'var(--accent)');
          else _toast('⚠ Falha ao copiar — selecione manualmente', 'var(--amber)');
        });
      } else {
        _toast(ok?'✅ Prompt copiado':'⚠ Falha ao copiar', ok?'var(--accent)':'var(--amber)');
      }
    });
  };

  window._icPerfilColarResposta = function(){
    var ta = _g('icPerfRespIA');
    var txt = ta ? ta.value.trim() : '';
    if(!txt){ _toast('⚠ Cole o JSON da resposta da IA antes', 'var(--amber)'); return; }
    /* Tenta extrair JSON puro mesmo se vier embrulhado em ```json ... ``` */
    var match = txt.match(/```(?:json)?\s*([\s\S]*?)```/);
    if(match) txt = match[1].trim();
    var analise;
    try {
      analise = JSON.parse(txt);
    } catch(e){
      _toast('❌ JSON inválido: '+(e.message||e), 'var(--red)');
      return;
    }
    analise._meta = { fonte:'ia', em: new Date().toISOString() };
    _dossie.analiseIA = analise;
    _salvar().then(function(){
      _renderAnaliseAtual();
      if(ta) ta.value = '';
      _toast('✅ Análise da IA aplicada e salva', 'var(--accent)');
    });
  };

  window._icPerfilSalvar = function(){
    _coletarForm();
    _salvar().then(function(){
      _toast('💾 Dossiê salvo', 'var(--accent)');
      _calcularGaps();
    });
  };

  /* ── Listeners dos inputs (auto-salvar gaps em tempo real) ───── */
  function _bindListeners(){
    ['icPerfDN_D','icPerfDN_I','icPerfDN_S','icPerfDN_C',
     'icPerfDA_D','icPerfDA_I','icPerfDA_S','icPerfDA_C'].forEach(function(id){
      var el = _g(id);
      if(el) el.addEventListener('input', function(){
        _coletarForm();
        _calcularGaps();
      });
    });
  }

  /* ── Modal open/close ────────────────────────────────────────── */
  window._icAbrirDossie = function(consultorUid, consultorNome){
    if(!consultorUid && !consultorNome){
      /* Tenta inferir consultor selecionado na aba Desenvolvimento */
      var sel = _g('fbConsultor');
      if(sel){
        consultorNome = sel.value || '';
        consultorUid = consultorNome ? ('uid_'+consultorNome.toUpperCase().replace(/\s+/g,'_')) : '';
      }
    }
    if(!consultorNome){
      _toast('⚠ Selecione um consultor antes de abrir o dossiê', 'var(--amber)');
      return;
    }
    _consultorAtual = { uid: consultorUid || ('uid_'+consultorNome.toUpperCase().replace(/\s+/g,'_')), nome: consultorNome };

    var modal = _g('icPerfilModal');
    if(!modal){
      console.warn('[icPerfil] Modal #icPerfilModal não existe no DOM');
      return;
    }
    modal.classList.add('open');
    _carregar(_consultorAtual.uid).then(function(){
      _renderForm();
      _bindListeners();
    });
  };

  window._icFecharDossie = function(){
    _coletarForm();
    _salvar();
    var modal = _g('icPerfilModal');
    if(modal) modal.classList.remove('open');
  };

  /* Atalho: tecla Esc fecha o modal */
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){
      var modal = _g('icPerfilModal');
      if(modal && modal.classList.contains('open')) window._icFecharDossie();
    }
  });

  /* ── Helpers expostos para templates HTML inline ──────────────── */
  window._icPerfilHelpers = {
    TRACOS_ORDEM: TRACOS_ORDEM,
    VALORES_ORDEM: VALORES_ORDEM,
    COMPS_FEBRACIS: COMPS_FEBRACIS
  };

  /* Banner */
  setTimeout(function(){
    console.log('%c[ic-perfil] dossiê comportamental ativo — _icAbrirDossie(uid, nome)',
      'color:#a78bfa;font-weight:600;');
  }, 2000);

})();
