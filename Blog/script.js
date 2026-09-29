async function getBlog() {
    const userId = localStorage.getItem("idUser")
    if (!userId || !localStorage.getItem("accessToken")) {
        location.replace("../Login/")
        return
    }
    
    const message = document.querySelector("#message")
    const list = document.querySelector("#posts")
    list.replaceChildren()
    message.textContent = "Carregando..."

    try {
        const blogs = await apiRequest(`${API.blog}?user.id=${encodeURIComponent(userId)}`)
        if (!Array.isArray(blogs)) {
            throw new Error("A API deve retornar uma lista de blogs.")
        }
    /* =========================================================
   FRONTD - FEED
========================================================= */


/* =========================================================
   CONFIGURAÇÃO DA API
========================================================= */

/*
    API de exemplo.

    Depois podemos trocar pela API que vocês
    realmente utilizarão no trabalho.
*/

const API_URL =
    "https://rickandmortyapi.com/api/character";


/* =========================================================
   ELEMENTOS
========================================================= */

const feed =
    document.getElementById("feed");

const searchInput =
    document.getElementById("searchInput");


/* =========================================================
   CORES DO FEED
========================================================= */

/*
    Cada personagem terá uma cor.

    Quando o usuário rolar até determinado
    post, o fundo muda.
*/

const feedColors = [

    {
        background: "#43075f",
        secondary: "#0b56b3"
    },

    {
        background: "#00b34a",
        secondary: "#0cc6ff"
    },

    {
        background: "#ca8607",
        secondary: "#f5150e"
    },

    {
        background: "#bb0c81",
        secondary: "#a90bf1"
    },

    {
        background: "#044e17",
        secondary: "#064952"
    },

    {
        background: "#6cdf00",
        secondary: "#bb8001"
    }

];


/* =========================================================
   ALTERAR FUNDO
========================================================= */

function alterarFundo(index) {

    const color =
        feedColors[index % feedColors.length];


    document.body.style.setProperty(
        "--background",
        color.background
    );


    document.body.style.setProperty(
        "--background-secondary",
        color.secondary
    );
}


/* =========================================================
   CRIAR POST
========================================================= */

function criarPost(personagem, index) {

    const post =
        document.createElement("article");


    post.classList.add("post");


    /*
        Cada post recebe uma cor própria.

        Isso será usado pelo IntersectionObserver.
    */

    const color =
        feedColors[index % feedColors.length];


    post.dataset.background =
        color.background;


    post.dataset.secondary =
        color.secondary;


    post.innerHTML = `

        <div class="post-header">

            <img
                class="post-avatar"
                src="${personagem.image}"
                alt="${personagem.name}"
            >

            <div class="post-user">

                <strong>
                    ${personagem.name}
                </strong>

                <span>
                    Personagem • FrontD
                </span>

            </div>

        </div>


        <div class="post-text">

            Conheça <strong>${personagem.name}</strong>!

            <br><br>

            Status:
            <strong>${personagem.status}</strong>

            <br>

            Espécie:
            <strong>${personagem.species}</strong>

        </div>


        <img
            class="post-character"
            src="${personagem.image}"
            alt="Imagem de ${personagem.name}"
        >


        <div class="post-actions">

            <button>
                ❤️ Curtir
            </button>

            <button>
                💬 Comentar
            </button>

            <button>
                🔄 Compartilhar
            </button>

            <button>
                🔖 Salvar
            </button>

        </div>

    `;


    feed.appendChild(post);


    return post;
}


/* =========================================================
   CARREGAR PERSONAGENS
========================================================= */

async function carregarPersonagens() {

    try {

        const resposta =
            await fetch(API_URL);


        if (!resposta.ok) {

            throw new Error(
                "Erro ao acessar a API."
            );

        }


        const dados =
            await resposta.json();


        feed.innerHTML = "";


        /*
            Vamos pegar os primeiros personagens.
        */

        const personagens =
            dados.results.slice(0, 10);


        personagens.forEach(
            (personagem, index) => {

                criarPost(
                    personagem,
                    index
                );

            }
        );


        iniciarObservador();


    } catch (erro) {

        console.error(erro);


        feed.innerHTML = `

            <div class="loading">

                ❌ Não foi possível carregar
                os personagens.

                <br><br>

                Verifique a conexão com a API.

            </div>

        `;

    }

}


/* =========================================================
   MUDAR FUNDO DURANTE A NAVEGAÇÃO
========================================================= */

function iniciarObservador() {

    const posts =
        document.querySelectorAll(".post");


    const observer =
        new IntersectionObserver(

            (entries) => {

                entries.forEach(
                    (entry) => {

                        /*
                            Quando o post estiver
                            suficientemente visível...
                        */

                        if (
                            entry.isIntersecting
                        ) {

                            const background =
                                entry.target.dataset.background;


                            const secondary =
                                entry.target.dataset.secondary;


                            document.body.style.setProperty(
                                "--background",
                                background
                            );


                            document.body.style.setProperty(
                                "--background-secondary",
                                secondary
                            );

                        }

                    }
                );

            },

            {
                threshold: 0.45
            }

        );


    posts.forEach(
        (post) => {

            observer.observe(post);

        }
    );

}


/* =========================================================
   PESQUISA
========================================================= */

searchInput.addEventListener(
    "input",
    () => {

        const texto =
            searchInput.value
                .toLowerCase()
                .trim();


        const posts =
            document.querySelectorAll(".post");


        posts.forEach(
            (post) => {

                const conteudo =
                    post.innerText.toLowerCase();


                if (
                    conteudo.includes(texto)
                ) {

                    post.style.display =
                        "block";

                } else {

                    post.style.display =
                        "none";

                }

            }
        );

    }
);


/* =========================================================
   BOTÕES DE CURTIDA
========================================================= */

document.addEventListener(
    "click",
    (event) => {

        const botao =
            event.target.closest(
                ".post-actions button"
            );


        if (!botao) {
            return;
        }


        /*
            Identifica o botão de Curtir.
        */

        if (
            botao.innerText.includes(
                "Curtir"
            )
        ) {

            if (
                botao.classList.contains(
                    "liked"
                )
            ) {

                botao.classList.remove(
                    "liked"
                );

                botao.innerHTML =
                    "❤️ Curtir";

            } else {

                botao.classList.add(
                    "liked"
                );

                botao.innerHTML =
                    "💜 Curtido";

            }

        }

    }
);


/* =========================================================
   INICIAR
========================================================= */

carregarPersonagens();
        let blog = blogs.find(item => String(item.user?.id) === userId)
        if (!blog) {
            blog = await apiRequest(API.blog, {
                method: "POST",
                body: JSON.stringify({ user: { id: userId }, fandom: [], blog: [] })
            })
        }

        if (blog && blog.blog == null) blog.blog = []

        if (blog?.id == null || !Array.isArray(blog.blog)) {
            throw new Error("O blog retornado pela API precisa ter id e uma lista blog.")
        }

        localStorage.setItem("blogID", blog.id)
        for (const post of blog.blog) {
            const item = document.createElement("li")


            if (typeof post === "string") {
                item.textContent = post
            } 
            
            else {
                const title = document.createElement("h2")
                title.textContent = post?.title || post?.titulo || "Sem título"
                const content = document.createElement("p")
                content.textContent = post?.body || post?.content || post?.conteudo || ""
                item.append(title, content)
            }
            list.appendChild(item)
        }
        message.textContent = blog.blog.length ? "" : "Você ainda não tem publicações."
    } catch (error) {
        message.textContent = error.message
    }
}

document.querySelector("#logout").addEventListener("click", () => {
    for (const key of ["accessToken", "idUser", "blogID"]) {
        localStorage.removeItem(key)
    }
    location.href = "../Login/"
})

getBlog()
