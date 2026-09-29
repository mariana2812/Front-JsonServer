const idLogado = localStorage.getItem("idUser")
const idPerfil = new URLSearchParams(location.search).get("id") || idLogado
const meuPerfil = idPerfil === idLogado
let avatarSelecionado = ""
let editandoPerfil = false
let usuarioPerfil = null

function perfilEstaPrivado(usuario) {
    return usuario?.privado === true || usuario?.privado === "true"
}

function relacaoEntre(relacao, primeiroId, segundoId) {
    return (
        (String(relacao.userId) === String(primeiroId) && String(relacao.friendId) === String(segundoId)) ||
        (String(relacao.userId) === String(segundoId) && String(relacao.friendId) === String(primeiroId))
    )
}

async function criarAmizadeMutua(outroId, relacoes) {
    let seguindo = relacoes.find(
        (item) => String(item.userId) === idLogado && String(item.friendId) === String(outroId)
    )
    if (!seguindo) {
        seguindo = await apiRequest("/friends", {
            method: "POST",
            body: JSON.stringify({ userId: idLogado, friendId: outroId, status: "following" })
        })
    }
    const par = [...relacoes.filter((item) => relacaoEntre(item, idLogado, outroId)), seguindo]
    const unicas = new Map(par.filter((item) => item.id != null).map((item) => [String(item.id), item]))
    for (const relacao of unicas.values()) {
        if (relacao.status !== "friend") {
            await apiRequest("/friends/" + encodeURIComponent(relacao.id), {
                method: "PATCH",
                body: JSON.stringify({ status: "friend" })
            })
        }
    }
}

async function alternarEdicao(editar) {
    editandoPerfil = meuPerfil && editar
    document.getElementById("editarPerfil").hidden = !editandoPerfil
    document.getElementById("adicionarSistemaArea").hidden = !editandoPerfil
    document.getElementById("abrirEdicao").hidden = !meuPerfil || editandoPerfil
    document.getElementById("abrirEdicao").setAttribute("aria-expanded", String(editandoPerfil))
    if (usuarioPerfil) {
        document.getElementById("nome").value = usuarioPerfil.nome || ""
        document.getElementById("biografia").value = usuarioPerfil.biografia || ""
        document.getElementById("privacidadePerfil").value = perfilEstaPrivado(usuarioPerfil) ? "privado" : "publico"
        avatarSelecionado = usuarioPerfil.avatar || criarAvatar(usuarioPerfil.nome || usuarioPerfil.email)
    }
    if (editandoPerfil) {
        await carregarAvatares()
        document.getElementById("nome").focus()
    }
    await carregarSistemas()
}

document.getElementById("abrirEdicao").addEventListener(
    "click",
    executarAcao(() => alternarEdicao(true))
)
document.getElementById("cancelarEdicao").addEventListener("click", executarAcao(async () => {
    await alternarEdicao(false)
    document.getElementById("abrirEdicao").focus()
}))

