const idUser = localStorage.getItem("idUser")
let contatoSelecionado = null
let usuarios = []
let carregandoChat = false
let versaoChat = 0
let amigos = new Set()
let companheiros = new Set()
let comunidadesDisponiveis = []
let membrosComunidades = []
let perfisAbertos = new Set()
let filtroContatos = "todos"
const chaveContatos = "frontdContatosPerfil:" + idUser

async function iniciarMensagens() {
    usuarios = await apiRequest("/users")
    try {
        const salvos = JSON.parse(localStorage.getItem(chaveContatos) || "[]")
        perfisAbertos = new Set(Array.isArray(salvos) ? salvos.map(String) : [])
    } catch {
        perfisAbertos = new Set()
    }
    const amizades = await apiRequest("/friends")
    amigos = new Set(
        amizades
            .filter(
                (item) =>
                    isAcceptedFriendRelation(item) &&
                    (String(item.userId) === idUser || String(item.friendId) === idUser)
            )
            .map((item) => (String(item.userId) === idUser ? String(item.friendId) : String(item.userId)))
    )
    const [comunidades, membros] = await Promise.all([apiRequest("/communities"), apiRequest("/communityMembers")])
    membrosComunidades = membros
    comunidadesDisponiveis = comunidades.filter(
        (item) =>
            String(item.ownerId) === idUser ||
            membros.some((membro) => String(membro.communityId) === String(item.id) && String(membro.userId) === idUser)
    )
    companheiros = new Set()
    comunidadesDisponiveis.forEach((comunidade) => {
        companheiros.add(String(comunidade.ownerId))
        membros
            .filter((membro) => String(membro.communityId) === String(comunidade.id))
            .forEach((membro) => companheiros.add(String(membro.userId)))
    })
    companheiros.delete(String(idUser))
    const historico = await apiRequest("/messages")
    atualizarResumoMensagens(historico, new Set(comunidadesDisponiveis.map((item) => String(item.id))))
    const comunidadeId = new URLSearchParams(location.search).get("comunidade")
    const comunidade = comunidadesDisponiveis.find((item) => String(item.id) === comunidadeId)
    if (comunidade) {
        mostrarContatos()
        await selecionarComunidade(comunidade)
        return
    }
    const contatoId = new URLSearchParams(location.search).get("contato")
    const contato = usuarios.find((usuario) => String(usuario.id) === contatoId && contatoId !== idUser)
    if (contato) {
        perfisAbertos.add(contatoId)
        localStorage.setItem(chaveContatos, JSON.stringify([...perfisAbertos]))
    }
    mostrarContatos()
    if (contato) await selecionarContato(contato)
}

function contatoPermitido(usuario) {
    const id = String(usuario.id)
    const perfilPrivado = usuario.privado === true || usuario.privado === "true"
    return (
        id !== idUser &&
        (contatosComConversa.has(id) ||
            amigos.has(id) ||
            companheiros.has(id) ||
            (perfisAbertos.has(id) && !perfilPrivado))
    )
}

async function selecionarContato(usuario) {
    if (!contatoPermitido(usuario)) return
    contatoSelecionado = { tipo: "usuario", dados: usuario }
    document.getElementById("mensagem").value = ""
    document.getElementById("chat").textContent = "Carregando conversa..."
    document.getElementById("nomeContato").textContent = usuario.nome || usuario.email
    document.getElementById("detalheContato").textContent = "Conversa direta"
    document.getElementById("mensagem").disabled = false
    document.getElementById("enviar").disabled = false
    mostrarContatos()
    await carregarChat()
}

function participantesDaComunidade(comunidade) {
    const ids = new Set([String(comunidade.ownerId)])
    membrosComunidades
        .filter((item) => String(item.communityId) === String(comunidade.id))
        .forEach((item) => ids.add(String(item.userId)))
    return usuarios.filter((usuario) => ids.has(String(usuario.id)))
}

function usuarioParticipa(comunidade) {
    return (
        String(comunidade.ownerId) === idUser ||
        membrosComunidades.some(
            (item) => String(item.communityId) === String(comunidade.id) && String(item.userId) === idUser
        )
    )
}

