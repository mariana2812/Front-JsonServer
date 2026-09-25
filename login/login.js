const form = document.querySelector("form")
const message = document.querySelector("#message")

form.addEventListener("submit", async (event) => {
    event.preventDefault()
    const button = form.querySelector("button")
    button.disabled = true
    message.textContent = "Entrando..."
    try {
        const data = await apiRequest(API.login, {
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
