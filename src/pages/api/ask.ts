import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { DocumentInterface } from "@langchain/core/documents";
import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { ChatGroq } from "@langchain/groq";
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

  Object.values(docsByQuery).forEach((queryResults, _) => {
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
  const embeddingModel = new HuggingFaceInferenceEmbeddings({
    model: "intfloat/multilingual-e5-large",
    apiKey: process.env["HUGGING_FACE_API_KEY"]
  });
  const model = new ChatGroq({
    apiKey: process.env["GROQ_API_KEY"],
    model: "llama-3.1-70b-versatile"
  });

  const pinecone = new PineconeClient({
    apiKey: process.env["PINECONE_API_KEY"] as string
  });
  const pineconeIndex = pinecone.Index("pln-docs");
  const vs = await PineconeStore.fromExistingIndex(embeddingModel, {
    pineconeIndex,
    maxConcurrency: 5
  });

  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate("Você é um assistente útil que gera várias consultas de pesquisa com base em uma única consulta de entrada."),
    HumanMessagePromptTemplate.fromTemplate("Gere 4 consultas de pesquisa relacionadas a: {query}. Você deve retornar apenas a lista de consultas sem numeração e sem qualquer texto adicional")
  ])

  const formattedPrompt = await prompt.formatMessages({
    query
  });

  const response = await model.invoke(formattedPrompt);
  const queries = response.content.toString().split("\n");
  const docsByQuery: Record<string, [DocumentInterface<Record<string, any>>, number][]> = {}

  for (const query of queries) {
    const result = await vs.similaritySearchWithScore(query, 5)
    docsByQuery[query] = result
  }

  const rrfDocs = applyRRF(docsByQuery)
  const context = rrfDocs.reduce((prev, curr, index) => {
    return prev + `
      Trecho: ${index + 1}
      Conteúdo: ${curr.doc.pageContent}
      \n
    `
  }, "")

  const answerPrompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate("Você é um assistente útil que responde questionamentos de usuários que eles possuem acerca de documentos."),
    HumanMessagePromptTemplate.fromTemplate("Você deve responder a seguinte pergunta: {query}, com base apenas nos seguintes trechos extraídos de documentos relevantes: {context}.")
  ])

  const formattedAnswerPrompt = await answerPrompt.formatMessages({
    query,
    context: context
  });
  const result = await model.invoke(formattedAnswerPrompt);

  res.status(200).json({ answer: result.content });
}