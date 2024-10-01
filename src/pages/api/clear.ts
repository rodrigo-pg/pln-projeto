import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import type { NextApiRequest, NextApiResponse } from "next";

type Response = {
  response: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>,
) {
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
      maxConcurrency: 5
    });
    await vs.delete({
        deleteAll: true
    })

    res.status(200).json({ response: "Documentos deletados com sucesso!" });
}
