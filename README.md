# 🍕 Sistema de Pizzaria (didático)

Este projeto consiste no desenvolvimento de um **sistema de gerenciamento para pizzaria** escrito em **TypeScript**, com execução no terminal.  
Ele foi elaborado com fins **acadêmicos e didáticos**, simulando um cenário real de atendimento, onde é possível gerenciar clientes, produtos e pedidos de forma simples e organizada.  

O objetivo principal é **praticar lógica de programação, estruturas de dados, manipulação de arquivos (CSV) e utilização de dependências no ecossistema Node.js**, aproximando a teoria aprendida em sala de aula de uma aplicação prática.  

---

# 👥 Grupo
- João Pedro Roveri - RA 2510193  
- Alexandre Rebello - RA 2506485  
- Enzo Tavares - RA 2500507  
- Miguel Henrique Oliveira - RA 2501000
- André Almeida de Oliveira - RA 2501296

---

## 📖 1. Manual de Utilização da Aplicação

O sistema é executado no **terminal** e permite:  
- Cadastrar, listar, atualizar e remover **clientes**.  
- Cadastrar, listar, atualizar e remover **produtos** (pizzas, refrigerantes, sobremesas, outros).  
- Registrar **pedidos**, vinculando clientes e produtos.  
- Gerar **relatórios** de pizzas vendidas por dia e por mês.  

A interação é feita por meio de menus simples usando o pacote `readline-sync`.

---

## 🗂️ 2. Estrutura do Projeto e Dependências

### Estrutura de pastas:

```Bash
pizzaria/
├─ package.json
├─ tsconfig.json
├─ README.md
├─ node_modules/
├─ src/
│  └─ index.ts              # Arquivo principal do sistema
└─ data/                    # Pasta para persistência em CSV
   ├─ clientes.csv          # Dados de clientes
   ├─ produtos.csv          # Dados de produtos
   └─ pedidos.csv           # Dados de pedidos
   

### Dependências de runtime:
- `readline-sync` → para interação via terminal.

### Dependências de desenvolvimento:
- `typescript` → compilador TypeScript.  
- `ts-node` → execução direta de arquivos TypeScript.  
- `@types/node` → tipagens do Node.js.  
- `@types/readline-sync` → tipagens para o pacote readline-sync.

---
### 3. Diagrama da Aplicação

![Imagem do WhatsApp de 2025-09-25 à(s) 18 44 18_bd73911a](https://github.com/user-attachments/assets/a9bb7740-9348-4396-bf16-b91a104e4dd6)

## ⚙️ 4. Instruções de Instalação e Execução

### 🚀 Passo a Passo de Instalação e Execução

```Bash
# 1. Criar a pasta do projeto e entrar nela
mkdir Pizzaria
cd Pizzaria

# 2. Criar a pasta src
mkdir src

# 3. Criar a pasta data (para salvar os CSVs)
mkdir data

# 4. Iniciar o projeto Node
npm init -y

# 5. Instalar o TypeScript
npm install --save-dev typescript

# 6. Criar o tsconfig.json
npx tsc --init

# 7. Instalar dependências de desenvolvimento adicionais
npm install --save-dev ts-node @types/node @types/readline-sync

# 8. Instalar dependência de runtime
npm install readline-sync

# 9. Criar o arquivo inicial dentro de src
cd src
touch index.ts
cd ..

# 10. Estrutura final do projeto
# pizzaria/
# ├─ package.json
# ├─ tsconfig.json
# ├─ README.md
# ├─ node_modules/
# ├─ src/
# │  └─ index.ts
# └─ data/
#    ├─ clientes.csv
#    ├─ produtos.csv
#    └─ pedidos.csv

# 11. Compilar o arquivo TypeScript para JavaScript
npx tsc src/index.ts

# 12. Executar o arquivo compilado no Node
node src/index.js

# 13. (Alternativa) Executar direto o TypeScript sem compilar
npx ts-node src/index.ts



