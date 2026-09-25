const API = {
    baseUrl: "http://localhost:3001",
    cadastro: "/Cadastro",
    login: "/login",
    blog: "/Blog"
}

async function apiRequest(path, options = {}) {
    const token = localStorage.getItem("accessToken")
    
    let response
    try {
        response = await fetch(API.baseUrl + path, {
            ...options,
            headers: {
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...options.headers
            }
        })
    } catch {
        throw new Error("Não foi possível conectar ao servidor. Verifique se a API está rodando na porta 3001.")
    }
    const text = await response.text()
    let data
    try {
        data = text ? JSON.parse(text) : null
    } catch {
        throw new Error("O servidor retornou uma resposta inválida.")
    }
    if (!response.ok) {
        throw new Error(typeof data === "string" ? data : data?.message || `Erro na requisição (${response.status}).`)
    }
    return data
}

function saveSession(data) {
    if (!data?.accessToken || data?.user?.id == null) {
        throw new Error("A API precisa retornar accessToken e user.id para iniciar a sessão.")
    }
    localStorage.removeItem("blogID")
    localStorage.setItem("accessToken", data.accessToken)
    localStorage.setItem("idUser", data.user.id)
}
