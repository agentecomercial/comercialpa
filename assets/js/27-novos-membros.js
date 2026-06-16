/* ═══════════════════════════════════════════
   NOVO CONSULTOR / TREINADOR
═══════════════════════════════════════════ */
var _ncSelecionados=[];
function _ncLimparSelecao(){
  _ncSelecionados=[];
  document.querySelectorAll('#novoConsultorLista .fbtn').forEach(function(b){b.classList.remove('active');});
}
function abrirNovoConsultor(){
  _ncSelecionados=[];
  document.getElementById('novoConsultorNome').value='';
  document.getElementById('novoConsultorLista').innerHTML='<span style="font-size:12px;color:var(--muted);">Carregando...</span>';
  document.getElementById('novoConsultorVazio').style.display='none';
  document.getElementById('novoConsultorOverlay').classList.add('open');
  if(window._fbGet){
    window._fbGet('usuarios').then(function(usuarios){
      var lista=[];
      if(usuarios&&typeof usuarios==='object'){
        Object.values(usuarios).forEach(function(u){
          if(u&&u.nome&&u.ativo!==false&&u.perfil==='consultor'){
            var nomeUp=u.nome.toUpperCase();
            if(!allConsultors.map(function(c){return c.toUpperCase();}).includes(nomeUp))
              lista.push(nomeUp);
          }
        });
      }
      lista.sort();
      var el=document.getElementById('novoConsultorLista');
      if(!lista.length){
        el.innerHTML='';
        document.getElementById('novoConsultorVazio').style.display='block';
        return;
      }
      el.innerHTML=lista.map(function(n){
        return '<button class="fbtn" onclick="_ncSelecionar(\''+n+'\')" type="button">'+n+'</button>';
      }).join('');
    }).catch(function(){
      document.getElementById('novoConsultorLista').innerHTML='<span style="font-size:12px;color:var(--muted);">Erro ao carregar.</span>';
    });
  } else {
    document.getElementById('novoConsultorLista').innerHTML='';
  }
  setTimeout(function(){document.getElementById('novoConsultorNome').focus();},100);
}
function _ncSelecionar(nome){
  document.getElementById('novoConsultorNome').value='';
  var idx=_ncSelecionados.indexOf(nome);
  if(idx===-1){_ncSelecionados.push(nome);}
  else{_ncSelecionados.splice(idx,1);}
  document.querySelectorAll('#novoConsultorLista .fbtn').forEach(function(b){
    b.classList.toggle('active',_ncSelecionados.indexOf(b.textContent)!==-1);
  });
}
function fecharNovoConsultor(){document.getElementById('novoConsultorOverlay').classList.remove('open');_ncSelecionados=[];}
function salvarNovoConsultor(){
  var digitado=document.getElementById('novoConsultorNome').value.trim().toUpperCase();
  var lista=_ncSelecionados.length?_ncSelecionados.slice():(digitado?[digitado]:[]);
  if(!lista.length){document.getElementById('novoConsultorNome').focus();return;}
  var adicionados=[];
  lista.forEach(function(nome){
    if(!allConsultors.includes(nome)){
      allConsultors.push(nome);
      adicionados.push(nome);
      if(typeof _addPendLog==='function')_addPendLog('Novo consultor adicionado','Consultor: '+nome,'👤');
    }
  });
  if(!adicionados.length){_showToast('Todos já existem na turma.','var(--amber)');return;}
  _buildColors();_atualizarEquipeTurma();buildSelects();renderConsultor();fecharNovoConsultor();
  _showToast('✅ '+adicionados.length+' consultor'+(adicionados.length>1?'es':'')+' adicionado'+(adicionados.length>1?'s':'')+'!','var(--accent)');
  /* SYNC usuarios/: cria a conta IMEDIATAMENTE (modo silencioso, login/senha
     vazios + ativo:true). Aparece na hora no Gestão de Usuários com dot
     "sem acesso"; o admin configura login/senha lá quando quiser. */
  adicionados.forEach(function(n){
    if(window._registrarUsuario) window._registrarUsuario(n, 'consultor', {modo:'silencioso'});
  });
}

/* Fila uniforme de acessos pendentes — array de {nome, perfil} */
window._autoAcessoFila = window._autoAcessoFila || [];

/* Adiciona nomes na fila (filtra os que já têm acesso) e abre o próximo modal */
function _autoCriarAcessoUsuario(nomes, perfil){
  if(!nomes || !nomes.length) return;
  var local = (typeof _getUsuariosLocal==='function') ? _getUsuariosLocal() : {};
  var existentesNomes = new Set();
  Object.values(local||{}).forEach(function(u){
    if(u && u.nome) existentesNomes.add(String(u.nome).toUpperCase().trim());
  });
  nomes.forEach(function(n){
    if(!existentesNomes.has(String(n).toUpperCase().trim())){
      window._autoAcessoFila.push({ nome:n, perfil:perfil });
    }
  });
  if(window._autoAcessoFila.length === 0) return;
  /* Se já tem modal aberto, só enfileira e sai */
  var overlay = document.getElementById('novoUsuarioOverlay');
  if(overlay && overlay.classList.contains('open')) return;
  _abrirProxAutoAcesso();
}

