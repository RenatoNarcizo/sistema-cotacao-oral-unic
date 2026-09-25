/* =========================================
   LÓGICA DO CHAT EM TEMPO REAL (FIREBASE)
========================================= */

let chatAtualCotacaoId = null;
let chatUnsubscribe = null;
let contatosUnsubscribe = null;
let chatUsuarioAtual = null; // Guardar quem está logado
let isComprador = false; // Flag para roteamento

// MediaRecorder para áudio
let mediaRecorder;
let audioChunks = [];

function getEmailFormatado(email) {
    if (!email) return "desconhecido";
    return email.replace(/[@.]/g, '_');
}

// Injeção do window.abrirChatGeral (chamado no clique do cabeçalho)
window.abrirChatGeral = function() {

    console.log("abrirChatGeral INICIOU EXCUCAO");
    let usu = {nome: 'Usuário', email: '', tipo: ''};
    try {
        let uLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
        if (uLogado) usu = uLogado;
    } catch(e) {}

    chatUsuarioAtual = usu;
    const isGerencia = usu.email === "gerencia.cgms@gmail.com" || usu.email === "admin@teste.com";
    isComprador = (usu.tipo === "comprador" && !isGerencia);

    console.log("Definindo modal como flex. isComprador=", isComprador);
    let chatMod = document.getElementById('supportWindowSystem');
    if (chatMod && chatMod.parentNode !== document.body) {
        document.body.appendChild(chatMod);
    }
    document.getElementById('supportWindowSystem').style.display = 'flex';
    document.getElementById('supportWindowSystem').style.setProperty('display', 'flex', 'important');
    
    // Remove blink effect when opened
    const btnBlink1 = document.getElementById('btnChatGeral');
    if (btnBlink1) { btnBlink1.classList.remove('chat-blink'); btnBlink1.style.border = "2px solid #fff"; }
    const btnBlink2 = document.getElementById('cardChatFornecedor');
    if (btnBlink2) { btnBlink2.classList.remove('chat-blink'); btnBlink2.style.border = ""; }

    if (isComprador) {
        // Comprador vê a lista de contatos
        document.getElementById('chatTitle').innerText = 'Chat Fornecedores';
        document.getElementById('chatRoomView').style.display = 'none';
        document.getElementById('chatContactList').style.display = 'flex';
        document.getElementById('chatBackBtn').style.display = 'none';
        carregarListaContatos();
    } else {
        // Fornecedor vai direto para o chat dele
        let myChatId = getEmailFormatado(usu.email);
        document.getElementById('chatContactList').style.display = 'none';
        abrirSalaChat(myChatId, 'Atendimento Compras');
        document.getElementById('chatBackBtn').style.display = 'none'; // Não precisa voltar
    }
};

function voltarListaChats() {
    if (chatUnsubscribe) chatUnsubscribe();
    document.getElementById('chatRoomView').style.display = 'none';
    document.getElementById('chatContactList').style.display = 'flex';
    document.getElementById('chatTitle').innerText = 'Chat Fornecedores';
    document.getElementById('chatBackBtn').style.display = 'none';
    if(isComprador) carregarListaContatos();
}

function fecharChat() {
    document.getElementById('supportWindowSystem').style.display = 'none';
    if (chatUnsubscribe) chatUnsubscribe();
}

