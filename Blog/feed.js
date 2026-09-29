const idUser = localStorage.getItem("idUser")
const token = localStorage.getItem("accessToken")

document.addEventListener("DOMContentLoaded", () => {
    if (window.lucide) lucide.createIcons()
})

if (!idUser || !token) {
    location.replace("../login/index.html")
}

const feed = document.getElementById("feed")

const searchInput = document.getElementById("searchInput")

const profileName = document.getElementById("profileName")
const profileDescription = document.getElementById("profileDescription")
const profileAvatar = document.getElementById("profileAvatar")

const topAvatar = document.getElementById("topAvatar")
const createPostAvatar = document.getElementById("createPostAvatar")

const profileSystems = document.getElementById("profileSystems")

const campaignCount = document.getElementById("campaignCount")
const friendCount = document.getElementById("friendCount")

const openCampaigns = document.getElementById("openCampaigns")

const postContent = document.getElementById("postContent")
const publishButton = document.getElementById("publishButton")

let usuarioLogado = null
let imagemPost = ""
let sistemaPost = ""
const mensagemFeed = document.createElement("p")
mensagemFeed.setAttribute("role", "status")
mensagemFeed.className = "feed-message"
feed.before(mensagemFeed)

document.getElementById("createCampaignButton").addEventListener("click", () => {
    location.href = "../campanhas/index.html"
})
const atualizarFeed = document.getElementById("atualizarFeed")
const abrirMensagens = document.getElementById("abrirMensagens")

atualizarFeed.addEventListener("click", executarAcao(carregarFeed))
abrirMensagens.addEventListener("click", () => {
    location.href = "../mensagens/index.html"
})

const ferramentas = document.querySelectorAll(".create-tools button")
const previaImagem = document.createElement("img")
previaImagem.className = "previa-publicacao"
previaImagem.alt = "Imagem selecionada para publicar"
previaImagem.hidden = true
postContent.after(previaImagem)
const semResultados = document.createElement("p")
semResultados.className = "empty-feed"
semResultados.textContent = "Nenhuma publicação encontrada."
semResultados.hidden = true
feed.after(semResultados)

function atualizarFerramenta(botao, texto) {
    let legenda = botao.querySelector("span")
    if (!legenda) {
        legenda = document.createElement("span")
        botao.appendChild(legenda)
    }
    legenda.textContent = texto
    botao.title = texto
    botao.setAttribute("aria-label", texto)
}
const arquivoImagem = document.createElement("input")
arquivoImagem.type = "file"
arquivoImagem.accept = "image/png,image/jpeg,image/webp"
arquivoImagem.hidden = true
document.body.appendChild(arquivoImagem)
ferramentas[0].addEventListener("click", () => {
    if (imagemPost) {
        imagemPost = ""
        arquivoImagem.value = ""
        previaImagem.hidden = true
        previaImagem.removeAttribute("src")
        atualizarFerramenta(ferramentas[0], "Adicionar imagem")
    } else arquivoImagem.click()
})
arquivoImagem.addEventListener("change", async () => {
    const arquivo = arquivoImagem.files[0]
    if (!arquivo) return
    publishButton.disabled = true
    try {
        imagemPost = await lerImagem(arquivo)
        previaImagem.src = imagemPost
        previaImagem.hidden = false
        atualizarFerramenta(ferramentas[0], "Remover imagem")
    } catch (error) {
        mensagemFeed.textContent = error.message || "Não foi possível ler a imagem."
    } finally {
        publishButton.disabled = false
    }
})
ferramentas[1].addEventListener("click", async () => {
    const nome = await abrirModal({
        titulo: "Qual é o sistema da aventura?",
        mensagem: "Adicione um sistema à sua publicação. Deixe em branco para remover.",
        campo: true,
        valor: sistemaPost,
        confirmar: "Adicionar sistema"
    })
    if (nome === null) return
    sistemaPost = nome.trim()
    atualizarFerramenta(ferramentas[1], sistemaPost || "Escolher sistema")
})

