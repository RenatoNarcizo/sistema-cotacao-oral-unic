// 🚀 PREMIUM RENDER JS CARREGADO - V_FINAL_POLISHED_V2
function renderizarTabelaAnalise(textoOuId, containerOverride = null) {
    console.log("🚀 PREMIUM RENDER JS EXECUTANDO...");
    const container = containerOverride || document.getElementById('analiseConteudo');

    if (!container) {
        console.error("Erro: Container de renderização não encontrado.");
        return;
    }

    // 🔍 Helper Local
    const normalizarEmail = (e) => (e || "").toLowerCase().trim();

    const cotacoes = JSON.parse(localStorage.getItem("cotacoes")) || [];
    let cotacao = cotacoes.find(c => c.id === textoOuId);
    if (!cotacao) {
        cotacao = cotacoes.find(c => c.numero === textoOuId);
    }

    if (!cotacao) {
        container.innerHTML = "<p>Cotação não encontrada.</p>";
        return;
    }

    // 🔒 VINCULA ID AO MODAL (CORREÇÃO CRÍTICA) - Só se não for override
    if (!containerOverride) {
        const modal = document.getElementById("modalAnaliseCotacao");
        if (modal) {
            modal.setAttribute("data-cotacao", cotacao.numero || cotacao.id);
        }
    }

    /* ==========================
       📌 CABEÇALHO 
    ========================== */
    // Apenas atualiza elementos do modal se não estiver em modo override
    if (!containerOverride) {
        const elNum = document.getElementById("analiseNumero");
        if (elNum) {
            let numDisplay = cotacao.numero || cotacao.id || "";
            if (numDisplay && !String(numDisplay).startsWith("COT-")) {
                numDisplay = "COT-" + numDisplay;
            }
            elNum.textContent = numDisplay;
        }

        // ⏳ LÓGICA DO TIMER (MODAL ANÁLISE)
        const timerDisplay = document.getElementById("analiseTimerDisplay");
        const containerTimer = document.getElementById("analiseTimer");

        if (window.timerAnaliseInterval) clearInterval(window.timerAnaliseInterval);

        if (cotacao.status === "fechada" || cotacao.status === "finalizada") {
            if (containerTimer) containerTimer.style.display = "none";
        } else {
            if (containerTimer) containerTimer.style.display = "block";

            function atualizarTimerAnalise() {
                const agora = new Date();
                let dataFim;

                const valorFim = String(cotacao.dataFechamento || "").trim();
                if (valorFim.includes('/')) {
                    const [d, h] = valorFim.split(',');
                    const [dia, mes, ano] = d.trim().split('/');
                    dataFim = new Date(`${ano}-${mes}-${dia}T${(h || "00:00:00").trim()}`);
                } else {
                    dataFim = new Date(valorFim);
                }

                const diff = dataFim - agora;

                if (diff <= 0) {
                    if (timerDisplay) {
                        timerDisplay.innerText = "FECHAMENTO";
                        timerDisplay.style.color = "#ff4444";
                    }
                    clearInterval(window.timerAnaliseInterval);
                    return;
                }

                const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);

                if (timerDisplay) {
                    timerDisplay.innerText = `${d}d ${h}h ${m}m ${s}s`;
                    timerDisplay.style.color = d === 0 && h < 2 ? "#ffd700" : "#00ff99";
                }
            }

            atualizarTimerAnalise();
            window.timerAnaliseInterval = setInterval(atualizarTimerAnalise, 1000);
        }

        const elDesc = document.getElementById("analiseDescricao");
        if (elDesc) elDesc.textContent = cotacao.descricao || "— Sem descrição";

        const elData = document.getElementById("analiseDataCriacao");
        if (elData) elData.textContent = cotacao.dataCriacao || "-";

        const elFech = document.getElementById("analiseDataFechamento");
        if (elFech) elFech.textContent = cotacao.dataFechamento || "-";
    }

    // Controle de Status / Visibilidade de Botões EXTERNOS
    const statusDiv = document.getElementById("statusAprovacao");
    const divAcoesFechada = document.getElementById("acoesFechada");
    const btnEnviarExterno = document.getElementById("btnEnviarAprovacao");
    const btnVerTodosAnexos = document.getElementById("btnVerTodosAnexos");

    // Limpeza de visibilidade (Só se não for override)
    if (!containerOverride) {
        if (divAcoesFechada) divAcoesFechada.style.display = "none";
        if (statusDiv) statusDiv.innerHTML = "";
        if (btnEnviarExterno) btnEnviarExterno.style.display = "none";
        if (btnVerTodosAnexos) btnVerTodosAnexos.style.display = "none";

        // --- LIMPEZA E POPULAÇÃO DO MOTIVO DE REJEIÇÃO ---
        const contMotivo = document.getElementById("contMotivoRejeicao");
        const boxMotivo = document.getElementById("boxMotivoRejeicao");
        const areaMotivo = document.getElementById("motivoRejeicao");
        const btnMotivo = document.getElementById("btnMotivoRejeicao");

        if (contMotivo) contMotivo.style.display = "none";
        if (boxMotivo) boxMotivo.style.display = "none";
        if (areaMotivo) areaMotivo.value = "";
        if (btnMotivo) {
            btnMotivo.style.display = "none";
            btnMotivo.innerText = "📄 Ver motivo da rejeição";
        }

        if (cotacao.motivoRejeicao && cotacao.status !== "aprovacao") {
            if (areaMotivo) areaMotivo.value = cotacao.motivoRejeicao;
            if (contMotivo) contMotivo.style.display = "block";
            // O botão btnMotivo agora fica oculto (display:none no HTML) para evitar duplicidade.
            // O controle é feito apenas pelo botão na linha de ações da matriz.
        }
    }

    // 1. ANÁLISE / APROVAÇÃO
    const isAnalise = (cotacao.status === "respondida" || cotacao.status === "reanalise" || cotacao.status === "analise" || cotacao.status === "aberta" || cotacao.status === "aprovacao");

    // 2. Lógica de Status (Texto)
    let textoStatus = "";
    if (cotacao.status === "aprovacao") {
        textoStatus = "⏳ Aguardando Aprovação";
    } else if (cotacao.status === "fechada") {
        textoStatus = "🔒 Fechada (Pedido Gerado)";
        if (!containerOverride && divAcoesFechada) divAcoesFechada.style.display = "flex";
        window.cotacaoAtualPDF = cotacao;
    }

    // Se estiver no modal, atualiza o statusDiv global. Se estiver no acordeão, guardamos para o HTML.
    if (!containerOverride && statusDiv) {
        statusDiv.innerHTML = textoStatus;
    }

    /* ==========================
       📊 DADOS (Sincronizados via Nuvem)
    ========================== */
    const listaFornGlobal = JSON.parse(localStorage.getItem("fornecedores")) || [];
    const getNomeExibicao = (email, nomeOriginal) => {
        const f = listaFornGlobal.find(x => (x.email || "").toLowerCase().trim() === (email || "").toLowerCase().trim());
        return f ? f.nome : nomeOriginal;
    };

    let respostas = [];
    if (Array.isArray(cotacao.respostasFornecedores)) {
        respostas = [...cotacao.respostasFornecedores];
    }

    if (respostas.length === 0) {
        container.innerHTML = "<p style='color:#ccc; padding:20px;'>Nenhuma resposta recebida para esta cotação ainda.</p>";
        if (isAnalise && cotacao.status !== "aprovacao") {
            container.innerHTML += `
               <div style="margin-top:20px;">
                  <button onclick="excluirCotacao('${cotacao.numero}')" 
                       style="background:#b93a3a; color:white; border:none; padding:10px 20px; border-radius:6px; cursor:pointer;">
                     <i class="fa-solid fa-trash"></i> Excluir Cotação
                  </button>
               </div>`;
        }
        return;
    }

    /* ==========================
       🏗️ MATRIZ VISUAL
    ========================== */
    let html = `
        <table class="matriz-cotacao" style="width:100%; border-collapse:collapse; margin-top:20px;">
            <thead style="background:#500a40; color:white;">
                <tr>
                    <th style="width:40px; text-align:center; padding:12px;">
                        <i id="iconExpandirGlobal" class="fa-solid fa-expand" 
                           style="cursor:pointer; font-size:14px; color:#3ab9b6;" 
                           onclick="toggleExpansaoColunas()"
                           title="Expandir Visualização"></i>
                        <script>
                          // Verifica se existem documentos financeiros para esta cotação e injeta ícone se sim
                          (async function() {
                             try {
                               const idLimpo = "${cotacao.numero || cotacao.id}".replace(/#/g, "").replace(/COT-/gi, "").trim();
                               const idOrig = "${cotacao.numero || cotacao.id}";
                               const ids = [`docs_` + idLimpo, `docs_` + idOrig];
                               let temFin = false;
                               if (typeof db !== "undefined") {
                                 for(const id of ids) {
                                   const snap = await db.collection("documentos_cotacao").doc(id).get();
                                   if (snap.exists) { temFin = true; break; }
                                   const sub = await db.collection("documentos_cotacao").doc(id).collection("anexos_individuais").limit(1).get();
                                   if (!sub.empty) { temFin = true; break; }
                                 }
                               }
                               if (temFin) {
                                 const icon = document.createElement("i");
                                 icon.className = "fa-solid fa-file-invoice-dollar";
                                 icon.style.color = "#fbbf24";
                                 icon.style.cursor = "pointer";
                                 icon.style.marginLeft = "8px";
                                 icon.title = "Ver Notas/Boletos da Gestão Financeira";
                                 icon.onclick = () => visualizarDocumentos("${cotacao.numero || cotacao.id}");
                                 document.getElementById("iconExpandirGlobal").parentElement.appendChild(icon);
                               }
                             } catch(e) {}
                          })();
                        </script>
                    </th>
                    <th style="width:45px; text-align:center;" class="col-idx">#</th>
                    <th class="col-fixa" style="text-align:left; padding-left:10px;">Item</th>
                    <th class="col-fixa-2" style="text-align:center;">Marca</th>
                    <th class="col-fixa-3" style="text-align:center;">Qtd</th>`;

    // Cabeçalhos dos fornecedores
    respostas.forEach(r => {
        const temAnexo = r.anexo || (Array.isArray(r.anexos) && r.anexos.length > 0) || r.base64;

        html += `<th style="text-align:center; min-width:120px;">
                    <div style="font-size:13px; font-weight:bold; display:flex; align-items:center; justify-content:center; gap:5px;">
                        ${temAnexo ? `
                        <i class="fa-solid fa-paperclip" 
                           style="color:#10b981; cursor:pointer;" 
                           title="Ver Anexos deste Fornecedor" 
                           onclick="visualizarDocumentos('${cotacao.numero}', '${r.email}')"></i>
                        ` : ''}
                        ${getNomeExibicao(r.email, r.fornecedor)}
                    </div>
                 </th>`;
    });

    html += `<th style="text-align:center; color:#10b981; min-width:180px; font-weight:bold;">🏆 VENCEDOR</th>`;
    html += `</tr></thead><tbody style="background:#000;">`;

    const produtos = cotacao.produtos || cotacao.itens || [];

    produtos.forEach((prod, idx) => {
        const nomeItem = prod.nome || prod.descricao || ("Item " + (idx + 1));
        const nomeProd = prod.produto || nomeItem;
        const qtd = prod.quantidade || 0;

        let precosRow = [];
        respostas.forEach(r => {
            const pItem = (r.itens || []).find(it => (it.produto === nomeProd) || (it.nome === nomeProd) || (it.produto === nomeItem));
            if (pItem) {
                let valor = Number(pItem.preco || pItem.valor || pItem.precoUnitario || 0);
                if (valor > 0) precosRow.push({ fornecedor: r.fornecedor, email: r.email, val: valor });
            }
        });
        precosRow.sort((a, b) => a.val - b.val);

        const melhorPreco = precosRow.length > 0 ? precosRow[0] : null;

        html += `<tr style="border-bottom:1px solid #222;">
                <td style="text-align:center; padding:10px;"></td>
                <td style="text-align:center;">
                  <span style="display:inline-block; padding:4px 8px; background:#000; border:1px solid #7e22ce; color:#d8b4fe; border-radius:6px; font-weight:bold; font-size:11px;">#${idx + 1}</span>
                </td>
                <td style="padding:12px 10px; color:white;">
                    <div style="font-weight:bold; font-size:14px; margin-bottom:2px;">${nomeItem}</div>
                    ${(nomeProd !== nomeItem && nomeProd) ? `<div style="font-size:12px; color:#888;">${nomeProd}</div>` : ''}
                </td>
                <td style="text-align:center; color:#ccc;">${prod.marca || "-"}</td>
                <td style="text-align:center; color:#ccc;">${qtd}</td>`;

        respostas.forEach(r => {
            const pItem = (r.itens || []).find(it => (it.produto === nomeProd) || (it.nome === nomeProd) || (it.produto === nomeItem));
            const valor = pItem ? (Number(pItem.preco) || Number(pItem.valor) || 0) : 0;
            const rankIndex = precosRow.findIndex(x => x.email === r.email);

            let badge = "";
            let textColor = "#fff";

            if (valor > 0) {
                const baseStyle = `width:26px; height:26px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-weight:800; font-size:11px; margin-right:10px; background:transparent;`;
                if (rankIndex === 0) { textColor = "#10b981"; badge = `<div style="${baseStyle} border:2px solid #10b981; color:#10b981;">1º</div>`; }
                else if (rankIndex === 1) { textColor = "#fbbf24"; badge = `<div style="${baseStyle} border:2px solid #fbbf24; color:#fbbf24;">2º</div>`; }
                else if (rankIndex === 2) { textColor = "#ef4444"; badge = `<div style="${baseStyle} border:2px solid #ef4444; color:#ef4444;">3º</div>`; }
            }

            html += `<td style="text-align:center; padding:12px;">`;
            if (valor > 0) {
                html += `<div style="display:flex; align-items:center; justify-content:center;">${badge}<span style="color:${textColor}; font-weight:800; font-size:15px;">R$ ${valor.toFixed(2)}</span></div>`;
            } else { html += `<span style="color:#333;">-</span>`; }
            html += `</td>`;
        });

        const keyItem = `item_${idx}`;
        let emailEscolhido = window.decisoesAnalise?.[cotacao.numero || cotacao.id]?.[keyItem];
        if (!emailEscolhido && melhorPreco) {
            emailEscolhido = melhorPreco.email;
            if (!window.decisoesAnalise) window.decisoesAnalise = {};
            if (!window.decisoesAnalise[cotacao.numero || cotacao.id]) window.decisoesAnalise[cotacao.numero || cotacao.id] = {};
            window.decisoesAnalise[cotacao.numero || cotacao.id][keyItem] = emailEscolhido;
        }

        let fornEscolhidoObj = respostas.find(r => normalizarEmail(r.email) === normalizarEmail(emailEscolhido));
        let nomeEscolhido = fornEscolhidoObj ? getNomeExibicao(fornEscolhidoObj.email, fornEscolhidoObj.fornecedor) : "Selecione";
        const labelId = `label-escolhido-${idx}`;

        html += `<td style="text-align:center; padding:12px;">
                 <div style="background:#000; border:1px solid #10b981; padding:10px 14px; border-radius:8px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; min-width:180px; position:relative;">
                    <div style="display:flex; align-items:center; gap:10px; color:#10b981; font-weight:800;">
                       <i class="fa-solid fa-trophy" style="color:#fbbf24; font-size:16px;"></i> 
                       <span id="${labelId}">${nomeEscolhido}</span>
                    </div>
                    ${(isAnalise && cotacao.status !== "aprovacao") ? `
                      <select onchange="atualizarDecisaoV3('${cotacao.numero || cotacao.id}', '${idx}', this.value, '${idx}')" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;">
                          ${precosRow.map(p => {
            const n = getNomeExibicao(p.email, p.fornecedor);
            return `<option value="${p.email}" data-nome="${n}" ${normalizarEmail(p.email) === normalizarEmail(emailEscolhido) ? 'selected' : ''}>${n} - R$ ${p.val.toFixed(2)}</option>`;
        }).join('')}
                      </select>
                      <i class="fa-solid fa-chevron-down" style="color:#10b981; font-size:11px;"></i>` : ''}
                 </div>
               </td>`;
        html += `</tr>`;
    });

    html += `</tbody></table>`;

    // 🏆 STATUS (Se for override/accordion, adiciona aqui no final do HTML)
    if (containerOverride && textoStatus) {
        html += `<div style="text-align:center; font-size:16px; font-weight:bold; margin:20px 0; color:#fbbf24;">${textoStatus}</div>`;
    }

    // BOTÕES DE AÇÃO
    const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado")) || {};
    const isAprovador = (usuarioLogado.tipo === "aprovador" || usuarioLogado.tipo === "administrador");

    if (isAnalise) {
        html += `<div class="botoes-acao-container" style="margin-top:30px; display:flex; gap:10px; flex-direction: row; justify-content: center; align-items: center; flex-wrap: nowrap; width: 100%; padding: 10px 0;">`;

        if (cotacao.status === "aprovacao") {
            // No status de aprovação, não mostramos botões de ação na matriz de análise.
            // O usuário apenas acompanha o status.
            html += `<!-- Acompanhamento: Sem botões de ação neste status -->`;
        } else if (cotacao.status !== "aprovacao") {
            // --- BOTÕES DE ANÁLISE (Comprador) ---
            if (cotacao.motivoRejeicao) {
                html += `<button onclick="toggleMotivoRejeicao()" style="flex:1; width:auto; min-width:150px; background:#661155; color:#fff; border:none; padding:12px 8px; border-radius:8px; cursor:pointer; font-weight:800; font-size:10px; display:flex; align-items:center; justify-content:center; gap:5px; box-shadow:0 3px 0 #4a0c3e; text-transform:uppercase;"><i class="fa-solid fa-file-invoice"></i> Ver motivo da rejeição</button>`;
            }
            html += `<button onclick="visualizarDocumentos('${cotacao.numero || cotacao.id}')" style="flex:1; width:auto; min-width:150px; background:#3ab9b6; color:#fff; border:none; padding:12px 8px; border-radius:8px; cursor:pointer; font-weight:800; font-size:10px; display:flex; align-items:center; justify-content:center; gap:5px; box-shadow:0 3px 0 #2a8f8c; text-transform:uppercase;"><i class="fa-solid fa-folder-open"></i> Ver Todos os Anexos</button>`;
            html += `<button onclick="excluirCotacao('${cotacao.numero || cotacao.id}')" style="flex:1; width:auto; min-width:140px; background:#ef4444; color:white; border:none; padding:12px 8px; border-radius:8px; cursor:pointer; font-weight:800; font-size:10px; display:flex; align-items:center; justify-content:center; gap:5px; box-shadow:0 3px 0 #b91c1c; text-transform:uppercase;"><i class="fa-solid fa-trash"></i> Excluir Cotação</button>`;
            html += `<button onclick="enviarParaAprovacao()" style="flex:1.2; width:auto; min-width:160px; background:#661155; color:white; border:none; padding:12px 8px; border-radius:8px; cursor:pointer; font-weight:800; font-size:10px; display:flex; align-items:center; justify-content:center; gap:5px; box-shadow:0 3px 0 #4a0c3e; text-transform:uppercase;"><i class="fa-solid fa-paper-plane"></i> Enviar para aprovação</button>`;
        }
        html += `</div>`;
    }

    container.innerHTML = html;
}

