/* ═══════════════════════════════════════════
   LOGIN
═══════════════════════════════════════════ */

function _getSessao(){try{return JSON.parse(sessionStorage.getItem('ci_sessao'));}catch(e){return null;}}
function _setSessao(s){sessionStorage.setItem('ci_sessao',JSON.stringify(s));}
function _clearSessao(){sessionStorage.removeItem('ci_sessao');}

function _entrarDashboardEquipe(user){
  /* Consultor desktop: a landing assume o fluxo (botões Gerenciar Turmas / Pipeline) */
  if(typeof window._mostrarLandingConsultorDesktop === 'function' && window._mostrarLandingConsultorDesktop(user)) return;
  _mostrarTela('dashboard'); // oculta tudo imediatamente enquanto carrega
  _carregarTurmaGlobalAtiva(function(){
    if(!_turmaGlobalAtiva){
      _mostrarPropostaComercial();
      return;
    }
    entrarTurma(_turmaGlobalAtiva);
  });
}

/* Converte login (ex: "larissa") em email sintético para Firebase Auth */
function _loginToEmail(login){
  return (login||'').toLowerCase().replace(/[^a-z0-9_.\-]/g,'_')+'@febracis-internal.local';
}

/* Finaliza o login após identificar o usuário (Auth ou legado) */
function _concluirLogin(uid,user,loginStr,manter){
  var sessao=JSON.stringify({login:loginStr,perfil:user.perfil,nome:user.nome,uid:uid,vinculo:user.vinculo||user.nome});
  sessionStorage.setItem('ci_sessao',sessao);
  if(manter) localStorage.setItem('ci_sessao_persistente',sessao);
  else localStorage.removeItem('ci_sessao_persistente');
  if(user.primeiroAcesso){
    _abrirModalPrimeiroAcesso(uid,user.nome);
    return;
  }
  if(user.primeiroAcesso!==false){
    var _localU=_getUsuariosLocal();
    if(_localU[uid]){_localU[uid].primeiroAcesso=false;_saveUsuariosLocal(_localU);}
    if(window._fbUpdate){
      window._fbUpdate('usuarios/'+uid,{primeiroAcesso:false,lastLogin:Date.now()})
        .catch(function(e){console.warn('[login] primeiroAcesso update:',e);});
    }
  }
  _addUsuarioRecente(uid, user.nome, user.perfil);

  /* Migração silenciosa: se usuário tem senha em texto plano e ainda não tem authUid,
     cria conta Firebase Auth e apaga a senha do RTDB */
  if(user.senha && !user.authUid && window._fbAuthCreate && window._fbUpdate){
    var _emailMigr = _loginToEmail(loginStr);
    var _senhaMigr = user.senha;
    window._fbAuthCreate(_emailMigr, _senhaMigr).then(function(cred){
      var updates = {authUid: cred.user.uid, lastLogin: Date.now()};
      updates['senha'] = null; /* apaga senha em texto plano */
      window._fbUpdate('usuarios/'+uid, updates).catch(function(){});
      console.info('[auth] Usuário migrado para Firebase Auth:', loginStr);
    }).catch(function(e){
      /* conta pode já existir — apenas remove a senha local do RTDB */
      if(e.code === 'auth/email-already-in-use'){
        window._fbUpdate('usuarios/'+uid, {senha: null, lastLogin: Date.now()}).catch(function(){});
      }
    });
  } else if(window._fbUpdate){
    window._fbUpdate('usuarios/'+uid, {lastLogin: Date.now()}).catch(function(){});
  }

  _mostrarTela('dashboard');
  _entrarDashboardEquipe(user);
  if(typeof window._audit==='function') window._audit('auth.login',null,{perfil:user.perfil||'—'});
  if(typeof window._notifListen==='function') window._notifListen();
}

