const form = document.querySelector("form");
const message = document.querySelector("#message");

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button");
    button.disabled = true;
    message.textContent = "Entrando...";

    try {
        // A rota padrão do json-server-auth para login é /login
        const response = await fetch("http://localhost:3001/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: document.querySelector("#email").value.trim(),
                password: document.querySelector("#senha").value
            })
        });

        if (!response.ok) throw new Error("Email ou senha incorretos.");

        const data = await response.json();
        
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("idUser", data.user.id);
        
        // Vai direto para o mural
        location.href = "../Blog/index.html";
    } catch (error) {
        message.textContent = error.message;
    } finally {
        button.disabled = false;
    }
});