async function iniciarPerfil() {
    const usuario = await apiRequest("/users/" + encodeURIComponent(idPerfil))
    usuarioPerfil = usuario
    const nome = usuario.nome || usuario.email
    document.getElementById("nomePerfil").textContent = nome
    document.getElementById("emailPerfil").textContent = meuPerfil ? usuario.email || "" : ""
    document.getElementById("avatarPerfil").src = usuario.avatar || criarAvatar(nome)
    document.getElementById("editarPerfil").hidden = !editandoPerfil
    document.getElementById("adicionarSistemaArea").hidden = !editandoPerfil
    document.getElementById("abrirEdicao").hidden = !meuPerfil || editandoPerfil
    const tituloPerfil = document.querySelector(".titulo-pagina h1")
    if (tituloPerfil) {
        tituloPerfil.textContent = meuPerfil ? "Meu perfil" : "Perfil"
    }

    if (meuPerfil) {
        document.getElementById("nome").value = usuario.nome || ""
        document.getElementById("biografia").value = usuario.biografia || ""
        document.getElementById("privacidadePerfil").value = perfilEstaPrivado(usuario) ? "privado" : "publico"
        avatarSelecionado = usuario.avatar || criarAvatar(nome)
        if (editandoPerfil) await carregarAvatares()
    }

    const relacoes = await apiRequest("/friends")
    const amizade = relacoes.some((item) => relacaoEntre(item, idLogado, idPerfil) && isAcceptedFriendRelation(item))
    const podeVerConteudo = meuPerfil || !perfilEstaPrivado(usuario) || amizade
    document.getElementById("bioPerfil").textContent = podeVerConteudo
        ? usuario.biografia || "Sem biografia"
        : "Este perfil é privado."
    document.getElementById("perfilPrivadoAviso").hidden = podeVerConteudo
    document.getElementById("solicitacoesCard").hidden = !meuPerfil

    if (!meuPerfil) await mostrarAmizade(relacoes)
    if (podeVerConteudo) {
        await carregarSistemas()
        await carregarPosts()
        await carregarCampanhasPerfil()
    } else {
        document.getElementById("sistemas").replaceChildren()
        document.getElementById("tagsPerfil").replaceChildren()
        document.getElementById("postsPerfil").textContent = "Conteúdo disponível após aceitar sua solicitação."
        document.getElementById("campanhasCard").hidden = true
    }
    if (meuPerfil) {
        await carregarSolicitacoes(relacoes)
        if (location.hash === "#solicitacoesCard") {
            document.getElementById("solicitacoesCard").scrollIntoView({ behavior: "smooth", block: "start" })
        }
    }
}

async function carregarAvatares() {
    let avatares
    try {
        avatares = await apiRequest("/avatar")
    } catch (erro) {
        if (erro.status !== 404) throw erro
        avatares = ["novo", "Mariana", "Olivier"].map((nome) => ({ url: criarAvatar(nome) }))
    }
    if (!Array.isArray(avatares)) throw new Error("A lista de avatares está inválida.")
    avatares = avatares.filter((avatar) => avatar && typeof avatar.url === "string" && avatar.url)
    // O avatar salvo continua disponível mesmo se sair do catálogo.
    avatares = [{ url: avatarSelecionado }, ...avatares.filter((avatar) => avatar.url !== avatarSelecionado)]
    const area = document.getElementById("avatarOpcoes")
    area.replaceChildren()
    avatares.forEach((avatar, index) => {
        const botao = document.createElement("button")
        botao.type = "button"
        botao.className = "avatar-escolha"
        botao.title = avatar.url === usuarioPerfil.avatar ? "Seu avatar atual" : "Avatar " + (index + 1)
        botao.setAttribute("aria-pressed", String(avatar.url === avatarSelecionado))
        const imagem = document.createElement("img")
        imagem.src = avatar.url
        imagem.alt = "Avatar " + (index + 1)
        imagem.classList.toggle("selecionado", avatar.url === avatarSelecionado)
        botao.appendChild(imagem)
        botao.addEventListener("click", () => {
            avatarSelecionado = avatar.url
            area.querySelectorAll("button").forEach((item) => {
                item.setAttribute("aria-pressed", String(item === botao))
                item.querySelector("img").classList.toggle("selecionado", item === botao)
            })
        })
        area.appendChild(botao)
    })
}

document.getElementById("formPerfil").addEventListener("submit", executarAcao(async () => {
    if (!meuPerfil) return
    const nome = document.getElementById("nome").value.trim()
    const biografia = document.getElementById("biografia").value.trim()
    const privado = document.getElementById("privacidadePerfil").value === "privado"
    if (!nome) throw new Error("Digite seu nome.")
    await apiRequest("/users/" + encodeURIComponent(idLogado), {
        method: "PATCH",
        body: JSON.stringify({ nome, biografia, avatar: avatarSelecionado, privado })
    })
    editandoPerfil = false
    document.getElementById("abrirEdicao").setAttribute("aria-expanded", "false")
    await iniciarPerfil()
    mostrarMensagem("Perfil salvo com sucesso.")
}))