function _abrirProxAutoAcesso(){
  var prox = (window._autoAcessoFila || []).shift();
  if(!prox || !prox.nome) return;
  /* Marca que este modal foi aberto pelo fluxo auto-acesso — fechar sem salvar
     vai alertar o adm que o usuário ficará fantasma. */
  window._autoAcessoEmAndamento = prox;
  if(typeof abrirNovoUsuario === 'function') abrirNovoUsuario();
  setTimeout(function(){
    var nomeEl   = document.getElementById('novoUsuarioNome');
    var perfilEl = document.getElementById('novoUsuarioPerfil');
    var loginEl  = document.getElementById('novoUsuarioLogin');
    var uidEl    = document.getElementById('novoUsuarioUid');
    if(uidEl)    uidEl.value = '';
    if(nomeEl)   nomeEl.value = prox.nome;
    if(perfilEl) perfilEl.value = prox.perfil;
    if(loginEl && !loginEl.value){
      loginEl.value = String(prox.nome).toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g,'')
        .replace(/[^a-z0-9]/g,'').slice(0,20);
      loginEl.focus();
    }
    var restantes = (window._autoAcessoFila || []).length;
    var msg = '⚠ Configure acesso para "'+prox.nome+'"' + (restantes>0 ? ' ('+restantes+' restantes na fila)' : '');
    _showToast(msg, 'var(--amber)');
  }, 200);
}

/* Intercepta o fechar do modal: se foi aberto pelo auto-acesso e ainda não foi
   salvo, alerta o adm que o usuário vai ficar fantasma (sem login). */
window._autoAcessoFechouSemSalvar = function(){
  var atual = window._autoAcessoEmAndamento;
  if(!atual) return false;
  window._autoAcessoEmAndamento = null;
  var msg = '⚠ Você fechou o cadastro de "'+atual.nome+'" SEM configurar login/senha.\n\n'
    + 'O nome ainda está na turma, mas SEM acesso ao sistema (usuário "fantasma").\n\n'
    + 'O que deseja fazer?\n'
    + '• OK = remover "'+atual.nome+'" da turma (desfaz adição)\n'
    + '• Cancelar = manter na turma mas sem login (pode configurar depois via 🔍 Varrer fantasmas)';
  if(confirm(msg)){
    /* Desfaz adição na turma */
    if(atual.perfil === 'consultor' && typeof allConsultors !== 'undefined'){
      allConsultors = allConsultors.filter(function(n){ return n !== atual.nome; });
      window.allConsultors = allConsultors;
    } else if(atual.perfil === 'treinador' && typeof allTrainers !== 'undefined'){
      allTrainers = allTrainers.filter(function(n){ return n !== atual.nome; });
      window.allTrainers = allTrainers;
    }
    if(typeof _atualizarEquipeTurma === 'function') _atualizarEquipeTurma();
    if(typeof buildSelects === 'function') buildSelects();
    if(typeof buildFilterBtns === 'function') buildFilterBtns();
    if(typeof renderAll === 'function') renderAll();
    if(typeof renderConsultor === 'function') renderConsultor();
    if(typeof _showToast === 'function') _showToast('🗑 "'+atual.nome+'" removido da turma.','var(--amber)');
  }
  return true;
};

/* Hook chamado por salvarUsuario do 18-usuarios.js — abre o próximo da fila */
window._autoAcessoProxPendente = function(){
  if(window._autoAcessoFila && window._autoAcessoFila.length){
    _abrirProxAutoAcesso();
  }
};

/* Helper: encontra UID em usuarios/ pelo nome e EXCLUI PERMANENTEMENTE */
function _excluirUsuarioPorNome(nome){
  if(!nome) return null;
  var local = (typeof _getUsuariosLocal==='function') ? _getUsuariosLocal() : {};
  var nomeNorm = String(nome).toUpperCase().trim();
  var uidAchado = null;
  Object.keys(local||{}).forEach(function(uid){
    var u = local[uid];
    if(u && u.nome && String(u.nome).toUpperCase().trim() === nomeNorm){
      uidAchado = uid;
    }
  });
  if(!uidAchado) return null;
  /* Apaga local + Firebase */
  delete local[uidAchado];
  if(typeof _saveUsuariosLocal==='function') _saveUsuariosLocal(local);
  if(window._fbSave){
    try { window._fbSave('usuarios/'+uidAchado, null); } catch(e){}
  }
  /* Re-renderiza o modal Gestão de Usuários se estiver aberto */
  if(typeof _refreshGestaoUsuarios==='function') _refreshGestaoUsuarios();
  return uidAchado;
}

/* ══════════════════════════════════════════════════════════════════
   NÚCLEO ÚNICO DE SINCRONIZAÇÃO COM usuarios/ (Gestão de Usuários)
   Todo caminho que insere/exclui/renomeia consultor ou treinador deve
   delegar a estas 3 funções para que o modal "Gestão de Usuários" e o
   nó Firebase usuarios/{uid} fiquem SEMPRE consistentes.
   ══════════════════════════════════════════════════════════════════ */

/* Helper: nome normalizado (uppercase + trim) ou '' se inválido */
function _normNome(nome){
  var n = String(nome || '').toUpperCase().trim();
  if(!n || n === '-' || n === '—') return '';
  return n;
}

/* Helper: localiza entrada em usuarios/ pelo nome. Retorna {uid, dados} ou null */
function _acharUsuarioPorNome(nome){
  var nomeNorm = _normNome(nome);
  if(!nomeNorm) return null;
  var local = (typeof _getUsuariosLocal==='function') ? _getUsuariosLocal() : {};
  var achado = null;
  Object.keys(local||{}).forEach(function(uid){
    var u = local[uid];
    if(u && u.nome && String(u.nome).toUpperCase().trim() === nomeNorm){
      achado = { uid: uid, dados: u };
    }
  });
  return achado;
}

/* Helper: re-renderiza o modal "Gestão de Usuários" se estiver aberto */
function _refreshGestaoUsuarios(){
  var ov = document.getElementById('usuariosOverlay');
  if(ov && ov.classList.contains('open') && typeof _renderUsuariosGrid==='function'){
    try { _renderUsuariosGrid(); } catch(e){}
  }
}

