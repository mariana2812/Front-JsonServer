document.getElementById("perfil").addEventListener("click", () => {
    location.href = "../perfil/index.html#editar"
})
document.getElementById("sair").addEventListener("click", sair)

async function carregarConta() {
    const usuario = await apiRequest("/users/" + encodeURIComponent(localStorage.getItem("idUser")))
    document.getElementById("email").textContent = "E-mail: " + usuario.email
}

if (verificarLogin()) executarAcao(carregarConta)()
