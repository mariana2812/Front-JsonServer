let solicitacoesPendentes = []

let mensagensRecebidas = []
let contatosComConversa = new Set()

function chaveMensagensLidas() {
    return "frontdReadMessages:" + localStorage.getItem("idUser")
}

function contarMensagensNaoLidas(tipo, id) {
    const lidas = lerIdsNotificados(chaveMensagensLidas())
    return mensagensRecebidas.filter((mensagem) => {
        if (lidas.has(String(mensagem.id))) return false
        if (!tipo) return true

        if (tipo === "comunidade") {
            return String(mensagem.communityId) === String(id)
        }

        return mensagem.communityId == null && String(mensagem.senderId) === String(id)
    }).length
}

function mostrarContadorMensagens(elemento, quantidade) {
    let contador = elemento.querySelector(".contador-mensagens")
    if (!contador) {
        contador = document.createElement("span")
        contador.className = "contador-mensagens"
        elemento.appendChild(contador)
    }
    contador.textContent = quantidade
    contador.hidden = quantidade === 0
    contador.setAttribute("aria-label", quantidade + " mensagens não lidas")
}

function atualizarContadoresMensagens() {
    const links = document.querySelectorAll('a[href$="mensagens/index.html"], #abrirMensagens')
    links.forEach((link) => mostrarContadorMensagens(link, contarMensagensNaoLidas()))
    document.dispatchEvent(new Event("mensagensAtualizadas"))
}

function atualizarResumoMensagens(mensagens, comunidades) {
    const usuario = localStorage.getItem("idUser")
    mensagensRecebidas = mensagens.filter(
        (item) =>
            item.id != null &&
            String(item.senderId) !== usuario &&
            (item.communityId != null ? comunidades.has(String(item.communityId)) : String(item.receiverId) === usuario)
    )
    contatosComConversa = new Set()
    mensagens.forEach((item) => {
        if (item.communityId != null) return
        if (String(item.receiverId) === usuario) contatosComConversa.add(String(item.senderId))
        if (String(item.senderId) === usuario) contatosComConversa.add(String(item.receiverId))
    })
    atualizarContadoresMensagens()
}

function marcarMensagensLidas(mensagens) {
    if (document.hidden) return
    const usuario = localStorage.getItem("idUser")
    const lidas = lerIdsNotificados(chaveMensagensLidas())
    mensagens.forEach((item) => {
        if (item.id != null && String(item.senderId) !== usuario) lidas.add(String(item.id))
    })
    localStorage.setItem(chaveMensagensLidas(), JSON.stringify([...lidas]))
    atualizarContadoresMensagens()
}

window.addEventListener("storage", (event) => {
    if (event.key === chaveMensagensLidas()) atualizarContadoresMensagens()
})

function atualizarContadorSolicitacoes() {
    const bell = document.querySelector('.top-actions button[title="Notificações"], .app-notificacoes')
    if (!bell) return

    let badge = bell.querySelector(".notification-badge")
    if (!badge) {
        badge = document.createElement("span")
        badge.className = "notification-badge"
        bell.appendChild(badge)
    }

    const count = solicitacoesPendentes.length
    badge.textContent = count > 9 ? "9+" : count
    badge.hidden = count === 0
}

function criarAreaAvisos() {
    let stack = document.querySelector(".notification-stack")
    if (!stack) {
        stack = document.createElement("div")
        stack.className = "notification-stack"
        stack.setAttribute("aria-live", "polite")
        document.body.appendChild(stack)
    }
    return stack
}

function mostrarAviso(notificacao) {
    const stack = criarAreaAvisos()
    const toast = document.createElement("div")
    toast.className = `toast toast-${notificacao.tipo || "info"}`
    toast.innerHTML = `
        <div class="toast-icon">${notificacao.tipo === "success" ? "✓" : notificacao.tipo === "warning" ? "!" : "•"}</div>
        <div class="toast-copy">
            <strong></strong>
            <span></span>
        </div>
    `
    toast.querySelector(".toast-copy strong").textContent = notificacao.titulo || "Notificação"
    toast.querySelector(".toast-copy span").textContent = notificacao.mensagem || ""
    if (notificacao.url) {
        const abrir = () => {
            location.href = notificacao.url
        }
        toast.classList.add("toast-link")
        toast.tabIndex = 0
        toast.setAttribute("role", "link")
        toast.addEventListener("click", abrir)
        toast.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                abrir()
            }
        })
    }
    stack.prepend(toast)

    requestAnimationFrame(() => {
        toast.classList.add("show")
    })

    setTimeout(() => {
        toast.classList.remove("show")
        setTimeout(() => toast.remove(), 400)
    }, 3200)
}

function adicionarAviso(titulo, mensagem, tipo = "info", exibirToast = true, url = "") {
    const item = {
        id: Date.now() + Math.random(),
        titulo,
        mensagem,
        tipo,
        url
    }

    if (exibirToast) {
        mostrarAviso(item)
    }

    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
        try {
            const notificacao = new Notification(titulo, {
                body: mensagem,
                tag: String(item.id)
            })
            if (url)
                notificacao.onclick = () => {
                    window.focus()
                    location.href = url
                }
        } catch {}
    }
}

async function responderSolicitacao(id, aceitar) {
    const pedido = await apiRequest("/friends/" + encodeURIComponent(id))
    if (String(pedido.friendId) !== localStorage.getItem("idUser") || pedido.status !== "pending") {
        throw new Error("Esta solicitação não está mais disponível.")
    }
    const opcoes = aceitar ? { method: "PATCH", body: JSON.stringify({ status: "accepted" }) } : { method: "DELETE" }
    await apiRequest("/friends/" + encodeURIComponent(id), opcoes)
    solicitacoesPendentes = solicitacoesPendentes.filter((item) => String(item.id) !== String(id))
    atualizarContadorSolicitacoes()
    document.dispatchEvent(new Event("solicitacoesAlteradas"))
}

