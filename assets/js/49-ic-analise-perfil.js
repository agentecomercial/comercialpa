/* ═══════════════════════════════════════════════════════════════
   49-ic-analise-perfil.js — Dossiê Comportamental MINIMALISTA
   ═══════════════════════════════════════════════════════════════
   Versão simplificada: gestor anexa o PDF do perfil comportamental
   (CIS Assessment ou qualquer outro formato), clica em "Gerar análise"
   que copia um prompt pra IA com visão (Claude/GPT-4o), gestor anexa
   o MESMO PDF na IA + cola o prompt, recebe JSON, cola de volta e
   o sistema renderiza o plano contextualizado.

   Sem form estruturado, sem gráficos do sistema, sem parser local.
   O gráfico fica no PDF anexado (já bonito, gerado pelo instrumento).

   Persistência: icPerfil/{consultorUid} no Firebase.
═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* Caminho do prompt versionado (carregado on-demand) */
  var PROMPT_PATH = 'assets/prompts/analise-perfil-consultor.md';

  /* ── Estado ──────────────────────────────────────────────────── */
  var _consultorAtual = null;  /* { uid, nome } */
  var _dossie = null;
  var _promptCache = null;

  /* ── Helpers ─────────────────────────────────────────────────── */
  function _g(id){ return document.getElementById(id); }
  function _v(id){ var el=_g(id); return el ? el.value : ''; }
  function _esc(s){
    return String(s==null?'':s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function _toast(msg, cor){
    if(typeof window._showToast === 'function') window._showToast(msg, cor||'var(--accent)');
    else console.log('[dossie]', msg);
  }

  /* ── Dossiê padrão ───────────────────────────────────────────── */
  function _dossieVazio(){
    return {
      tempoCasa: '',
      cargo: 'Consultor',
      aplicadoEm: '',
      proxReavaliacao: '',
      origem: 'CIS Assessment',
      anexos: [],
      analiseIA: null,
      atualizadoEm: null
    };
  }

  /* ── Carregar / Salvar ───────────────────────────────────────── */
  function _carregar(consultorUid){
    if(typeof window._fbGet !== 'function'){
      _dossie = _dossieVazio();
      return Promise.resolve(_dossie);
    }
    return window._fbGet('icPerfil/'+consultorUid).then(function(d){
      _dossie = d || _dossieVazio();
      if(!Array.isArray(_dossie.anexos)) _dossie.anexos = [];
      if(!_dossie.origem) _dossie.origem = 'CIS Assessment';
      if(!_dossie.cargo) _dossie.cargo = 'Consultor';
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

  function _coletarForm(){
    _dossie.aplicadoEm      = _v('icPerfAplicadoEm');
    _dossie.proxReavaliacao = _v('icPerfProxReav');
    _dossie.tempoCasa       = _v('icPerfTempoCasa');
    _dossie.cargo           = _v('icPerfCargo') || 'Consultor';
  }

  /* ── Render ──────────────────────────────────────────────────── */
  function _renderForm(){
    if(!_dossie) _dossie = _dossieVazio();
    _g('icPerfNomeTit').textContent = _consultorAtual ? _consultorAtual.nome : '—';
    _g('icPerfAplicadoEm').value    = _dossie.aplicadoEm || '';
    _g('icPerfProxReav').value      = _dossie.proxReavaliacao || '';
    _g('icPerfTempoCasa').value     = _dossie.tempoCasa || '';
    _g('icPerfCargo').value         = _dossie.cargo || 'Consultor';
    _renderAnexos();
    _renderAnaliseAtual();
  }

  function _renderAnexos(){
    var box = _g('icPerfAnexos');
    if(!box) return;
    if(!_dossie.anexos.length){
      box.innerHTML = '<div style="font-size:11px;color:var(--muted);padding:8px 0;font-style:italic;">Nenhum anexo. Adicione o PDF do perfil comportamental para gerar a análise.</div>';
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

  /* ── Render da análise (resultado da IA) ─────────────────────── */
  function _renderAnaliseAtual(){
    var box = _g('icPerfAnalise');
    if(!box) return;
    if(!_dossie.analiseIA){
      box.innerHTML = '<div style="font-size:11px;color:var(--muted);padding:14px;text-align:center;background:var(--surface2);border-radius:6px;font-style:italic;">'
        +'Nenhuma análise gerada ainda.<br>'
        +'1. Anexe o PDF do perfil &middot; 2. Clique em "Copiar prompt" &middot; 3. Cole no Claude/ChatGPT (anexando o mesmo PDF) &middot; 4. Cole o JSON de resposta aqui'
        +'</div>';
      return;
    }
    var a = _dossie.analiseIA;
    var quando = a._meta && a._meta.em ? new Date(a._meta.em).toLocaleString('pt-BR') : '';

    var html = '<div style="font-size:10px;color:var(--muted);margin-bottom:10px;">Gerado por ✨ IA · '+quando+'</div>';

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
        +'⚠ Campos que a IA não conseguiu extrair: '+a.campos_pendentes.map(_esc).join(', ')
      +'</div>';
    }

    box.innerHTML = html;
  }

  /* ── Carrega prompt da IA ────────────────────────────────────── */
  function _carregarPrompt(){
    if(_promptCache) return Promise.resolve(_promptCache);
    return fetch(PROMPT_PATH).then(function(r){
      if(!r.ok) throw new Error('http '+r.status);
      return r.text();
    }).then(function(txt){
      _promptCache = txt;
      return _promptCache;
    }).catch(function(){
      _promptCache = _promptFallback();
      return _promptCache;
    });
  }

  function _promptFallback(){
    return '# ANÁLISE DE PERFIL COMPORTAMENTAL — FALLBACK\n\n'
      +'Você é consultor sênior em desenvolvimento de vendas com domínio em metodologias DISC e vendas consultivas.\n'
      +'O documento ANEXADO é o perfil comportamental completo de um consultor. Leia-o (incluindo gráficos visuais — DISC, dimensões, radar de traços, valores motivacionais) e produza uma análise contextualizada e acionável.\n\n'
      +'## DADOS ADICIONAIS\n'
      +'- Consultor: {{NOME_CONSULTOR}}\n'
      +'- Tempo de casa: {{TEMPO_CASA}}\n'
      +'- Cargo: {{CARGO}}\n'
      +'- KPIs: Faturado R$ {{FATURADO}} · Meta R$ {{META_BASICA}} ({{PCT_META}}%) · Conversão {{CONVERSAO}}% · Ticket R$ {{TICKET_MEDIO}} · Posição {{POSICAO_RANKING}}/{{TOTAL_CONSULTORES}}\n\n'
      +'## REGRAS\n'
      +'- Responda APENAS com JSON (sem markdown wrappers, sem texto antes/depois)\n'
      +'- Português do Brasil, tom profissional, sem clichê de coaching\n'
      +'- Toda recomendação cita o dado visual de origem (ex: "I=58 dominante visível no DISC Natural")\n\n'
      +'## FORMATO DE SAÍDA (JSON puro)\n'
      +'{"leitura_geral":{"perfil_dominante":"","perfil_secundario":"","resumo_uma_frase":"","alerta_principal":"","sinal_de_atencao_kpi":""},'
      +'"competencias_alvo_sugeridas":[{"competencia":"","prioridade":1,"porque":"","como_alavancar_perfil":""}],'
      +'"framework_pdi_recomendado":{"nome":"GROW","razao":"","tradeoff":""},'
      +'"tom_de_feedback":{"estilo_geral":"","formato_ideal":"","duracao_max":"","publico_vs_privado":""},'
      +'"frase_de_abertura_1a1":"",'
      +'"motivadores_para_usar":[{"motivador":"","como_usar":"","exemplo_frase":""}],'
      +'"evitar_absolutamente":[{"comportamento":"","porque":""}],'
      +'"perguntas_para_aprofundar_no_proximo_1a1":[],'
      +'"campos_pendentes":[]}\n\n'
      +'competencia DEVE ser uma destas exatamente: "Prospecção" "Qualificação" "Apresentação" "Negociação" "Follow-up" "Constância" "Mix de produto" "Aproveitamento" "Visão (Oportunidades)"\n\n'
      +'framework_pdi_recomendado.nome DEVE ser um destes: "GROW" "OKRs" "Performance Gap" "STAR" "Balanced Scorecard"\n\n'
      +'Agora analise o PDF anexado e responda APENAS com o JSON.';
  }

  /* ── Monta prompt substituindo placeholders ──────────────────── */
  function _montarPrompt(prompt){
    _coletarForm();
    var d = _dossie;
    var kpis = _coletarKpis();
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
      .replace(/\{\{TOTAL_CONSULTORES\}\}/g, v(kpis.total));
  }

  function _coletarKpis(){
    var nome = _consultorAtual && _consultorAtual.nome || '';
    var nomeUp = String(nome).toUpperCase();
    var kpis = {
      faturado:'', meta:'', pctMeta:'', conversao:'', ticket:'',
      pos:'', total:''
    };
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
    return kpis;
  }

  /* ── Ações dos botões ────────────────────────────────────────── */
  window._icPerfilCopiarPrompt = function(){
    _coletarForm();
    if(!_dossie.anexos.length){
      if(!confirm('Nenhum PDF anexado. A IA não vai ter o perfil visual pra analisar.\n\nDeseja copiar o prompt mesmo assim?')) return;
    }
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
          _toast('✅ Prompt copiado · Abra Claude/ChatGPT, ANEXE O PDF do perfil + cole', 'var(--accent)');
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
      _toast('✅ Análise aplicada e salva', 'var(--accent)');
    });
  };

  window._icPerfilSalvar = function(){
    _coletarForm();
    _salvar().then(function(){
      _toast('💾 Dossiê salvo', 'var(--accent)');
    });
  };

  window._icPerfilLimpar = function(){
    if(!_consultorAtual){ _toast('⚠ Selecione um consultor primeiro', 'var(--amber)'); return; }
    var nome = _consultorAtual.nome || 'consultor';
    if(!confirm('Limpar TODOS os dados do dossiê de '+nome+'?\n\n'
      +'• Apaga identificação (datas, tempo de casa, cargo)\n'
      +'• Apaga anexos (PDFs/imagens)\n'
      +'• Apaga análise gerada\n\n'
      +'Não pode ser desfeito.')) return;

    _dossie = _dossieVazio();
    _renderForm();
    _salvar().then(function(){
      _toast('🗑 Dossiê limpo', 'var(--accent)');
    });
  };

  /* ── Modal open/close ────────────────────────────────────────── */
  window._icAbrirDossie = function(consultorUid, consultorNome){
    if(!consultorUid && !consultorNome){
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
    _carregar(_consultorAtual.uid).then(_renderForm);
  };

  window._icFecharDossie = function(){
    _coletarForm();
    _salvar();
    var modal = _g('icPerfilModal');
    if(modal) modal.classList.remove('open');
  };

  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){
      var modal = _g('icPerfilModal');
      if(modal && modal.classList.contains('open')) window._icFecharDossie();
    }
  });

  /* Banner */
  setTimeout(function(){
    console.log('%c[ic-perfil] dossiê comportamental ativo (versão minimalista) — _icAbrirDossie(uid, nome)',
      'color:#a78bfa;font-weight:600;');
  }, 2000);

})();
