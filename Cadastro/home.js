function init() {
    const form = document.querySelector("form")
    const message = document.querySelector("#message")
    const button = form.querySelector("button")
    form.addEventListener("submit", async (event) => {
        event.preventDefault()
        button.disabled = true
        message.textContent = "Criando conta..."
        try {
            const data = await apiRequest(API.cadastro, {
                method: "POST",
                body: JSON.stringify({
                    email: document.querySelector("#email").value.trim(),
                    password: document.querySelector("#senha").value
                })
            })
            saveSession(data)
          
            location.href = "../Blog/"
        } catch (error) {
            message.textContent = error.message
        } finally {
            button.disabled = false
        }
    })
}
init()
