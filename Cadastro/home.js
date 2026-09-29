function init() {
    const form = document.querySelector("form");
    const message = document.querySelector("#message");
    const button = form.querySelector("button");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        button.disabled = true;
        message.textContent = "Criando conta...";

        try {
            // A rota padrão do json-server-auth para criar conta é /register
            const response = await fetch("http://localhost:3001/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: document.querySelector("#email").value.trim(),
                    password: document.querySelector("#senha").value
                })
            });

            if (!response.ok) throw new Error("Erro ao criar conta. Este email já existe?");

            const data = await response.json();
            
            // Salva token e ID retornados pela API
            localStorage.setItem("accessToken", data.accessToken);
            localStorage.setItem("idUser", data.user.id);
          
            // Após o cadastro, obriga o usuário a escolher avatar e nome
            location.href = "../perfil/index.html"; 
        } catch (error) {
            message.textContent = error.message;
        } finally {
            button.disabled = false;
        }
    });
}

init();