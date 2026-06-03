import { GoogleGenAI, Type } from "@google/genai";

const getAI = (apiKey?: string) => new GoogleGenAI({ apiKey: apiKey || process.env.GEMINI_API_KEY });

export async function generateVisualIdentity(productDescription: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: `あなたはシニア・アートディレクターです。以下の製品説明をもとに、画像生成AIが製品の一貫性を保てるような、詳細な「ビジュアル・アイデンティティ」を確立してください。
形状、色（パントーン指定のように具体的）、素材の質感（マット、メタリック、ガラス等）、ロゴの特徴、独特なディテールを含めてください。
出力は日本語で。

製品説明: ${productDescription}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          visualDescription: { type: Type.STRING, description: "詳細なビジュアル説明（英語のプロンプトに組み込める形式）" },
          brandName: { type: Type.STRING, description: "ブランド名（もし指定がなければ作成）" },
          keyFeatures: { type: Type.ARRAY, items: { type: Type.STRING }, description: "主要なビジュアル特徴3つ" },
        },
        required: ["visualDescription", "brandName", "keyFeatures"],
      },
    },
  });

  return JSON.parse(response.text);
}

export type ImageModel = "nano-banana" | "nano-banana-2" | "nano-banana-pro";

export async function generateLogo(visualIdentity: string, brandName: string, modelId: ImageModel = "nano-banana-2") {
  const ai = getAI();
  const modelMap: Record<ImageModel, string> = {
    "nano-banana": "gemini-2.5-flash-image",
    "nano-banana-2": "gemini-3.1-flash-image-preview",
    "nano-banana-pro": "gemini-3-pro-image-preview",
  };
  const actualModel = modelMap[modelId];

  const prompt = `A professional, minimalist vector logo design for a brand named "${brandName}". Visual identity: ${visualIdentity}. The logo should be centered on a clean, solid neutral background. Modern typography, sophisticated icon. ABSOLUTELY NO PEOPLE.`;

  try {
    const response = await ai.models.generateContent({
      model: actualModel,
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          ...(actualModel !== "gemini-2.5-flash-image" ? { imageSize: "1K" } : {})
        },
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error: any) {
    console.error("Logo generation error:", error);
    if (error.message?.includes("403") || error.message?.includes("PERMISSION_DENIED")) {
      throw new Error(`403: ロゴ生成には支払い設定済みのAPIキーが必要です。`);
    }
    throw error;
  }
  throw new Error("Failed to generate logo");
}

export async function generateProductImage(
  visualIdentity: string, 
  mediaType: "billboard" | "newspaper" | "social", 
  brandName: string, 
  modelId: ImageModel = "nano-banana-2"
) {
  const ai = getAI();
  let contextPrompt = "";
  let aspectRatio: "16:9" | "3:4" | "1:1" = "1:1";

  const modelMap: Record<ImageModel, string> = {
    "nano-banana": "gemini-2.5-flash-image",
    "nano-banana-2": "gemini-3.1-flash-image-preview",
    "nano-banana-pro": "gemini-3-pro-image-preview",
  };

  const actualModel = modelMap[modelId];

  switch (mediaType) {
    case "billboard":
      contextPrompt = "A professional, high-end billboard advertisement in a modern city at dusk. The product is the central focus. Clean layout, minimalist branding.";
      aspectRatio = "16:9";
      break;
    case "newspaper":
      contextPrompt = "A high-quality black and white print advertisement in a premium newspaper. Elegant typography, professional product photography texture. Vintage feel but modern product.";
      aspectRatio = "3:4";
      break;
    case "social":
      contextPrompt = "A trendy, vibrant social media product photography shot. Dynamic composition, clean background, soft studio lighting. High-end lifestyle vibe without people.";
      aspectRatio = "1:1";
      break;
  }

  const finalPrompt = `${contextPrompt} The product is: ${visualIdentity}. ABSOLUTELY NO PEOPLE in the image. High-end photography, professional lighting, consistent with the brand ${brandName}.`;

  try {
    const response = await ai.models.generateContent({
      model: actualModel,
      contents: {
        parts: [{ text: finalPrompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          ...(actualModel !== "gemini-2.5-flash-image" ? { imageSize: "1K" } : {})
        },
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error: any) {
    console.error("Image generation error:", error);
    if (error.message?.includes("403") || error.message?.includes("PERMISSION_DENIED")) {
      throw new Error(`403: ${modelId} モデルの使用には支払い設定済みのAPIキーが必要です。右上の「Select Pro Key」から設定してください。`);
    }
    throw error;
  }
  throw new Error("Failed to generate image");
}
