const idUser = localStorage.getItem("idUser")
const form = document.getElementById("formComunidade")
let comunidadeEditada = null
const cancelarEdicao = document.createElement("button")
cancelarEdicao.type = "button"
cancelarEdicao.className = "botao-secundario"
cancelarEdicao.textContent = "Cancelar"
cancelarEdicao.hidden = true
form.appendChild(cancelarEdicao)
function finalizarEdicao() {
    comunidadeEditada = null
    form.reset()
    form.querySelector("button").textContent = "Criar comunidade"
    form.closest("section").querySelector("h2").textContent = "Criar comunidade"
    cancelarEdicao.hidden = true
}
cancelarEdicao.addEventListener("click", finalizarEdicao)

form.addEventListener("submit", executarAcao(async () => {
    const nome = document.getElementById("nome").value.trim()
    const descricao = document.getElementById("descricao").value.trim()
    if (!nome || !descricao) throw new Error("Preencha o nome e a descrição.")
    if (comunidadeEditada) {
        const atual = await apiRequest("/communities/" + encodeURIComponent(comunidadeEditada))
        if (String(atual.ownerId) !== idUser) throw new Error("Somente o criador pode editar a comunidade.")
        await apiRequest("/communities/" + encodeURIComponent(comunidadeEditada), {
            method: "PATCH",
            body: JSON.stringify({ nome, descricao })
        })
    } else {
        await apiRequest("/communities", {
            method: "POST",
            body: JSON.stringify({ nome, descricao, ownerId: idUser })
        })
    }
    finalizarEdicao()
    await carregarComunidades()
}))

async function carregarComunidades() {
    const comunidades = await apiRequest("/communities")
    const membros = await apiRequest("/communityMembers")
    const area = document.getElementById("comunidades")
    area.replaceChildren()
    if (!comunidades.length) area.textContent = "Nenhuma comunidade criada."
    comunidades.forEach((comunidade) => {
        const card = document.createElement("article")
        card.className = "card"
        const nome = document.createElement("h3")
        nome.textContent = comunidade.nome
        const descricao = document.createElement("p")
        descricao.textContent = comunidade.descricao
        const botao = document.createElement("button")
        botao.className = "botao"
        const membro = membros.find(
            (item) => String(item.communityId) === String(comunidade.id) && String(item.userId) === idUser
        )
        const dono = String(comunidade.ownerId) === idUser
        botao.textContent = dono ? "Sua comunidade" : membro ? "Sair" : "Entrar"
        botao.disabled = dono
        botao.addEventListener("click", executarAcao(async () => {
            const atuais = await apiRequest(
                "/communityMembers?communityId=" +
                    encodeURIComponent(comunidade.id) +
                    "&userId=" +
                    encodeURIComponent(idUser)
            )
            if (membro) {
                for (const atual of atuais)
                    await apiRequest("/communityMembers/" + encodeURIComponent(atual.id), {
                        method: "DELETE"
                    })
            } else if (!atuais.length) {
                await apiRequest("/communityMembers", {
                    method: "POST",
                    body: JSON.stringify({ communityId: comunidade.id, userId: idUser })
                })
            }
            await carregarComunidades()
        }))
        card.append(nome, descricao, botao)
        if (dono || membro) {
            const abrirChat = document.createElement("a")
            abrirChat.className = "botao-secundario"
            abrirChat.textContent = "Abrir chat"
            abrirChat.href = "../mensagens/index.html?comunidade=" + encodeURIComponent(comunidade.id)
            card.appendChild(abrirChat)
        }
        if (dono) {
            const editar = document.createElement("button")
            editar.type = "button"
            editar.className = "botao-secundario"
            editar.textContent = "Editar comunidade"
            editar.addEventListener("click", () => {
                comunidadeEditada = comunidade.id
                document.getElementById("nome").value = comunidade.nome
                document.getElementById("descricao").value = comunidade.descricao
                form.querySelector("button").textContent = "Salvar alterações"
                form.closest("section").querySelector("h2").textContent = "Editar comunidade"
                cancelarEdicao.hidden = false
                document.getElementById("nome").focus()
            })
            card.appendChild(editar)
        }
        const quantidade = document.createElement("p")
        const participantes = new Set(
            membros
                .filter((item) => String(item.communityId) === String(comunidade.id))
                .map((item) => String(item.userId))
        )
        participantes.add(String(comunidade.ownerId))
        quantidade.textContent = participantes.size + " participante(s)"
        card.insertBefore(quantidade, botao)
        if (dono || membro) {
            const ver = document.createElement("button")
            ver.type = "button"
            ver.className = "botao-secundario ver-participantes"
            ver.textContent = "Ver participantes"
            ver.setAttribute("aria-expanded", "false")
            const lista = document.createElement("div")
            lista.className = "comunidade-participantes"
            lista.hidden = true
            ver.addEventListener("click", executarAcao(async () => {
                if (!lista.hidden) {
                    lista.hidden = true
                    ver.setAttribute("aria-expanded", "false")
                    return
                }
                const usuarios = await apiRequest("/users")
                lista.replaceChildren()
                usuarios
                    .filter((usuario) => participantes.has(String(usuario.id)))
                    .forEach((usuario) => {
                        const link = document.createElement("a")
                        link.href = "../perfil/index.html?id=" + encodeURIComponent(usuario.id)
                        const avatar = document.createElement("img")
                        avatar.src = usuario.avatar || criarAvatar(usuario.nome || usuario.email)
                        avatar.alt = ""
                        const nome = document.createElement("span")
                        nome.textContent = usuario.nome || usuario.email
                        link.append(avatar, nome)
                        lista.appendChild(link)
                    })
                lista.hidden = false
                ver.setAttribute("aria-expanded", "true")
            }))
            card.append(ver, lista)
        }
        area.appendChild(card)
    })
}

if (verificarLogin()) executarAcao(carregarComunidades)()