function doLogin(){
  var u=document.getElementById('loginUser').value.trim();
  var p=document.getElementById('loginPass').value.trim();
  var manter=document.getElementById('manterConectado').checked;
  document.getElementById('loginErr').style.display='none';
  if(!u||!p){document.getElementById('loginErr').style.display='block';return;}
  if(u==='adm'){
    var senhaAdm=localStorage.getItem('ci_adm_senha')||'adm123';
    if(p===senhaAdm){
      var sessao=JSON.stringify({login:'adm',perfil:'adm',nome:'ADM'});
      sessionStorage.setItem('ci_sessao',sessao);
      if(manter) localStorage.setItem('ci_sessao_persistente',sessao);
      else localStorage.removeItem('ci_sessao_persistente');
      _mostrarTela('turmasScreen');
      _mostrarTurmas();
    } else {
      document.getElementById('loginErr').style.display='block';
    }
    return;
  }

  var _loginErr=function(){document.getElementById('loginErr').style.display='block';};
  var _authDisponivel=typeof window._fbAuthLogin==='function';

  /* Caminho legado: buscar senha no RTDB */
  function _loginLegado(migrarAuthEmBackground){
    window._fbGet('usuarios').then(function(usuarios){
      if(!usuarios){_loginErr();return;}
      var entry=Object.entries(usuarios).find(function(e){return e[1].login===u&&e[1].senha===p&&e[1].ativo!==false;});
      if(!entry){_loginErr();return;}
      var uid=entry[0],user=entry[1];
      /* Tentar migrar para Auth em background sem bloquear o fluxo */
      if(migrarAuthEmBackground&&_authDisponivel){
        window._fbAuthCreate(_loginToEmail(u),p).then(function(cred2){
          window._fbUpdate('usuarios/'+uid,{authUid:cred2.user.uid}).catch(function(){});
        }).catch(function(){/* conta pode já existir */});
      }
      _concluirLogin(uid,user,u,manter);
    }).catch(_loginErr);
  }

  if(!_authDisponivel){
    /* Auth ainda não carregado — usar legado direto */
    _loginLegado(false);
    return;
  }

  /* Tentativa Auth-first */
  window._fbAuthLogin(_loginToEmail(u),p).then(function(cred){
    /* Auth ok — localizar dados do usuário no RTDB pelo login */
    return window._fbGet('usuarios').then(function(usuarios){
      var entry=null;
      if(usuarios) entry=Object.entries(usuarios).find(function(e){return e[1].login===u&&e[1].ativo!==false;});
      if(!entry){_loginErr();return;}
      var uid=entry[0],user=entry[1];
      /* Vincular authUid se ainda não estiver salvo */
      if(!user.authUid){
        window._fbUpdate('usuarios/'+uid,{authUid:cred.user.uid}).catch(function(){});
      }
      _concluirLogin(uid,user,u,manter);
    });
  }).catch(function(authErr){
    /* Auth falhou — verificar feature flag antes de tentar legado */
    window._fbGet('config/featureFlags/authObrigatorio').then(function(obrigatorio){
      if(obrigatorio){
        /* Auth obrigatório ativado — não usar fallback */
        _loginErr();
      } else {
        /* Fallback legado com migração em background */
        _loginLegado(true);
      }
    }).catch(function(){
      /* Sem acesso ao nó de config — usar legado como segurança */
      _loginLegado(true);
    });
  });
}
/* ── Fix 2: Primeiro acesso e reset de senha ── */
function _abrirModalPrimeiroAcesso(uid,nome){
  var el=document.getElementById('primeiroAcessoOverlay');
  if(!el){
    var div=document.createElement('div');
    div.className='modal-overlay';
    div.id='primeiroAcessoOverlay';
    // Construção via DOM para evitar problema de aspas em onkeydown
    var modalDiv=document.createElement('div');
    modalDiv.className='modal';
    modalDiv.style.cssText='width:min(380px,92vw);max-height:90vh;overflow-y:auto;';
    modalDiv.innerHTML=[
      '<div class="modal-title">&#128272; Redefinir senha</div>',
      '<div class="modal-subtitle">Este é seu primeiro acesso. Por favor, defina uma nova senha.</div>',
      '<input type="hidden" id="paTmpUid">',
      '<div class="modal-field"><label class="modal-label">Nova senha</label>',
      '<input class="modal-input" type="password" id="paNovaSenha" placeholder="Mínimo 4 caracteres"></div>',
      '<div class="modal-field"><label class="modal-label">Confirmar senha</label>',
      '<input class="modal-input" type="password" id="paConfirmarSenha" placeholder="Repetir senha"></div>',
      '<div class="modal-actions">',
      '<button class="modal-save" onclick="_confirmarPrimeiroAcesso()">Salvar nova senha</button>',
      '</div>'
    ].join('');
    div.appendChild(modalDiv);
    document.body.appendChild(div);
    // Adicionar listener de Enter após inserir no DOM
    setTimeout(function(){
      ['paNovaSenha','paConfirmarSenha'].forEach(function(id){
        var inp=document.getElementById(id);
        if(inp) inp.addEventListener('keydown',function(e){
          if(e.key==='Enter') _confirmarPrimeiroAcesso();
        });
      });
    },50);
  }
  document.getElementById('paTmpUid').value=uid;
  document.getElementById('primeiroAcessoOverlay').classList.add('open');
  setTimeout(function(){var inp=document.getElementById('paNovaSenha');if(inp)inp.focus();},100);
}