/* ── REGISTRAR ──────────────────────────────────────────────────────
   Insere consultor/treinador em usuarios/. Idempotente por NOME.
   opts.modo:
     'auto' (default) → enfileira o wizard p/ o adm definir login/senha
     'silencioso'     → grava direto com login/senha vazios + ativo:true
                        (usado pela importação CSV, sem credenciais)
   Retorna {status:'criado'|'existe'|'enfileirado', uid?} ou null. */
window._registrarUsuario = function(nome, perfil, opts){
  opts = opts || {};
  var nomeNorm = _normNome(nome);
  if(!nomeNorm) return null;
  perfil = perfil || 'consultor';

  /* Idempotência: se já existe conta com esse nome, NÃO duplica nem
     rebaixa (ex.: um adm que também aparece como consultor). */
  var existente = _acharUsuarioPorNome(nomeNorm);
  if(existente) return { status:'existe', uid:existente.uid };

  if(opts.modo === 'silencioso'){
    var uid = perfil + '_' + (typeof _normalizeUid==='function' ? _normalizeUid(nomeNorm) : nomeNorm.toLowerCase().replace(/\s+/g,'_'));
    var dados = {
      nome: nomeNorm, login: '', senha: '', perfil: perfil,
      vinculo: nomeNorm, ativo: true, primeiroAcesso: true,
      _semCredencial: true, createdAt: Date.now(), updatedAt: Date.now()
    };
    var local = (typeof _getUsuariosLocal==='function') ? _getUsuariosLocal() : {};
    local[uid] = dados;
    if(typeof _saveUsuariosLocal==='function') _saveUsuariosLocal(local);
    if(window._fbSave){ try { window._fbSave('usuarios/'+uid, dados); } catch(e){} }
    _refreshGestaoUsuarios();
    return { status:'criado', uid:uid };
  }

  /* modo auto: reaproveita a fila do wizard existente */
  _autoCriarAcessoUsuario([nomeNorm], perfil);
  return { status:'enfileirado' };
};

/* ── REMOVER ────────────────────────────────────────────────────────
   Apaga consultor/treinador de usuarios/ por nome.
   opts.preservarAdm (default true): NÃO apaga conta cujo perfil é 'adm'.
   Se 'perfil' for informado e divergir do perfil da conta, aborta
   (ex.: pedir remover 'consultor' mas a conta é 'treinador').
   treinador↔ministrante são considerados compatíveis.
   Retorna {status, uid?} ou null. */
window._removerUsuario = function(nome, perfil, opts){
  opts = opts || {};
  var preservarAdm = opts.preservarAdm !== false;
  var alvo = _acharUsuarioPorNome(nome);
  if(!alvo) return null;
  var perfilConta = alvo.dados ? alvo.dados.perfil : null;

  if(preservarAdm && perfilConta === 'adm') return { status:'protegido', uid:alvo.uid };

  if(perfil && perfilConta && perfilConta !== perfil){
    var compat = (perfil === 'treinador' && perfilConta === 'ministrante');
    if(!compat) return { status:'perfil-diverge', uid:alvo.uid };
  }

  var uidRemovido = _excluirUsuarioPorNome(_normNome(nome));
  _refreshGestaoUsuarios();
  return { status:'removido', uid:uidRemovido };
};

/* ── RENOMEAR ───────────────────────────────────────────────────────
   Move a conta do nome antigo para o novo, preservando login/senha/
   perfil/ativo. O UID deriva do nome, então renomear sem isto deixaria
   a conta antiga órfã (fantasma) e o nome novo sem acesso.
   Se não há conta para o nome antigo, não faz nada em usuarios/ (o nome
   só estava na turma sem acesso configurado) — retorna null.
   Retorna {status:'movido'|'protegido', uidAntigo, uidNovo} ou null. */
window._renomearUsuario = function(nomeAntigo, nomeNovo, perfil){
  var antigoNorm = _normNome(nomeAntigo);
  var novoNorm = _normNome(nomeNovo);
  if(!antigoNorm || !novoNorm || antigoNorm === novoNorm) return null;

  var alvo = _acharUsuarioPorNome(antigoNorm);
  if(!alvo) return null; /* sem conta — nada a migrar */

  var dados = alvo.dados || {};
  perfil = perfil || dados.perfil || 'consultor';

  /* Monta a entrada nova preservando credenciais e perfil */
  var uidNovo = perfil + '_' + (typeof _normalizeUid==='function' ? _normalizeUid(novoNorm) : novoNorm.toLowerCase().replace(/\s+/g,'_'));
  var novosDados = Object.assign({}, dados, {
    nome: novoNorm,
    vinculo: (dados.vinculo && String(dados.vinculo).toUpperCase().trim() === antigoNorm) ? novoNorm : (dados.vinculo || novoNorm),
    updatedAt: Date.now()
  });

  var local = (typeof _getUsuariosLocal==='function') ? _getUsuariosLocal() : {};
  /* Remove a entrada antiga e grava a nova */
  if(local[alvo.uid]) delete local[alvo.uid];
  local[uidNovo] = novosDados;
  if(typeof _saveUsuariosLocal==='function') _saveUsuariosLocal(local);
  if(window._fbSave){
    try {
      if(alvo.uid !== uidNovo) window._fbSave('usuarios/'+alvo.uid, null);
      window._fbSave('usuarios/'+uidNovo, novosDados);
    } catch(e){}
  }
  _refreshGestaoUsuarios();
  return { status:'movido', uidAntigo:alvo.uid, uidNovo:uidNovo };
};

/* ── REMOVER DA EQUIPE (caminho inverso) ────────────────────────────
   Tira o nome de allConsultors/allTrainers conforme o perfil e persiste
   a equipe da turma. Usado quando o usuário é excluído PELO modal
   "Gestão de Usuários" — mantém os cards de consultor/treinador em
   sincronia. NÃO mexe na equipe se o perfil for adm.
   Retorna true se removeu algo. */
