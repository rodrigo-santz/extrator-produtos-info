// ⚙️ CONFIGURAÇÃO: Altere a URL aqui se necessário
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz4Sj05M50kF8T3FrEfZ6f5XegfTANul3jvUI-n5iYFO1OhWPkzejhZKwM4urZ64n3u/exec';

// Armazenar produtos excluídos
let excludedProducts = [];
let currentFilteredProducts = [];

function postToAppsScript(scriptUrl, payload) {
    return new Promise((resolve, reject) => {
        try {
            const iframeId = 'appsScriptSubmitFrame';
            let iframe = document.getElementById(iframeId);

            if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.id = iframeId;
                iframe.name = iframeId;
                iframe.style.display = 'none';
                document.body.appendChild(iframe);
            }

            const form = document.createElement('form');
            form.method = 'POST';

            form.action = scriptUrl;
            form.target = iframeId;
            form.style.display = 'none';

            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'data';
            input.value = JSON.stringify(payload);
            form.appendChild(input);

            document.body.appendChild(form);
            form.submit();

            setTimeout(() => {
                form.remove();
                resolve();
            }, 300);
        } catch (error) {
            reject(error);
        }
    });
}

// Enviar para Google Sheets
function sendToGoogleSheets(products, destination = 'approved') {
    const scriptUrl = SCRIPT_URL;

    if (!scriptUrl) {
        alert('A URL do Google Apps Script não foi configurada.');
        return;
    }

    const isRejected = destination === 'rejected';
    const buttonId = isRejected ? 'sendRejectedBtn' : 'sendToSheetBtn';
    const sendingLabel = isRejected ? '⏳ Enviando reprovados...' : '⏳ Enviando...';
    const successLabel = isRejected ? '✓ Reprovados enviados!' : '✓ Enviado!';
    const defaultLabel = isRejected ? '🚫 ENVIAR reprovados para Sheets' : '📊 Enviar para Sheets';
    const defaultClass = isRejected ? 'btn-danger' : 'btn-warning';
    const activeButton = document.getElementById(buttonId);

    const approvedButton = document.getElementById('sendToSheetBtn');
    const rejectedButton = document.getElementById('sendRejectedBtn');

    approvedButton.disabled = true;
    rejectedButton.disabled = true;

    activeButton.textContent = sendingLabel;

    const payload = {
        products: products,
        timestamp: new Date().toLocaleString('pt-BR'),
        destination: destination
    };

    console.log('Enviando para:', scriptUrl);
    console.log('Produtos:', products.length);

    return postToAppsScript(scriptUrl, payload)
        .then(() => {
            activeButton.textContent = successLabel;
            activeButton.classList.remove(defaultClass);
            activeButton.classList.add('btn-success');
            // Limpa o campo de input e a área de resultados após envio bem-sucedido
            try {
                const inputTextEl = document.getElementById('inputText');
                const resultDivEl = document.getElementById('result');
                const copyVerticalBtnEl = document.getElementById('copyVerticalBtn');
                const sendToSheetBtnEl = document.getElementById('sendToSheetBtn');
                const sendRejectedBtnEl = document.getElementById('sendRejectedBtn');
                const productCountEl = document.getElementById('productCount');

                if (inputTextEl) inputTextEl.value = '';
                if (resultDivEl) {
                    resultDivEl.textContent = 'Os produtos aparecerão aqui após processar...';
                    resultDivEl.classList.add('text-muted');
                }
                if (copyVerticalBtnEl) copyVerticalBtnEl.style.display = 'none';
                if (sendToSheetBtnEl) sendToSheetBtnEl.style.display = 'none';
                if (sendRejectedBtnEl) sendRejectedBtnEl.style.display = 'none';
                if (productCountEl) productCountEl.style.display = 'none';
            } catch (e) {
                console.warn('Não foi possível limpar a UI após envio:', e.message);
            }

            setTimeout(() => {
                activeButton.textContent = defaultLabel;
                activeButton.classList.remove('btn-success');
                activeButton.classList.add(defaultClass);
                approvedButton.disabled = false;
                rejectedButton.disabled = false;
            }, 3000);
        })
        .catch(err => {
            console.error('Erro no envio:', err.message);
            activeButton.textContent = '❌ Falha no envio';
            if (!isRejected) {
                activeButton.classList.remove('btn-warning');
                activeButton.classList.add('btn-danger');
            }

            alert(`Não foi possível enviar para o Sheets.\n\nDetalhe: ${err.message}`);

            setTimeout(() => {
                activeButton.textContent = defaultLabel;
                activeButton.classList.remove('btn-success');
                activeButton.classList.remove('btn-danger');
                activeButton.classList.add(defaultClass);
                approvedButton.disabled = false;
                rejectedButton.disabled = false;
            }, 3000);
        });
}

