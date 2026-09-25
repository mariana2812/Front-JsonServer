const inputNome = document.getElementById('nome');
const formPerfil = document.getElementById('form-perfil');
const divAvatares = document.querySelector('.avatar-wrapper');

// Variável global para guardar a URL do avatar que o usuário escolher
let avatarSelecionado = ''; 

// 1. Buscar avatares no json-server e renderizar na tela
async function avatarJsonServer() {
    try {
        // ATENÇÃO: Confirme se a porta do seu db.json é 3000 ou 3001
        const res = await fetch("http://localhost:3001/avatar"); 
        const resJson = await res.json();
        
        divAvatares.innerHTML = ''; // Limpa a div antes de preencher

        resJson.forEach((item) => {
            // Criamos a imagem usando CLASS em vez de ID
            // Salvamos a URL num atributo customizado chamado 'data-url'
            const imgHTML = `
                <img 
                    class="avatar-option" 
                    src="${item.url}" 
                    alt="Avatar ${item.id}" 
                    width="80" 
                    height="80"
                    data-url="${item.url}"
                >
            `;
            divAvatares.insertAdjacentHTML("beforeend", imgHTML);
        });

        // 2. Adicionar o evento de clique para SELECIONAR o avatar
        const imagensGeradas = document.querySelectorAll('.avatar-option');
        
        imagensGeradas.forEach(img => {
            img.addEventListener('click', (evento) => {
                // Remove a classe 'selecionado' de todas as imagens primeiro
                imagensGeradas.forEach(i => i.classList.remove('selecionado'));
                
                // Adiciona a classe 'selecionado' APENAS na imagem que foi clicada
                evento.target.classList.add('selecionado');
                
                // Salva a URL dessa imagem na nossa variável
                avatarSelecionado = evento.target.getAttribute('data-url');
            });
        });

    } catch (erro) {
        console.error("Erro ao buscar avatares:", erro);
    }
}

// Chama a função assim que a página carrega
avatarJsonServer();


// 3. Salvar os dados no json-server (Criação de Usuário)
formPerfil.addEventListener('submit', async (evento) => {
    evento.preventDefault(); 

    // Validação: Verifica se o usuário clicou em algum avatar
    if (avatarSelecionado === '') {
        alert("Por favor, selecione um avatar clicando em uma das imagens antes de salvar!");
        return; // Para a execução aqui e não envia o formulário
    }

    const dadosPerfil = {
        nome: inputNome.value,
        biografia: document.getElementById('biografia').value,
        avatar: avatarSelecionado // Envia a URL do avatar que foi clicado
    };

    try {
        const resposta = await fetch('http://localhost:3001/users', {
            method: 'POST', 
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosPerfil)
        });

        if (resposta.ok) {
            alert('Perfil criado com sucesso!');
            // Opcional: Limpar o formulário e a seleção após salvar
            formPerfil.reset();
            avatarSelecionado = '';
            document.querySelectorAll('.avatar-option').forEach(i => i.classList.remove('selecionado'));
        }
    } catch (erro) {
        console.error('Erro ao salvar o perfil:', erro);
        alert('Não foi possível salvar o perfil. Verifique se o json-server está rodando.');
    }
});