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
