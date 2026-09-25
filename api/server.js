const http = require("http")
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

const PORT = 3001
const databasePath = path.join(__dirname, "db.json")
const sessions = new Map()

function readDatabase() {
    return JSON.parse(fs.readFileSync(databasePath, "utf8"))
}

function writeDatabase(database) {
    fs.writeFileSync(databasePath, `${JSON.stringify(database, null, 2)}\n`)
}

function send(response, status, data) {
    response.writeHead(status, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Content-Type": "application/json; charset=utf-8"
    })
    response.end(JSON.stringify(data))
}

function readBody(request) {
    return new Promise((resolve, reject) => {
        let body = ""
        request.on("data", chunk => body += chunk)
        request.on("end", () => {
            try {
                resolve(body ? JSON.parse(body) : {})
            } catch {
                reject(new Error("JSON inválido."))
            }
        })
        request.on("error", reject)
    })
}

function getAuthenticatedUser(request, database) {
    const token = request.headers.authorization?.replace("Bearer ", "")
    const userId = sessions.get(token)
    return database.users.find(user => String(user.id) === String(userId))
}

function sessionResponse(user) {
    const accessToken = crypto.randomBytes(24).toString("hex")
    sessions.set(accessToken, user.id)
    return { accessToken, user: { id: user.id, email: user.email } }
}

const server = http.createServer(async (request, response) => {
    if (request.method === "OPTIONS") {
        send(response, 204, null)
        return
    }

    const url = new URL(request.url, `http://localhost:${PORT}`)
    const database = readDatabase()

    try {
        if (request.method === "POST" && url.pathname === "/Cadastro") {
            const body = await readBody(request)
            if (!body.email || !body.password) {
                send(response, 400, { message: "Email e senha são obrigatórios." })
                return
            }
            if (database.users.some(user => user.email.toLowerCase() === body.email.toLowerCase())) {
                send(response, 409, { message: "Este email já está cadastrado." })
                return
            }
            const user = { id: database.nextUserId++, email: body.email, password: body.password }
            database.users.push(user)
            writeDatabase(database)
            send(response, 201, sessionResponse(user))
            return
        }

        if (request.method === "POST" && url.pathname === "/login") {
            const body = await readBody(request)
            const user = database.users.find(item => item.email === body.email && item.password === body.password)
            if (!user) {
                send(response, 401, { message: "Email ou senha inválidos." })
                return
            }
            send(response, 200, sessionResponse(user))
            return
        }

        if (url.pathname === "/Blog") {
            const user = getAuthenticatedUser(request, database)
            if (!user) {
                send(response, 401, { message: "Sessão inválida. Faça login novamente." })
                return
            }
            if (request.method === "GET") {
                const userId = url.searchParams.get("user.id")
                const blogs = database.blogs.filter(blog => !userId || String(blog.user.id) === String(userId))
                send(response, 200, blogs)
                return
            }
            if (request.method === "POST") {
                const body = await readBody(request)
                const blog = { id: database.nextBlogId++, user: { id: user.id }, blog: [] }
                database.blogs.push(blog)
                writeDatabase(database)
                send(response, 201, blog)
                return
            }
        }

        send(response, 404, { message: "Rota não encontrada." })
    } catch (error) {
        send(response, 400, { message: error.message })
    }
})

server.listen(PORT, () => {
    console.log(`API disponível em http://localhost:${PORT}`)
})