async function selecionarComunidade(comunidade) {
    if (!usuarioParticipa(comunidade)) throw new Error("Você precisa participar da comunidade para abrir o chat.")
    contatoSelecionado = { tipo: "comunidade", dados: comunidade }
    document.getElementById("mensagem").value = ""
    document.getElementById("chat").textContent = "Carregando conversa..."
    document.getElementById("nomeContato").textContent = comunidade.nome
    const participantes = participantesDaComunidade(comunidade).map((usuario) =>
        String(usuario.id) === idUser ? "Você" : usuario.nome || usuario.email
    )
    document.getElementById("detalheContato").textContent =
        `${participantes.length} participante(s): ${participantes.join(", ")}`
    document.getElementById("mensagem").disabled = false
    document.getElementById("enviar").disabled = false
    mostrarContatos()
    await carregarChat()
}

function mostrarContatos() {
    const area = document.getElementById("contatos")
    area.replaceChildren()
    const pesquisa = document.getElementById("buscarContato").value.trim().toLowerCase()
    let quantidade = 0
    const contatos = usuarios.filter(
        (usuario) =>
            filtroContatos !== "comunidade" &&
            contatoPermitido(usuario) &&
            (filtroContatos !== "amigos" || amigos.has(String(usuario.id))) &&
            `${usuario.nome || ""} ${usuario.email || ""}`.toLowerCase().includes(pesquisa)
    )
    contatos.forEach((usuario) => {
        const botao = document.createElement("button")
        botao.type = "button"
        botao.className = "contato"
        const avatar = document.createElement("img")
        avatar.className = "avatar"
        avatar.alt = ""
        avatar.src = usuario.avatar || criarAvatar(usuario.nome || usuario.email)
        const nome = document.createElement("span")
        nome.textContent = usuario.nome || usuario.email
        botao.append(avatar, nome)
        mostrarContadorMensagens(botao, contarMensagensNaoLidas("usuario", usuario.id))
        botao.title = nome.textContent
        botao.classList.toggle(
            "ativo",
            contatoSelecionado?.tipo === "usuario" && String(contatoSelecionado.dados.id) === String(usuario.id)
        )
        botao.setAttribute("aria-pressed", String(botao.classList.contains("ativo")))
        botao.addEventListener(
            "click",
            executarAcao(() => selecionarContato(usuario))
        )
        area.appendChild(botao)
        quantidade++
    })

    const grupos =
        filtroContatos === "amigos"
            ? []
            : comunidadesDisponiveis.filter((comunidade) => comunidade.nome.toLowerCase().includes(pesquisa))
    grupos.forEach((comunidade) => {
        const botao = document.createElement("button")
        botao.type = "button"
        botao.className = "contato contato-comunidade"
        const icone = document.createElement("span")
        icone.className = "avatar avatar-comunidade"
        icone.textContent = "#"
        icone.setAttribute("aria-hidden", "true")
        const nome = document.createElement("span")
        nome.textContent = comunidade.nome
        botao.append(icone, nome)
        mostrarContadorMensagens(botao, contarMensagensNaoLidas("comunidade", comunidade.id))
        botao.title = "Chat da comunidade " + comunidade.nome
        botao.classList.toggle(
            "ativo",
            contatoSelecionado?.tipo === "comunidade" && String(contatoSelecionado.dados.id) === String(comunidade.id)
        )
        botao.setAttribute("aria-pressed", String(botao.classList.contains("ativo")))
        botao.addEventListener(
            "click",
            executarAcao(() => selecionarComunidade(comunidade))
        )
        area.appendChild(botao)
        quantidade++
    })

    if (!quantidade) {
        const vazio = document.createElement("p")
        vazio.className = "contatos-vazio"
        vazio.textContent = pesquisa
            ? "Nenhuma conversa encontrada."
            : filtroContatos === "comunidade"
              ? "Você ainda não participa de comunidades."
              : "Nenhum contato nesta lista."
        area.appendChild(vazio)
    }
}

