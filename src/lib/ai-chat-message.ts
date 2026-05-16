import type { ChatContentPart, ChatMessagePayload } from "@/types/ai-chat";

export type ChatMessageImage = {
  fileId?: string;
  url?: string;
  base64?: string;
  previewUrl: string;
};

export type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  images?: ChatMessageImage[];
  reasoning?: string;
};

export const toChatMessagePayload = (message: ChatMessage): ChatMessagePayload => {
  if (message.role === "assistant" || !message.images?.length) {
    return {
      role: message.role,
      content: message.content,
    };
  }

  const content: ChatContentPart[] = message.images.map((image) => {
    if (image.url) {
      return {
        type: "image_url",
        image_url: image.url,
      };
    }

    if (image.fileId) {
      return {
        type: "image_file_id",
        image_file_id: image.fileId,
      };
    }

    if (image.base64) {
      return {
        type: "image_base64",
        image_base64: image.base64,
      };
    }

    return {
      type: "image_url",
      image_url: image.previewUrl,
    };
  });

  if (message.content.trim()) {
    content.push({ type: "text", text: message.content });
  }

  return {
    role: message.role,
    content,
  };
};
