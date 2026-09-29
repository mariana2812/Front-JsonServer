function montarNavegacao() {
    const topo = document.querySelector(".topo")
    if (!topo) return
    const pagina = location.pathname.split("/").filter(Boolean).at(-2)
    const links = [
        ["Blog", "Taverna", "hash"],
        ["descobrir", "Descobrir jogadores", "compass"],
        ["campanhas", "Campanhas", "swords"],
        ["mensagens", "Mensagens", "message-circle"],
        ["comunidades", "Comunidades", "castle"],
        ["perfil", "Meu perfil", "user-round"],
        ["configuracoes", "Configurações", "settings"]
    ]
    document.body.classList.add("app-comunidade")
    if (pagina === "mensagens") document.body.classList.add("app-mensagens")
    const lateral = document.createElement("aside")
    lateral.className = "app-lateral"
    lateral.innerHTML = `
        <a class="app-marca" href="../Blog/index.html">Front<span>D</span><small>A sua próxima aventura</small></a>
        <a class="app-conversas" href="../mensagens/index.html"><i data-lucide="messages-square"></i><span>Suas conversas<small>Mensagens diretas</small></span><i data-lucide="chevron-right"></i></a>
        <p class="app-grupo">PONTO DE ENCONTRO</p><nav aria-label="Navegação principal"></nav>
        <a class="app-criar" href="../campanhas/index.html#formCampanha"><i data-lucide="plus"></i> Criar campanha</a>
        <a class="app-voltar" href="../Blog/index.html"><i data-lucide="arrow-left"></i> Voltar à taverna</a>`
    for (const [pasta, nome, icone] of links) {
        const link = document.createElement("a")
        link.href = "../" + pasta + "/index.html"
        const ativo = pasta === pagina || (pagina === "campanha" && pasta === "campanhas")
        if (ativo) link.setAttribute("aria-current", "page")
        link.innerHTML = `<i data-lucide="${icone}"></i><span></span>`
        link.querySelector("span").textContent = nome
        lateral.querySelector("nav").appendChild(link)
    }
    const titulo = document.title.split(" - ")[0]
    topo.replaceChildren()
    const alternar = document.createElement("button")
    alternar.type = "button"
    alternar.className = "app-menu-botao"
    alternar.title = "Abrir navegação"
    alternar.setAttribute("aria-label", "Abrir navegação")
    alternar.setAttribute("aria-expanded", "false")
    alternar.innerHTML = '<i data-lucide="menu"></i>'
    const notificacoes = document.createElement("button")
    notificacoes.type = "button"
    notificacoes.className = "app-notificacoes"
    notificacoes.title = "Notificações"
    notificacoes.setAttribute("aria-label", "Notificações")
    notificacoes.innerHTML = '<i data-lucide="bell"></i>'
    const nome = document.createElement("strong")
    nome.textContent = "# " + titulo
    const perfil = document.createElement("a")
    perfil.href = "../perfil/index.html"
    perfil.textContent = "Meu perfil"
    topo.append(alternar, nome, notificacoes, perfil)
    const fundo = document.createElement("button")
    fundo.type = "button"
    fundo.className = "app-menu-fundo"
    fundo.setAttribute("aria-label", "Fechar navegação")
    fundo.hidden = true
    function fecharMenu() {
        document.body.classList.remove("menu-aberto")
        alternar.setAttribute("aria-expanded", "false")
        fundo.hidden = true
    }
    alternar.addEventListener("click", () => {
        const aberto = document.body.classList.toggle("menu-aberto")
        alternar.setAttribute("aria-expanded", String(aberto))
        fundo.hidden = !aberto
    })
    fundo.addEventListener("click", fecharMenu)
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && document.body.classList.contains("menu-aberto")) {
            fecharMenu()
            alternar.focus()
        }
    })
    document.body.prepend(lateral, fundo)
    document.querySelectorAll(".campo").forEach((campo) => {
        const label = campo.querySelector("label")
        const input = campo.querySelector("input, textarea, select")
        if (label && input?.id) label.htmlFor = input.id
    })
    if (window.lucide) lucide.createIcons()
    else {
        const biblioteca = document.createElement("script")
        biblioteca.src = "https://unpkg.com/lucide@0.468.0/dist/umd/lucide.min.js"
        biblioteca.onload = () => lucide.createIcons()
        document.head.appendChild(biblioteca)
    }
}

montarNavegacao()
