const idUser = localStorage.getItem("idUser")
const pesquisa = document.getElementById("pesquisa")
let usuarios = []
let amigos = new Set()

async function carregarUsuarios() {
    usuarios = await apiRequest("/users")
    const relacoes = await apiRequest("/friends")
    amigos = new Set(
        relacoes
            .filter(
                (item) =>
                    isAcceptedFriendRelation(item) &&
                    (String(item.userId) === idUser || String(item.friendId) === idUser)
            )
            .map((item) => (String(item.userId) === idUser ? String(item.friendId) : String(item.userId)))
    )
    mostrarUsuarios()
}

function mostrarUsuarios() {
    const area = document.getElementById("usuarios")
    const texto = pesquisa.value.trim().toLowerCase()
    area.replaceChildren()
    const resultado = usuarios.filter(
        (usuario) =>
            String(usuario.id) !== idUser && `${usuario.nome || ""} ${usuario.email}`.toLowerCase().includes(texto)
    )
    if (!resultado.length) area.textContent = "Nenhum jogador encontrado."
    resultado.forEach((usuario) => {
        const item = document.createElement("div")
        item.className = "item-lista"
        const avatar = document.createElement("img")
        avatar.className = "avatar"
        avatar.alt = ""
        avatar.src = usuario.avatar || criarAvatar(usuario.nome || usuario.email)
        const info = document.createElement("div")
        info.className = "item-info"
        const nome = document.createElement("strong")
        nome.textContent = usuario.nome || usuario.email
        const bio = document.createElement("p")
        const privado = usuario.privado === true || usuario.privado === "true"
        bio.textContent =
            privado && !amigos.has(String(usuario.id)) ? "Perfil privado" : usuario.biografia || "Sem biografia"
        const link = document.createElement("a")
        link.className = "botao"
        link.textContent = "Ver perfil"
        link.href = "../perfil/index.html?id=" + encodeURIComponent(usuario.id)
        info.append(nome, bio)
        item.append(avatar, info, link)
        area.appendChild(item)
    })
}

pesquisa.addEventListener("input", mostrarUsuarios)
if (verificarLogin()) executarAcao(carregarUsuarios)()
