import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { DocumentInterface } from "@langchain/core/documents";
import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { ChatGroq } from "@langchain/groq";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import type { NextApiRequest, NextApiResponse } from "next";

const RRF_K = 1;

interface DocWithRanks {
  doc: DocumentInterface;
  ranks: number[];
}

interface DocWithRRFScore {
  doc: DocumentInterface;
  rrfScore: number;
}

function calculateRRFScore(ranks: number[]): number {
  return ranks.reduce((sum, rank) => sum + 1 / (RRF_K + rank), 0);
}

function applyRRF(docsByQuery: Record<string, [DocumentInterface<Record<string, any>>, number][]>, topN: number = 5): DocWithRRFScore[] {
  const allDocs = new Map<string, DocWithRanks>();

  Object.values(docsByQuery).forEach((queryResults) => {
    queryResults.forEach(([doc], rank) => {
      const docId = doc.id || doc.pageContent;
      if (!allDocs.has(docId)) {
        allDocs.set(docId, { doc, ranks: [] });
      }
      allDocs.get(docId)!.ranks.push(rank + 1);
    });
  });

  const scoredDocs: DocWithRRFScore[] = Array.from(allDocs.values()).map(({ doc, ranks }) => ({
    doc,
    rrfScore: calculateRRFScore(ranks)
  }));

  return scoredDocs
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, topN);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { query } = req.query;
  const embeddingModel = new OpenAIEmbeddings({
    apiKey: process.env["OPENAI_API_KEY"],
    model: "text-embedding-3-small"
  })
  const model = new ChatGroq({
    apiKey: process.env["GROQ_API_KEY"],
    model: "llama-3.1-70b-versatile"
  });

  const pinecone = new PineconeClient({
    apiKey: process.env["PINECONE_API_KEY"] as string
  });
  const pineconeIndex = pinecone.Index("pln-docs-openai");
  const vs = await PineconeStore.fromExistingIndex(embeddingModel, {
    pineconeIndex,
    maxConcurrency: 5
  });

  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate("Você é um assistente útil que gera várias consultas de pesquisa para serem utilizadas em documentos oficiais da UFCG (Universidade Federal de Campina Grande) com base em uma única consulta de entrada."),
    HumanMessagePromptTemplate.fromTemplate("Gere 2 consultas de pesquisa relacionadas a: {query}. Você deve retornar apenas a lista de consultas sem numeração e sem qualquer texto adicional")
  ])

  const formattedPrompt = await prompt.formatMessages({
    query
  });

  const response = await model.invoke(formattedPrompt);
  const queries = response.content.toString().split("\n").concat(query as string);
  const docsByQuery: Record<string, [DocumentInterface<Record<string, any>>, number][]> = {}

  console.log(await vs.asRetriever().invoke(query as string))

  for (const query of queries) {
    const result = await vs.similaritySearchWithScore(query, 5)
    docsByQuery[query] = result
  }

  const rrfDocs = applyRRF(docsByQuery)

  const context = rrfDocs.reduce((prev, curr, _) => {
    return prev + curr.doc.pageContent + "\n"
  }, "")

  const answerPrompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate("Você é um assistente útil que responde questionamentos de usuários que eles possuem acerca de documentos."),
    HumanMessagePromptTemplate.fromTemplate(`Você deve responder a seguinte pergunta: {query}, com base apenas no seguinte contexto: {context}. Caso você não tenha informações suficientes para responder, apenas diga que não possui informações suficientes, sem justificativas adicionais.`)
  ])

  const formattedAnswerPrompt = await answerPrompt.formatMessages({
    query,
    context: context
  });
  const result = await model.invoke(formattedAnswerPrompt);

  res.status(200).json({ answer: result.content });
}