document.querySelector(".user-button").addEventListener("click", () => {
    location.href = "../perfil/index.html"
})
document.querySelector(".mobile-nav > button").addEventListener("click", () => {
    postContent.scrollIntoView({ behavior: "smooth", block: "center" })
    postContent.focus({ preventScroll: true })
})

document.addEventListener("click", async (event) => {
    const button = event.target.closest(".share-button")
    if (!button) return
    const url = new URL(location.href)
    url.hash = "post-" + button.closest(".post").dataset.postId
    try {
        await navigator.clipboard.writeText(url.href)
        mensagemFeed.textContent = "Link da publicação copiado."
    } catch {
        mensagemFeed.textContent = "Link da publicação: " + url.href
    }
})

document.addEventListener("click", async (event) => {
    const button = event.target.closest(".delete-post-button")
    if (!button) return

    const article = button.closest(".post")
    const postId = article?.dataset?.postId
    if (!postId) return

    const confirmar = await abrirModal({
        titulo: "Excluir publicação?",
        mensagem: "Sua publicação será removida do mural. Essa ação não pode ser desfeita.",
        confirmar: "Excluir publicação",
        perigo: true
    })
    if (!confirmar) return

    try {
        await excluirPublicacao(postId)
        mensagemFeed.textContent = "Publicação removida."
        await carregarFeed()
    } catch (error) {
        console.error("Erro ao excluir publicação:", error)
        mensagemFeed.textContent = error.message || "Não foi possível excluir a publicação."
    }
})

/* =========================
   USUÁRIO
========================= */

