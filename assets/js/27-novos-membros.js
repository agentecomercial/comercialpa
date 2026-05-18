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
  /* AUTO-CRIAR ACESSO: se algum dos adicionados ainda não existe em usuarios/,
     abre o modal de cadastro pra forçar o adm a configurar login/senha. */
  _autoCriarAcessoUsuario(adicionados, 'consultor');
}

/* Verifica quais nomes ainda não existem em usuarios/. Para o primeiro deles,
   abre o modal "Novo Usuário" pré-preenchido com nome+perfil. */
function _autoCriarAcessoUsuario(nomes, perfil){
  if(!nomes || !nomes.length) return;
  var local = (typeof _getUsuariosLocal==='function') ? _getUsuariosLocal() : {};
  var existentesNomes = new Set();
  Object.values(local||{}).forEach(function(u){
    if(u && u.nome) existentesNomes.add(String(u.nome).toUpperCase().trim());
  });
  var faltam = nomes.filter(function(n){ return !existentesNomes.has(String(n).toUpperCase().trim()); });
  if(!faltam.length) return; // todos já têm acesso configurado

  var nome = faltam[0];
  var restantes = faltam.slice(1);
  /* Abre o modal completo de criar usuário do 18-usuarios.js */
  if(typeof abrirNovoUsuario === 'function') abrirNovoUsuario();
  setTimeout(function(){
    var nomeEl   = document.getElementById('novoUsuarioNome');
    var perfilEl = document.getElementById('novoUsuarioPerfil');
    var loginEl  = document.getElementById('novoUsuarioLogin');
    var uidEl    = document.getElementById('novoUsuarioUid');
    if(uidEl)    uidEl.value = '';
    if(nomeEl)   nomeEl.value = nome;
    if(perfilEl) perfilEl.value = perfil;
    /* Sugerir login = primeira parte do nome em lowercase sem acentos */
    if(loginEl && !loginEl.value){
      loginEl.value = String(nome).toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g,'')
        .replace(/[^a-z0-9]/g,'').slice(0,20);
      loginEl.focus();
    }
    /* Aviso explícito */
    _showToast('⚠ Configure o acesso (login + senha) para "'+nome+'"', 'var(--amber)');
    /* Guardar restantes para abrir em sequência após salvar este */
    window._autoAcessoPendentes = restantes.length ? { nomes:restantes, perfil:perfil } : null;
  }, 200);
}

/* Hook: depois de salvarUsuario do 18-usuarios.js terminar, se houver pendentes,
   abre o próximo. (chamado de dentro de salvarUsuario via window.) */
window._autoAcessoProxPendente = function(){
  var p = window._autoAcessoPendentes;
  window._autoAcessoPendentes = null;
  if(p && p.nomes && p.nomes.length){
    _autoCriarAcessoUsuario(p.nomes, p.perfil);
  }
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
  _buildColors();buildSelects();buildFilterBtns();renderAll();
  _showToast('✅ Treinador renomeado para '+novoNome,'var(--accent)');
  if(typeof _addPendLog==='function')_addPendLog('Treinador renomeado',nomeAtual+' → '+novoNome,'✏️');
}

function removerTreinador(nome){
  if(!confirm('Remover "'+nome+'" da turma?\nOs clientes vinculados a ele não serão excluídos.')) return;
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
  _buildColors();buildSelects();buildFilterBtns();renderAll();
  _showToast('✅ Treinador '+nome+' removido da turma.','var(--accent)');
  if(typeof _addPendLog==='function')_addPendLog('Treinador removido (rápido)','Treinador: '+nome,'🗑️');
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
  _buildColors();buildSelects();buildFilterBtns();
  _renderEditarConsultoresLista();
  renderAll();renderConsultor();
  _showToast('✅ Renomeado para '+novoNome,'var(--accent)');
}

function _confirmarExcluirConsultor(nome,idx){
  var row=document.getElementById('consultorEditRow_'+idx);
  if(!row) return;
  row.innerHTML='<span style="flex:1;font-size:13px;color:var(--red);font-weight:600;">Excluir "'+nome+'"?</span>'
    +'<button class="modal-save" onclick="_executarExcluirConsultor(\''+nome+'\')" style="padding:4px 12px;font-size:12px;background:var(--red);border-color:var(--red);color:#fff;">Sim, excluir</button>'
    +'<button class="modal-cancel" onclick="_renderEditarConsultoresLista()" style="padding:4px 12px;font-size:12px;">Cancelar</button>';
}

function _executarExcluirConsultor(nome){
  allConsultors=allConsultors.filter(function(c){return c!==nome;});
  _atualizarEquipeTurma();
  _buildColors();buildSelects();buildFilterBtns();
  _renderEditarConsultoresLista();
  renderAll();renderConsultor();
  _showToast('✅ '+nome+' removido.','var(--accent)');
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
  _buildColors();buildSelects();buildFilterBtns();
  fecharModalEditarConsultores();
  renderAll();renderConsultor();
  _showToast('✅ '+nome+' removido.','var(--accent)');
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
  _buildColors();buildSelects();buildFilterBtns();
  _renderEditarTreinadoresLista();
  renderAll();renderTreinador();
  _showToast('✅ Renomeado para '+novoNome,'var(--accent)');
}

function _confirmarExcluirTreinador(nome,idx){
  var row=document.getElementById('treinadorEditRow_'+idx);
  if(!row) return;
  row.innerHTML='<span style="flex:1;font-size:13px;color:var(--red);font-weight:600;">Excluir "'+nome+'"?</span>'
    +'<button class="modal-save" onclick="_executarExcluirTreinador(\''+nome+'\')" style="padding:4px 12px;font-size:12px;background:var(--red);border-color:var(--red);color:#fff;">Sim, excluir</button>'
    +'<button class="modal-cancel" onclick="_renderEditarTreinadoresLista()" style="padding:4px 12px;font-size:12px;">Cancelar</button>';
}

function _executarExcluirTreinador(nome){
  allTrainers=allTrainers.filter(function(t){return t!==nome;});
  _atualizarEquipeTurma();
  _buildColors();buildSelects();buildFilterBtns();
  _renderEditarTreinadoresLista();
  renderAll();renderTreinador();
  _showToast('✅ '+nome+' removido.','var(--accent)');
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
  _buildColors();buildSelects();buildFilterBtns();
  fecharModalEditarTreinadores();
  renderAll();renderTreinador();
  _showToast('✅ '+nome+' removido.','var(--accent)');
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
  /* AUTO-CRIAR ACESSO: força configuração de login/senha em usuarios/ */
  _autoCriarAcessoUsuario(adicionados, 'treinador');
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

