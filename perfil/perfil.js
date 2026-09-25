const inputNome = document.getElementById('nome');
const avatarPreview = document.getElementById('avatar-preview');
const formPerfil = document.getElementById('form-perfil');

// 1. Atualizar o avatar em tempo real
// inputNome.addEventListener('input', (evento) => {
//     // Pega o valor digitado ou usa 'novo' se estiver vazio
//     const seed = evento.target.value.trim() || 'novo';

//     // O DiceBear possui vários estilos (bottts, avataaars, pixel-art, etc)
//     // Estamos usando o estilo 'bottts' (robôs), mas você pode alterar na URL
//     const urlDiceBear = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(seed)}`;

//     avatarPreview.src = urlDiceBear;
// });

async function avatarJsonServer() {
    const res = await fetch("http://localhost:3001/avatar")
    console.log(res,'1')
    const resJson = await res.json()
    console.log(resJson, "res")
    const div = document.querySelector(".avatar-wrapper")
    resJson.forEach(async(item) => {
        const avatar = item.url
        div.insertAdjacentHTML("beforeend",`
             <img id="avatar-preview" src=${avatar} alt="Avatar do Usuário" width="100" height="100">
            
            `)

    })
}

avatarJsonServer()
// 2. Salvar os dados no json-server (Criação)
formPerfil.addEventListener('submit', async (evento) => {
    evento.preventDefault(); // Evita que a página recarregue

    const dadosPerfil = {
        nome: inputNome.value,
        biografia: document.getElementById('biografia').value,
        avatar: avatarPreview.src // Salva a URL gerada pelo DiceBear
    };

    try {
        // Considerando que o seu db.json terá um array "usuarios"
        const resposta = await fetch('http://localhost:3000/usuarios', {
            method: 'POST', // Para CRIAR um novo perfil
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosPerfil)
        });

        if (resposta.ok) {
            alert('Perfil criado com sucesso!');
            // formPerfil.reset(); // Opcional: limpar formulário após salvar
        }
    } catch (erro) {
        console.error('Erro ao salvar o perfil:', erro);
        alert('Não foi possível salvar o perfil. Verifique se o json-server está rodando.');
    }
});