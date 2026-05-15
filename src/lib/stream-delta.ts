const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const readNestedString = (
  source: Record<string, unknown> | undefined,
  key: string,
): string => (source ? readString(source[key]) : "");

const extractGeminiDelta = (payload: Record<string, unknown>): string => {
  const candidates = payload.candidates;

  if (!Array.isArray(candidates) || !isRecord(candidates[0])) {
    return "";
  }

  const content = candidates[0].content;

  if (!isRecord(content)) {
    return "";
  }

  const parts = content.parts;

  if (!Array.isArray(parts)) {
    return readString(content.text);
  }

  return parts
    .map((part) => (isRecord(part) ? readString(part.text) : ""))
    .join("");
};

const extractAnthropicDelta = (payload: Record<string, unknown>): string => {
  const delta = payload.delta;

  if (!isRecord(delta)) {
    return "";
  }

  return readString(delta.text);
};

const extractOpenAiDelta = (payload: Record<string, unknown>): string => {
  const choices = payload.choices;

  if (!Array.isArray(choices) || !isRecord(choices[0])) {
    return "";
  }

  const choice = choices[0];

  return (
    readNestedString(choice.delta as Record<string, unknown> | undefined, "content") ||
    readNestedString(choice.message as Record<string, unknown> | undefined, "content") ||
    readString(choice.text)
  );
};

/** 从多种厂商 SSE JSON 载荷中提取可展示的文本增量 */
export const extractStreamDelta = (data: unknown): string => {
  if (!isRecord(data)) {
    return "";
  }

  if (typeof data.delta === "string") {
    return data.delta;
  }

  const direct =
    readString(data.content) ||
    readString(data.text) ||
    readString(data.response) ||
    readString(data.output_text) ||
    readString(data.answer);

  if (direct) {
    return direct;
  }

  const anthropic = extractAnthropicDelta(data);
  if (anthropic) {
    return anthropic;
  }

  const openAi = extractOpenAiDelta(data);
  if (openAi) {
    return openAi;
  }

  const gemini = extractGeminiDelta(data);
  if (gemini) {
    return gemini;
  }

  if (isRecord(data.message)) {
    const messageDelta = readString(data.message.content);
    if (messageDelta) {
      return messageDelta;
    }
  }

  if (isRecord(data.output)) {
    const outputDelta =
      readString(data.output.text) ||
      readNestedString(data.output as Record<string, unknown>, "content");
    if (outputDelta) {
      return outputDelta;
    }
  }

  return "";
};

export const extractStreamReasoning = (data: unknown): string => {
  if (!isRecord(data)) {
    return "";
  }

  if (typeof data.reasoning === "string") {
    return data.reasoning;
  }

  const choices = data.choices;
  if (Array.isArray(choices) && isRecord(choices[0])) {
    const delta = choices[0].delta;
    if (isRecord(delta)) {
      return readString(delta.reasoning_content) || readString(delta.reasoning);
    }
  }

  if (isRecord(data.delta)) {
    return readString(data.delta.thinking) || readString(data.delta.reasoning);
  }

  return "";
};

export const extractStreamErrorMessage = (data: unknown): string | null => {
  if (!isRecord(data)) {
    return null;
  }

  if (isRecord(data.error)) {
    return (
      readString(data.error.message) ||
      readString(data.error.msg) ||
      "AI 服务返回错误"
    );
  }

  if (data.type === "error" && typeof data.message === "string") {
    return data.message;
  }

  if (typeof data.message === "string" && data.event === "error") {
    return data.message;
  }

  return null;
};