window._removerDaEquipe = function(nome, perfil){
  var nomeNorm = _normNome(nome);
  if(!nomeNorm) return false;
  var mexeu = false;

  if(perfil === 'consultor' && typeof allConsultors !== 'undefined' && Array.isArray(allConsultors)){
    var antesC = allConsultors.length;
    allConsultors = allConsultors.filter(function(c){ return String(c).toUpperCase().trim() !== nomeNorm; });
    window.allConsultors = allConsultors;
    if(allConsultors.length !== antesC) mexeu = true;
  }
  if((perfil === 'treinador' || perfil === 'ministrante') && typeof allTrainers !== 'undefined' && Array.isArray(allTrainers)){
    var antesT = allTrainers.length;
    allTrainers = allTrainers.filter(function(t){ return String(t).toUpperCase().trim() !== nomeNorm; });
    window.allTrainers = allTrainers;
    if(allTrainers.length !== antesT) mexeu = true;
  }
  /* Perfil ausente/desconhecido: tenta remover dos dois (segurança) */
  if(!perfil || (perfil!=='consultor' && perfil!=='treinador' && perfil!=='ministrante' && perfil!=='adm')){
    if(typeof allConsultors !== 'undefined' && Array.isArray(allConsultors)){
      var a1 = allConsultors.length;
      allConsultors = allConsultors.filter(function(c){ return String(c).toUpperCase().trim() !== nomeNorm; });
      window.allConsultors = allConsultors;
      if(allConsultors.length !== a1) mexeu = true;
    }
    if(typeof allTrainers !== 'undefined' && Array.isArray(allTrainers)){
      var a2 = allTrainers.length;
      allTrainers = allTrainers.filter(function(t){ return String(t).toUpperCase().trim() !== nomeNorm; });
      window.allTrainers = allTrainers;
      if(allTrainers.length !== a2) mexeu = true;
    }
  }

  if(mexeu){
    if(typeof _atualizarEquipeTurma === 'function') _atualizarEquipeTurma();
    if(typeof _buildColors === 'function') _buildColors();
    if(typeof buildSelects === 'function') buildSelects();
    if(typeof buildFilterBtns === 'function') buildFilterBtns();
    if(typeof renderAll === 'function') renderAll();
    if(typeof renderConsultor === 'function') renderConsultor();
    if(typeof renderTreinador === 'function') renderTreinador();
  }
  return mexeu;
};

/* VARREDURA: detecta usuários "fantasma" (em allConsultors/allTrainers mas
   sem entrada em usuarios/) e enfileira modais de configuração */
window._varrerUsuariosFantasma = function(){
  var local = (typeof _getUsuariosLocal==='function') ? _getUsuariosLocal() : {};
  var registrados = new Set();
  Object.values(local||{}).forEach(function(u){
    if(u && u.nome) registrados.add(String(u.nome).toUpperCase().trim());
  });
  var fantC = (typeof allConsultors!=='undefined' && Array.isArray(allConsultors) ? allConsultors : [])
    .filter(function(n){ return n && !registrados.has(String(n).toUpperCase().trim()); });
  var fantT = (typeof allTrainers!=='undefined' && Array.isArray(allTrainers) ? allTrainers : [])
    .filter(function(n){ return n && n!=='-' && !registrados.has(String(n).toUpperCase().trim()); });
  if(!fantC.length && !fantT.length){
    _showToast('✅ Todos os consultores e treinadores já têm acesso configurado.','var(--accent)');
    return;
  }
  var msg = '🔍 Encontrados '+(fantC.length+fantT.length)+' usuário(s) sem acesso configurado:\n\n';
  if(fantC.length) msg += '👤 Consultores ('+fantC.length+'): '+fantC.slice(0,5).join(', ')+(fantC.length>5?' …':'')+'\n';
  if(fantT.length) msg += '🎓 Treinadores ('+fantT.length+'): '+fantT.slice(0,5).join(', ')+(fantT.length>5?' …':'')+'\n';
  msg += '\nAbrir modal para configurar acesso de cada um?';
  if(!confirm(msg)) return;
  /* Enfileira todos */
  fantC.forEach(function(n){ window._autoAcessoFila.push({nome:n, perfil:'consultor'}); });
  fantT.forEach(function(n){ window._autoAcessoFila.push({nome:n, perfil:'treinador'}); });
  _abrirProxAutoAcesso();
};
function editarNomeTreinador(nomeAtual){
  var novoNome=prompt('Novo nome para "'+nomeAtual+'":', nomeAtual);
  if(!novoNome||!novoNome.trim()||novoNome.trim().toUpperCase()===nomeAtual.toUpperCase()) return;
  novoNome=novoNome.trim().toUpperCase();
  if(allTrainers.includes(novoNome)){alert('Já existe um treinador com esse nome.');return;}
  // Atualizar em allTrainers e na turma
  var idx=allTrainers.indexOf(nomeAtual);
  if(idx===-1) return;
  allTrainers[idx]=novoNome;
  // Atualizar nos dados dos clientes
  data.forEach(function(d){if(d.treinador===nomeAtual)d.treinador=novoNome;});
  // Atualizar na turma ativa
  if(_turmaAtiva){
    var turmas=_getTurmas();
    var ti=turmas.findIndex(function(t){return t.id===_turmaAtiva.id;});
    if(ti!==-1){
      turmas[ti].treinadores=allTrainers;
      _saveTurmas(turmas);
      _turmaAtiva=turmas[ti];
    }
  }
  /* SYNC usuarios/: migra a conta (preserva login/senha) */
  if(window._renomearUsuario) window._renomearUsuario(nomeAtual, novoNome, 'treinador');
  _buildColors();buildSelects();buildFilterBtns();renderAll();
  _showToast('✅ Treinador renomeado para '+novoNome,'var(--accent)');
  if(typeof _addPendLog==='function')_addPendLog('Treinador renomeado',nomeAtual+' → '+novoNome,'✏️');
}

