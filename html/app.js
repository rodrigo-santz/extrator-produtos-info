// ⚙️ CONFIGURAÇÃO: Altere a URL aqui se necessário
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxYBQXQmyP5G-96uZ4YE8F1pAI5qUJ83OYJ3yPQ6UtKPHJwNPIZt7OGpR997cZVAmrx/exec';

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

    postToAppsScript(scriptUrl, payload)
        .then(() => {
            activeButton.textContent = successLabel;
            activeButton.classList.remove(defaultClass);
            activeButton.classList.add('btn-success');
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

    // Divide o texto em produtos usando o padrão "1/2" ou similar no início
    const productPattern = /\d+\/\d+\s*\n/g;
    const matches = [...inputText.matchAll(productPattern)];

    if (matches.length === 0) {
        resultDiv.innerHTML = '<span class="text-danger"> Não foi possivel capturar nenhum produto. Certifique-se de que cada produto começa com "1/2", "1/4", etc.</span>';
        copyVerticalBtn.style.display = 'none';
        sendToSheetBtn.style.display = 'none';
        sendRejectedBtn.style.display = 'none';
        productCount.style.display = 'none';
        return;
    }

    // Divide em blocos de produtos
    const products = [];
    const seenProducts = new Set();
    for (let i = 0; i < matches.length; i++) {
        const startIndex = matches[i].index;
        const endIndex = i < matches.length - 1 ? matches[i + 1].index : inputText.length;
        let productText = inputText.substring(startIndex, endIndex).trim();

        // Remove linhas indesejadas
        productText = productText
            .replace(/^\d+\/\d+\s*\n/gm, '') // Remove 1/2, 1/4, etc
            .replace(/^img-carousel\s*\n/gm, '')
            .replace(/^Previous slide\s*\n/gm, '')
            .replace(/^Next slide\s*\n/gm, '')
            .replace(/^Pendente\s*$/gm, '')
            .replace(/^Variações\s*\n/gm, '')
            .replace(/^Nenhum atributo informado\s*$/gm, '')
            .replace(/^Mostrando de \d+ até \d+ de \d+\s*$/gm, '')
            .replace(/^[«‹›»\d\s]+$/gm, '') // Remove linhas com símbolos de navegação
            .replace(/\n{3,}/g, '\n\n') // Remove linhas em branco extras
            .trim();

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

    // Mostra todos os produtos separados
    const productsWithQuotes = products.map(p => '"' + p.replace(/"/g, '""') + '"');
    const resultForCopyVertical = productsWithQuotes.join('\n');
    const resultForDisplay = products.join('\n\n' + '─'.repeat(80) + '\n\n');

    resultDiv.textContent = resultForDisplay;
    resultDiv.classList.remove('text-muted');
    copyVerticalBtn.style.display = 'inline-block';
    sendToSheetBtn.style.display = 'inline-block';
    sendRejectedBtn.style.display = 'inline-block';
    productCount.style.display = 'inline-block';
    productCount.textContent = `${products.length} produto${products.length !== 1 ? 's' : ''}`;

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

    // Enviar para Google Sheets
    sendToSheetBtn.onclick = function () {
        sendToGoogleSheets(products, 'approved');
    };

    // Enviar reprovados para Google Sheets (coluna A)
    sendRejectedBtn.onclick = function () {
        sendToGoogleSheets(products, 'rejected');
    };
});