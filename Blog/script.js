/* =========================================================
   BARREIRA DE SEGURANÇA E DADOS GERAIS
========================================================= */
const idUser = localStorage.getItem("idUser");
const token = localStorage.getItem("accessToken");

if (!idUser || !token) {
    location.replace("../login/index.html");
}

const feed = document.getElementById("feed");
const searchInput = document.getElementById("searchInput");

/* =========================================================
   CORES DO FEED E OBSERVER (Mantido)
========================================================= */
const feedColors = [
    { background: "#43075f", secondary: "#0b56b3" },
    { background: "#00b34a", secondary: "#0cc6ff" },
    { background: "#ca8607", secondary: "#f5150e" },
    { background: "#bb0c81", secondary: "#a90bf1" },
    { background: "#044e17", secondary: "#064952" },
    { background: "#6cdf00", secondary: "#bb8001" }
];

function iniciarObservador() {
    const postsElements = document.querySelectorAll(".post");
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const background = entry.target.dataset.background;
                const secondary = entry.target.dataset.secondary;
                document.body.style.setProperty("--background", background);
                document.body.style.setProperty("--background-secondary", secondary);
            }
        });
    }, { threshold: 0.45 });

    postsElements.forEach((post) => observer.observe(post));
}

/* =========================================================
   CRIAR E CARREGAR POSTS (Integrado com json-server)
========================================================= */
function criarPost(post, index) {
    const postElement = document.createElement("article");
    postElement.classList.add("post");

    const color = feedColors[index % feedColors.length];
    postElement.dataset.background = color.background;
    postElement.dataset.secondary = color.secondary;

    // Se o user_id cruzar corretamente, pegamos nome e avatar; senão, dados genéricos
    const nomeAutor = post.user?.nome || post.user?.email || "Anônimo";
    const avatarAutor = post.user?.avatar || "https://api.dicebear.com/9.x/bottts/svg?seed=novo";

    postElement.innerHTML = `
        <div class="post-header">
            <img class="post-avatar" src="${avatarAutor}" alt="${nomeAutor}" width="50" style="border-radius:50%">
            <div class="post-user">
                <strong>${nomeAutor}</strong>
                <span>Dev • FrontD</span>
            </div>
        </div>

        <div class="post-text">
            ${post.conteudo || post.body}
        </div>

        <div class="post-actions">
            <button>❤️ Curtir</button>
            <button>💬 Comentar</button>
            <button>🔄 Compartilhar</button>
        </div>
    `;

    feed.appendChild(postElement);
}

async function carregarFeed() {
    try {
        // _expand=user cruza o post com os dados de quem o publicou
        const resposta = await fetch("http://localhost:3001/posts?_expand=user", {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!resposta.ok) throw new Error("Erro ao acessar os posts.");

        const posts = await resposta.json();
        feed.innerHTML = "";

        // Inverte para mostrar os mais novos no topo
        posts.reverse().forEach((post, index) => {
            criarPost(post, index);
        });

        iniciarObservador();
    } catch (erro) {
        console.error(erro);
        feed.innerHTML = `<div class="loading">❌ Não foi possível carregar os posts.</div>`;
    }
}

/* =========================================================
   PESQUISA NO FEED E CURTIDAS (Mantido)
========================================================= */
searchInput.addEventListener("input", () => {
    const texto = searchInput.value.toLowerCase().trim();
    const postsElements = document.querySelectorAll(".post");

    postsElements.forEach((post) => {
        const conteudo = post.innerText.toLowerCase();
        post.style.display = conteudo.includes(texto) ? "block" : "none";
    });
});

document.addEventListener("click", (event) => {
    const botao = event.target.closest(".post-actions button");
    if (!botao) return;

    if (botao.innerText.includes("Curtir")) {
        botao.classList.toggle("liked");
        botao.innerHTML = botao.classList.contains("liked") ? "💜 Curtido" : "❤️ Curtir";
    }
});

/* =========================================================
   INICIALIZAÇÃO
========================================================= */
carregarFeed();