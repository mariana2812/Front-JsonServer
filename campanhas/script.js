const idUser = localStorage.getItem("idUser")
const form = document.getElementById("formCampanha")
let versaoCapa = 0
document.getElementById("capa").addEventListener("change", executarAcao(async () => {
    const versao = ++versaoCapa
    const previa = document.getElementById("previaCapa")
    previa.hidden = true
    const imagem = await lerImagem(document.getElementById("capa").files[0])
    if (versao !== versaoCapa) return
    previa.src = imagem
    previa.hidden = !imagem
}))

form.addEventListener("submit", executarAcao(async () => {
    const nome = document.getElementById("nome").value.trim()
    const sistema = document.getElementById("sistema").value.trim()
    const descricao = document.getElementById("descricao").value.trim()
    const maxJogadores = Number(document.getElementById("maxJogadores").value)
    if (!nome || !sistema || !descricao) throw new Error("Preencha todos os campos.")
    if (!Number.isInteger(maxJogadores) || maxJogadores < 2 || maxJogadores > 20) {
        throw new Error("Escolha entre 2 e 20 jogadores.")
    }
    const capa = await lerImagem(document.getElementById("capa").files[0])
    const campanha = await apiRequest("/campaigns", {
        method: "POST",
        body: JSON.stringify({
            nome,
            sistema,
            descricao,
            maxJogadores,
            capa,
            masterId: idUser,
            status: "aberta",
            created_at: new Date().toISOString()
        })
    })
    form.reset()
    location.href = "../campanha/index.html?id=" + encodeURIComponent(campanha.id)
}))

async function carregarCampanhas() {
    const campanhas = await apiRequest("/campaigns")
    const area = document.getElementById("campanhas")
    area.replaceChildren()
    if (!campanhas.length) area.textContent = "Nenhuma campanha criada."
    campanhas.reverse().forEach((campanha) => {
        const card = document.createElement("article")
        card.className = "card"
        if (campanha.capa) {
            const capa = document.createElement("img")
            capa.className = "capa-lista"
            capa.src = campanha.capa
            capa.alt = "Capa de " + campanha.nome
            card.appendChild(capa)
        }
        const nome = document.createElement("h3")
        nome.textContent = campanha.nome
        const sistema = document.createElement("span")
        sistema.className = "tag"
        sistema.textContent = campanha.sistema || campanha.sistemaNome
        const descricao = document.createElement("p")
        descricao.textContent = campanha.descricao
        const link = document.createElement("a")
        link.className = "botao"
        link.textContent = "Ver campanha"
        link.href = "../campanha/index.html?id=" + encodeURIComponent(campanha.id)
        card.append(nome, sistema, descricao, link)
        area.appendChild(card)
    })
}

if (verificarLogin()) executarAcao(carregarCampanhas)()