function removerTreinador(nome){
  if(!confirm('EXCLUIR PERMANENTEMENTE "'+nome+'"?\n\nRemove o usuário do sistema (Firebase + cache local) E desvincula da turma.\nClientes JÁ vinculados mantêm o nome preservado nos cards (histórico).\n\nEsta ação NÃO pode ser desfeita.')) return;
  allTrainers=allTrainers.filter(function(t){return t!==nome;});
  if(_turmaAtiva){
    var turmas=_getTurmas();
    var ti=turmas.findIndex(function(t){return t.id===_turmaAtiva.id;});
    if(ti!==-1){
      turmas[ti].treinadores=allTrainers;
      _saveTurmas(turmas);
      _turmaAtiva=turmas[ti];
    }
  }
  /* EXCLUSÃO PERMANENTE em usuarios/ (Firebase + local) */
  var uidRemovido = _excluirUsuarioPorNome(nome);
  _buildColors();buildSelects();buildFilterBtns();renderAll();
  _showToast('🗑 Treinador '+nome+' excluído'+(uidRemovido?' (Firebase + turma)':' (só turma — não tinha acesso configurado)'),'var(--accent)');
  if(typeof _addPendLog==='function')_addPendLog('Treinador excluído permanentemente',(nome||'')+(uidRemovido?' — UID: '+uidRemovido:''),'🗑️');
}

function abrirModalEditarConsultores(){
  _renderEditarConsultoresLista();
  document.getElementById('novoConsultorModalInput').value='';
  document.getElementById('editarConsultoresOverlay').classList.add('open');
}
function fecharModalEditarConsultores(){
  document.getElementById('editarConsultoresOverlay').classList.remove('open');
}
function _renderEditarConsultoresLista(){
  var el=document.getElementById('editarConsultoresLista');
  if(!el) return;
  if(!allConsultors.length){
    el.innerHTML='<div style="color:var(--muted);font-size:13px;text-align:center;padding:12px 0;">Nenhum consultor cadastrado.</div>';
    return;
  }
  el.innerHTML=allConsultors.map(function(c,i){
    return '<div id="consultorEditRow_'+i+'" style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);">'
      +'<span style="flex:1;font-size:13px;font-weight:600;color:var(--text);">'+c+'</span>'
      +'<button class="title-edit-btn" onclick="_iniciarRenomearConsultor('+i+',\''+c+'\')" style="padding:4px 10px;font-size:12px;">Renomear</button>'
      +'<button class="title-edit-btn del" onclick="_confirmarExcluirConsultor(\''+c+'\','+i+')" style="padding:4px 10px;font-size:12px;">Excluir</button>'
      +'</div>';
  }).join('');
}

function _iniciarRenomearConsultor(idx,nomeAtual){
  var row=document.getElementById('consultorEditRow_'+idx);
  if(!row) return;
  row.innerHTML='<input id="inputRenomearConsultor_'+idx+'" class="modal-input" value="'+nomeAtual+'" style="flex:1;font-size:13px;padding:4px 8px;" />'
    +'<button class="modal-save" onclick="_confirmarRenomearConsultor('+idx+',\''+nomeAtual+'\')" style="padding:4px 12px;font-size:12px;">Confirmar</button>'
    +'<button class="modal-cancel" onclick="_renderEditarConsultoresLista()" style="padding:4px 12px;font-size:12px;">Cancelar</button>';
  var inp=document.getElementById('inputRenomearConsultor_'+idx);
  if(inp){inp.focus();inp.select();}
}

function _confirmarRenomearConsultor(idx,nomeAtual){
  var inp=document.getElementById('inputRenomearConsultor_'+idx);
  if(!inp) return;
  var novoNome=inp.value.trim().toUpperCase();
  if(!novoNome||novoNome===nomeAtual){_renderEditarConsultoresLista();return;}
  if(allConsultors.includes(novoNome)){alert('Já existe um consultor com esse nome.');return;}
  allConsultors[allConsultors.indexOf(nomeAtual)]=novoNome;
  data.forEach(function(d){if(d.consultor===nomeAtual)d.consultor=novoNome;});
  _atualizarEquipeTurma();
  /* SYNC usuarios/: migra a conta (preserva login/senha) — antes virava fantasma */
  if(window._renomearUsuario) window._renomearUsuario(nomeAtual, novoNome, 'consultor');
  _buildColors();buildSelects();buildFilterBtns();
  _renderEditarConsultoresLista();
  renderAll();renderConsultor();
  _showToast('✅ Renomeado para '+novoNome,'var(--accent)');
  if(typeof _addPendLog==='function')_addPendLog('Consultor renomeado',nomeAtual+' → '+novoNome,'✏️');
}

function _confirmarExcluirConsultor(nome,idx){
  var row=document.getElementById('consultorEditRow_'+idx);
  if(!row) return;
  row.innerHTML='<span style="flex:1;font-size:13px;color:var(--red);font-weight:600;">Excluir "'+nome+'"?</span>'
    +'<button class="modal-save" onclick="_executarExcluirConsultor(\''+nome+'\')" style="padding:4px 12px;font-size:12px;background:var(--red);border-color:var(--red);color:#fff;">Sim, excluir</button>'
    +'<button class="modal-cancel" onclick="_renderEditarConsultoresLista()" style="padding:4px 12px;font-size:12px;">Cancelar</button>';
}

