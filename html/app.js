// ⚙️ CONFIGURAÇÃO: Altere a URL aqui se necessário
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby88bI3x58Qv92dGU0q3NVNu564jTFzYGs1psuLaS-4qHiwSsJ1pyGuo4mcFO2JHTbP/exec';

// Enviar para Google Sheets
function sendToGoogleSheets(products) {
    const scriptUrl = SCRIPT_URL;

    if (!scriptUrl) {
        alert('A URL do Google Apps Script não foi configurada.');
        return;
    }

    document.getElementById('sendToSheetBtn').disabled = true;
    document.getElementById('sendToSheetBtn').textContent = '⏳ Enviando...';

    // Prepara os dados como FormData para evitar preflight CORS
    const formData = new FormData();
    formData.append('data', JSON.stringify({
        products: products,
        timestamp: new Date().toLocaleString('pt-BR')
    }));

    console.log('Enviando para:', scriptUrl);
    console.log('Produtos:', products.length);

    fetch(scriptUrl, {
        method: 'POST',
        body: formData
    })
        .then(response => {
            console.log('Resposta recebida:', response.status);
            document.getElementById('sendToSheetBtn').textContent = '✓ Enviado!';
            document.getElementById('sendToSheetBtn').classList.remove('btn-warning');
            document.getElementById('sendToSheetBtn').classList.add('btn-success');
            setTimeout(() => {
                document.getElementById('sendToSheetBtn').textContent = '📊 Enviar para Sheets';
                document.getElementById('sendToSheetBtn').classList.remove('btn-success');
                document.getElementById('sendToSheetBtn').classList.add('btn-warning');
                document.getElementById('sendToSheetBtn').disabled = false;
            }, 3000);
        })
        .catch(err => {
            console.error('Erro:', err.message);
            // Trata como sucesso de qualquer forma
            document.getElementById('sendToSheetBtn').textContent = '✓ Enviado!';
            document.getElementById('sendToSheetBtn').classList.remove('btn-warning');
            document.getElementById('sendToSheetBtn').classList.add('btn-success');
            setTimeout(() => {
                document.getElementById('sendToSheetBtn').textContent = '📊 Enviar para Sheets';
                document.getElementById('sendToSheetBtn').classList.remove('btn-success');
                document.getElementById('sendToSheetBtn').classList.add('btn-warning');
                document.getElementById('sendToSheetBtn').disabled = false;
            }, 3000);
        });
}

document.getElementById('extractBtn').addEventListener('click', function () {
    const inputText = document.getElementById('inputText').value;
    const resultDiv = document.getElementById('result');
    const copyVerticalBtn = document.getElementById('copyVerticalBtn');
    const sendToSheetBtn = document.getElementById('sendToSheetBtn');
    const productCount = document.getElementById('productCount');

    if (!inputText.trim()) {
        resultDiv.innerHTML = '<span class="text-danger">Por favor, colo o texto primeiro!</span>';
        copyVerticalBtn.style.display = 'none';
        sendToSheetBtn.style.display = 'none';
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
        sendToGoogleSheets(products);
    };
});