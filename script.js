const Cadastro = document.getElementById("Cadastro")
const Login = document.getElementById("Login")

Cadastro?.addEventListener("click", () => {
    window.location.href = "./Cadastro/"
})

Login?.addEventListener("click", () => {
    window.location.href = "./login/"
})

const API = {
    baseUrl: "http://localhost:3001",
    cadastro: "/register",
    login: "/login",
    blog: "/blog"
}

async function apiRequest(path, options = {}) {
    const token = localStorage.getItem("accessToken")
    const isAuthRequest = path === API.cadastro || path === API.login
    let response
    try {
        response = await fetch(API.baseUrl + path, {
            ...options,
            headers: {
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...(token && !isAuthRequest ? { Authorization: `Bearer ${token}` } : {}),
                ...options.headers
            }
        })
    } catch {
        throw new Error(
            "Não foi possível conectar à API em " +
                API.baseUrl +
                ". Verifique se o servidor está ligado, a porta está correta e o CORS permite esta página."
        )
    }
    const text = await response.text()
    let data = text || null
    try {
        data = text ? JSON.parse(text) : null
    } catch {
        if (response.ok) {
            throw new Error("O servidor retornou uma resposta inválida: era esperado JSON.")
        }
    }
    if (!response.ok) {
        const detail = typeof data === "string" ? data : data?.message
        const error = new Error(`Erro na requisição (${response.status}): ${detail || response.statusText}`)
        error.status = response.status
        throw error
    }
    return data
}

async function deleteByIdOrFilter(collection, id, filters = {}) {
    if (id != null && id !== "") {
        try {
            return await apiRequest(`/${collection}/${encodeURIComponent(id)}`, {
                method: "DELETE"
            })
        } catch (error) {
            if (error.status !== 404) throw error
        }
    }

    const query = new URLSearchParams(filters).toString()
    const endpoint = query ? `/${collection}?${query}` : `/${collection}`
    const items = await apiRequest(endpoint)

    if (!Array.isArray(items) || items.length === 0) {
        throw new Error("Registro não encontrado para remover.")
    }

    const item = items[0]
    if (item?.id == null) {
        throw new Error("Este registro não possui identificador para exclusão.")
    }

    return apiRequest(`/${collection}/${encodeURIComponent(item.id)}`, { method: "DELETE" })
}

function isAcceptedFriendRelation(relation) {
    return !relation.status || relation.status === "accepted" || relation.status === "friend"
}

async function excluirCampanha(id) {
    const campanha = await apiRequest("/campaigns/" + encodeURIComponent(id))
    const idUsuario = localStorage.getItem("idUser")
    if (String(campanha.masterId ?? campanha.mestreId) !== String(idUsuario)) {
        throw new Error("Somente o mestre pode excluir esta campanha.")
    }

    for (const collection of ["campaignPosts", "campaignMembers"]) {
        const items = await apiRequest(`/${collection}?campaignId=${encodeURIComponent(id)}`)
        for (const item of items) {
            await apiRequest(`/${collection}/${encodeURIComponent(item.id)}`, { method: "DELETE" })
        }
    }

    return apiRequest("/campaigns/" + encodeURIComponent(id), { method: "DELETE" })
}

function saveSession(data) {
    if (!data?.accessToken || data?.user?.id == null) {
        throw new Error("A API precisa retornar accessToken e user.id para iniciar a sessão.")
    }
    localStorage.removeItem("blogID")
    localStorage.setItem("accessToken", data.accessToken)
    localStorage.setItem("idUser", data.user.id)
}

function verificarLogin() {
    if (!localStorage.getItem("accessToken") || !localStorage.getItem("idUser")) {
        location.replace("../login/index.html")
        return false
    }
    return true
}

function sair() {
    localStorage.removeItem("accessToken")
    localStorage.removeItem("idUser")
    location.href = "../login/index.html"
}

function criarAvatar(nome) {
    return "https://api.dicebear.com/9.x/bottts/svg?seed=" + encodeURIComponent(nome || "RPG")
}

async function lerImagem(arquivo) {
    if (!arquivo) return ""
    if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type) || arquivo.size > 5 * 1024 * 1024) {
        throw new Error("Escolha uma imagem JPG, PNG ou WebP de até 5 MB.")
    }
    const url = URL.createObjectURL(arquivo)
    try {
        const imagem = new Image()
        imagem.src = url
        await imagem.decode()
        const escala = Math.min(1, 1200 / Math.max(imagem.width, imagem.height))
        const canvas = document.createElement("canvas")
        canvas.width = Math.max(1, Math.round(imagem.width * escala))
        canvas.height = Math.max(1, Math.round(imagem.height * escala))
        canvas.getContext("2d").drawImage(imagem, 0, 0, canvas.width, canvas.height)
        const dados = canvas.toDataURL("image/webp", 0.75)
        if (dados.length > 650000) throw new Error("Esta imagem tem muitos detalhes. Escolha uma versão menor.")
        return dados
    } finally {
        URL.revokeObjectURL(url)
    }
}

