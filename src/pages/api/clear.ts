import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
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
    await vs.delete({
        deleteAll: true
    })

    res.status(200).json({ response: "Documentos deletados com sucesso!" });
}