// Exportação Global
window.renderizarTabelaAnalise = renderizarTabelaAnalise;

// 🗑️ Lógica para Excluir Cotação (OTIMISTA E COM BLACKLIST)
window.excluirCotacao = async function (id) {
    if (!confirm("⚠️ ATENÇÃO: Tem certeza que deseja EXCLUIR permanentemente esta cotação?\n\nEssa ação apagará todos os itens e respostas vinculadas em seu navegador IMEDIATAMENTE.")) {
        return;
    }

    try {
        const idStr = String(id);

        // 🛡️ 1. ADICIONA À BLACKLIST LOCAL IMEDIATAMENTE
        // Isso garante que mesmo que o Firestore mande a cotação de volta (cache/quota),
        // o navegador vai ignorá-la.
        let blacklist = JSON.parse(localStorage.getItem("cotacoes_deletadas_local")) || [];
        if (!blacklist.includes(idStr)) {
            blacklist.push(idStr);
            localStorage.setItem("cotacoes_deletadas_local", JSON.stringify(blacklist));
        }

        // 🔥 2. LIMPEZA LOCAL IMEDIATA (OTIMISTA)
        let cotacoes = JSON.parse(localStorage.getItem("cotacoes")) || [];
        const cotacaoAlvo = cotacoes.find(c => String(c.numero) === idStr || String(c.id) === idStr);
        const statusAnterior = cotacaoAlvo ? cotacaoAlvo.status : 'aberta';

        const novaLista = cotacoes.filter(c => String(c.numero) !== idStr && String(c.id) !== idStr);
        localStorage.setItem("cotacoes", JSON.stringify(novaLista));

        // Limpeza de Respostas (Várias chaves possíveis)
        const keysParaRemover = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const match = key.startsWith(`resposta_${idStr}_`) ||
                key.startsWith(`resposta_${idStr} _`) ||
                key.startsWith(`res_${idStr}_`) ||
                key.startsWith(`res_${idStr} _`);
            if (match) keysParaRemover.push(key);
        }
        keysParaRemover.forEach(k => localStorage.removeItem(k));

        if (window.decisoesAnalise && window.decisoesAnalise[idStr]) {
            delete window.decisoesAnalise[idStr];
            localStorage.setItem('decisoesAnalise', JSON.stringify(window.decisoesAnalise));
        }

        // 🔄 3. ATUALIZAÇÃO DA UI IMEDIATA
        const modal = document.getElementById('modalAnaliseCotacao');
        if (modal) modal.style.display = "none";

        if (typeof toggleListaRespondidas === 'function') {
            const abaAlvo = statusAnterior === 'aberta' ? 'publicadas' : 'analise';
            console.log(`🔄 UI Atualizada otimisticamente na aba: ${abaAlvo}`);
            toggleListaRespondidas(abaAlvo, true); // Force refresh
        }

        alert("✅ Cotação removida localmente com sucesso!");

        // ☁️ 4. EXCLUSÃO EM SEGUNDO PLANO (FIRESTORE)
        if (typeof db !== "undefined") {
            const docId = idStr;
            console.log(`☁️ Tentando remover ${docId} do Firestore em background...`);
            db.collection("cotacoes").doc(docId).delete()
                .then(() => console.log(`✅ Firestore: Cotação ${docId} removida.`))
                .catch(fsError => console.warn("⚠️ Firestore: Falha na exclusão (Quota?), mas o item permanecerá oculto localmente.", fsError));
        }

    } catch (e) {
        console.error("Erro ao excluir cotação:", e);
        alert("Ocorreu um erro ao processar a exclusão local: " + e.message);
    }
};