document.getElementById('extractBtn').addEventListener('click', function () {
    const inputText = document.getElementById('inputText').value;
    const resultDiv = document.getElementById('result');
    const copyVerticalBtn = document.getElementById('copyVerticalBtn');
    const sendToSheetBtn = document.getElementById('sendToSheetBtn');
    const sendRejectedBtn = document.getElementById('sendRejectedBtn');
    const productCount = document.getElementById('productCount');

    if (!inputText.trim()) {
        resultDiv.innerHTML = '<span class="text-danger">Por favor, colo o texto primeiro!</span>';
        copyVerticalBtn.style.display = 'none';
        sendToSheetBtn.style.display = 'none';
        sendRejectedBtn.style.display = 'none';
        productCount.style.display = 'none';
        return;
    }

    const splitByMarkers = (text, markerRegex) => {
        const matches = [...text.matchAll(markerRegex)];
        const blocks = [];

        for (let i = 0; i < matches.length; i++) {
            const startIndex = matches[i].index;
            const endIndex = i < matches.length - 1 ? matches[i + 1].index : text.length;
            blocks.push(text.substring(startIndex, endIndex).trim());
        }

        return blocks;
    };

    // Delimitador principal: cada card começa em "img-carousel"
    const markerByCarousel = /^img-carousel\s*$/gm;
    let rawProductBlocks = splitByMarkers(inputText, markerByCarousel);

    // Fallback: tenta com paginação (1/1, 1/2, etc) se houver "Pendente"
    if (rawProductBlocks.length === 0 && inputText.includes('Pendente')) {
        const markerByPagination = /^\d+\/\d+\s*$/gm;
        rawProductBlocks = splitByMarkers(inputText, markerByPagination);
    }

    // Fallback para textos antigos, caso não haja nenhum marcador anterior
    if (rawProductBlocks.length === 0) {
        const markerByPagination = /^\d+\/\d+\s*$/gm;
        rawProductBlocks = splitByMarkers(inputText, markerByPagination);
    }

    if (rawProductBlocks.length === 0) {
        resultDiv.innerHTML = '<span class="text-danger">Não foi possível capturar nenhum produto. Tente copiar novamente incluindo os blocos com "img-carousel".</span>';
        copyVerticalBtn.style.display = 'none';
        sendToSheetBtn.style.display = 'none';
        sendRejectedBtn.style.display = 'none';
        productCount.style.display = 'none';
        return;
    }

    // Limpa blocos e remove duplicados
    const products = [];
    const seenProducts = new Set();
    for (const block of rawProductBlocks) {
        let productText = block;

        // Remove linhas indesejadas
        productText = productText
            .replace(/^\d+\/\d+\s*\n/gm, '') // Remove 1/2, 1/4, etc
            .replace(/^img-carousel\s*\n?/gm, '')
            .replace(/^Previous slide\s*\n/gm, '')
            .replace(/^Next slide\s*\n/gm, '')
            .replace(/^Pendente\s*$/gm, '')
            .replace(/^Variações\s*\n/gm, '')
            .replace(/^Nenhum atributo informado\s*$/gm, '')
            .replace(/^Mostrando de \d+ até \d+ de \d+\s*$/gm, '')
            .replace(/^[«‹›»\d\s\/]+$/gm, '') // Remove linhas com símbolos de navegação/paginação
            .replace(/\n{3,}/g, '\n\n') // Remove linhas em branco extras
            .trim();

        if (!productText) {
            continue;
        }

        const skuMatch = productText.match(/^SKU:\s*(.+)$/m);
        const sellerMatch = productText.match(/^Seller:\s*(.+)$/m);
        const titleLine = productText.split('\n').find(line => line.trim());

        const sku = skuMatch ? skuMatch[1].trim() : '';
        const seller = sellerMatch ? sellerMatch[1].trim() : '';
        const title = titleLine ? titleLine.trim() : '';

        const productKey = sku ? `sku:${sku}` : `${title}||${seller}`;

        if (!seenProducts.has(productKey)) {
            seenProducts.add(productKey);
            products.push(productText);
        }
    }

    if (products.length === 0) {
        resultDiv.innerHTML = '<span class="text-danger">Nenhum produto válido foi encontrado após a limpeza do texto.</span>';
        copyVerticalBtn.style.display = 'none';
        sendToSheetBtn.style.display = 'none';
        sendRejectedBtn.style.display = 'none';
        productCount.style.display = 'none';
        return;
    }

    // Filtra produtos com Categoria: Medicamentos ou Categoria: Remédios
    const excludedWarning = document.getElementById('excludedWarning');
    const addExcludedBtn = document.getElementById('addExcludedBtn');
    const filteredProducts = [];
    excludedProducts = []; // Limpa excluídos anteriores
    let medicamentosCount = 0;
    let remediosCount = 0;

    for (const product of products) {
        const isMedicamentos = /^Categoria:\s*Medicamentos\s*$/m.test(product);
        const isRemedios = /^Categoria:\s*Remédios\s*$/m.test(product);

        if (isMedicamentos) {
            medicamentosCount++;
            excludedProducts.push(product);
        } else if (isRemedios) {
            remediosCount++;
            excludedProducts.push(product);
        } else {
            filteredProducts.push(product);
        }
    }

    // Mostra aviso se houver produtos excluídos
    const totalExcluded = medicamentosCount + remediosCount;
    if (totalExcluded > 0) {
        let warningText = `Um total de ${products.length} produtos foram encontrados.`;
        if (medicamentosCount > 0) {
            warningText += ` Medicamentos: ${medicamentosCount}`;
        }
        if (remediosCount > 0) {
            warningText += `${medicamentosCount > 0 ? ',' : ''} Remédios: ${remediosCount}`;
        }
        excludedWarning.textContent = warningText;
        excludedWarning.style.display = 'inline-block';
        addExcludedBtn.style.display = 'inline-block';
    } else {
        excludedWarning.style.display = 'none';
        addExcludedBtn.style.display = 'none';
    }

    // Se todos foram excluídos
    if (filteredProducts.length === 0) {
        resultDiv.innerHTML = '<span class="text-warning">Todos os produtos foram excluídos por conterem Categoria: Medicamentos ou Remédios.</span>';
        const copyVerticalBtn = document.getElementById('copyVerticalBtn');
        const sendToSheetBtn = document.getElementById('sendToSheetBtn');
        const sendRejectedBtn = document.getElementById('sendRejectedBtn');
        const productCount = document.getElementById('productCount');
        copyVerticalBtn.style.display = 'none';
        sendToSheetBtn.style.display = 'none';
        sendRejectedBtn.style.display = 'inline-block';
        productCount.style.display = 'none';

        // Botões para enviar excluídos
        sendRejectedBtn.textContent = '🚫 ENVIAR EXCLUÍDOS (reprovados) para Sheets';
        const addExcludedBtnLocal = document.getElementById('addExcludedBtn');

        // Envia como reprovados
        sendRejectedBtn.onclick = function () {
            sendToGoogleSheets(excludedProducts, 'rejected')
                .then(() => {
                    excludedProducts = [];
                    if (addExcludedBtnLocal) addExcludedBtnLocal.style.display = 'none';
                    if (excludedWarning) excludedWarning.style.display = 'none';
                })
                .catch(() => { });
        };
        return;
    }

    // Mostra todos os produtos separados
    currentFilteredProducts = filteredProducts; // Armazena produtos atuais

    const productsWithQuotes = filteredProducts.map(p => '"' + p.replace(/"/g, '""') + '"');
    const resultForCopyVertical = productsWithQuotes.join('\n');
    const resultForDisplay = filteredProducts.join('\n\n' + '─'.repeat(80) + '\n\n');

    resultDiv.textContent = resultForDisplay;
    resultDiv.classList.remove('text-muted');
    copyVerticalBtn.style.display = 'inline-block';

    // Se houver produtos excluídos, mostra botões para reprovar/enviar excluídos
    if (totalExcluded > 0) {
        // Mostrar o botão de envio principal apenas se houver produtos filtrados (aprováveis)
        if (filteredProducts.length > 0) {
            sendToSheetBtn.style.display = 'inline-block';
            sendToSheetBtn.onclick = function () {
                sendToGoogleSheets(filteredProducts, 'approved');
            };
        } else {
            sendToSheetBtn.style.display = 'none';
        }

        // Mostrar botão de reprovar (excluídos/reprovados)
        sendRejectedBtn.style.display = 'inline-block';
        sendRejectedBtn.textContent = '🚫 ENVIAR reprovados para Sheets';

        // Envia os produtos excluídos como reprovados e limpa a lista após envio
        sendRejectedBtn.onclick = function () {
            const addExcludedBtnLocal = document.getElementById('addExcludedBtn');
            sendToGoogleSheets(excludedProducts, 'rejected')
                .then(() => {
                    excludedProducts = [];
                    if (addExcludedBtnLocal) addExcludedBtnLocal.style.display = 'none';
                    excludedWarning.style.display = 'none';
                })
                .catch(() => { });
        };

        addExcludedBtn.onclick = function () {
            // Exibe somente os excluídos e permite enviar apenas como reprovados
            const onlyExcluded = excludedProducts;
            resultDiv.textContent = onlyExcluded.join('\n\n' + '─'.repeat(80) + '\n\n');
            sendToSheetBtn.style.display = 'none';
            sendRejectedBtn.style.display = 'inline-block';
            addExcludedBtn.style.display = 'none';
            productCount.textContent = `${onlyExcluded.length} produto${onlyExcluded.length !== 1 ? 's' : ''}`;

            const newProductsWithQuotes = onlyExcluded.map(p => '"' + p.replace(/"/g, '""') + '"');
            const newResultForCopyVertical = newProductsWithQuotes.join('\n');

            // Envia apenas os excluídos como reprovados
            sendRejectedBtn.onclick = function () {
                sendToGoogleSheets(onlyExcluded, 'rejected')
                    .then(() => {
                        excludedProducts = [];
                        excludedWarning.style.display = 'none';
                    })
                    .catch(() => {});
            };

            // Atualiza cópia
            copyVerticalBtn.onclick = function () {
                navigator.clipboard.writeText(newResultForCopyVertical).then(function () {
                    const originalText = copyVerticalBtn.textContent;
                    copyVerticalBtn.textContent = '✓ Copiado!';
                    copyVerticalBtn.classList.remove('btn-light');
                    copyVerticalBtn.classList.add('btn-success');
                    setTimeout(function () {
                        copyVerticalBtn.textContent = originalText;
                        copyVerticalBtn.classList.remove('btn-success');
                        copyVerticalBtn.classList.add('btn-light');
                    }, 2000);
                }).catch(function (err) {
                    alert('Erro ao copiar. Tente usar Ctrl+C manualmente.');
                    console.error('Erro:', err);
                });
            };
        };
    } else {
        sendToSheetBtn.style.display = 'inline-block';
        sendRejectedBtn.style.display = 'none';
        addExcludedBtn.style.display = 'none';
        // Envia produtos filtrados como aprovados
        sendToSheetBtn.onclick = function () {
            sendToGoogleSheets(filteredProducts, 'approved');
        };
        // Envia produtos filtrados como reprovados
        sendRejectedBtn.onclick = function () {
            sendToGoogleSheets(filteredProducts, 'rejected');
        };
    }

    productCount.style.display = 'inline-block';
    productCount.textContent = `${filteredProducts.length} produto${filteredProducts.length !== 1 ? 's' : ''}`;

    // Copia vertical (em linhas)
    copyVerticalBtn.onclick = function () {
        navigator.clipboard.writeText(resultForCopyVertical).then(function () {
            const originalText = copyVerticalBtn.textContent;
            copyVerticalBtn.textContent = '✓ Copiado!';
            copyVerticalBtn.classList.remove('btn-light');
            copyVerticalBtn.classList.add('btn-success');
            setTimeout(function () {
                copyVerticalBtn.textContent = originalText;
                copyVerticalBtn.classList.remove('btn-success');
                copyVerticalBtn.classList.add('btn-light');
            }, 2000);
        }).catch(function (err) {
            alert('Erro ao copiar. Tente usar Ctrl+C manualmente.');
            console.error('Erro:', err);
        });
    };
});