async function carregarUsuario() {
    try {
        const user = await apiRequest(`/users/${encodeURIComponent(idUser)}`)

        usuarioLogado = user

        const nome = user.nome || user.username || user.email || "Usuário"

        const avatar = user.avatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(nome)}`

        profileName.textContent = nome

        profileDescription.textContent = user.biografia || ""

        profileAvatar.src = avatar
        topAvatar.src = avatar
        createPostAvatar.src = avatar

        carregarSistemasUsuario()

        carregarQuantidadeAmigos()
    } catch (error) {
        console.error("Erro ao carregar usuário:", error)
        profileName.textContent = "Perfil indisponível"
        mensagemFeed.textContent = error.message
    }
}

/* =========================
   SISTEMAS DO USUÁRIO
========================= */

async function carregarSistemasUsuario() {
    profileSystems.innerHTML = ""

    try {
        const relacionamentos = await apiRequest(`/userSystems?userId=${idUser}`)

        if (!Array.isArray(relacionamentos)) {
            return
        }

        for (const relacionamento of relacionamentos) {
            try {
                const sistema = await apiRequest(`/systems/${relacionamento.systemId}`)

                const tag = document.createElement("span")

                tag.textContent = sistema.nome

                profileSystems.appendChild(tag)
            } catch (error) {
                console.error(error)
            }
        }
    } catch (error) {
        console.log("Nenhum sistema selecionado.")
    }
}

/* =========================
   AMIGOS
========================= */

async function carregarQuantidadeAmigos() {
    try {
        const amigos = await apiRequest("/friends")
        if (!Array.isArray(amigos)) throw new Error("A lista de amizades está inválida.")
        const amigosFeed = amigos
            .filter(
                (item) =>
                    isAcceptedFriendRelation(item) &&
                    (String(item.userId) === idUser || String(item.friendId) === idUser)
            )
            .map((item) => (String(item.userId) === idUser ? String(item.friendId) : String(item.userId)))
        searchInput.dispatchEvent(new Event("input"))

        friendCount.textContent = new Set(amigosFeed).size
    } catch (error) {
        friendCount.textContent = "0"
    }
}

/* =========================
   DATA
========================= */

function formatarData(data) {
    if (!data) {
        return "Publicação"
    }

    const date = new Date(data)

    if (Number.isNaN(date.getTime())) {
        return "Publicação"
    }

    return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    })
}

/* =========================
   POST
========================= */

function criarPost(post) {
    const article = document.createElement("article")

    article.className = "post"
    article.dataset.userId = post.userId ?? post.user?.id ?? ""
    article.id = "post-" + post.id

    article.dataset.postId = post.id

    const nome = post.user?.nome || post.user?.username || post.user?.email || "Usuário"

    const avatar = post.user?.avatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(nome)}`

    article.innerHTML = `
        <div class="post-header">

            <img
                class="post-avatar"
                alt=""
            >

            <div class="post-user">

                <strong></strong>

                <span></span>

            </div>

        </div>

        <div class="post-content"></div>

        <div class="post-actions">

            <button
                type="button"
                class="like-button"
            >
                ♡ Curtir
                <span class="like-count">0</span>
            </button>

            <button
                type="button"
                class="comment-button"
            >
                💬 Comentar
                <span class="comment-count">0</span>
            </button>

            <button
                type="button"
                class="share-button"
            >
                ↗ Compartilhar
            </button>

            ${
                String(post.userId ?? post.user?.id ?? "") === String(idUser)
                    ? `
                <button
                    type="button"
                    class="delete-post-button botao-perigo"
                >
                    🗑 Excluir
                </button>
            `
                    : ""
            }

        </div>

        <div class="comments-area">

            <div class="comments-list"></div>

            <div class="comment-form">

                <input
                    type="text"
                    placeholder="Escreva um comentário..."
                    maxlength="500"
                >

                <button
                    type="button"
                    class="send-comment"
                >
                    Enviar
                </button>

            </div>

        </div>
    `

    article.querySelector(".post-avatar").src = avatar

    article.querySelector(".post-user strong").textContent = nome

    article.querySelector(".post-user span").textContent = formatarData(post.created_at)

    article.querySelector(".post-content").textContent = post.conteudo || post.body || ""

    if (post.sistema) {
        const sistema = document.createElement("p")
        sistema.textContent = post.sistema
        article.querySelector(".post-content").appendChild(sistema)
    }
    if (post.imagem && /^data:image\/(png|jpeg|webp);base64,/.test(post.imagem)) {
        const imagem = document.createElement("img")
        imagem.src = post.imagem
        imagem.alt = "Imagem da publicação"
        imagem.className = "post-image"
        article.querySelector(".post-content").appendChild(imagem)
    }

    if (String(post.userId ?? post.user?.id) === String(idUser)) {
        const editar = document.createElement("button")
        editar.type = "button"
        editar.className = "edit-post-button"
        editar.textContent = "Editar"
        editar.addEventListener("click", executarAcao(async () => {
            await editarPublicacao(post.id)
            await carregarFeed()
        }))
        article.querySelector(".post-actions").appendChild(editar)
    }

    carregarCurtidasPost(article, post.id)

    carregarContadorComentarios(article, post.id)

    return article
}

/* =========================
   CARREGAR FEED
========================= */

async function carregarFeed() {
    feed.innerHTML = `
        <div class="loading">
            Carregando publicações...
        </div>
    `

    try {
        const posts = await apiRequest(API.blog)

        if (!Array.isArray(posts)) {
            throw new Error("A rota do blog precisa retornar uma lista.")
        }

        const idsAutores = [...new Set(posts.map((post) => post.userId ?? post.user?.id).filter((id) => id != null))]

        const autores = new Map()

        await Promise.all(
            idsAutores.map(async (id) => {
                try {
                    const user = await apiRequest(`/users/${encodeURIComponent(id)}`)

                    autores.set(String(id), user)
                } catch (error) {
                    autores.set(String(id), null)
                }
            })
        )

        const relacoes = await apiRequest("/friends")
        const amigos = new Set(
            relacoes
                .filter(
                    (item) =>
                        isAcceptedFriendRelation(item) &&
                        (String(item.userId) === idUser || String(item.friendId) === idUser)
                )
                .map((item) => (String(item.userId) === idUser ? String(item.friendId) : String(item.userId)))
        )

        feed.innerHTML = ""

        const visiveis = posts.filter((post) => {
            const autorId = post.userId ?? post.user?.id
            const autor = autores.get(String(autorId)) || post.user
            return String(autorId) === idUser || !autor?.privado || amigos.has(String(autorId))
        })
        const ordenados = [...visiveis].reverse()

        ordenados.forEach((post) => {
            const userId = post.userId ?? post.user?.id

            if (userId != null) {
                post.user = autores.get(String(userId)) || post.user
            }

            feed.appendChild(criarPost(post))
        })

        if (visiveis.length === 0) {
            feed.innerHTML = `
                <div class="empty-feed">

                    <h3>Nenhuma publicação disponível</h3>

                    <p>
                        Publicações de perfis privados aparecem apenas para amigos.
                    </p>

                </div>
            `
        }

        searchInput.dispatchEvent(new Event("input"))
        const destino = document.getElementById(location.hash.slice(1))
        if (destino) destino.scrollIntoView({ block: "center" })
    } catch (error) {
        console.error("Erro no feed:", error)
        mensagemFeed.textContent = error.message

        feed.innerHTML = `
            <div class="empty-feed">

                <h3>Não foi possível carregar o feed</h3>

                <p>
                    Verifique se a API está funcionando.
                </p>

            </div>
        `
    }
}

