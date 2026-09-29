const inputNome = document.getElementById('nome');
const formPerfil = document.getElementById('form-perfil');
const divAvatares = document.querySelector('.avatar-wrapper');

let avatarSelecionado = ''; 

async function avatarJsonServer() {
    try {
        const res = await fetch("http://localhost:3001/avatar"); 
        const resJson = await res.json();
        divAvatares.innerHTML = ''; 

        resJson.forEach((item) => {
            const imgHTML = `
                <img class="avatar-option" src="${item.url}" alt="Avatar ${item.id}" width="80" height="80" data-url="${item.url}">
            `;
            divAvatares.insertAdjacentHTML("beforeend", imgHTML);
        });

        const imagensGeradas = document.querySelectorAll('.avatar-option');
        imagensGeradas.forEach(img => {
            img.addEventListener('click', (evento) => {
                imagensGeradas.forEach(i => i.classList.remove('selecionado'));
                evento.target.classList.add('selecionado');
                avatarSelecionado = evento.target.getAttribute('data-url');
            });
        });
    } catch (erro) {
        console.error("Erro ao buscar avatares:", erro);
    }
}

avatarJsonServer();

formPerfil.addEventListener('submit', async (evento) => {
    evento.preventDefault(); 

    if (avatarSelecionado === '') {
        alert("Por favor, selecione um avatar clicando em uma das imagens antes de salvar!");
        return; 
    }

    const idUser = localStorage.getItem("idUser");
    const token = localStorage.getItem("accessToken");
    
    // Se não estiver logado, manda pro login
    if (!idUser || !token) {
        alert("Sessão expirada. Faça login novamente.");
        location.href = "../login/index.html";
        return;
    }

    const dadosPerfil = {
        nome: inputNome.value,
        biografia: document.getElementById('biografia').value || "Sem biografia",
        avatar: avatarSelecionado
    };

    try {
        const resposta = await fetch(`http://localhost:3001/users/${idUser}`, {
            method: 'PATCH', 
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(dadosPerfil)
        });

        if (resposta.ok) {
            alert('Perfil atualizado com sucesso!');
            // Redireciona para o mural após configurar o perfil
            location.href = "../Blog/index.html";
        }
    } catch (erro) {
        console.error('Erro ao salvar o perfil:', erro);
    }
});