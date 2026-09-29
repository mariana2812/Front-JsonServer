const idUser = localStorage.getItem("idUser")
const campaignId = new URLSearchParams(location.search).get("id")
let campanha
let membros = []
let usuarios = []

function souMestre() {
    return campanha && String(campanha.masterId ?? campanha.mestreId) === idUser
}

function souParticipante() {
    return souMestre() || membros.some((item) => String(item.userId) === idUser)
}

async function iniciarCampanha() {
    campanha = await apiRequest("/campaigns/" + encodeURIComponent(campaignId))
    usuarios = await apiRequest("/users")
    membros = await apiRequest("/campaignMembers?campaignId=" + encodeURIComponent(campaignId))
    const mestre = usuarios.find((usuario) => String(usuario.id) === String(campanha.masterId ?? campanha.mestreId))
    document.getElementById("nome").textContent = campanha.nome
    const capa = document.getElementById("capaCampanha")
    capa.hidden = !campanha.capa
    if (campanha.capa) capa.src = campanha.capa
    else capa.removeAttribute("src")
    document.getElementById("sistema").textContent = campanha.sistema || campanha.sistemaNome
    document.getElementById("descricao").textContent = campanha.descricao
    document.getElementById("mestre").textContent = "Mestre: " + (mestre?.nome || mestre?.email || "Usuário")
    mostrarParticipantes()
    mostrarAcao()
    document.getElementById("mensagem").disabled = !souParticipante()
    document.getElementById("enviar").disabled = !souParticipante()
    await carregarMural()
}

function mostrarParticipantes() {
    const area = document.getElementById("participantes")
    area.replaceChildren()
    const ids = new Set([String(campanha.masterId ?? campanha.mestreId), ...membros.map((item) => String(item.userId))])
    usuarios
        .filter((usuario) => ids.has(String(usuario.id)))
        .forEach((usuario) => {
            const item = document.createElement("div")
            item.className = "item-lista"
            const avatar = document.createElement("img")
            avatar.className = "avatar"
            avatar.alt = ""
            avatar.src = usuario.avatar || criarAvatar(usuario.nome || usuario.email)
            const nome = document.createElement("a")
            nome.textContent = usuario.nome || usuario.email
            nome.href = "../perfil/index.html?id=" + encodeURIComponent(usuario.id)
            item.append(avatar, nome)
            area.appendChild(item)
        })
}

function mostrarAcao() {
    const area = document.getElementById("acao")
    area.replaceChildren()
    if (souMestre()) {
        area.textContent = "Você é o mestre"
        const botaoStatus = document.createElement("button")
        botaoStatus.type = "button"
        botaoStatus.className = "botao-secundario"
        const aberta = ["aberta", "open"].includes(campanha.status)
        botaoStatus.textContent = aberta ? "Fechar inscrições" : "Reabrir inscrições"
        botaoStatus.addEventListener("click", executarAcao(async () => {
            await apiRequest("/campaigns/" + encodeURIComponent(campaignId), {
                method: "PATCH",
                body: JSON.stringify({ status: aberta ? "fechada" : "aberta" })
            })
            await iniciarCampanha()
        }))
        area.appendChild(botaoStatus)
        const editar = document.createElement("button")
        editar.type = "button"
        editar.className = "botao"
        editar.textContent = "Editar campanha"
        editar.addEventListener("click", () => {
            document.getElementById("formEditarCampanha").reset()
            document.getElementById("editarNome").value = campanha.nome || ""
            document.getElementById("editarSistema").value = campanha.sistema || campanha.sistemaNome || ""
            document.getElementById("editarDescricao").value = campanha.descricao || ""
            document.getElementById("editarLimite").value = campanha.maxJogadores || 5
            document.getElementById("previaCapa").hidden = !campanha.capa
            if (campanha.capa) document.getElementById("previaCapa").src = campanha.capa
            document.getElementById("editarCampanha").hidden = false
            document.getElementById("editarNome").focus()
        })
        area.appendChild(editar)
        const excluir = document.createElement("button")
        excluir.type = "button"
        excluir.className = "botao-perigo"
        excluir.textContent = "Excluir campanha"
        excluir.addEventListener("click", executarAcao(async () => {
            const confirmar = await abrirModal({
                titulo: "Excluir campanha?",
                mensagem:
                    "A campanha, seus participantes e mensagens do mural serão removidos. Essa ação não pode ser desfeita.",
                confirmar: "Excluir campanha",
                perigo: true
            })
            if (!confirmar) return
            await excluirCampanha(campaignId)
            location.replace("../campanhas/index.html")
        }))
        area.appendChild(excluir)
        return
    }
    const membro = membros.find((item) => String(item.userId) === idUser)
    const botao = document.createElement("button")
    botao.className = "botao"
    botao.textContent = membro ? "Sair da campanha" : "Entrar na campanha"
    const jogadores = membros.filter((item) => String(item.userId) !== String(campanha.masterId ?? campanha.mestreId))
    if (!membro && !["aberta", "open"].includes(campanha.status)) {
        botao.textContent = "Inscrições fechadas"
        botao.disabled = true
    } else if (!membro && jogadores.length >= campanha.maxJogadores) {
        botao.textContent = "Campanha cheia"
        botao.disabled = true
    }
    botao.addEventListener("click", executarAcao(async () => {
        const atuais = await apiRequest("/campaignMembers?campaignId=" + encodeURIComponent(campaignId))
        const atual = atuais.find((item) => String(item.userId) === idUser)
        if (membro && atual) {
            await apiRequest("/campaignMembers/" + encodeURIComponent(atual.id), {
                method: "DELETE"
            })
        } else if (!membro && !atual) {
            const dados = await apiRequest("/campaigns/" + encodeURIComponent(campaignId))
            const jogadores = atuais.filter(
                (item) => String(item.userId) !== String(dados.masterId ?? dados.mestreId)
            )
            if (!["aberta", "open"].includes(dados.status)) throw new Error("A campanha está fechada.")
            if (jogadores.length >= dados.maxJogadores) throw new Error("A campanha está cheia.")
            await apiRequest("/campaignMembers", {
                method: "POST",
                body: JSON.stringify({ campaignId: campanha.id, userId: idUser })
            })
        }
        await iniciarCampanha()
    }))
    area.appendChild(botao)
}

