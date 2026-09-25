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
}

function fecharChat() {
    document.getElementById('supportWindowSystem').style.display = 'none';
    if (chatUnsubscribe) chatUnsubscribe();
    if (contatosUnsubscribe) contatosUnsubscribe();
}

// ==========================================
// LISTA DE CONTATOS (COMPRADOR)
// ==========================================
function carregarListaContatos() {
    const listArea = document.getElementById('chatContactList');
    listArea.innerHTML = '<div style="color:white; text-align:center;">Carregando contatos...</div>';
    
    if (!firebase.apps.length) {
        listArea.innerHTML = '<div style="color:red; text-align:center;">Erro: Firebase não está conectado.</div>';
        return;
    }

    const db = firebase.firestore();
    
    contatosUnsubscribe = db.collection('chats_metadata')
        .orderBy('lastUpdate', 'desc')
        .onSnapshot((snapshot) => {
            listArea.innerHTML = '';
            if (snapshot.empty) {
                listArea.innerHTML = '<div style="color:white; text-align:center; padding: 20px;">Nenhum chat ativo.</div>';
                return;
            }
            
            snapshot.forEach((doc) => {
                const data = doc.data();
                const chatId = doc.id;
                
                const div = document.createElement('div');
                div.style.cssText = "background: #222; padding: 10px; border-radius: 8px; cursor: pointer; border: 1px solid #444; display: flex; flex-direction: column; gap: 5px;";
                
                  // Adiciona o piscar se a última mensagem for do fornecedor
                  if (data.tipo !== "comprador") {
                      div.classList.add("chat-blink");
                      div.style.border = "2px solid #00ff00";
                  }
                  div.onclick = () => abrirSalaChat(chatId, data.nomeFornecedor || chatId);
                
                div.innerHTML = `
                    <strong style="color: #00ffff; font-size: 14px;">${data.nomeFornecedor || 'Fornecedor'}</strong>
                    <span style="color: #aaa; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
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
    
    const db = firebase.firestore();
    
    if (chatUnsubscribe) chatUnsubscribe();
    
    chatUnsubscribe = db.collection('chats').doc(chatAtualCotacaoId).collection('mensagens')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            mensagensArea.innerHTML = '';
            snapshot.forEach((doc) => {
                renderizarMensagem(doc.data());
            });
            mensagensArea.scrollTop = mensagensArea.scrollHeight;
        });
}

function renderizarMensagem(msg) {
    const mensagensArea = document.getElementById('chatMessagesArea');
    const div = document.createElement('div');
    
    const isMine = (msg.remetenteEmail === chatUsuarioAtual.email);
    div.className = isMine ? 'chat-msg msg-mine' : 'chat-msg msg-other';
    
    let html = `<strong>${msg.remetenteNome || 'Usuário'}</strong><br>`;
    
    if (msg.texto) {
        html += `<span>${msg.texto}</span>`;
    }
    
    if (msg.urlArquivo) {
        if (msg.tipoArquivo === 'audio') {
            html += `<br><audio controls src="${msg.urlArquivo}" style="max-width: 220px; height: 35px; outline: none; margin-top: 5px;"></audio>`;
        } else if (msg.tipoArquivo === 'imagem') {
            html += `<br><img src="${msg.urlArquivo}" style="max-width:100%; border-radius:5px; margin-top:5px; cursor:pointer;" onclick="window.open('${msg.urlArquivo}')">`;
        } else {
            html += `<br><a href="${msg.urlArquivo}" target="_blank" style="color:#00ffff; text-decoration:underline; font-size:12px;">📁 Abrir Anexo</a>`;
        }
    }
    
    const dataFormatada = msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleString('pt-BR') : 'agora';
    html += `<span class="msg-time">${dataFormatada}</span>`;
    
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

        // Atualiza a metadata para a Lista do Comprador
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
            
            // Pára as tracks do microfone para não ficar gravando escondido
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        };
    }
}


// Monitoramento Global Robusto para Notificações Visuais (Piscar o botão)
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

// Atualizado em: 2026-09-21 09:45:24