// 🔄 Lógica para Reabrir Cotação
window.reabrirCotacao = async function (id) {
    if (!confirm("⚠️ Deseja REABRIR esta cotação?\n\nIsso estenderá o prazo de fechamento em 3 dias para tentar atrair novos fornecedores.")) {
        return;
    }

    try {
        let cotacoes = JSON.parse(localStorage.getItem("cotacoes")) || [];
        const index = cotacoes.findIndex(c => String(c.numero) === String(id) || String(c.id) === String(id));

        if (index === -1) {
            alert("Cotação não encontrada.");
            return;
        }

        const agora = new Date();
        agora.setDate(agora.getDate() + 3);

        const cot = cotacoes[index];
        cot.status = 'aberta';
        cot.prazoEncerrado = false;
        cot.dataFechamento = agora.toLocaleString();

        localStorage.setItem("cotacoes", JSON.stringify(cotacoes));

        // 🔥 SINCRONIZAÇÃO CLOUD: Atualiza no Firestore se possível
        if (typeof db !== "undefined") {
            try {
                const docId = String(cot.numero || cot.id);
                await db.collection("cotacoes").doc(docId).update({
                    status: 'aberta',
                    prazoEncerrado: false,
                    dataFechamento: cot.dataFechamento
                });
                console.log(`✅ Cotação ${docId} reaberta no Firestore`);
            } catch (fsError) {
                console.warn("⚠️ Falha ao atualizar Firestore em reabrirCotacao:", fsError);
            }
        }

        // ☁️ SYNC RTDB (CRÍTICO PARA REABERTURA)
        if (typeof rtdb !== "undefined") {
            rtdb.ref("cotacoes/" + cot.numero).update({
                status: 'aberta',
                prazoEncerrado: false,
                dataFechamento: cot.dataFechamento
            }).then(() => console.log("☁️ Reabertura sincronizada no RTDB."))
                .catch(e => console.error("❌ Erro sync reabertura:", e));
        }

        alert("✅ Cotação reaberta com sucesso! O prazo foi estendido em 3 dias.");

        if (typeof toggleListaRespondidas === 'function') {
            toggleListaRespondidas('publicadas', true); // Force refresh
        } else {
            window.location.reload();
        }

    } catch (e) {
        console.error(e);
        alert("Erro ao reabrir cotação: " + e.message);
    }
};

