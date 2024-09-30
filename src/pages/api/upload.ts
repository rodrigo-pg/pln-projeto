import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { PineconeStore } from "@langchain/pinecone";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "node:crypto";

type Response = {
  response: string;
};

export default async function handler(
  _: NextApiRequest,
  res: NextApiResponse<Response>,
) {

    const loader = new PDFLoader("/home/pc/Documentos/projetos/pln/src/docs/guia-23.2.pdf");
    const docs = await loader.load();
    
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const splits = await textSplitter.splitDocuments(docs);

    const embeddingModel = new HuggingFaceInferenceEmbeddings({
        model: "intfloat/multilingual-e5-large",
        apiKey: process.env["HUGGING_FACE_API_KEY"]
    });
    const pinecone = new PineconeClient({
      apiKey: process.env["PINECONE_API_KEY"] as string
    });
    const pineconeIndex = pinecone.Index("pln-docs");
    const vs = await PineconeStore.fromExistingIndex(embeddingModel, {
      pineconeIndex,
      maxConcurrency: 5
    });
    await vs.addDocuments(splits, Array.from({length: splits.length}).map(_ => randomUUID()));

    res.status(200).json({ response: "Documentos adicionados com sucesso!" });
}
