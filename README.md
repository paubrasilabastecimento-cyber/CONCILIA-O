# Estoque Oficial Guarabira (CDD Ambev)

Sistema completo de controle, conciliação e conferência de estoque diário e mensal, com suporte a conciliação fiscal/física (relatórios 02.05.02 e 02.03.04), congelamento de saldos, controle de quebras/avarias, check de lançamento e exportação oficial de grade para o Promax (`importacaoGrade.csv`).

---

## 🚀 Como acessar o sistema online (Já compilado e rodando)

Você **não precisa compilar manualmente no GitHub** para usar a plataforma! O sistema já roda em tempo real na nuvem através do Google AI Studio / Cloud Run:

* **Link da Aplicação:** Acesse diretamente pelo seu navegador no computador ou celular através do link do preview do Google AI Studio.

---

## 💻 Como compilar e rodar no seu computador (Local)

Caso queira baixar o código do GitHub e rodar no seu computador:

### Pré-requisitos
* Ter o **[Node.js](https://nodejs.org/)** instalado (versão 18 ou superior).

### Passo a passo:
1. Abra o terminal (Prompt de Comando ou PowerShell) na pasta do projeto:
   ```bash
   cd ESTOQUE
   ```
2. Instale todas as dependências:
   ```bash
   npm install
   ```
3. Para iniciar o sistema em modo desenvolvimento:
   ```bash
   npm run dev
   ```
   O terminal exibirá um link como `http://localhost:3000`. Basta abrir no seu navegador!

4. Para gerar a versão de produção compilada:
   ```bash
   npm run build
   ```
   Os arquivos compilados e otimizados serão gerados na pasta `dist/`.

---

## 📦 Estrutura dos Módulos
* **DASHBOARD**: Visão geral de caixas, hectolitros e valor financeiro de sobras e faltas.
* **EXPORTAR GRADE**: Gera o arquivo `importacaoGrade.csv` formatado com delimitador `;` para faturamento direto no Promax.
* **CHECK LANÇAMENTO**: Compara o relatório do que foi lançado no sistema contra a grade esperada.
* **ESTOQUE CENTRAL**: Importação e auditoria completa do relatório Promax 02.05.02.
* **RESUMO FISCAL/FÍSICO**: Conciliação dos 400+ itens com cálculo de quebras e reposição.
* **DIF DIÁRIA e DIF MENSAL**: Histórico dia a dia de divergências.
