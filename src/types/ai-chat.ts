/** SenseNova 多模态 content 片段，见 https://platform.sensenova.cn/product/APIService/document */

export type ChatTextPart = {
  type: "text";
  text: string;
};

export type ChatImageFileIdPart = {
  type: "image_file_id";
  image_file_id: string;
};

export type ChatImageUrlPart = {
  type: "image_url";
  image_url: string;
};

export type ChatImageBase64Part = {
  type: "image_base64";
  image_base64: string;
};

export type ChatContentPart =
  | ChatTextPart
  | ChatImageFileIdPart
  | ChatImageUrlPart
  | ChatImageBase64Part;

export type ChatMessagePayload = {
  role: "user" | "assistant" | "system";
  content: string | ChatContentPart[];
};

/** POST /web/ai/files 上传成功后的 data */
export type WebAiUploadedFile = {
  url: string;
  fileId?: string;
  filename?: string;
  mimeType?: string;
  size?: number;
};

export type ChatStreamRequestBody = {
  messages: ChatMessagePayload[];
  reasoningEffort?: string;
};
