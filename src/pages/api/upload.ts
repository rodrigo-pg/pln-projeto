import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { PineconeStore } from "@langchain/pinecone";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "node:crypto";
import pdfParse from "pdf-parse"
import fs from "fs";
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";

type Response = {
  response: string;
};

export default async function handler(
  _: NextApiRequest,
  res: NextApiResponse<Response>,
) {
    const pdf = await pdfParse(fs.readFileSync("/home/pc/Documentos/projetos/pln/src/docs/atividades.pdf"))
    const docs = [
        new Document({
            pageContent: pdf.text
        })
    ]
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200
    });
    const splits = await textSplitter.splitDocuments(docs);
    const embeddingModel = new OpenAIEmbeddings({
        apiKey: process.env["OPENAI_API_KEY"],
        model: "text-embedding-3-small"
      })
    const pinecone = new PineconeClient({
      apiKey: process.env["PINECONE_API_KEY"] as string
    });
    const pineconeIndex = pinecone.Index("pln-docs-openai");
    const vs = await PineconeStore.fromExistingIndex(embeddingModel, {
      pineconeIndex,
      maxConcurrency: 10
    });

    await vs.addDocuments(splits, Array.from({length: splits.length}).map(_ => randomUUID()))

    res.status(200).json({ response: "Documentos adicionados com sucesso!" });
}
