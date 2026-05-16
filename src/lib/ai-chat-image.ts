import { apiRequest } from "@/lib/api-client";
import type {
  ChatContentPart,
  ChatImageBase64Part,
  ChatImageFileIdPart,
  ChatImageUrlPart,
  WebAiUploadedFile,
} from "@/types/ai-chat";

export const CHAT_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/bmp";

export const CHAT_IMAGE_MAX_COUNT = 6;
export const CHAT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const CHAT_IMAGE_MAX_TOTAL_BYTES = 45 * 1024 * 1024;

export type PendingChatImage = {
  id: string;
  file: File;
  previewUrl: string;
};

export const createPendingChatImage = (file: File): PendingChatImage => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  file,
  previewUrl: URL.createObjectURL(file),
});

export const revokePendingChatImage = (image: PendingChatImage) => {
  URL.revokeObjectURL(image.previewUrl);
};

export const validateChatImageFile = (file: File): string | null => {
  if (!file.type.startsWith("image/")) {
    return "仅支持上传图片文件";
  }

  if (file.size > CHAT_IMAGE_MAX_BYTES) {
    return `单张图片不能超过 ${Math.round(CHAT_IMAGE_MAX_BYTES / 1024 / 1024)}MB`;
  }

  return null;
};

export const extractImagesFromClipboard = (
  clipboardData: DataTransfer | null,
): File[] => {
  if (!clipboardData) {
    return [];
  }

  const files: File[] = [];

  for (let index = 0; index < clipboardData.items.length; index += 1) {
    const item = clipboardData.items[index];

    if (item.kind !== "file" || !item.type.startsWith("image/")) {
      continue;
    }

    const file = item.getAsFile();

    if (!file) {
      continue;
    }

    const extension = file.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
    const name =
      file.name && !file.name.startsWith("image.")
        ? file.name
        : `paste-${Date.now()}-${index}.${extension}`;

    files.push(
      file.name === name ? file : new File([file], name, { type: file.type }),
    );
  }

  if (files.length === 0) {
    for (const file of Array.from(clipboardData.files)) {
      if (file.type.startsWith("image/")) {
        files.push(file);
      }
    }
  }

  return files;
};

export const validateChatImageBatch = (
  files: File[],
  existingCount: number,
): string | null => {
  if (existingCount + files.length > CHAT_IMAGE_MAX_COUNT) {
    return `最多上传 ${CHAT_IMAGE_MAX_COUNT} 张图片`;
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  if (totalBytes > CHAT_IMAGE_MAX_TOTAL_BYTES) {
    return "单次图片总大小不能超过 45MB";
  }

  for (const file of files) {
    const error = validateChatImageFile(file);

    if (error) {
      return error;
    }
  }

  return null;
};

export const uploadChatImage = async (file: File): Promise<WebAiUploadedFile> => {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest.post<WebAiUploadedFile>("/web/ai/files", formData, {
    showLoading: false,
    retry: 0,
  });
};

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("图片读取失败"));
    };

    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });

const toImageBase64Part = async (
  file: File,
): Promise<ChatImageBase64Part> => {
  const dataUrl = await readFileAsDataUrl(file);
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl;

  return {
    type: "image_base64",
    image_base64: base64,
  };
};

const toImageUrlPart = (url: string): ChatImageUrlPart => ({
  type: "image_url",
  image_url: url,
});

const toImageFileIdPart = (fileId: string): ChatImageFileIdPart => ({
  type: "image_file_id",
  image_file_id: fileId,
});

const uploadedFileToContentPart = (uploaded: WebAiUploadedFile): ChatContentPart => {
  if (uploaded.url?.trim()) {
    return toImageUrlPart(uploaded.url.trim());
  }

  if (uploaded.fileId?.trim()) {
    return toImageFileIdPart(uploaded.fileId.trim());
  }

  throw new Error("上传响应缺少图片地址");
};

/** 上传图片，优先使用服务端返回的 url 传给对话接口 */
export const resolveImageContentParts = async (
  images: PendingChatImage[],
): Promise<ChatContentPart[]> => {
  const parts = await Promise.all(
    images.map(async (image) => {
      try {
        const uploaded = await uploadChatImage(image.file);
        return uploadedFileToContentPart(uploaded);
      } catch {
        return toImageBase64Part(image.file);
      }
    }),
  );

  return parts;
};

export const buildUserMessageContent = (
  text: string,
  imageParts: ChatContentPart[],
): string | ChatContentPart[] => {
  const trimmed = text.trim();

  if (imageParts.length === 0) {
    return trimmed;
  }

  const content: ChatContentPart[] = [...imageParts];

  if (trimmed) {
    content.push({ type: "text", text: trimmed });
  }

  return content;
};