function _confirmarPrimeiroAcesso(){
  var uid=document.getElementById('paTmpUid').value;
  var nova=(document.getElementById('paNovaSenha')||{value:''}).value.trim();
  var conf=(document.getElementById('paConfirmarSenha')||{value:''}).value.trim();
  if(!nova||nova.length<4){_showToast('❌ Senha deve ter pelo menos 4 caracteres.','var(--red)');return;}
  if(nova!==conf){_showToast('❌ Senhas não conferem.','var(--red)');return;}
  // Atualizar local e Firebase
  var local=_getUsuariosLocal();
  if(local[uid]){local[uid].senha=nova;local[uid].primeiroAcesso=false;_saveUsuariosLocal(local);}
  // FIX: usar _fbUpdate (merge) em vez de _fbSave (set/replace) para não apagar o resto do usuário
  if(window._fbUpdate){
    window._fbUpdate('usuarios/'+uid,{senha:nova,primeiroAcesso:false,updatedAt:Date.now()})
      .catch(function(e){console.error('[primeiroAcesso]',e);});
  } else if(window._fbSave){
    window._fbSave('usuarios/'+uid+'/senha',nova).catch(function(e){console.error('[primeiroAcesso senha]',e);});
    window._fbSave('usuarios/'+uid+'/primeiroAcesso',false);
    window._fbSave('usuarios/'+uid+'/updatedAt',Date.now());
  }
  // Atualizar senha no Firebase Auth (se o usuário estiver autenticado via Auth)
  if(typeof window._fbAuthUpdatePass==='function'){
    window._fbAuthUpdatePass(nova).catch(function(e){
      console.warn('[primeiroAcesso] Auth updatePassword:',e.code||e.message);
    });
  }
  document.getElementById('primeiroAcessoOverlay').classList.remove('open');
  _showToast('✅ Senha redefinida! Bem-vindo!','var(--accent)');
  // Continuar para o dashboard
  var sess=_getSessao?_getSessao():null;
  if(sess){
    var user={perfil:sess.perfil,nome:sess.nome,vinculo:sess.vinculo};
    _mostrarTela('dashboard');
    _entrarDashboardEquipe(user);
  }
}

/* Resetar senha — ADM pode usar em qualquer usuário */
function resetarSenhaUsuario(uid,nome){
  if(!confirm('Resetar senha de '+nome+'?\nA nova senha será o nome do usuário.')) return;
  var novaSenha=(nome||'').toLowerCase().replace(/\s+/g,'');
  var local=_getUsuariosLocal();
  if(local[uid]){local[uid].senha=novaSenha;local[uid].primeiroAcesso=true;_saveUsuariosLocal(local);}
  if(window._fbSave){
    if(window._fbUpdate){
      window._fbUpdate('usuarios/'+uid,{senha:novaSenha,primeiroAcesso:true,updatedAt:Date.now()})
        .then(function(){_showToast('✅ Senha de '+nome+' resetada!','var(--accent)');})
        .catch(function(e){_showToast('⚠️ Salvo localmente.','var(--amber)');console.error(e);});
    } else {
      window._fbSave('usuarios/'+uid+'/senha',novaSenha);
      window._fbSave('usuarios/'+uid+'/primeiroAcesso',true);
      _showToast('✅ Senha de '+nome+' resetada!','var(--accent)');
    }
  } else {
    _showToast('✅ Senha resetada localmente.','var(--accent)');
  }
  _renderUsuariosGrid();
}
window.resetarSenhaUsuario=resetarSenhaUsuario;


function _mostrarTurmas(){
  _mostrarTela('turmasScreen');
  var sess=_getSessao?_getSessao():null;
  var isAdm=!sess||sess.perfil==='adm';
  var isAdmOuMin=isAdm||(sess&&sess.perfil==='ministrante');
  // Card TURMAS: ADM e ministrante
  var btnCardT=document.getElementById('btnCardTurmas');
  if(btnCardT) btnCardT.style.display=isAdmOuMin?'':'none';
  // Card MAPEAMENTO: só ADM
  var btnMap=document.getElementById('btnMapHome');
  if(btnMap) btnMap.style.display=isAdm?'':'none';
  renderTurmasGrid();
}
// Auto-login: verificar sessão persistente no localStorage
(function(){
  try{
    var s=localStorage.getItem('ci_sessao_persistente');
    if(s){
      var sessao=JSON.parse(s);
      sessionStorage.setItem('ci_sessao',s);
      window.addEventListener('DOMContentLoaded',function(){
        if(sessao.perfil==='adm') _mostrarTurmas();
        else _entrarDashboardEquipe(sessao);
      });
    }
  }catch(e){}
})();
function logout(){
  if(typeof window._notifUnlisten==='function') window._notifUnlisten();
  if(typeof window._fbAuthLogout==='function') window._fbAuthLogout().catch(function(){});
  sessionStorage.removeItem('adm_logged');
  sessionStorage.removeItem('ci_sessao');
  localStorage.removeItem('ci_sessao_persistente');
  if(typeof window._resetModoConsultorDesktop==='function') window._resetModoConsultorDesktop();
  _mostrarTela('loginScreen',true);
  document.getElementById('loginUser').value='';document.getElementById('loginPass').value='';
  _turmaAtiva=null;
}