function _executarExcluirConsultor(nome){
  /* Confirmação dupla — exclusão é permanente em Firebase + local */
  if(!confirm('EXCLUIR PERMANENTEMENTE "'+nome+'"?\n\nRemove o usuário do sistema (Firebase + cache local) E desvincula da turma.\nClientes JÁ vinculados mantêm o nome preservado nos cards (histórico).\n\nEsta ação NÃO pode ser desfeita.')) return;
  allConsultors=allConsultors.filter(function(c){return c!==nome;});
  _atualizarEquipeTurma();
  /* EXCLUSÃO PERMANENTE em usuarios/ (Firebase + local) */
  var uidRemovido = _excluirUsuarioPorNome(nome);
  _buildColors();buildSelects();buildFilterBtns();
  _renderEditarConsultoresLista();
  renderAll();renderConsultor();
  _showToast('🗑 '+nome+' excluído'+(uidRemovido?' (Firebase + turma)':' (só turma — não tinha acesso configurado)'),'var(--accent)');
  if(typeof _addPendLog==='function')_addPendLog('Consultor excluído permanentemente',(nome||'')+(uidRemovido?' — UID: '+uidRemovido:''),'🗑️');
}
function adicionarConsultorModal(){
  var inp=document.getElementById('novoConsultorModalInput');
  var nome=inp.value.trim().toUpperCase();
  if(!nome){alert('Informe o nome.');return;}
  if(allConsultors.includes(nome)){alert('Consultor já cadastrado.');return;}
  allConsultors.push(nome);
  _atualizarEquipeTurma();
  _buildColors();buildSelects();buildFilterBtns();
  fecharModalEditarConsultores();
  renderAll();renderConsultor();
  inp.value='';
  _showToast('✅ '+nome+' adicionado.','var(--accent)');
  if(typeof _addPendLog==='function')_addPendLog('Novo consultor adicionado (via Editar)','Consultor: '+nome,'👤');
  /* SYNC usuarios/: cria conta imediatamente (sem acesso) — aparece já no Gestão */
  if(window._registrarUsuario) window._registrarUsuario(nome, 'consultor', {modo:'silencioso'});
}
function renomearConsultorModal(nomeAtual){
  var novoNome=prompt('Novo nome para "'+nomeAtual+'":', nomeAtual);
  if(!novoNome||!novoNome.trim()) return;
  novoNome=novoNome.trim().toUpperCase();
  if(novoNome===nomeAtual) return;
  if(allConsultors.includes(novoNome)){alert('Já existe um consultor com esse nome.');return;}
  var idx=allConsultors.indexOf(nomeAtual);
  if(idx===-1) return;
  allConsultors[idx]=novoNome;
  data.forEach(function(d){if(d.consultor===nomeAtual)d.consultor=novoNome;});
  _atualizarEquipeTurma();
  /* SYNC usuarios/: migra a conta (preserva login/senha) */
  if(window._renomearUsuario) window._renomearUsuario(nomeAtual, novoNome, 'consultor');
  _buildColors();buildSelects();buildFilterBtns();
  fecharModalEditarConsultores();
  renderAll();renderConsultor();
  _showToast('✅ Renomeado para '+novoNome,'var(--accent)');
  if(typeof _addPendLog==='function')_addPendLog('Consultor renomeado',nomeAtual+' → '+novoNome,'✏️');
}
function excluirConsultorModal(nome){
  if(!confirm('Excluir "'+nome+'" da turma?\nOs clientes vinculados não serão excluídos.')) return;
  allConsultors=allConsultors.filter(function(c){return c!==nome;});
  _atualizarEquipeTurma();
  /* SYNC usuarios/: remove a conta (protege adm) — antes ficava fantasma */
  var _rc = window._removerUsuario ? window._removerUsuario(nome, 'consultor') : null;
  _buildColors();buildSelects();buildFilterBtns();
  fecharModalEditarConsultores();
  renderAll();renderConsultor();
  var _sufC = (_rc && _rc.status==='protegido') ? ' (conta adm preservada)' : (_rc && _rc.status==='removido' ? ' (Firebase + turma)' : '');
  _showToast('🗑 '+nome+' removido'+_sufC+'.','var(--accent)');
  if(typeof _addPendLog==='function')_addPendLog('Consultor excluído',nome,'🗑️');
}

function abrirModalEditarTreinadores(){
  _renderEditarTreinadoresLista();
  document.getElementById('novoTreinadorModalInput').value='';
  document.getElementById('editarTreinadoresOverlay').classList.add('open');
}
function fecharModalEditarTreinadores(){
  document.getElementById('editarTreinadoresOverlay').classList.remove('open');
}
function _renderEditarTreinadoresLista(){
  var el=document.getElementById('editarTreinadoresLista');
  if(!el) return;
  if(!allTrainers.length){
    el.innerHTML='<div style="color:var(--muted);font-size:13px;text-align:center;padding:12px 0;">Nenhum treinador cadastrado.</div>';
    return;
  }
  el.innerHTML=allTrainers.map(function(t,i){
    return '<div id="treinadorEditRow_'+i+'" style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--radius-sm);">'
      +'<span style="flex:1;font-size:13px;font-weight:600;color:var(--text);">'+t+'</span>'
      +'<button class="title-edit-btn" onclick="_iniciarRenomearTreinador('+i+',\''+t+'\')" style="padding:4px 10px;font-size:12px;">Renomear</button>'
      +'<button class="title-edit-btn del" onclick="_confirmarExcluirTreinador(\''+t+'\','+i+')" style="padding:4px 10px;font-size:12px;">Excluir</button>'
      +'</div>';
  }).join('');
}

function _iniciarRenomearTreinador(idx,nomeAtual){
  var row=document.getElementById('treinadorEditRow_'+idx);
  if(!row) return;
  row.innerHTML='<input id="inputRenomearTreinador_'+idx+'" class="modal-input" value="'+nomeAtual+'" style="flex:1;font-size:13px;padding:4px 8px;" />'
    +'<button class="modal-save" onclick="_confirmarRenomearTreinador('+idx+',\''+nomeAtual+'\')" style="padding:4px 12px;font-size:12px;">Confirmar</button>'
    +'<button class="modal-cancel" onclick="_renderEditarTreinadoresLista()" style="padding:4px 12px;font-size:12px;">Cancelar</button>';
  var inp=document.getElementById('inputRenomearTreinador_'+idx);
  if(inp){inp.focus();inp.select();}
}

