## Projeto Final - Disciplina PLN (UFCG)

Esse projeto foi desenvolvido para a cadeira de Processamento de Linguagem Natural da UFCG.

O projeto consiste em utilizar a técnica de RAG Fusion para responder questionamentos que os estudantes podem possuir sobre o funcionamento do curso de computação.

Para isso, os documentos oficiais foram salvos em um banco de dados de vetor, especificamente o pinecone, utilizamos RAG Fusion para escolher os trechos mais relevantes dos documentos que possam contribuir para a resposta e o Llama3, através da API do Groq, para processar os trechos relevantes e criar uma resposta para a pergunta do aluno.

## Equipe

Rodrigo Pedroza Gadelha Rodrigues

João Victor dos Santos Oliveira

## Rodando o projeto

Para rodar o projeto basta:

1. Instalar as dependências:

```bash
pnpm i
```
2. Executar o projeto:

```bash
pnpm dev
```

Caso você não tenha o ```pnpm``` instalado pode utilizar ```npm``` ou ```yarn```.

## Acesando o projeto

Você pode acessá-lo diretamente através do link https://pln-projeto.vercel.app.

## Estrutura

O projeto é basicamente dividido em um front que consiste, basicamente, de um chat box e algumas rotas de api. Quanto as rotas da api temos duas principais:

1. ```/ask```: Onde receberá a pergunta do usuário e será feito o processo de RAG Fusion para criação da resposta.
2. ```/upload```: Onde os documentos são divididos em pequenos trechos e salvos no banco de dados de vetor para que possam ser utilizados em buscas posteriormente.