async function removerSistemaDoPerfil(systemId) {
    if (!meuPerfil || localStorage.getItem("idUser") !== idLogado) {
        throw new Error("Você só pode remover sistemas do seu próprio perfil.")
    }
    const relacoes = await apiRequest(
        "/userSystems?userId=" + encodeURIComponent(idLogado) + "&systemId=" + encodeURIComponent(systemId)
    )
    const minhasRelacoes = relacoes.filter(
        (item) => String(item.userId) === idLogado && String(item.systemId) === String(systemId)
    )
    if (minhasRelacoes.some((item) => item.id == null || item.id === "")) {
        throw new Error("Não foi possível remover: o vínculo do sistema está sem identificador no servidor.")
    }
    for (const relacao of minhasRelacoes) {
        await apiRequest("/userSystems/" + encodeURIComponent(relacao.id), { method: "DELETE" })
    }
    await carregarSistemas()
    mostrarMensagem("Sistema removido do perfil.")
}

async function carregarSistemas() {
    const sistemas = await apiRequest("/systems")
    const relacoes = await apiRequest("/userSystems?userId=" + encodeURIComponent(idPerfil))
    const area = document.getElementById("sistemas")
    const tags = document.getElementById("tagsPerfil")
    area.replaceChildren()
    tags.replaceChildren()
    relacoes.forEach((relacao) => {
        const sistema = sistemas.find((item) => String(item.id) === String(relacao.systemId))
        if (!sistema) return

        const tag = document.createElement("span")
        tag.className = "tag tag-removivel"

        const nome = document.createElement("span")
        nome.textContent = sistema.nome
        tag.appendChild(nome)

        if (meuPerfil) {
            const remover = document.createElement("button")
            remover.type = "button"
            remover.textContent = "×"
            remover.className = "tag-remover"
            remover.title = "Remover sistema"
            remover.setAttribute("aria-label", "Remover sistema " + sistema.nome)
            remover.addEventListener("click", executarAcao(async () => {
                await removerSistemaDoPerfil(relacao.systemId)
            }))
            tag.appendChild(remover)
        }

        area.appendChild(tag)
        const resumo = document.createElement("span")
        resumo.className = "tag"
        resumo.textContent = sistema.nome
        tags.appendChild(resumo)
    })
}

document.getElementById("adicionarSistema").addEventListener("click", executarAcao(async () => {
    if (!meuPerfil) return
    const input = document.getElementById("nomeSistema")
    const nome = input.value.trim()
    if (!nome) return
    const sistemas = await apiRequest("/systems")
    let sistema = sistemas.find((item) => item.nome.toLowerCase() === nome.toLowerCase())
    if (!sistema)
        sistema = await apiRequest("/systems", {
            method: "POST",
            body: JSON.stringify({ nome })
        })
    const relacoes = await apiRequest(
        "/userSystems?userId=" + encodeURIComponent(idLogado) + "&systemId=" + encodeURIComponent(sistema.id)
    )
    if (!relacoes.length)
        await apiRequest("/userSystems", {
            method: "POST",
            body: JSON.stringify({ userId: idLogado, systemId: sistema.id })
        })
    input.value = ""
    await carregarSistemas()
}))

