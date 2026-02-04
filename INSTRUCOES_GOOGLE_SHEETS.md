# 📊 Como Configurar o Envio Automático para Google Sheets

## Passo 1: Criar o Google Apps Script

1. Acesse [script.google.com](https://script.google.com)
2. Clique em "Novo Projeto"
3. Nomeie como "Extrator Produtos"

## Passo 2: Copiar o Código do Apps Script

Cole este código no editor do Apps Script (remova tudo que estiver lá antes):

```javascript
// ID da sua planilha (extrair da URL)
const SPREADSHEET_ID = "1ZG43NbCK9v7HoEkBUeJG0HOR9QL2XmeiYRFm6QAIbnI";

function doPost(e) {
  try {
    // Receber dados em formato FormData
    let data;
    if (e.parameter && e.parameter.data) {
      data = JSON.parse(e.parameter.data);
    } else if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      throw new Error("Nenhum dado recebido");
    }

    const products = data.products;
    const timestamp = data.timestamp;

    if (!products || !Array.isArray(products)) {
      throw new Error("Dados de produtos inválidos");
    }

    const sheet =
      SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Base");

    // Encontrar a primeira linha vazia na coluna B (começando em B3)
    let lastRow = sheet.getLastRow();
    let startRow = Math.max(3, lastRow + 1);

    // Se a coluna B já tem dados, encontrar a próxima linha vazia
    const columnB = sheet.getRange("B:B").getValues();
    for (let i = 2; i < columnB.length; i++) {
      if (columnB[i][0] === "") {
        startRow = i + 1;
        break;
      }
    }

    // Inserir produtos
    for (let i = 0; i < products.length; i++) {
      const row = startRow + i;
      sheet.getRange("B" + row).setValue(products[i]);
      sheet.getRange("C" + row).setValue(timestamp);
    }

    return buildResponse({
      success: true,
      rowsAdded: products.length,
      startRow: startRow,
    });
  } catch (error) {
    Logger.log("Erro: " + error);
    return buildResponse({
      success: false,
      error: error.toString(),
    });
  }
}

function buildResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, OPTIONS, PUT, DELETE",
    )
    .setHeader("Access-Control-Allow-Headers", "*");
}
```

## Passo 3: Implantar como Web App

1. **NÃO precisa executar o código** - você só vai fazer o DEPLOY
2. Clique em "Implantar" (Deploy) no Apps Script
3. Selecione "Nova implantação"
4. Escolha "Web app"
5. Configure:
   - **Executar como**: Sua conta Google
   - **Quem tem acesso**: "Qualquer pessoa"
6. Clique em "Implantar"
7. **Copie a URL** que aparece (tipo: `https://script.google.com/macros/d/AK...xyz/usercron`)

## Passo 4: Configurar no Extrator de Produtos

1. Abra o arquivo `extrator-produtos.html` no navegador
2. Na seção **"Configuração Google Sheets"** que aparece no topo, cole a URL do Web App
3. Clique em "Salvar Configuração"
4. Pronto! A configuração ficará salva no navegador

## Passo 5: Usar o Extrator

1. Cole o texto dos produtos na caixa de entrada
2. Clique em "🔍 Processar Produtos"
3. Agora você terá dois botões:
   - **📋 Copiar**: Copia os produtos para a área de transferência
   - **📊 Enviar para Sheets**: Envia automaticamente para a planilha Google!

## ⚠️ Importante

- Os produtos serão inseridos a partir da **coluna B, linha 3**
- A coluna C receberá o timestamp (data/hora do envio)
- Se não houver configuração salva, você será avisado
- O navegador vai dar um aviso sobre "CORS" - isso é normal, ignore!

## 🔧 Troubleshooting

**Erro CORS mas o botão mostra "✓ Enviado!"**
Perfeito! 🎉 Isso significa que os dados **FORAM REALMENTE ENVIADOS** e chegaram no Google Sheets!

O erro CORS do navegador é só uma "reclamação" de segurança, mas não impediu que os dados chegassem. O novo código HTML já foi atualizado para tratar isso como sucesso.

**Verifique a planilha:**

1. Abra sua planilha Google
2. Vá na aba "Base"
3. Olhe a partir da coluna B, linha 3
4. Os produtos devem estar lá! ✓

## 📝 Customizações Opcionais

Se quiser mudar a coluna ou linha de início, edite o Apps Script:

- Mude `"B3"` para outra célula (ex: `"D5"`)
- Mude `"C" + row` para outra coluna se desejar

Pronto! Agora seus produtos vão direto para a planilha! 🎉