/* ======================================================
   ✏️ ATUALIZAÇÃO MANUAL DE VENCEDOR (V3 - Index Based)
====================================================== */
window.atualizarDecisaoV3 = function (numeroCotacao, itemIndex, emailFornecedor, labelIndex) {
    console.log(`✏️ Decisão Manual (Index): ${numeroCotacao} | Item #${itemIndex} -> ${emailFornecedor}`);

    // 1. Carrega decisões atuais
    let decisoes = JSON.parse(localStorage.getItem('decisoesAnalise')) || {};
    if (!decisoes[numeroCotacao]) decisoes[numeroCotacao] = {};

    // 2. Salva usando a chave por INDEX (item_0, item_1...)
    const keyItem = `item_${itemIndex}`;
    decisoes[numeroCotacao][keyItem] = emailFornecedor;
    localStorage.setItem('decisoesAnalise', JSON.stringify(decisoes));

    // Atualiza memória
    if (!window.decisoesAnalise) window.decisoesAnalise = {};
    window.decisoesAnalise = decisoes;

    // 3. Atualiza UI imediatamente
    const labelId = `label-escolhido-${labelIndex}`; // labelIndex deve ser igual ao itemIndex aqui, mas mantive separado por segurança
    const labelEl = document.getElementById(labelId);

    if (labelEl) {
        // Tenta achar o nome do fornecedor no select oculto
        const selectEl = labelEl.parentElement.parentElement.querySelector('select');
        let novoNome = "Manual";

        if (selectEl) {
            const option = Array.from(selectEl.options).find(o => o.value === emailFornecedor);
            if (option) {
                novoNome = option.getAttribute('data-nome') || option.innerText.split(' - R$')[0];
            }
        }

        labelEl.innerText = novoNome;

        // Feedback visual
        const container = labelEl.closest('div');
        if (container) {
            container.style.borderColor = "#10b981";
            container.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
            setTimeout(() => {
                container.style.backgroundColor = "#000";
            }, 500);
        }
    }
};