/* =========================
   PUBLICAR
========================= */

publishButton.addEventListener("click", async () => {
    const conteudo = postContent.value.trim()

    if (!conteudo) {
        postContent.focus()

        return
    }

    publishButton.disabled = true

    publishButton.textContent = "Publicando..."

    try {
        const novoPost = await apiRequest(API.blog, {
            method: "POST",

            body: JSON.stringify({
                userId: usuarioLogado?.id ?? idUser,
                imagem: imagemPost,
                sistema: sistemaPost,
                user: {
                    id: usuarioLogado?.id ?? idUser
                },

                conteudo,

                created_at: new Date().toISOString()
            })
        })

        novoPost.user = usuarioLogado

        const empty = feed.querySelector(".empty-feed")

        if (empty) {
            feed.innerHTML = ""
        }

        feed.prepend(criarPost(novoPost))

        postContent.value = ""
        imagemPost = ""
        sistemaPost = ""
        arquivoImagem.value = ""
        previaImagem.hidden = true
        previaImagem.removeAttribute("src")
        atualizarFerramenta(ferramentas[0], "Adicionar imagem")
        atualizarFerramenta(ferramentas[1], "Escolher sistema")
        searchInput.dispatchEvent(new Event("input"))
    } catch (error) {
        console.error("Erro ao publicar:", error)

        await abrirModal({
            titulo: "Não foi possível publicar",
            mensagem: error.message || "Tente novamente em instantes.",
            confirmar: "Entendi",
            cancelar: false
        })
    } finally {
        publishButton.disabled = false

        publishButton.textContent = "Publicar"
    }
})

/* =========================
   CURTIDAS
========================= */

async function carregarCurtidasPost(article, postId) {
    try {
        const likes = await apiRequest(`/likes?postId=${postId}`)

        if (!Array.isArray(likes)) {
            return
        }

        const count = article.querySelector(".like-count")

        count.textContent = likes.length

        const minhaCurtida = likes.find((like) => {
            return String(like.userId) === String(idUser)
        })

        if (minhaCurtida) {
            article.querySelector(".like-button").classList.add("liked")
        }
    } catch (error) {
        console.error("Erro ao carregar curtidas:", error)
    }
}

async function buscarMinhaCurtida(postId) {
    try {
        const likes = await apiRequest(`/likes?postId=${postId}&userId=${idUser}`)

        if (!Array.isArray(likes)) {
            return null
        }

        return likes[0] || null
    } catch (error) {
        throw error
    }
}

document.addEventListener("click", async (event) => {
    const button = event.target.closest(".like-button")

    if (!button) {
        return
    }

    const article = button.closest(".post")

    const postId = article.dataset.postId

    button.disabled = true

    try {
        const curtida = await buscarMinhaCurtida(postId)

        if (curtida) {
            await apiRequest(`/likes/${curtida.id}`, {
                method: "DELETE"
            })

            button.classList.remove("liked")
        } else {
            await apiRequest("/likes", {
                method: "POST",

                body: JSON.stringify({
                    postId,
                    userId: usuarioLogado?.id ?? idUser
                })
            })

            const autorPost = String(article.dataset.userId || "")
            if (autorPost && autorPost !== String(idUser)) {
                adicionarAviso("Nova curtida", "Sua publicação recebeu uma curtida.", "success")
            }

            button.classList.add("liked")
        }

        await carregarCurtidasPost(article, postId)
    } catch (error) {
        console.error("Erro ao curtir:", error)
        mensagemFeed.textContent = error.message
    } finally {
        button.disabled = false
    }
})