function _confirmarRenomearTreinador(idx,nomeAtual){
  var inp=document.getElementById('inputRenomearTreinador_'+idx);
  if(!inp) return;
  var novoNome=inp.value.trim().toUpperCase();
  if(!novoNome||novoNome===nomeAtual){_renderEditarTreinadoresLista();return;}
  if(allTrainers.includes(novoNome)){alert('Já existe um treinador com esse nome.');return;}
  allTrainers[allTrainers.indexOf(nomeAtual)]=novoNome;
  data.forEach(function(d){if(d.treinador===nomeAtual)d.treinador=novoNome;});
  _atualizarEquipeTurma();
  /* SYNC usuarios/: migra a conta (preserva login/senha) — antes virava fantasma */
  if(window._renomearUsuario) window._renomearUsuario(nomeAtual, novoNome, 'treinador');
  _buildColors();buildSelects();buildFilterBtns();
  _renderEditarTreinadoresLista();
  renderAll();renderTreinador();
  _showToast('✅ Renomeado para '+novoNome,'var(--accent)');
  if(typeof _addPendLog==='function')_addPendLog('Treinador renomeado',nomeAtual+' → '+novoNome,'✏️');
}

function _confirmarExcluirTreinador(nome,idx){
  var row=document.getElementById('treinadorEditRow_'+idx);
  if(!row) return;
  row.innerHTML='<span style="flex:1;font-size:13px;color:var(--red);font-weight:600;">Excluir "'+nome+'"?</span>'
    +'<button class="modal-save" onclick="_executarExcluirTreinador(\''+nome+'\')" style="padding:4px 12px;font-size:12px;background:var(--red);border-color:var(--red);color:#fff;">Sim, excluir</button>'
    +'<button class="modal-cancel" onclick="_renderEditarTreinadoresLista()" style="padding:4px 12px;font-size:12px;">Cancelar</button>';
}

function _executarExcluirTreinador(nome){
  /* Confirmação dupla — exclusão é permanente em Firebase + local */
  if(!confirm('EXCLUIR PERMANENTEMENTE "'+nome+'"?\n\nRemove o usuário do sistema (Firebase + cache local) E desvincula da turma.\nClientes JÁ vinculados mantêm o nome preservado nos cards (histórico).\n\nEsta ação NÃO pode ser desfeita.')) return;
  allTrainers=allTrainers.filter(function(t){return t!==nome;});
  _atualizarEquipeTurma();
  /* SYNC usuarios/: remove a conta (protege adm) — antes ficava fantasma */
  var _rt = window._removerUsuario ? window._removerUsuario(nome, 'treinador') : null;
  _buildColors();buildSelects();buildFilterBtns();
  _renderEditarTreinadoresLista();
  renderAll();renderTreinador();
  var _sufT = (_rt && _rt.status==='protegido') ? ' (conta adm preservada)' : (_rt && _rt.status==='removido' ? ' (Firebase + turma)' : '');
  _showToast('🗑 '+nome+' removido'+_sufT+'.','var(--accent)');
  if(typeof _addPendLog==='function')_addPendLog('Treinador excluído permanentemente',nome,'🗑️');
}
function adicionarTreinadorModal(){
  var inp=document.getElementById('novoTreinadorModalInput');
  var nome=inp.value.trim().toUpperCase();
  if(!nome){alert('Informe o nome.');return;}
  if(allTrainers.includes(nome)){alert('Treinador já cadastrado.');return;}
  allTrainers.push(nome);
  _atualizarEquipeTurma();
  _buildColors();buildSelects();buildFilterBtns();
  fecharModalEditarTreinadores();
  renderAll();renderTreinador();
  inp.value='';
  _showToast('✅ '+nome+' adicionado.','var(--accent)');
  if(typeof _addPendLog==='function')_addPendLog('Novo treinador adicionado (via Editar)','Treinador: '+nome,'👤');
  /* SYNC usuarios/: cria conta imediatamente (sem acesso) — aparece já no Gestão */
  if(window._registrarUsuario) window._registrarUsuario(nome, 'treinador', {modo:'silencioso'});
}
function renomearTreinadorModal(nomeAtual){
  var novoNome=prompt('Novo nome para "'+nomeAtual+'":', nomeAtual);
  if(!novoNome||!novoNome.trim()) return;
  novoNome=novoNome.trim().toUpperCase();
  if(novoNome===nomeAtual) return;
  if(allTrainers.includes(novoNome)){alert('Já existe um treinador com esse nome.');return;}
  var idx=allTrainers.indexOf(nomeAtual);
  if(idx===-1) return;
  allTrainers[idx]=novoNome;
  data.forEach(function(d){if(d.treinador===nomeAtual)d.treinador=novoNome;});
  _atualizarEquipeTurma();
  /* SYNC usuarios/: migra a conta (preserva login/senha) */
  if(window._renomearUsuario) window._renomearUsuario(nomeAtual, novoNome, 'treinador');
  _buildColors();buildSelects();buildFilterBtns();
  fecharModalEditarTreinadores();
  renderAll();renderTreinador();
  _showToast('✅ Renomeado para '+novoNome,'var(--accent)');
  if(typeof _addPendLog==='function')_addPendLog('Treinador renomeado',nomeAtual+' → '+novoNome,'✏️');
}
function excluirTreinadorModal(nome){
  if(!confirm('Excluir "'+nome+'" da turma?\nOs clientes vinculados não serão excluídos.')) return;
  allTrainers=allTrainers.filter(function(t){return t!==nome;});
  _atualizarEquipeTurma();
  /* SYNC usuarios/: remove a conta (protege adm) — antes ficava fantasma */
  var _rtm = window._removerUsuario ? window._removerUsuario(nome, 'treinador') : null;
  _buildColors();buildSelects();buildFilterBtns();
  fecharModalEditarTreinadores();
  renderAll();renderTreinador();
  var _sufTm = (_rtm && _rtm.status==='protegido') ? ' (conta adm preservada)' : (_rtm && _rtm.status==='removido' ? ' (Firebase + turma)' : '');
  _showToast('🗑 '+nome+' removido'+_sufTm+'.','var(--accent)');
  if(typeof _addPendLog==='function')_addPendLog('Treinador excluído',nome,'🗑️');
}