// ==========================================
// LISTA DE CONTATOS (COMPRADOR) E NOVA CONVERSA
// ==========================================
function carregarListaContatos() {
    const listArea = document.getElementById('chatContactList');
    listArea.innerHTML = '<div style="color:white; text-align:center;">Carregando contatos...</div>';
    
    if (!firebase.apps.length) {
        listArea.innerHTML = '<div style="color:red; text-align:center;">Erro: Firebase não está conectado.</div>';
        return;
    }

    const db = firebase.firestore();
    
    if(contatosUnsubscribe) contatosUnsubscribe();
    
    contatosUnsubscribe = db.collection('chats_metadata')
        .orderBy('lastUpdate', 'desc')
        .onSnapshot((snapshot) => {
            listArea.innerHTML = '';
            
            // BOTÃO NOVA CONVERSA
            const btnNova = document.createElement('button');
            btnNova.innerText = '+ Iniciar Nova Conversa';
            btnNova.style.cssText = 'background: #1ebd5a; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold; margin-bottom: 15px; font-size: 14px;';
            btnNova.onclick = () => {
                abrirTelaSelecaoNovoContato();
            };
            listArea.appendChild(btnNova);

            if (snapshot.empty) {
                const divVazio = document.createElement('div');
                divVazio.innerHTML = '<div style="color:white; text-align:center; padding: 20px;">Nenhum chat ativo no momento.</div>';
                listArea.appendChild(divVazio);
                return;
            }
            
            snapshot.forEach((doc) => {
                const data = doc.data();
                const chatId = doc.id;
                
                const div = document.createElement('div');
                div.style.cssText = "background: #222; padding: 10px; border-radius: 8px; cursor: pointer; border: 1px solid #444; display: flex; flex-direction: column; gap: 5px; margin-bottom: 5px;";
                
                div.onclick = () => abrirSalaChat(chatId, data.nomeFornecedor || 'Usuário');
                
                const dataUpdate = data.lastUpdate ? new Date(data.lastUpdate.toDate()).toLocaleString('pt-BR') : '';
                
                div.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong style="color: #00ffff;">${data.nomeFornecedor || 'Usuário'}</strong>
                        <span style="font-size: 11px; color: #888;">${dataUpdate}</span>
                    </div>
                    <span style="color: #ccc; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${data.ultimaMensagem || 'Arquivo/Áudio enviado'}
                    </span>
                `;
                listArea.appendChild(div);
            });
        }, (error) => {
            console.error("Erro lista:", error);
            listArea.innerHTML = '<div style="color:red; text-align:center;">Erro ao carregar lista.</div>';
        });
}

// ==========================================
// TELA COM 2 ABAS (EQUIPE / FORNECEDOR)
// ==========================================
function abrirTelaSelecaoNovoContato() {
    if(contatosUnsubscribe) { contatosUnsubscribe(); contatosUnsubscribe = null; }
    const listArea = document.getElementById('chatContactList');
    
    // Renderiza Botões Iniciais
    listArea.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap: nowrap;">
            <h4 style="color:white; margin:0; font-size:16px; white-space: nowrap;">Nova Conversa</h4>
            <button onclick="carregarListaContatos()" style="background:transparent; color:#bbb; border:1px solid #666; padding:4px 8px; border-radius:5px; cursor:pointer; font-size: 12px; margin-left: 10px; white-space: nowrap;">
                <i class="fa-solid fa-arrow-left"></i> Voltar
            </button>
        </div>
        <div style="display:flex; flex-direction:column; gap:10px; margin-top:5px;">
            <button id="btnListaEquipe" style="background:#ff9900; color:#000; border:none; padding:15px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:15px;">
                👥 Equipe da Empresa
            </button>
            <button id="btnListaForn" style="background:#00ffff; color:#000; border:none; padding:15px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:15px;">
                🚚 Fornecedores
            </button>
        </div>
        <div id="chatGlobalListDiv" style="margin-top: 20px;"></div>
    `;

    document.getElementById('btnListaEquipe').onclick = () => renderizarAba('equipe');
    document.getElementById('btnListaForn').onclick = () => renderizarAba('fornecedor');

    async function renderizarAba(aba) {
        const divLista = document.getElementById('chatGlobalListDiv');
        divLista.innerHTML = '<div style="color:white; text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Buscando...</div>';
        
        try {
            const db = firebase.firestore();
            let contatos = [];
            
            if (aba === 'equipe') {
                // Busca de Equipe Interna (qualquer usuário que NÃO seja fornecedor)
                const usersSnap = await db.collection('usuarios').get();
                usersSnap.forEach(doc => {
                    const d = doc.data();
                    if(d.email && d.email !== chatUsuarioAtual.email && d.tipo !== 'fornecedor') {
                        contatos.push({ nome: d.nome || d.email, email: d.email, tipo: d.tipo || 'Equipe Interna', cor: '#ff9900' });
                    }
                });
            } else {
                // Busca de fornecedores (tabela de fornecedores + tabela de usuários que são fornecedores)
                const fornSnap = await db.collection('fornecedores').get();
                fornSnap.forEach(doc => {
                    const d = doc.data();
                    if(d.email && d.email !== chatUsuarioAtual.email) {
                        contatos.push({ nome: d.nome || d.razaoSocial || d.email, email: d.email, tipo: 'Fornecedor', cor: '#00ffff' });
                    }
                });
                
                const usersSnap = await db.collection('usuarios').get();
                usersSnap.forEach(doc => {
                    const d = doc.data();
                    if(d.tipo === 'fornecedor' && d.email && d.email !== chatUsuarioAtual.email && !contatos.some(c => c.email === d.email)) {
                        contatos.push({ nome: d.nome || d.email, email: d.email, tipo: 'Fornecedor', cor: '#00ffff' });
                    }
                });
            }
            
            // Ordena alfabeticamente
            contatos.sort((a, b) => a.nome.localeCompare(b.nome));
            
            let html = `
                <input type="text" id="chatSearchContato" placeholder="Pesquisar..." style="width:100%; padding:8px; border-radius:5px; border:none; margin-bottom:15px; outline:none;">
                <div id="listaContatosFiltrados" style="display:flex; flex-direction:column; gap:8px;"></div>
            `;
            divLista.innerHTML = html;
            
            const divFiltrados = document.getElementById('listaContatosFiltrados');
            
            const renderFiltrados = (termo = '') => {
                divFiltrados.innerHTML = '';
                const filtrados = contatos.filter(c => c.nome.toLowerCase().includes(termo.toLowerCase()) || c.email.toLowerCase().includes(termo.toLowerCase()));
                
                if(filtrados.length === 0) {
                    divFiltrados.innerHTML = '<div style="color:#aaa; text-align:center;">Nenhum contato encontrado.</div>';
                    return;
                }
                
                filtrados.forEach(c => {
                    const item = document.createElement('div');
                    item.style.cssText = "background: #222; padding: 10px; border-radius: 8px; cursor: pointer; border: 1px solid #444;";
                    item.innerHTML = `
                        <div style="font-weight:bold; color:white;">${c.nome}</div>
                        <div style="display:flex; justify-content:space-between; margin-top:4px;">
                            <span style="font-size:12px; color:#aaa;">${c.email}</span>
                            <span style="font-size:11px; background:${c.cor}; color:#000; padding:2px 6px; border-radius:4px; font-weight:bold;">${c.tipo}</span>
                        </div>
                    `;
                    item.onclick = () => {
                        const chatId = getEmailFormatado(c.email);
                        abrirSalaChat(chatId, c.nome);
                    };
                    divFiltrados.appendChild(item);
                });
            };
            
            renderFiltrados('');
            
            document.getElementById('chatSearchContato').addEventListener('input', (e) => {
                renderFiltrados(e.target.value);
            });
            
        } catch(e) {
            console.error("Erro ao buscar contatos:", e);
            divLista.innerHTML = '<div style="color:red; text-align:center;">Erro ao carregar lista.</div>';
        }
    }
}


// ==========================================
// SALA DE CHAT (MENSAGENS)
// ==========================================
function abrirSalaChat(chatId, titleNome) {
    chatAtualCotacaoId = chatId;
    
    document.getElementById('chatContactList').style.display = 'none';
    document.getElementById('chatRoomView').style.display = 'flex';
    document.getElementById('chatTitle').innerText = titleNome;
    
    if (isComprador) {
        document.getElementById('chatBackBtn').style.display = 'inline-block';
    }

    carregarMensagens();
}

function carregarMensagens() {
    const mensagensArea = document.getElementById('chatMessagesArea');
    mensagensArea.innerHTML = '<div style="color:white; text-align:center;">Carregando mensagens...</div>';
    
    if (!firebase.apps.length) return;
    const db = firebase.firestore();
    
    if (chatUnsubscribe) chatUnsubscribe();
    chatUnsubscribe = db.collection('chats').doc(chatAtualCotacaoId).collection('mensagens')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            mensagensArea.innerHTML = '';
            
            if (snapshot.empty) {
                mensagensArea.innerHTML = '<div style="color:#aaa; text-align:center; padding: 20px; font-style: italic;">Envie uma mensagem para iniciar o chat.</div>';
                return;
            }
            
            snapshot.forEach((doc) => {
                const msg = doc.data();
                renderizarMensagemNaTela(msg);
            });
            
            mensagensArea.scrollTop = mensagensArea.scrollHeight;
        });
}

function renderizarMensagemNaTela(msg) {
    const mensagensArea = document.getElementById('chatMessagesArea');
    const div = document.createElement('div');
    
    const isMine = (msg.remetenteEmail === chatUsuarioAtual.email);
    div.className = isMine ? 'chat-msg msg-mine' : 'chat-msg msg-other';
    
    // ESTILO WHATSAPP
    div.style.backgroundColor = isMine ? '#005c4b' : '#202c33';
    div.style.padding = '6px 10px';
    div.style.borderRadius = '10px';
    div.style.marginBottom = '12px';
    div.style.width = 'fit-content';
    div.style.maxWidth = '85%';
    div.style.marginLeft = isMine ? 'auto' : '0';
    div.style.marginRight = isMine ? '0' : 'auto';
    div.style.color = '#e9edef';
    
    let html = `<div style="font-size: 12px; font-weight: bold; margin-bottom: 4px; color: ${isMine ? '#1ebd5a' : '#53bdeb'};">${msg.remetenteNome || 'Usuário'}</div>`;
    
    if (msg.texto) {
        html += `<div style="font-size: 14px; line-height: 1.3;">${msg.texto}</div>`;
    }
    
    if (msg.urlArquivo) {
        if (msg.tipoArquivo === 'audio') {
            html += `<br><audio controls src="${msg.urlArquivo}" style="max-width: 220px; height: 35px; outline: none; margin-top: 5px;"></audio>`;
        } else if (msg.tipoArquivo === 'imagem') {
            html += `<br><img src="${msg.urlArquivo}" style="max-width:100%; border-radius:5px; margin-top:5px; cursor:pointer;" onclick="window.open('${msg.urlArquivo}')">`;
        } else {
            html += `<br><a href="${msg.urlArquivo}" target="_blank" style="color:#53bdeb; text-decoration:underline; font-size:12px;">📁 Abrir Anexo</a>`;
        }
    }
    
    const dataFormatada = msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : 'agora';
    html += `<div style="text-align: right; margin-top: 2px; margin-bottom: -4px;">
                <span style="font-size: 11px; color: #8696a0;">${dataFormatada}</span>
             </div>`;
    
    div.innerHTML = html;
    mensagensArea.appendChild(div);
}

// ==========================================
// ENVIO DE MENSAGENS E ARQUIVOS
// ==========================================
async function enviarMensagemChat(texto = null, urlArquivo = null, tipoArquivo = null) {
    const input = document.getElementById('chatInputText');
    const msgTexto = texto !== null ? texto : input.value.trim();
    
    if (!msgTexto && !urlArquivo) return;
    if (texto === null) input.value = '';
    
    const db = firebase.firestore();
    try {
        await db.collection('chats').doc(chatAtualCotacaoId).collection('mensagens').add({
            texto: msgTexto,
            urlArquivo: urlArquivo,
            tipoArquivo: tipoArquivo,
            remetenteNome: chatUsuarioAtual.nome || 'Usuário',
            remetenteEmail: chatUsuarioAtual.email || '',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        await db.collection('chats_metadata').doc(chatAtualCotacaoId).set({
            nomeFornecedor: isComprador ? document.getElementById('chatTitle').innerText : (chatUsuarioAtual.nome || chatUsuarioAtual.email),
            tipo: chatUsuarioAtual.tipo || 'fornecedor',
            ultimaMensagem: msgTexto || (tipoArquivo === 'audio' ? '🎤 Áudio' : '📎 Anexo'),
            lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
        }, {merge: true});

    } catch (e) {
        console.error("Erro ao enviar mensagem:", e);
    }
}

window.handleChatFileSelect = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const storageRef = firebase.storage().ref();
    const fileRef = storageRef.child(`chat_anexos/${chatAtualCotacaoId}/${Date.now()}_${file.name}`);
    
    const btnIcon = document.querySelector('#chatFileInput + button i');
    btnIcon.className = 'fa-solid fa-spinner fa-spin';
    
    fileRef.put(file).then((snapshot) => {
        snapshot.ref.getDownloadURL().then((url) => {
            let tipo = 'arquivo';
            if (file.type.startsWith('image/')) tipo = 'imagem';
            enviarMensagemChat('', url, tipo);
            btnIcon.className = 'fa-solid fa-paperclip';
            event.target.value = '';
        });
    }).catch(e => {
        alert("Erro no upload do arquivo.");
        btnIcon.className = 'fa-solid fa-paperclip';
    });
}

// ==========================================
// GRAVAÇÃO DE ÁUDIO
// ==========================================
async function startRecording(e) {
    if(e) e.preventDefault();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("O seu navegador não suporta gravação de áudio.");
        return;
    }
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) audioChunks.push(event.data);
        };
        
        mediaRecorder.start();
        document.getElementById('btnRecordAudio').style.color = 'red';
    } catch (err) {
        console.error("Erro no microfone:", err);
        alert("Erro no microfone: Não foi possível encontrar um microfone conectado ou o acesso foi negado.");
    }
}