/* =========================
   CONTADOR COMENTÁRIOS
========================= */

async function carregarContadorComentarios(article, postId) {
    try {
        const comentarios = await apiRequest(`/comments?postId=${postId}`)

        if (!Array.isArray(comentarios)) {
            return
        }

        article.querySelector(".comment-count").textContent = comentarios.length
    } catch (error) {
        console.error(error)
    }
}

/* =========================
   ABRIR COMENTÁRIOS
========================= */

document.addEventListener("click", async (event) => {
    const button = event.target.closest(".comment-button")

    if (!button) {
        return
    }

    const article = button.closest(".post")

    const area = article.querySelector(".comments-area")

    area.classList.toggle("open")

    if (area.classList.contains("open")) {
        await carregarComentarios(article, article.dataset.postId)
    }
})

/* =========================
   CARREGAR COMENTÁRIOS
========================= */

async function carregarComentarios(article, postId) {
    const lista = article.querySelector(".comments-list")

    lista.innerHTML = `
        <div class="empty-small">
            Carregando comentários...
        </div>
    `

    try {
        const comentarios = await apiRequest(`/comments?postId=${postId}`)

        lista.innerHTML = ""

        if (!Array.isArray(comentarios)) {
            return
        }

        for (const comentario of comentarios) {
            let user = null

            try {
                user = await apiRequest(`/users/${comentario.userId}`)
            } catch (error) {
                console.error(error)
            }

            adicionarComentario(lista, comentario, user)
        }

        if (comentarios.length === 0) {
            lista.innerHTML = `
                <div class="empty-small">
                    Nenhum comentário ainda.
                </div>
            `
        }
    } catch (error) {
        console.error("Erro nos comentários:", error)
        lista.textContent = error.message
    }
}

/* =========================
   MOSTRAR COMENTÁRIO
========================= */

