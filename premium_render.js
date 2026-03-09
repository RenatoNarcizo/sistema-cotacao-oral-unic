// 🚀 PREMIUM RENDER JS CARREGADO - V_FINAL_POLISHED_V2
function renderizarTabelaAnalise(textoOuId, containerOverride = null) {
    console.log("🚀 PREMIUM RENDER JS EXECUTANDO...");
    const container = containerOverride || document.getElementById('analiseConteudo');

    if (!container) {
        console.error("Erro: Container de renderização não encontrado.");
        return;
    }

    // 🔍 Helpers Locais
    const normalizarEmail = (e) => (e || "").toLowerCase().trim();
    const normalizarTexto = (t) => (t || "").toLowerCase().trim();

    const cotacoes = JSON.parse(localStorage.getItem("cotacoes")) || [];
    let cotacao = cotacoes.find(c => c.id === textoOuId) || cotacoes.find(c => c.numero === textoOuId);

    if (!cotacao) {
        container.innerHTML = "<p>Cotação não encontrada.</p>";
        return;
    }

    // 🔒 VINCULA ID AO MODAL
    if (!containerOverride) {
        const modal = document.getElementById("modalAnaliseCotacao");
        if (modal) modal.setAttribute("data-cotacao", cotacao.numero || cotacao.id);
    }

    /* ==========================
       📌 CABEÇALHO & TIMER
    ========================== */
    if (!containerOverride) {
        const elNum = document.getElementById("analiseNumero");
        if (elNum) {
            let numDisplay = cotacao.numero || cotacao.id || "";
            if (numDisplay && !String(numDisplay).startsWith("COT-")) numDisplay = "COT-" + numDisplay;
            elNum.textContent = numDisplay;
        }

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
                    if (timerDisplay) { timerDisplay.innerText = "FECHAMENTO"; timerDisplay.style.color = "#ff4444"; }
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

        if (document.getElementById("analiseDescricao")) document.getElementById("analiseDescricao").textContent = cotacao.descricao || "— Sem descrição";
        if (document.getElementById("analiseDataCriacao")) document.getElementById("analiseDataCriacao").textContent = cotacao.dataCriacao || "-";
        if (document.getElementById("analiseDataFechamento")) document.getElementById("analiseDataFechamento").textContent = cotacao.dataFechamento || "-";
    }

    const isAnalise = ["respondida", "reanalise", "analise", "aberta", "aprovacao"].includes(cotacao.status);
    let textoStatus = "";
    if (cotacao.status === "aprovacao") textoStatus = "⏳ Aguardando Aprovação";
    else if (cotacao.status === "fechada") {
        textoStatus = "🔒 Fechada (Pedido Gerado)";
        window.cotacaoAtualPDF = cotacao;
    }

    const statusDiv = document.getElementById("statusAprovacao");
    if (!containerOverride && statusDiv) statusDiv.innerHTML = textoStatus;

    /* ==========================
       📊 DADOS & RESPOSTAS
    ========================== */
    const listaFornGlobal = JSON.parse(localStorage.getItem("fornecedores")) || [];
    const getNomeExibicao = (email, nomeOriginal) => {
        const f = listaFornGlobal.find(x => normalizarEmail(x.email) === normalizarEmail(email));
        return f ? f.nome : nomeOriginal;
    };

    let respostas = Array.isArray(cotacao.respostasFornecedores) ? [...cotacao.respostasFornecedores] : [];
    if (respostas.length === 0) {
        container.innerHTML = "<p style='color:#ccc; padding:20px;'>Nenhuma resposta recebida para esta cotação ainda.</p>";
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
                       <i id="iconExpandirGlobal" class="fa-solid fa-expand" style="cursor:pointer; font-size:14px; color:#3ab9b6;" onclick="toggleExpansaoColunas()" title="Expandir Visualização"></i>
                   </th>
                   <th style="width:45px; text-align:center;" class="col-idx">#</th>
                   <th class="col-fixa" style="text-align:left; padding-left:10px;">Item</th>
                   <th class="col-fixa-2" style="text-align:center;">Marca</th>
                   <th class="col-fixa-3" style="text-align:center;">Qtd</th>`;

    respostas.forEach(r => {
        const temAnexo = r.anexo || (Array.isArray(r.anexos) && r.anexos.length > 0) || r.base64;
        html += `<th style="text-align:center; min-width:120px;">
                   <div style="font-size:13px; font-weight:bold; display:flex; align-items:center; justify-content:center; gap:5px;">
                       ${temAnexo ? `<i class="fa-solid fa-paperclip" style="color:#10b981; cursor:pointer;" title="Ver Anexos deste Fornecedor" onclick="visualizarDocumentos('${cotacao.numero}', '${r.email}')"></i>` : ''}
                       ${getNomeExibicao(r.email, r.fornecedor)}
                   </div>
                 </th>`;
    });

    html += `<th style="text-align:center; color:#10b981; min-width:180px; font-weight:bold;">🏆 VENCEDOR</th></tr></thead><tbody style="background:#000;">`;

    const produtos = cotacao.produtos || cotacao.itens || [];

    // 🚀 INICIALIZA TOTAIS PARA O RODAPÉ
    const totaisBrutos = new Array(respostas.length).fill(0);
    const valorGanhando = new Array(respostas.length).fill(0);
    let totalMenorPrecoGeral = 0;

    produtos.forEach((prod, pIdx) => {
        const nomeItem = prod.nome || prod.descricao || ("Item " + (pIdx + 1));
        const nomeProd = prod.produto || nomeItem;
        const qtd = Number(prod.quantidade || 0);

        let precosRow = [];
        respostas.forEach((r, rIdx) => {
            const pItem = (r.itens || []).find(it =>
                normalizarTexto(it.produto) === normalizarTexto(nomeProd) ||
                normalizarTexto(it.nome) === normalizarTexto(nomeProd) ||
                normalizarTexto(it.produto) === normalizarTexto(nomeItem) ||
                normalizarTexto(it.nome) === normalizarTexto(nomeItem)
            );
            if (pItem) {
                const valor = Number(pItem.preco || pItem.valor || 0);
                if (valor > 0) {
                    precosRow.push({ email: r.email, val: valor, rIdx: rIdx });
                    totaisBrutos[rIdx] += (valor * qtd);
                }
            }
        });

        precosRow.sort((a, b) => a.val - b.val);
        if (precosRow.length > 0) totalMenorPrecoGeral += (precosRow[0].val * qtd);

        const keyItem = `item_${pIdx}`;
        let emailEscolhido = (window.decisoesAnalise?.[cotacao.numero || cotacao.id]?.[keyItem]) || (cotacao.decisoes?.[keyItem]);
        if (!emailEscolhido && precosRow.length > 0) {
            emailEscolhido = precosRow[0].email;
            if (!window.decisoesAnalise) window.decisoesAnalise = {};
            if (!window.decisoesAnalise[cotacao.numero || cotacao.id]) window.decisoesAnalise[cotacao.numero || cotacao.id] = {};
            window.decisoesAnalise[cotacao.numero || cotacao.id][keyItem] = emailEscolhido;
        }

        // Soma o valor para o fornecedor que está ganhando
        if (emailEscolhido) {
            const rIdxVenc = respostas.findIndex(r => normalizarEmail(r.email) === normalizarEmail(emailEscolhido));
            if (rIdxVenc !== -1) {
                const precoVenc = precosRow.find(p => normalizarEmail(p.email) === normalizarEmail(emailEscolhido))?.val || 0;
                valorGanhando[rIdxVenc] += (precoVenc * qtd);
            }
        }

        html += `<tr style="border-bottom:1px solid #222;">
                <td style="text-align:center; padding:10px;"></td>
                <td style="text-align:center;"><span style="display:inline-block; padding:4px 8px; background:#000; border:1px solid #7e22ce; color:#d8b4fe; border-radius:6px; font-weight:bold; font-size:11px;">#${pIdx + 1}</span></td>
                <td style="padding:12px 10px; color:white;"><div style="font-weight:bold; font-size:14px; margin-bottom:2px;">${nomeItem}</div>${(nomeProd !== nomeItem) ? `<div style="font-size:12px; color:#888;">${nomeProd}</div>` : ''}</td>
                <td style="text-align:center; color:#ccc;">${prod.marca || "-"}</td>
                <td style="text-align:center; color:#ccc;">${qtd}</td>`;

        respostas.forEach(r => {
            const pItem = (r.itens || []).find(it =>
                normalizarTexto(it.produto) === normalizarTexto(nomeProd) ||
                normalizarTexto(it.nome) === normalizarTexto(nomeProd) ||
                normalizarTexto(it.produto) === normalizarTexto(nomeItem) ||
                normalizarTexto(it.nome) === normalizarTexto(nomeItem)
            );
            const valor = pItem ? (Number(pItem.preco) || Number(pItem.valor) || 0) : 0;
            const rank = precosRow.findIndex(x => x.email === r.email);

            let badge = "";
            let color = "#fff";
            if (valor > 0) {
                const style = `width:24px; height:24px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-weight:800; font-size:10px; margin-right:8px; border:2px solid;`;
                if (rank === 0) { color = "#10b981"; badge = `<div style="${style} border-color:#10b981; color:#10b981;">1º</div>`; }
                else if (rank === 1) { color = "#fbbf24"; badge = `<div style="${style} border-color:#fbbf24; color:#fbbf24;">2º</div>`; }
                else if (rank === 2) { color = "#ef4444"; badge = `<div style="${style} border-color:#ef4444; color:#ef4444;">3º</div>`; }
            }

            html += `<td style="text-align:center; padding:12px;">${valor > 0 ? `<div style="display:flex; align-items:center; justify-content:center;">${badge}<span style="color:${color}; font-weight:800; font-size:15px;">R$ ${valor.toFixed(2)}</span></div>` : '<span style="color:#333;">-</span>'}</td>`;
        });

        const fornEscolhido = respostas.find(r => normalizarEmail(r.email) === normalizarEmail(emailEscolhido));
        const nomeEscolhido = fornEscolhido ? getNomeExibicao(fornEscolhido.email, fornEscolhido.fornecedor) : "Selecione";

        html += `<td style="text-align:center; padding:12px;">
                <div style="background:#000; border:1px solid #10b981; padding:10px 14px; border-radius:8px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; min-width:180px; position:relative;">
                   <div style="display:flex; align-items:center; gap:10px; color:#10b981; font-weight:800;"><i class="fa-solid fa-trophy" style="color:#fbbf24; font-size:16px;"></i> <span id="label-escolhido-${pIdx}">${nomeEscolhido}</span></div>
                   ${(isAnalise && cotacao.status !== "aprovacao") ? `<select onchange="atualizarDecisaoV3('${cotacao.numero || cotacao.id}', '${pIdx}', this.value, '${pIdx}')" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;">
                         ${precosRow.map(p => {
            const n = getNomeExibicao(p.email, "");
            return `<option value="${p.email}" data-nome="${n}" ${normalizarEmail(p.email) === normalizarEmail(emailEscolhido) ? 'selected' : ''}>${n} - R$ ${p.val.toFixed(2)}</option>`;
        }).join('')}
                     </select><i class="fa-solid fa-chevron-down" style="color:#10b981; font-size:11px;"></i>` : ''}
                </div>
              </td></tr>`;
    });

    // 🚀 RODAPÉ (TOTAIS)
    html += `</tbody>
        <tfoot style="background: #0a0a0a; border-top: 2px solid #661155; font-weight: bold;">
            <tr style="height: 50px; border-bottom: 1px solid #222;">
                <td colspan="5" style="text-align: right; padding-right: 20px; color: #aaa; font-size: 13px; text-transform: uppercase;"><i class="fa-solid fa-calculator" style="margin-right: 8px;"></i>Totais Brutos:</td>
                ${totaisBrutos.map(t => `<td style="text-align: center; color: #888; font-size: 14px;">R$ ${t.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>`).join('')}
                <td style="text-align: center; color: #555; background: rgba(255,255,255,0.02);">-</td>
            </tr>
            <tr style="height: 60px;">
                <td colspan="5" style="text-align: right; padding-right: 20px; color: #3ab9b6; font-size: 14px; text-transform: uppercase;"><i class="fa-solid fa-trophy" style="margin-right: 8px;"></i>Valor Ganhando:</td>
                ${valorGanhando.map(t => `<td style="text-align: center; color: #fff; font-size: 15px;"><div style="font-size:9px; color:#3ab9b6; font-weight:normal;">ESTÁ GANHANDO</div>R$ ${t.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>`).join('')}
                <td style="text-align: center; color: #00ff99; font-size: 16px; background: rgba(0,255,153,0.05); border-left: 1px solid #333;">
                    <div style="font-size:9px; color:#10b981; font-weight:normal;">VALOR TOTAL DA COMPRA (1ºs)</div>R$ ${totalMenorPrecoGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
            </tr>
        </tfoot></table>`;

    if (containerOverride && textoStatus) html += `<div style="text-align:center; font-size:16px; font-weight:bold; margin:20px 0; color:#fbbf24;">${textoStatus}</div>`;

    if (isAnalise && cotacao.status !== "aprovacao") {
        html += `<div class="botoes-acao-container" style="margin-top:30px; display:flex; gap:10px; justify-content: center; width: 100%; padding: 10px 0;">
            ${cotacao.motivoRejeicao ? `<button onclick="toggleMotivoRejeicao()" style="flex:1; background:#661155; color:#fff; border:none; padding:12px 8px; border-radius:8px; cursor:pointer; font-weight:800; font-size:10px; text-transform:uppercase;"><i class="fa-solid fa-file-invoice"></i> Motivo Rejeição</button>` : ''}
            <button onclick="visualizarDocumentos('${cotacao.numero || cotacao.id}')" style="flex:1; background:#3ab9b6; color:#fff; border:none; padding:12px 8px; border-radius:8px; cursor:pointer; font-weight:800; font-size:10px; text-transform:uppercase;"><i class="fa-solid fa-folder-open"></i> Anexos</button>
            <button onclick="excluirCotacao('${cotacao.numero || cotacao.id}')" style="flex:1; background:#ef4444; color:white; border:none; padding:12px 8px; border-radius:8px; cursor:pointer; font-weight:800; font-size:10px; text-transform:uppercase;"><i class="fa-solid fa-trash"></i> Excluir</button>
            <button onclick="enviarParaAprovacao()" style="flex:1.2; background:#661155; color:white; border:none; padding:12px 8px; border-radius:8px; cursor:pointer; font-weight:800; font-size:10px; text-transform:uppercase;"><i class="fa-solid fa-paper-plane"></i> Enviar Aprovação</button>
        </div>`;
    }

    container.innerHTML = html;
}

// 🗑️ EXCLUIR COTAÇÃO
window.excluirCotacao = async function (id) {
    if (!confirm("⚠️ Confirmar exclusão permanente?")) return;
    try {
        const idStr = String(id);
        let blacklist = JSON.parse(localStorage.getItem("cotacoes_deletadas_local")) || [];
        if (!blacklist.includes(idStr)) { blacklist.push(idStr); localStorage.setItem("cotacoes_deletadas_local", JSON.stringify(blacklist)); }

        let cotacoes = JSON.parse(localStorage.getItem("cotacoes")) || [];
        const cotAlvo = cotacoes.find(c => String(c.numero) === idStr || String(c.id) === idStr);
        const statusAnt = cotAlvo ? cotAlvo.status : 'aberta';
        localStorage.setItem("cotacoes", JSON.stringify(cotacoes.filter(c => String(c.numero) !== idStr && String(c.id) !== idStr)));

        if (window.decisoesAnalise?.[idStr]) { delete window.decisoesAnalise[idStr]; localStorage.setItem('decisoesAnalise', JSON.stringify(window.decisoesAnalise)); }

        const modal = document.getElementById('modalAnaliseCotacao');
        if (modal) modal.style.display = "none";
        if (typeof toggleListaRespondidas === 'function') toggleListaRespondidas(statusAnt === 'aberta' ? 'publicadas' : 'analise', true);
        alert("✅ Excluída localmente.");
        if (typeof db !== "undefined") db.collection("cotacoes").doc(idStr).delete().catch(e => console.warn("Firestore sync erro", e));
    } catch (e) { alert("Erro: " + e.message); }
};

// ✏️ ATUALIZAÇÃO MANUAL
window.atualizarDecisaoV3 = function (numeroCotacao, itemIndex, emailFornecedor, labelIndex) {
    let decisoes = JSON.parse(localStorage.getItem('decisoesAnalise')) || {};
    if (!decisoes[numeroCotacao]) decisoes[numeroCotacao] = {};
    decisoes[numeroCotacao][`item_${itemIndex}`] = emailFornecedor;
    localStorage.setItem('decisoesAnalise', JSON.stringify(decisoes));
    window.decisoesAnalise = decisoes;
    renderizarTabelaAnalise(numeroCotacao); // Re-renderiza para atualizar totais
};

// 🚀 ENVIAR PARA APROVAÇÃO
window.enviarParaAprovacao = async function () {
    const modal = document.getElementById("modalAnaliseCotacao");
    const numeroCotacao = modal ? modal.getAttribute("data-cotacao") : null;
    if (!numeroCotacao) return alert("Erro ao identificar cotação.");
    if (!confirm("Enviar para aprovação?")) return;

    let cotacoes = JSON.parse(localStorage.getItem("cotacoes")) || [];
    const index = cotacoes.findIndex(c => c.numero === numeroCotacao || c.id === numeroCotacao);
    if (index === -1) return alert("Cotação não encontrada.");
    let cotacao = cotacoes[index];

    const decisoes = (JSON.parse(localStorage.getItem("decisoesAnalise")) || {})[numeroCotacao] || {};
    const adjudicacao = [];

    cotacao.produtos.forEach((prod, idx) => {
        const key = `item_${idx}`;
        const vencedorEmail = decisoes[key] || "";
        if (vencedorEmail) {
            const resp = (cotacao.respostasFornecedores || []).find(r => (r.email || "").toLowerCase() === vencedorEmail.toLowerCase());
            const itemResp = (resp?.itens || []).find(i => (i.produto || i.descricao || "").toLowerCase() === (prod.nome || "").toLowerCase());
            const preco = Number(itemResp?.preco || itemResp?.valor || 0);
            if (preco > 0) {
                adjudicacao.push({
                    produto: prod.nome, quantidade: prod.quantidade,
                    fornecedor: resp.fornecedor, emailFornecedor: vencedorEmail,
                    preco: preco, total: preco * prod.quantidade
                });
            }
        }
    });

    if (adjudicacao.length === 0) return alert("Nenhum vencedor válido.");
    cotacao.adjudicacao = adjudicacao;
    cotacao.status = "aprovacao";
    cotacao.decisoes = decisoes;
    cotacoes[index] = cotacao;
    localStorage.setItem("cotacoes", JSON.stringify(cotacoes));

    if (typeof db !== "undefined") {
        try {
            await db.collection("cotacoes").doc(String(numeroCotacao)).update({ status: "aprovacao", adjudicacao, decisoes });
        } catch (e) { console.error("Erro nuvem", e); }
    }
    alert("✅ Enviada!");
    if (modal) modal.style.display = "none";
    if (typeof toggleListaRespondidas === 'function') toggleListaRespondidas('aprovacao');
};

window.renderizarTabelaAnalise = renderizarTabelaAnalise;