async function carregarChat() {
    if (!contatoSelecionado) return
    const conversaSelecionada = contatoSelecionado
    const conversaId = String(conversaSelecionada.dados.id)
    const versao = ++versaoChat
    const mensagens = await apiRequest("/messages")
    if (contatoSelecionado !== conversaSelecionada || versao !== versaoChat) return
    const conversa = mensagens.filter((item) =>
        conversaSelecionada.tipo === "comunidade"
            ? String(item.communityId) === conversaId
            : item.communityId == null &&
              ((String(item.senderId) === idUser && String(item.receiverId) === conversaId) ||
                  (String(item.senderId) === conversaId && String(item.receiverId) === idUser))
    )
    conversa.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    const area = document.getElementById("chat")
    const noFim = area.scrollHeight - area.scrollTop - area.clientHeight < 40
    area.replaceChildren()
    if (!conversa.length) area.textContent = "Nenhuma mensagem nesta conversa."
    conversa.forEach((mensagem) => {
        const balao = document.createElement("div")
        balao.className = "balao"
        balao.classList.toggle("meu", String(mensagem.senderId) === idUser)
        if (conversaSelecionada.tipo === "comunidade") {
            const remetente = usuarios.find((usuario) => String(usuario.id) === String(mensagem.senderId))
            const nome = document.createElement("strong")
            nome.className = "mensagem-autor"
            nome.textContent =
                String(mensagem.senderId) === idUser ? "Você" : remetente?.nome || remetente?.email || "Participante"
            const texto = document.createElement("span")
            texto.textContent = mensagem.conteudo
            balao.append(nome, texto)
        } else {
            balao.textContent = mensagem.conteudo
        }
        area.appendChild(balao)
    })

    marcarMensagensLidas(conversa)
    if (noFim) area.scrollTop = area.scrollHeight
}

document.getElementById("enviar").addEventListener(
    "click",
    executarAcao(async () => {
        const campo = document.getElementById("mensagem")
        const conteudo = campo.value.trim()
        if (!contatoSelecionado || !conteudo) return
        const conversa = contatoSelecionado
        let dadosMensagem
        let nomeDestino
        if (conversa.tipo === "comunidade") {
            if (!usuarioParticipa(conversa.dados)) throw new Error("Você não participa desta comunidade.")
            dadosMensagem = {
                communityId: conversa.dados.id,
                senderId: idUser,
                conteudo,
                created_at: new Date().toISOString()
            }
            nomeDestino = conversa.dados.nome
        } else {
            const destinatario = conversa.dados
            if (!contatoPermitido(destinatario)) throw new Error("Abra o perfil do jogador para iniciar uma conversa.")
            dadosMensagem = {
                senderId: idUser,
                receiverId: destinatario.id,
                conteudo,
                created_at: new Date().toISOString()
            }
            nomeDestino = destinatario.nome || "o contato"
        }
        await apiRequest("/messages", {
            method: "POST",
            body: JSON.stringify(dadosMensagem)
        })
        mostrarMensagem(`Mensagem enviada para ${nomeDestino}.`)
        if (contatoSelecionado === conversa && campo.value.trim() === conteudo) campo.value = ""
        await carregarChat()
        if (contatoSelecionado === conversa) {
            document.getElementById("chat").scrollTop = document.getElementById("chat").scrollHeight
        }
    })
)

document.getElementById("mensagem").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.isComposing) {
        event.preventDefault()
        document.getElementById("enviar").click()
    }
})
document.getElementById("mensagem").disabled = true
document.getElementById("enviar").disabled = true
document.getElementById("buscarContato").addEventListener("input", mostrarContatos)
document.querySelectorAll("[data-filtro]").forEach((botao) => {
    botao.addEventListener("click", () => {
        filtroContatos = botao.dataset.filtro
        document
            .querySelectorAll("[data-filtro]")
            .forEach((item) => item.setAttribute("aria-pressed", String(item === botao)))
        mostrarContatos()
    })
})
if (verificarLogin()) {
    executarAcao(iniciarMensagens)()
    setInterval(async () => {
        if (document.hidden || carregandoChat || !contatoSelecionado) return
        carregandoChat = true
        try {
            await carregarChat()
        } catch (erro) {
            mostrarMensagem(erro.message)
        } finally {
            carregandoChat = false
        }
    }, 5000)
}

document.addEventListener("mensagensAtualizadas", mostrarContatos)
document.addEventListener("visibilitychange", () => {
    if (!document.hidden && contatoSelecionado) executarAcao(carregarChat)()
})