function adicionarComentario(lista, comentario, user) {
    const nome = user?.nome || user?.email || "Usuário"

    const avatar = user?.avatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(nome)}`

    const item = document.createElement("div")

    item.className = "comment"

    const img = document.createElement("img")

    img.className = "comment-avatar"

    img.src = avatar

    img.alt = ""

    const body = document.createElement("div")

    body.className = "comment-body"

    const strong = document.createElement("strong")

    strong.textContent = nome

    const text = document.createElement("p")

    text.textContent = comentario.conteudo

    body.append(strong, text)

    item.append(img, body)

    lista.appendChild(item)
}

/* =========================
   ENVIAR COMENTÁRIO
========================= */

document.addEventListener("click", async (event) => {
    const button = event.target.closest(".send-comment")

    if (!button) {
        return
    }

    const article = button.closest(".post")

    const input = article.querySelector(".comment-form input")

    const conteudo = input.value.trim()

    if (!conteudo) {
        input.focus()

        return
    }

    const postId = article.dataset.postId

    button.disabled = true

    try {
        await apiRequest("/comments", {
            method: "POST",

            body: JSON.stringify({
                postId,

                userId: usuarioLogado?.id ?? idUser,

                conteudo,

                created_at: new Date().toISOString()
            })
        })

        const autorPost = String(article.dataset.userId || "")
        if (autorPost && autorPost !== String(idUser)) {
            adicionarAviso("Novo comentário", "Alguém comentou na sua publicação.", "info")
        }

        input.value = ""

        await carregarComentarios(article, postId)

        await carregarContadorComentarios(article, postId)
    } catch (error) {
        console.error("Erro ao comentar:", error)
        mensagemFeed.textContent = error.message
    } finally {
        button.disabled = false
    }
})

/* =========================
   ENTER NO COMENTÁRIO
========================= */

document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || !event.target.matches(".comment-form input")) {
        return
    }

    event.preventDefault()

    event.target.closest(".comment-form").querySelector(".send-comment").click()
})

/* =========================
   PESQUISA
========================= */

searchInput.addEventListener("input", () => {
    const pesquisa = searchInput.value.trim().toLowerCase()

    document.querySelectorAll(".post").forEach((post) => {
        const texto = post.textContent.toLowerCase()

        post.style.display = texto.includes(pesquisa) ? "" : "none"
    })
    const posts = [...feed.querySelectorAll(".post")]
    semResultados.hidden = !posts.length || posts.some((post) => post.style.display !== "none")
})

/* =========================
   CAMPANHAS
========================= */

async function carregarCampanhas() {
    try {
        const campanhas = await apiRequest("/campaigns")

        if (!Array.isArray(campanhas)) {
            return
        }

        openCampaigns.innerHTML = ""
        const participacoes = await apiRequest("/campaignMembers?userId=" + encodeURIComponent(idUser))

        const minhasCampanhas = campanhas.filter((campanha) => {
            return (
                String(campanha.masterId ?? campanha.mestreId) === String(idUser) ||
                participacoes.some((item) => String(item.campaignId) === String(campanha.id))
            )
        })

        campaignCount.textContent = minhasCampanhas.length

        const abertas = campanhas
            .filter((campanha) => {
                return campanha.status === "aberta" || campanha.status === "open"
            })
            .slice(0, 4)

        abertas.forEach((campanha) => {
            const item = document.createElement("div")

            item.className = "campaign-item"
            item.tabIndex = 0
            item.setAttribute("role", "link")
            item.addEventListener("keydown", (event) => {
                if (event.key === "Enter") item.click()
            })
            const capa = document.createElement("img")
            capa.className = "campaign-cover"
            capa.alt = ""
            if (campanha.capa) {
                capa.src = campanha.capa
                item.appendChild(capa)
            } else item.classList.add("sem-capa")

            const nome = document.createElement("strong")

            nome.textContent = campanha.nome

            const sistema = document.createElement("span")

            sistema.textContent = campanha.sistema || campanha.sistemaNome || ""

            const info = document.createElement("small")

            if (campanha.vagas != null) {
                info.textContent = `${campanha.vagas} vaga(s)`
            }
            if (!info.textContent) info.textContent = "Inscrições abertas"

            item.append(nome, sistema, info)

            item.addEventListener("click", () => {
                location.href = `../campanha/index.html?id=${campanha.id}`
            })

            openCampaigns.appendChild(item)
        })

        if (abertas.length === 0) {
            openCampaigns.innerHTML = `
                <div class="empty-small">
                    Nenhuma campanha disponível.
                </div>
            `
        }
    } catch (error) {
        openCampaigns.innerHTML = `
            <div class="empty-small">
                Nenhuma campanha disponível.
            </div>
        `
    }
}

/* =========================
   INICIAR
========================= */

async function iniciar() {
    if (!idUser || !token) return

    await carregarUsuario()
    try {
        const usuarios = await apiRequest("/users")
        document.getElementById("onlineCount").textContent = usuarios.length
        const jogadores = document.getElementById("communityPlayers")
        jogadores.replaceChildren()
        usuarios.slice(0, 5).forEach((usuario) => {
            const link = document.createElement("a")
            link.className = "community-player"
            link.href = "../perfil/index.html?id=" + encodeURIComponent(usuario.id)
            const avatar = document.createElement("img")
            avatar.alt = ""
            avatar.src = usuario.avatar || criarAvatar(usuario.nome || usuario.email)
            const nome = document.createElement("span")
            nome.textContent = usuario.nome || usuario.email
            link.append(avatar, nome)
            jogadores.appendChild(link)
        })
    } catch (erro) {
        mensagemFeed.textContent = erro.message
    }

    await Promise.all([carregarFeed(), carregarCampanhas()])
}

iniciar()