async function excluirPublicacao(id) {
    const post = await apiRequest("/blog/" + encodeURIComponent(id))
    if (String(post.userId ?? post.user?.id) !== localStorage.getItem("idUser"))
        throw new Error("Somente o autor pode excluir esta publicação.")
    for (const colecao of ["likes", "comments"]) {
        const itens = await apiRequest("/" + colecao + "?postId=" + encodeURIComponent(id))
        for (const item of itens)
            await apiRequest("/" + colecao + "/" + encodeURIComponent(item.id), {
                method: "DELETE"
            })
    }
    await deleteByIdOrFilter("blog", id, { id })
}

async function editarPublicacao(id) {
    const post = await apiRequest("/blog/" + encodeURIComponent(id))
    if (String(post.userId ?? post.user?.id) !== localStorage.getItem("idUser"))
        throw new Error("Somente o autor pode editar esta publicação.")
    const conteudo = await abrirModal({
        titulo: "Editar publicação",
        mensagem: "Atualize sua história.",
        campo: true,
        multilinha: true,
        rotulo: "Publicação",
        valor: post.conteudo || post.body || "",
        confirmar: "Salvar alterações"
    })
    if (conteudo === null) return
    if (!conteudo) throw new Error("Escreva o texto da publicação.")
    await apiRequest("/blog/" + encodeURIComponent(id), {
        method: "PATCH",
        body: JSON.stringify({ conteudo, updated_at: new Date().toISOString() })
    })
}

function abrirModal({
    titulo,
    mensagem,
    campo = false,
    valor = "",
    confirmar = "Confirmar",
    perigo = false,
    cancelar = true,
    multilinha = false,
    rotulo = "Sistema de RPG"
}) {
    if (document.querySelector(".modal-frontd[open]")) return Promise.resolve(null)
    return new Promise((resolve) => {
        const focoAnterior = document.activeElement
        const modal = document.createElement("dialog")
        modal.className = "modal-frontd"
        modal.setAttribute("aria-labelledby", "tituloModal")
        modal.setAttribute("aria-describedby", "textoModal")
        modal.innerHTML = `
            <form method="dialog" class="modal-form">
                <div class="modal-topo"><span class="modal-marca">Front<span>D</span></span><button type="button" class="modal-fechar" aria-label="Fechar" title="Fechar">×</button></div>
                <h2 id="tituloModal"></h2>
                <p id="textoModal"></p>
                <div class="modal-campo"><label for="valorModal">Sistema de RPG</label><input id="valorModal" type="text" maxlength="100" autocomplete="off" placeholder="Ex.: D&D 5e, Tormenta 20"></div>
                <div class="modal-acoes"><button type="button" class="modal-cancelar">Cancelar</button><button type="submit" class="modal-confirmar"></button></div>
            </form>`
        modal.querySelector("h2").textContent = titulo
        modal.querySelector("p").textContent = mensagem
        modal.querySelector(".modal-campo").hidden = !campo
        modal.querySelector(".modal-cancelar").hidden = !cancelar
        let input = modal.querySelector("input")
        modal.querySelector("label").textContent = rotulo
        if (multilinha) {
            const texto = document.createElement("textarea")
            texto.id = input.id
            texto.maxLength = 5000
            texto.rows = 6
            input.replaceWith(texto)
            input = texto
        }
        input.value = valor
        const botao = modal.querySelector(".modal-confirmar")
        botao.textContent = confirmar
        botao.classList.toggle("modal-perigo", perigo)
        let resultado = null
        modal.querySelector("form").addEventListener("submit", (event) => {
            event.preventDefault()
            resultado = campo ? input.value.trim() : true
            modal.close()
        })
        modal.querySelector(".modal-fechar").addEventListener("click", () => modal.close())
        modal.querySelector(".modal-cancelar").addEventListener("click", () => modal.close())
        modal.addEventListener("click", (event) => {
            const area = modal.getBoundingClientRect()
            if (
                event.target === modal &&
                (event.clientX < area.left ||
                    event.clientX > area.right ||
                    event.clientY < area.top ||
                    event.clientY > area.bottom)
            )
                modal.close()
        })
        modal.addEventListener(
            "close",
            () => {
                modal.remove()
                if (focoAnterior?.isConnected) focoAnterior.focus()
                resolve(resultado)
            },
            { once: true }
        )
        document.body.appendChild(modal)
        modal.showModal()
        ;(campo ? input : perigo ? modal.querySelector(".modal-cancelar") : botao).focus()
    })
}

function mostrarMensagem(texto) {
    let mensagem = document.getElementById("mensagemPagina")
    if (!mensagem) {
        mensagem = document.createElement("p")
        mensagem.id = "mensagemPagina"
        mensagem.className = "mensagem"
        mensagem.setAttribute("role", "status")
        ;(document.querySelector("main") || document.body).prepend(mensagem)
    }
    mensagem.textContent = texto
}

function executarAcao(acao) {
    return async (event) => {
        event?.preventDefault()
        const elemento = event?.currentTarget
        const botao = elemento?.matches("form")
            ? elemento.querySelector('button[type="submit"], button:not([type])')
            : elemento
        if (botao?.disabled) return
        if (botao) botao.disabled = true
        try {
            mostrarMensagem("")
            await acao(event)
        } catch (erro) {
            mostrarMensagem(erro.message)
        } finally {
            if (botao) botao.disabled = false
        }
    }
}