async function carregarPosts() {
    const todos = await apiRequest(API.blog)
    const posts = todos.filter((post) => String(post.userId ?? post.user?.id) === idPerfil)
    const area = document.getElementById("postsPerfil")
    area.replaceChildren()
    if (!posts.length) {
        area.textContent = "Nenhuma publicação."
        return
    }

    posts.reverse().forEach((post) => {
        const item = document.createElement("div")
        item.className = "item-lista"

        const link = document.createElement("a")
        link.className = "item-info"
        link.textContent = post.conteudo || post.body || ""
        link.href = "../Blog/index.html#post-" + encodeURIComponent(post.id)

        item.appendChild(link)

        if (meuPerfil) {
            const remover = document.createElement("button")
            remover.type = "button"
            remover.className = "botao-perigo"
            remover.textContent = "Excluir"
            remover.addEventListener("click", executarAcao(async () => {
                const confirmar = await abrirModal({
                    titulo: "Excluir publicação?",
                    mensagem: "A publicação será removida do mural. Essa ação não pode ser desfeita.",
                    confirmar: "Excluir publicação",
                    perigo: true
                })
                if (!confirmar) return
                await excluirPublicacao(post.id)
                await carregarPosts()
            }))
            item.appendChild(remover)
        }

        area.appendChild(item)
    })
}

async function carregarCampanhasPerfil() {
    const area = document.getElementById("campanhasPerfil")
    const card = document.getElementById("campanhasCard")
    card.hidden = false
    area.replaceChildren()
    const campanhas = await apiRequest("/campaigns")
    const minhas = campanhas.filter((item) => String(item.masterId ?? item.mestreId) === idPerfil).reverse()
    if (!minhas.length) {
        area.textContent = "Nenhuma campanha criada."
        return
    }

    minhas.forEach((campanha) => {
        const item = document.createElement("div")
        item.className = "item-lista"
        const info = document.createElement("a")
        info.className = "item-info"
        info.href = "../campanha/index.html?id=" + encodeURIComponent(campanha.id)
        const nome = document.createElement("strong")
        nome.textContent = campanha.nome
        const detalhe = document.createElement("p")
        detalhe.textContent = `${campanha.sistema || campanha.sistemaNome || "Sistema não informado"} · ${campanha.status || "aberta"}`
        info.append(nome, detalhe)
        item.appendChild(info)

        if (meuPerfil) {
            const remover = document.createElement("button")
            remover.type = "button"
            remover.className = "botao-perigo"
            remover.textContent = "Excluir"
            remover.addEventListener("click", executarAcao(async () => {
                const confirmar = await abrirModal({
                    titulo: "Excluir campanha?",
                    mensagem:
                        "A campanha, seus participantes e mensagens serão removidos. Essa ação não pode ser desfeita.",
                    confirmar: "Excluir campanha",
                    perigo: true
                })
                if (!confirmar) return
                await excluirCampanha(campanha.id)
                await carregarCampanhasPerfil()
                mostrarMensagem("Campanha removida do perfil.")
            }))
            item.appendChild(remover)
        }
        area.appendChild(item)
    })
}

async function carregarSolicitacoes(relacoes) {
    const area = document.getElementById("solicitacoesPerfil")
    area.replaceChildren()
    const recebidas = relacoes.filter(
        (item) =>
            String(item.friendId) === idLogado &&
            String(item.userId) !== idLogado &&
            ["pending", "following"].includes(item.status)
    )
    if (!recebidas.length) {
        area.textContent = "Você não tem solicitações ou novos seguidores."
        return
    }

    const usuarios = await apiRequest("/users")
    recebidas.forEach((relacao) => {
        const usuario = usuarios.find((item) => String(item.id) === String(relacao.userId))
        const item = document.createElement("div")
        item.className = "item-lista"
        const info = document.createElement("a")
        info.className = "item-info"
        info.href = "index.html?id=" + encodeURIComponent(relacao.userId)
        const nome = document.createElement("strong")
        nome.textContent = usuario?.nome || usuario?.email || "Jogador"
        const detalhe = document.createElement("p")
        detalhe.textContent = relacao.status === "pending" ? "Solicitou para seguir você" : "Está seguindo você"
        info.append(nome, detalhe)
        item.appendChild(info)

        const acoes = document.createElement("div")
        acoes.className = "acoes-seguidor"
        if (relacao.status === "pending") {
            const aceitar = document.createElement("button")
            aceitar.type = "button"
            aceitar.className = "botao"
            aceitar.textContent = "Aceitar"
            aceitar.addEventListener("click", executarAcao(async () => {
                await responderSolicitacao(relacao.id, true)
                await iniciarPerfil()
                mostrarMensagem("Solicitação aceita.")
            }))
            const recusar = document.createElement("button")
            recusar.type = "button"
            recusar.className = "botao-secundario"
            recusar.textContent = "Recusar"
            recusar.addEventListener("click", executarAcao(async () => {
                await responderSolicitacao(relacao.id, false)
                await iniciarPerfil()
                mostrarMensagem("Solicitação recusada.")
            }))
            acoes.append(aceitar, recusar)
        } else {
            const seguir = document.createElement("button")
            seguir.type = "button"
            seguir.className = "botao"
            seguir.textContent = "Seguir de volta"
            seguir.addEventListener("click", executarAcao(async () => {
                const atuais = await apiRequest("/friends")
                await criarAmizadeMutua(relacao.userId, atuais)
                await iniciarPerfil()
                mostrarMensagem("Agora vocês são amigos.")
            }))
            acoes.appendChild(seguir)
        }
        item.appendChild(acoes)
        area.appendChild(item)
    })
}