async function abrirSolicitacoes() {
    if (document.getElementById("listaSolicitacoes")) return
    const modal = document.createElement("dialog")
    modal.id = "listaSolicitacoes"
    modal.setAttribute("aria-labelledby", "tituloSolicitacoes")
    modal.innerHTML = `
        <h2 id="tituloSolicitacoes">Solicitações para seguir</h2>
        <div></div>
        <p role="status"></p>
        <button type="button">Fechar</button>
    `
    const lista = modal.querySelector("div")
    const aviso = modal.querySelector('[role="status"]')
    modal.querySelector("button").addEventListener("click", () => modal.close())
    modal.addEventListener("close", () => {
        modal.remove()
        document.querySelector('.app-notificacoes, .top-actions button[title="Notificações"]')?.focus()
    })
    document.body.appendChild(modal)
    modal.showModal()
    aviso.textContent = "Carregando..."
    try {
        const relacoes = await apiRequest("/friends")
        solicitacoesPendentes = relacoes.filter(
            (item) => item.status === "pending" && String(item.friendId) === localStorage.getItem("idUser")
        )
        const usuarios = solicitacoesPendentes.length ? await apiRequest("/users") : []
        atualizarContadorSolicitacoes()
        aviso.textContent = solicitacoesPendentes.length ? "" : "Nenhuma solicitação pendente."
        solicitacoesPendentes.forEach((pedido) => {
            const pessoa = usuarios.find((item) => String(item.id) === String(pedido.userId))
            const linha = document.createElement("article")
            const nome = document.createElement("a")
            nome.href = appUrl("perfil/index.html?id=" + encodeURIComponent(pedido.userId))
            nome.textContent = pessoa?.nome || pessoa?.email || "Jogador"
            linha.appendChild(nome)
            for (const aceitar of [true, false]) {
                const botao = document.createElement("button")
                botao.type = "button"
                botao.textContent = aceitar ? "Aceitar" : "Recusar"
                botao.addEventListener("click", async () => {
                    linha.querySelectorAll("button").forEach((item) => (item.disabled = true))
                    try {
                        await responderSolicitacao(pedido.id, aceitar)
                        linha.remove()
                        aviso.textContent = aceitar ? "Solicitação aceita." : "Solicitação recusada."
                        if (!lista.children.length) aviso.textContent += " Nenhuma solicitação pendente."
                    } catch (erro) {
                        aviso.textContent = erro.message
                        linha.querySelectorAll("button").forEach((item) => (item.disabled = false))
                    }
                })
                linha.appendChild(botao)
            }
            lista.appendChild(linha)
        })
    } catch (erro) {
        aviso.textContent = erro.message
    }
}

function prepararSino() {
    const sino = document.querySelector('.app-notificacoes, .top-actions button[title="Notificações"]')
    if (!sino) return
    sino.addEventListener("click", abrirSolicitacoes)
    atualizarContadorSolicitacoes()
}

function appUrl(relativePath) {
    const paginas = new Set([
        "blog",
        "cadastro",
        "campanha",
        "campanhas",
        "comunidades",
        "configuracoes",
        "descobrir",
        "login",
        "mensagens",
        "perfil"
    ])
    const segmentos = location.pathname.split("/").filter(Boolean)
    const pastaPagina = segmentos.at(-1) === "index.html" ? segmentos.at(-2) : segmentos.at(-1)
    const prefixo = paginas.has((pastaPagina || "").toLowerCase()) ? "../" : "./"
    return new URL(prefixo + relativePath, location.href).href
}

function lerIdsNotificados(chave) {
    try {
        const ids = JSON.parse(localStorage.getItem(chave) || "[]")
        return new Set(Array.isArray(ids) ? ids.map(String) : [])
    } catch {
        return new Set()
    }
}

async function verificarNotificacoesRecebidas() {
    const idUsuario = localStorage.getItem("idUser")
    if (!idUsuario || !localStorage.getItem("accessToken")) return

    const [mensagens, relacoes, comunidades, membros] = await Promise.all([
        apiRequest("/messages"),
        apiRequest("/friends"),
        apiRequest("/communities"),
        apiRequest("/communityMembers")
    ])
    const idsComunidades = new Set(
        comunidades
            .filter(
                (comunidade) =>
                    String(comunidade.ownerId) === idUsuario ||
                    membros.some(
                        (membro) =>
                            String(membro.communityId) === String(comunidade.id) && String(membro.userId) === idUsuario
                    )
            )
            .map((comunidade) => String(comunidade.id))
    )
    atualizarResumoMensagens(mensagens, idsComunidades)

    solicitacoesPendentes = relacoes.filter((item) => item.status === "pending" && String(item.friendId) === idUsuario)
    atualizarContadorSolicitacoes()
}

function iniciarAtualizacaoNotificacoes() {
    if (window.frontdNotificationTimer || !localStorage.getItem("idUser") || !localStorage.getItem("accessToken"))
        return
    let verificando = false
    const verificar = async () => {
        if (verificando) return
        verificando = true
        try {
            await verificarNotificacoesRecebidas()
        } catch (error) {
            console.warn("Não foi possível atualizar as notificações.", error)
        } finally {
            verificando = false
        }
    }
    window.frontdNotificationTimer = setInterval(verificar, 5000)
    window.addEventListener("focus", verificar)
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) verificar()
    })
    verificar()
}

if (document.readyState !== "loading") {
    prepararSino()
    iniciarAtualizacaoNotificacoes()
} else {
    document.addEventListener("DOMContentLoaded", () => {
        prepararSino()
        iniciarAtualizacaoNotificacoes()
    })
}