var _ntSelecionados=[];
function _ntLimparSelecao(){
  _ntSelecionados=[];
  document.querySelectorAll('#novoTreinadorLista .fbtn').forEach(function(b){b.classList.remove('active');});
}
function abrirNovoTreinador(){
  _ntSelecionados=[];
  document.getElementById('novoTreinadorNome').value='';
  document.getElementById('novoTreinadorLista').innerHTML='<span style="font-size:12px;color:var(--muted);">Carregando...</span>';
  document.getElementById('novoTreinadorVazio').style.display='none';
  document.getElementById('novoTreinadorOverlay').classList.add('open');
  if(window._fbGet){
    window._fbGet('usuarios').then(function(usuarios){
      var lista=[];
      if(usuarios&&typeof usuarios==='object'){
        Object.values(usuarios).forEach(function(u){
          if(u&&u.nome&&u.ativo!==false&&(u.perfil==='treinador'||u.perfil==='ministrante')){
            var nomeUp=u.nome.toUpperCase();
            if(!allTrainers.map(function(t){return t.toUpperCase();}).includes(nomeUp))
              lista.push(nomeUp);
          }
        });
      }
      lista.sort();
      var el=document.getElementById('novoTreinadorLista');
      if(!lista.length){
        el.innerHTML='';
        document.getElementById('novoTreinadorVazio').style.display='block';
        return;
      }
      el.innerHTML=lista.map(function(n){
        return '<button class="fbtn" onclick="_ntSelecionar(\''+n+'\')" type="button">'+n+'</button>';
      }).join('');
    }).catch(function(){
      document.getElementById('novoTreinadorLista').innerHTML='<span style="font-size:12px;color:var(--muted);">Erro ao carregar.</span>';
    });
  } else {
    document.getElementById('novoTreinadorLista').innerHTML='';
  }
  setTimeout(function(){document.getElementById('novoTreinadorNome').focus();},100);
}
function _ntSelecionar(nome){
  document.getElementById('novoTreinadorNome').value='';
  var idx=_ntSelecionados.indexOf(nome);
  if(idx===-1){_ntSelecionados.push(nome);}
  else{_ntSelecionados.splice(idx,1);}
  document.querySelectorAll('#novoTreinadorLista .fbtn').forEach(function(b){
    b.classList.toggle('active',_ntSelecionados.indexOf(b.textContent)!==-1);
  });
}
function fecharNovoTreinador(){document.getElementById('novoTreinadorOverlay').classList.remove('open');_ntSelecionados=[];}
function salvarNovoTreinador(){
  var digitado=document.getElementById('novoTreinadorNome').value.trim().toUpperCase();
  var lista=_ntSelecionados.length?_ntSelecionados.slice():(digitado?[digitado]:[]);
  if(!lista.length){document.getElementById('novoTreinadorNome').focus();return;}
  var adicionados=[];
  lista.forEach(function(nome){
    if(!allTrainers.includes(nome)){
      allTrainers.push(nome);
      adicionados.push(nome);
      if(typeof _addPendLog==='function')_addPendLog('Novo treinador adicionado','Treinador: '+nome,'👤');
    }
  });
  if(!adicionados.length){_showToast('Todos já existem na turma.','var(--amber)');return;}
  _buildColors();_atualizarEquipeTurma();buildSelects();buildFilterBtns();renderTreinador();fecharNovoTreinador();
  _showToast('✅ '+adicionados.length+' treinador'+(adicionados.length>1?'es':'')+' adicionado'+(adicionados.length>1?'s':'')+'!','var(--accent)');
  /* SYNC usuarios/: cria a conta IMEDIATAMENTE (modo silencioso). Aparece na
     hora no Gestão de Usuários com "sem acesso"; configura login/senha lá. */
  adicionados.forEach(function(n){
    if(window._registrarUsuario) window._registrarUsuario(n, 'treinador', {modo:'silencioso'});
  });
}
function _atualizarEquipeTurma(){
  if(!_turmaAtiva)return;
  // FIX: sempre atualizar _turmaAtiva em memória antes de qualquer save
  _turmaAtiva.consultores=allConsultors.slice();
  _turmaAtiva.treinadores=allTrainers.slice();
  // Atualizar localStorage se a turma estiver na lista local
  const turmas=_getTurmas(),idx=turmas.findIndex(t=>t.id===_turmaAtiva.id);
  if(idx!==-1){turmas[idx].treinadores=allTrainers;turmas[idx].consultores=allConsultors;_saveTurmas(turmas);}
  // Salvar no Firebase — campos individuais E documento completo via saveStorage
  if(window._fbSave&&_turmaAtiva.id){
    window._fbSave(TURMAS_NODE+'/'+_turmaAtiva.id+'/treinadores',allTrainers)
      .catch(function(e){console.error('[FB] treinadores erro:',e);});
    window._fbSave(TURMAS_NODE+'/'+_turmaAtiva.id+'/consultores',allConsultors)
      .catch(function(e){console.error('[FB] consultores erro:',e);});
  }
  // Também salva o documento inteiro para garantir consistência
  if(typeof saveStorage==='function') saveStorage();
}