function stopRecording(e) {
    if(e) e.preventDefault();
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        document.getElementById('btnRecordAudio').style.color = 'white';
        
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const storageRef = firebase.storage().ref();
            const fileRef = storageRef.child(`chat_audios/${chatAtualCotacaoId}/${Date.now()}.webm`);
            
            const btnIcon = document.querySelector('#btnRecordAudio i');
            btnIcon.className = 'fa-solid fa-spinner fa-spin';
            
            fileRef.put(audioBlob).then((snapshot) => {
                snapshot.ref.getDownloadURL().then((url) => {
                    enviarMensagemChat('', url, 'audio');
                    btnIcon.className = 'fa-solid fa-microphone';
                });
            }).catch(e => {
                alert("Erro ao enviar áudio.");
                btnIcon.className = 'fa-solid fa-microphone';
            });
            
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        };
    }
}

let monitoramentoChatAtivo = false;
let monitoramentoUnsubscribe = null;
let monitoramentoAtualEmail = null;

setInterval(() => {
    try {
        let uLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
        
        if (uLogado && typeof firebase !== "undefined" && firebase.firestore) {
            const isGerencia = uLogado.email === "gerencia.cgms@gmail.com" || uLogado.email === "admin@teste.com";
            const isComp = (uLogado.tipo === "comprador" && !isGerencia);
            const myEmail = uLogado.email;
            
            if (!monitoramentoChatAtivo || monitoramentoAtualEmail !== myEmail) {
                if (monitoramentoUnsubscribe) monitoramentoUnsubscribe();
                
                monitoramentoChatAtivo = true;
                monitoramentoAtualEmail = myEmail;
                const db = firebase.firestore();
                
                if (isComp) {
                    let initialLoadComp = true;
                    monitoramentoUnsubscribe = db.collection('chats_metadata').onSnapshot((snapshot) => {
                        if (initialLoadComp) { initialLoadComp = false; return; }
                        let hasNew = false;
                        snapshot.docChanges().forEach((change) => {
                            if (change.type === "modified" || change.type === "added") {
                                const data = change.doc.data();
                                if (data.tipo !== "comprador" && document.getElementById('supportWindowSystem').style.display !== 'flex') {
                                    hasNew = true;
                                }
                            }
                        });
                        if (hasNew) {
                            const btn = document.getElementById('btnChatGeral');
                            if (btn) { btn.classList.add('chat-blink'); btn.style.border = "3px solid #00ff00"; }
                        }
                    });
                } else if (!isGerencia) {
                    const myChatId = getEmailFormatado(uLogado.email);
                    let initialLoadForn = true;
                    monitoramentoUnsubscribe = db.collection('chats_metadata').doc(myChatId).onSnapshot((doc) => {
                        if (initialLoadForn) { initialLoadForn = false; return; }
                        if (doc.exists) {
                            const data = doc.data();
                            if (data.tipo === "comprador" && document.getElementById('supportWindowSystem').style.display !== 'flex') {
                                const btn = document.getElementById('btnChatGeral');
                                if (btn) { btn.classList.add('chat-blink'); btn.style.border = "3px solid #00ff00"; }
                                const cardForn = document.getElementById('cardChatFornecedor');
                                if (cardForn) { cardForn.classList.add('chat-blink'); cardForn.style.border = "3px solid #00ff00"; }
                            }
                        }
                    });
                }
            }
        } 
        else if (!uLogado && monitoramentoChatAtivo) {
            monitoramentoChatAtivo = false;
            monitoramentoAtualEmail = null;
            if (monitoramentoUnsubscribe) {
                monitoramentoUnsubscribe();
                monitoramentoUnsubscribe = null;
            }
        }
    } catch(e) {}
}, 2000);