/* Migração única: cria contas Auth para todos os usuários do RTDB que ainda não têm.
   Chamar via console: _migrarUsuariosParaAuth()
   Senha padrão usada: o campo "senha" do RTDB (ou "Febracis@2024" se ausente). */
async function _migrarUsuariosParaAuth(){
  if(typeof window._fbAuthCreate!=='function'||typeof window._fbGet!=='function'){
    console.warn('[migração] Auth ou RTDB indisponíveis.');return;
  }
  var usuarios=await window._fbGet('usuarios');
  if(!usuarios){console.warn('[migração] Nenhum usuário no RTDB.');return;}
  var total=0,ok=0,skip=0,erros=0;
  for(var _entry of Object.entries(usuarios)){
    var _uid=_entry[0],_u=_entry[1];
    total++;
    if(_u.authUid){skip++;continue;}
    var _email=_loginToEmail(_u.login||_uid);
    var _senha=_u.senha||'Febracis@2024';
    try{
      var _cred=await window._fbAuthCreate(_email,_senha);
      await window._fbUpdate('usuarios/'+_uid,{authUid:_cred.user.uid});
      ok++;window._log&&window._log('[migração] ✅',_u.nome,'→',_email);
    }catch(_e){
      if(_e.code==='auth/email-already-in-use'){skip++;window._log&&window._log('[migração] ⚠️ já existe:',_email);}
      else{erros++;console.error('[migração] ❌',_u.nome,_e.code||_e.message);}
    }
  }
  var _msg='[migração] Concluída: '+total+' usuários | '+ok+' migrados | '+skip+' pulados | '+erros+' erros.';
  window._log&&window._log(_msg);
  if(typeof _showToast==='function') _showToast('✅ Migração: '+ok+' de '+total+' migrados','var(--accent)');
}
window._migrarUsuariosParaAuth=_migrarUsuariosParaAuth;

/* Migração opt-in: define mesMeta=periodEnd para turmas legadas sem vínculo explícito.
   Usar dryRun:true (padrão) para prévia sem gravar. Confirmar e executar com dryRun:false.
   Chamar via console: await _migrarMesMetaLegado()  ou  await _migrarMesMetaLegado({dryRun:false}) */
async function _migrarMesMetaLegado({dryRun=true}={}){
  if(typeof window._fbGet!=='function'||typeof window._fbUpdate!=='function'){
    console.warn('[migração mesMeta] Firebase indisponível.');return[];
  }
  var turmas=await window._fbGet('turmas');
  if(!turmas){console.warn('[migração mesMeta] Nenhuma turma.');return[];}
  var preview=[],total=0,skip=0;
  for(var _e of Object.entries(turmas)){
    var _id=_e[0],_t=_e[1];
    if(_t.mesMeta){skip++;continue;}
    var _anchor=(_t.periodEnd||_t.periodStart||'').slice(0,7);
    if(!_anchor){console.warn('[migração mesMeta] Turma sem período:',_id,_t.nome);skip++;continue;}
    preview.push({id:_id,nome:_t.nome||_id,mesMeta:_anchor,origem:'periodEnd'});
    total++;
    if(!dryRun){
      await window._fbUpdate('turmas/'+_id,{mesMeta:_anchor,mesMetaOrigem:'migracao-auto-periodEnd'});
    }
  }
  var msg='[migração mesMeta] '+(dryRun?'PRÉVIA':'CONCLUÍDA')+': '+total+' turmas | '+skip+' puladas (já têm mesMeta)';
  window._log&&window._log(msg);
  console.table(preview);
  if(!dryRun&&typeof _showToast==='function')
    _showToast('✅ mesMeta migrado: '+total+' turmas atualizadas','var(--accent)');
  return preview;
}
window._migrarMesMetaLegado=_migrarMesMetaLegado;