async function carregarMural() {
    const posts = await apiRequest("/campaignPosts?campaignId=" + encodeURIComponent(campaignId))
    const area = document.getElementById("mural")
    area.replaceChildren()
    if (!posts.length) area.textContent = "Nenhuma mensagem nesta campanha."
    posts.reverse().forEach((post) => {
        const usuario = usuarios.find((item) => String(item.id) === String(post.userId))
        const item = document.createElement("div")
        item.className = "item-lista"
        const info = document.createElement("div")
        info.className = "item-info"
        const nome = document.createElement("strong")
        nome.textContent = usuario?.nome || usuario?.email || "Usuário"
        const texto = document.createElement("p")
        texto.textContent = post.conteudo
        info.append(nome, texto)
        item.appendChild(info)
        if (souMestre() || String(post.userId) === idUser) {
            const excluir = document.createElement("button")
            excluir.type = "button"
            excluir.className = "botao-perigo"
            excluir.textContent = "Excluir"
            excluir.addEventListener("click", executarAcao(async () => {
                if (
                    !(await abrirModal({
                        titulo: "Excluir mensagem?",
                        mensagem: "Esta mensagem será removida do mural.",
                        confirmar: "Excluir",
                        perigo: true
                    }))
                )
                    return
                await apiRequest("/campaignPosts/" + encodeURIComponent(post.id), {
                    method: "DELETE"
                })
                await carregarMural()
            }))
            item.appendChild(excluir)
        }
        area.appendChild(item)
    })
}

document.getElementById("enviar").addEventListener("click", executarAcao(async () => {
    const campo = document.getElementById("mensagem")
    const conteudo = campo.value.trim()
    if (!conteudo) return
    membros = await apiRequest("/campaignMembers?campaignId=" + encodeURIComponent(campaignId))
    if (!souParticipante()) throw new Error("Entre na campanha para publicar no mural.")
    await apiRequest("/campaignPosts", {
        method: "POST",
        body: JSON.stringify({
            campaignId: campanha.id,
            userId: idUser,
            conteudo,
            created_at: new Date().toISOString()
        })
    })
    campo.value = ""
    await carregarMural()
}))

document.getElementById("cancelarCampanha").addEventListener("click", () => {
    document.getElementById("editarCampanha").hidden = true
})
document.getElementById("editarCapa").addEventListener("change", executarAcao(async () => {
    const previa = document.getElementById("previaCapa")
    previa.hidden = true
    const capa = await lerImagem(document.getElementById("editarCapa").files[0])
    if (capa) {
        previa.src = capa
        previa.hidden = false
        document.getElementById("removerCapa").checked = false
    }
}))
document.getElementById("removerCapa").addEventListener("change", (event) => {
    if (event.target.checked) {
        document.getElementById("editarCapa").value = ""
        document.getElementById("previaCapa").hidden = true
    }
})
document.getElementById("formEditarCampanha").addEventListener("submit", executarAcao(async () => {
    const atual = await apiRequest("/campaigns/" + encodeURIComponent(campaignId))
    if (String(atual.masterId ?? atual.mestreId) !== idUser)
        throw new Error("Somente o mestre pode editar esta campanha.")
    const nome = document.getElementById("editarNome").value.trim()
    const sistema = document.getElementById("editarSistema").value.trim()
    const descricao = document.getElementById("editarDescricao").value.trim()
    const maxJogadores = Number(document.getElementById("editarLimite").value)
    if (!nome || !sistema || !descricao) throw new Error("Preencha todos os campos.")
    const atuais = await apiRequest("/campaignMembers?campaignId=" + encodeURIComponent(campaignId))
    const quantidade = new Set(
        atuais.filter((item) => String(item.userId) !== idUser).map((item) => String(item.userId))
    ).size
    if (!Number.isInteger(maxJogadores) || maxJogadores < Math.max(2, quantidade) || maxJogadores > 20)
        throw new Error("O limite deve comportar os participantes atuais e ficar entre 2 e 20.")
    const arquivo = document.getElementById("editarCapa").files[0]
    const capa = document.getElementById("removerCapa").checked
        ? ""
        : arquivo
          ? await lerImagem(arquivo)
          : atual.capa || ""
    await apiRequest("/campaigns/" + encodeURIComponent(campaignId), {
        method: "PATCH",
        body: JSON.stringify({ nome, sistema, descricao, maxJogadores, capa })
    })
    document.getElementById("editarCampanha").hidden = true
    await iniciarCampanha()
    mostrarMensagem("Campanha atualizada.")
}))

document.getElementById("enviar").disabled = true
document.getElementById("mensagem").disabled = true
if (verificarLogin()) {
    if (campaignId) executarAcao(iniciarCampanha)()
    else location.replace("../campanhas/index.html")
}