/* ======================================================
   🚀 ENVIAR PARA APROVAÇÃO (COM DECISÕES MANUAIS)
====================================================== */
window.enviarParaAprovacao = async function () {
    // Tenta pegar o número da cotação do título ou do contexto
    let numeroCotacao = null;

    // Tenta IDs conhecidos do H1
    const titleEl = document.getElementById("analiseNumero") || document.getElementById("cotacaoNumero");

    if (titleEl) {
        numeroCotacao = titleEl.innerText.replace("Cotação: ", "").trim();
    }

    if (!numeroCotacao) {
        // Fallback: Tenta pegar do atributo do modal se houver
        const modal = document.getElementById("modalAnaliseCotacao");
        if (modal && modal.getAttribute("data-cotacao")) {
            numeroCotacao = modal.getAttribute("data-cotacao");
        }
    }

    if (!numeroCotacao) return alert("Erro ao identificar cotação. Tente reabrir a análise.");

    if (!confirm("Confirma o envio desta cotação para aprovação final?")) return;

    // 1. Carrega dados
    let cotacoes = JSON.parse(localStorage.getItem("cotacoes")) || [];
    const index = cotacoes.findIndex(c => c.numero === numeroCotacao || c.id === numeroCotacao);

    if (index === -1) return alert("Cotação não encontrada na base.");
    let cotacao = cotacoes[index];

    const decisoes = JSON.parse(localStorage.getItem("decisoesAnalise")) || {};
    const decisoesCotacao = decisoes[numeroCotacao] || {};

    // 2. Carrega respostas (Varredura no LocalStorage)
    let respostas = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Match flexível para chaves de resposta
        if (key.includes(`res_${cotacao.id}_`) || key.includes(`resposta_${cotacao.numero}_`) || key.includes(`res_${cotacao.numero}_`)) {
            respostas.push(JSON.parse(localStorage.getItem(key)));
        }
    }

    // 3. Monta a lista de ADJUDICAÇÃO (Vencedores)
    const adjudicacao = [];
    const norm = (s) => (s || "").toLowerCase().trim();

    cotacao.produtos.forEach((prod, idx) => {
        let vencedorEmail = null;
        let vencedorNome = "Sem Oferta";
        let menorPreco = Infinity;
        let precoFinal = 0;

        // CHAVE POR INDEX (Mais Robusto)
        const keyItem = `item_${idx}`;

        // A. Verifica decisão manual primeiro (Index ou Nome - retrocompatibilidade)
        if (decisoesCotacao[keyItem]) {
            vencedorEmail = norm(decisoesCotacao[keyItem]);
        } else if (decisoesCotacao[prod.nome]) {
            vencedorEmail = norm(decisoesCotacao[prod.nome]); // Fallback legado
        }

        // Se achou manual...
        if (vencedorEmail) {
            // Busca dados do vencedor manual
            const resp = respostas.find(r => norm(r.email || r.emailFornecedor) === vencedorEmail);

            if (resp) {
                vencedorNome = resp.fornecedor || resp.fornecedorNome;
                // Busca o item específico na resposta
                const itemResp = (resp.itens || []).find(i =>
                    norm(i.produto || i.descricao) === norm(prod.nome)
                );

                if (itemResp) {
                    precoFinal = parseFloat(itemResp.preco || itemResp.precoUnitario || itemResp.valor || 0);
                }
            } else {
                vencedorNome = "Manual (Não encontrado)";
            }
        }
        // B. Se não tiver manual, calcula o menor preço (Automático)
        else {
            respostas.forEach(r => {
                const item = (r.itens || []).find(i => norm(i.produto || i.descricao) === norm(prod.nome));

                if (item) {
                    const val = parseFloat(item.preco || item.precoUnitario || item.valor || 0);
                    if (val > 0 && val < menorPreco) {
                        menorPreco = val;
                        vencedorEmail = norm(r.email || r.emailFornecedor);
                        vencedorNome = r.fornecedor || r.fornecedorNome;
                        precoFinal = val;
                    }
                }
            });
        }

        if (vencedorEmail) {
            adjudicacao.push({
                produto: prod.nome,
                quantidade: prod.quantidade,
                fornecedor: vencedorNome,
                emailFornecedor: vencedorEmail,
                preco: precoFinal,
                total: precoFinal * prod.quantidade
            });
        }
    });

    // 4. Salva e Atualiza Status
    if (adjudicacao.length === 0) {
        return alert("⚠️ Nenhum vencedor identificado. Verifique se há respostas válidas antes de aprovar.");
    }

    // Salva na cotação
    cotacao.adjudicacao = adjudicacao;
    cotacao.status = "aprovacao"; // Avança workflow

    cotacoes[index] = cotacao;
    localStorage.setItem("cotacoes", JSON.stringify(cotacoes));

    // 🔥 SYNC FIRESTORE (AWAIT OBRIGATÓRIO)
    if (typeof db !== "undefined") {
        const docId = String(cotacao.numero || cotacao.id);

        // Bloqueia UI
        const btnEnviar = document.querySelector("#btnEnviarAprovacao"); // Se existir
        if (btnEnviar) { btnEnviar.disabled = true; btnEnviar.innerText = "☁️ Salvando na Nuvem..."; }

        try {
            await db.collection("cotacoes").doc(docId).update({
                status: "aprovacao",
                adjudicacao: adjudicacao,
                decisoes: decisoesCotacao || {}
            });
            console.log("✅ Cotação salva na nuvem com status 'aprovacao'.");
        } catch (err) {
            console.error("❌ Erro critico ao salvar na nuvem:", err);
            alert("Erro ao salvar na nuvem. Verifique sua conexão e tente novamente.");
            if (btnEnviar) { btnEnviar.disabled = false; btnEnviar.innerText = "Tentar Novamente"; }
            return; // Aborta para não dar falso positivo
        }
    }

    // ☁️ SYNC RTDB (CRÍTICO)
    if (typeof rtdb !== "undefined") {
        rtdb.ref("cotacoes/" + cotacao.numero).update({
            status: "aprovacao",
            adjudicacao: adjudicacao,
            decisoes: decisoesCotacao || {}
        }).then(() => console.log("☁️ Aprovação sincronizada no RTDB."))
            .catch(e => console.error("❌ Erro sync aprovacao analise:", e));
    }

    alert(`✅ Cotação enviada para aprovação com ${adjudicacao.length} itens adjudicados!`);

    // Atualiza UI sem recarregar (evita logout)
    const modal = document.getElementById('modalAnaliseCotacao');
    if (modal) modal.style.display = "none";
    document.body.style.overflow = "auto";

    if (typeof carregarCotacoes === 'function') carregarCotacoes('analise');

    if (typeof toggleListaRespondidas === 'function') {
        toggleListaRespondidas('aprovacao');
    }
};

