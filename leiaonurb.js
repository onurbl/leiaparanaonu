(async function() {
    console.clear();
    console.warn = function() {};
    console.error = function() {};

    // 🔹 1. CONSULTA À IA GEMINI
    async function consultarGemini(pergunta, livro, opcoes) {
        try {
            const prompt = `(Responda APENAS com a letra da opção correta, sem explicações! Exemplo: "A") Com base no livro "${livro}", qual é a resposta correta para: "${pergunta}"? Opções: ${opcoes.join(", ")}`;

            const resposta = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyDtanrJtBBHgkmelHFhAowEXAyjLyM4Y1c", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            const data = await resposta.json();
            return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Erro";
        } catch (error) {
            console.error("Erro na API Gemini:", error);
            return "Erro";
        }
    }

    // 🔹 2. BLOQUEIO DE SEGURANÇA (Evitar DevTools)
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', e => {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I','C','U','J'].includes(e.key))) e.preventDefault();
    });

    // 🔹 3. TELA INICIAL (leiaONURB)
    async function showSplashScreen() {
        const splash = document.createElement('div');
        splash.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: white; display: flex; align-items: center; 
            justify-content: center; z-index: 9999; font-family: 'Roboto', sans-serif;
            font-size: 30px; color: #9B1C31; font-weight: bold;
        `;
        splash.innerHTML = 'leiaONURB';
        document.body.appendChild(splash);
        setTimeout(() => splash.remove(), 2000);
    }

    // 🔹 4. CARREGAR FONTES (Roboto + Font Awesome)
    const fontLoader = () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap';
        document.head.appendChild(link);
        
        const fontAwesome = document.createElement('link');
        fontAwesome.rel = 'stylesheet';
        fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
        document.head.appendChild(fontAwesome);
    };

    // 🔹 5. SELECIONAR RESPOSTA
    function selecionarResposta(letra) {
        const opcoesMap = { 
            A: 0, B: 1, C: 2, D: 3, E: 4,
            a: 0, b: 1, c: 2, d: 3, e: 4
        };
        
        if (!letra || !(letra.toUpperCase() in opcoesMap)) return false;

        const indice = opcoesMap[letra.toUpperCase()];
        let clicou = false;

        // Tenta clicar no md-radio-button
        const radioButtons = document.querySelectorAll('md-radio-button.choice-radio-button');
        if (indice < radioButtons.length) {
            radioButtons[indice].click();
            clicou = true;
        }

        // Tenta clicar no texto da opção (fallback)
        const opcoesTexto = document.querySelectorAll('.choice-student.choice-new-styles__answer');
        if (indice < opcoesTexto.length) {
            opcoesTexto[indice].click();
            clicou = true;
        }

        return clicou;
    }

    // 🔹 6. AVANÇAR PÁGINA DO LIVRO
    function avancarPaginaLivro() {
        const botaoProximaPagina = document.querySelector('button.page-switch-overlay-icon[id="right-page-btn"]');
        if (botaoProximaPagina && !botaoProximaPagina.disabled) {
            botaoProximaPagina.click();
            return true;
        }
        return false;
    }

    // 🔹 7. AVANÇAR PERGUNTA (Versão Corrigida)
    function avancarPergunta() {
        // Remove o botão de voz da página (se existir)
        const botaoVoz = document.querySelector('button.md-icon-button.tts-controls__btn__play');
        if (botaoVoz) {
            botaoVoz.style.display = 'none';
        }

        // Primeiro tenta encontrar o botão "Próximo" específico
        let botao = document.querySelector('button.md-button[ng-click="next()"]');
        
        // Se não encontrar, procura pelo botão "Terminar" específico
        if (!botao) {
            botao = document.querySelector('button.md-button[ng-click="finish()"]');
        }

        // Verificação extra para garantir que é o botão correto
        if (botao) {
            const texto = botao.innerText.trim();
            if (texto === 'Próximo' || texto === 'Terminar') {
                botao.click();
                return true;
            }
        }
        
        return false;
    }

    // 🔹 8. VERIFICAR SE TEM PERGUNTA NA PÁGINA
    function temPerguntaAtiva() {
        return !!document.querySelector('.question-quiz-text.ng-binding');
    }

    // 🔹 9. NOTIFICAÇÕES ESTILIZADAS
    async function exibirNotificacao(mensagem, tipo = "info") {
        const notificacao = document.createElement('div');
        notificacao.className = `notificacao ${tipo}`;
        notificacao.innerHTML = `
            <i class="fas fa-${tipo === 'sucesso' ? 'check' : tipo === 'erro' ? 'times' : 'info'}-circle"></i>
            <span>${mensagem}</span>
        `;
        document.body.appendChild(notificacao);
        setTimeout(() => notificacao.remove(), 3000);
    }

    // 🔹 10. BOTÃO PRINCIPAL ("Resposta IA")
    function criarBotao() {
        const botao = document.createElement('button');
        botao.id = "botao-ia";
        botao.innerHTML = '<i class="fas fa-robot"></i> Resposta IA';
        document.body.appendChild(botao);
        return botao;
    }

    // 🔹 11. PROCESSAR PERGUNTA
    async function processarPergunta() {
        const livro = document.querySelector('.truncate-text.ng-binding')?.innerText || "Livro desconhecido";
        const pergunta = document.querySelector('.question-quiz-text.ng-binding')?.innerText || "Pergunta não encontrada";
        const opcoes = [...document.querySelectorAll('.choice-student.choice-new-styles__answer')]
            .map(op => op.innerText.trim())
            .filter(Boolean);

        if (opcoes.length === 0) {
            await exibirNotificacao("Nenhuma opção encontrada!", "erro");
            return false;
        }

        await exibirNotificacao("Processando com IA...", "info");
        const respostaIA = await consultarGemini(pergunta, livro, opcoes);
        
        if (respostaIA && !respostaIA.includes("Erro")) {
            const sucessoSelecao = selecionarResposta(respostaIA);
            
            if (sucessoSelecao) {
                await exibirNotificacao(`Resposta ${respostaIA} selecionada!`, "sucesso");
                
                // Aguarda 3 segundos antes de avançar
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Tenta avançar a pergunta
                if (avancarPergunta()) {
                    await exibirNotificacao("Avançando...", "info");
                    return true;
                } else {
                    await exibirNotificacao("Não foi possível avançar", "erro");
                }
            } else {
                await exibirNotificacao(`Resposta IA: ${respostaIA} (falha ao selecionar)`, "erro");
            }
        } else {
            await exibirNotificacao("A IA não conseguiu responder", "erro");
        }
        return false;
    }

    // 🔹 12. LOOP PRINCIPAL
    async function iniciarLeituraAutomatica() {
        let continuar = true;
        while (continuar) {
            if (temPerguntaAtiva()) {
                console.log("Pergunta detectada - processando...");
                await processarPergunta();
                // Aguarda 5 segundos após processar pergunta
                await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
                console.log("Avançando página...");
                if (avancarPaginaLivro()) {
                    await exibirNotificacao("Avançando para próxima página...", "info");
                } else {
                    await exibirNotificacao("Não foi possível avançar a página", "erro");
                    continuar = false;
                }
                // Aguarda 5 segundos entre páginas
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    // 🔹 13. ESTILOS CSS (Botão + Notificações)
    function aplicarEstilos() {
        const css = `
            #botao-ia {
                position: fixed;
                top: 20px;
                left: 20px;
                background: linear-gradient(135deg, #9B1C31, #D12D4A);
                color: white;
                border: none;
                padding: 10px 15px;
                font-size: 14px;
                border-radius: 25px;
                cursor: pointer;
                z-index: 10000;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s;
            }
            #botao-ia:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 12px rgba(0,0,0,0.3);
            }
            #botao-ia i {
                font-size: 16px;
            }
            .notificacao {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #333;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                animation: fadeIn 0.3s;
            }
            .notificacao.sucesso { background: #4CAF50; }
            .notificacao.erro { background: #F44336; }
            .notificacao.info { background: #2196F3; }
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            * { user-select: none !important; }
        `;
        const style = document.createElement('style');
        style.innerHTML = css;
        document.head.appendChild(style);
    }

    // ⚡ INICIALIZAÇÃO (Executa tudo)
    fontLoader();
    aplicarEstilos();
    showSplashScreen();
    const botao = criarBotao();
    botao.addEventListener('click', iniciarLeituraAutomatica);
})();