async function mostrarAmizade(relacoes) {
    if (!relacoes) relacoes = await apiRequest("/friends")
    const par = relacoes.filter((item) => relacaoEntre(item, idLogado, idPerfil))
    const amizade = par.find(isAcceptedFriendRelation)
    const seguindo = par.find((item) => String(item.userId) === idLogado && String(item.friendId) === idPerfil)
    const seguidor = par.find((item) => String(item.userId) === idPerfil && String(item.friendId) === idLogado)
    const area = document.getElementById("acoesPerfil")
    area.replaceChildren()
    const botao = document.createElement("button")
    botao.className = "botao"
    botao.type = "button"
    if (amizade) botao.textContent = "Remover amizade"
    else if (seguindo?.status === "pending") botao.textContent = "Cancelar solicitação"
    else if (seguindo?.status === "following") botao.textContent = "Deixar de seguir"
    else if (seguidor?.status === "pending") {
        botao.textContent = "Solicitação recebida: veja no seu perfil"
        botao.disabled = true
    } else if (seguidor?.status === "following") botao.textContent = "Seguir de volta"
    else botao.textContent = perfilEstaPrivado(usuarioPerfil) ? "Solicitar para seguir" : "Seguir"
    botao.addEventListener("click", executarAcao(async () => {
        if (amizade) {
            for (const relacao of par) {
                if (relacao.id != null)
                    await apiRequest("/friends/" + encodeURIComponent(relacao.id), {
                        method: "DELETE"
                    })
            }
        } else if (seguindo?.status === "pending" || seguindo?.status === "following") {
            await apiRequest("/friends/" + encodeURIComponent(seguindo.id), {
                method: "DELETE"
            })
        } else if (seguidor?.status === "pending") {
            return
        } else if (seguidor?.status === "following") {
            await criarAmizadeMutua(idPerfil, relacoes)
        } else {
            await apiRequest("/friends", {
                method: "POST",
                body: JSON.stringify({
                    userId: idLogado,
                    friendId: idPerfil,
                    status: perfilEstaPrivado(usuarioPerfil) ? "pending" : "following"
                })
            })
        }
        await iniciarPerfil()
    }))
    area.appendChild(botao)
    if (!perfilEstaPrivado(usuarioPerfil) || amizade) {
        const mensagem = document.createElement("a")
        mensagem.className = "botao-secundario"
        mensagem.textContent = "Enviar mensagem"
        mensagem.href = "../mensagens/index.html?contato=" + encodeURIComponent(idPerfil)
        area.appendChild(mensagem)
    }
}

if (verificarLogin())
    executarAcao(async () => {
        await iniciarPerfil()
        if (meuPerfil && location.hash === "#editar") await alternarEdicao(true)
    })()

document.addEventListener("solicitacoesAlteradas", executarAcao(iniciarPerfil))
