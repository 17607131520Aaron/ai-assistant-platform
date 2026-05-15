import { useState, useRef, useEffect } from "react";
import type { KeyboardEvent } from "react";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

type Conversation = {
  id: number;
  title: string;
  updatedAt: string;
};

const initialConversations: Conversation[] = [
  {
    id: 1,
    title: "产品需求梳理",
    updatedAt: "刚刚",
  },
  {
    id: 2,
    title: "接口联调计划",
    updatedAt: "昨天",
  },
];

type WebAiChatStreamEvent = {
  event: string;
  data: unknown;
};

type WebAiChatStreamChunk = {
  delta?: string;
};

type WebAiChatStreamError = {
  message?: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
const CHAT_STREAM_URL = `${API_BASE_URL.replace(/\/$/, "")}/web/ai/chat/stream`;

const createMessageId = () => Date.now() + Math.random();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseSseSegment = (segment: string): WebAiChatStreamEvent | null => {
  const lines = segment.split(/\r?\n/);
  let event = "message";
  const dataLines: string[] = [];

  lines.forEach((line) => {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  });

  if (dataLines.length === 0) {
    return null;
  }

  const rawData = dataLines.join("\n");

  return {
    event,
    data: rawData ? JSON.parse(rawData) : null,
  };
};

const getErrorMessage = (value: unknown) => {
  if (isRecord(value) && typeof value.message === "string") {
    return value.message;
  }

  if (value instanceof Error) {
    return value.message;
  }

  return "AI 对话接口暂时不可用，请稍后再试。";
};

const useAiassistant = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [activeConversationId, setActiveConversationId] = useState(1);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const messageEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const hasMessages = messages.length > 0;

  const handleInputChange = (value: string) => {
    setInput(value);
  };

  //是否展开侧边栏
  const toggleSidebar = () => {
    setSidebarOpen((value) => !value);
  };

  //点击历史对话列表
  const handleConversationClick = (conversationId: number) => {
    setActiveConversationId(conversationId);
    // setMessages(messages.filter((message) => message.role === "assistant"));
  };

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const startNewConversation = () => {
    abortControllerRef.current?.abort();

    const nextConversation = {
      id: Date.now(),
      title: "新的对话",
      updatedAt: "刚刚",
    };

    setConversations((current) => [nextConversation, ...current]);
    setActiveConversationId(nextConversation.id);
    setMessages([]);
    setInput("");
    setError("");
    setIsSending(false);
  };

  const sendMessage = async () => {
    const content = input.trim();

    if (!content || isSending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content,
    };

    const assistantMessage: ChatMessage = {
      id: createMessageId(),
      role: "assistant",
      content: "",
    };

    const requestMessages = [...messages, userMessage].map((message) => ({
      role: message.role,
      content: message.content,
    }));

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setInput("");
    setError("");
    setIsSending(true);
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeConversationId
          ? {
              ...conversation,
              title: content.slice(0, 18),
              updatedAt: "刚刚",
            }
          : conversation,
      ),
    );

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(CHAT_STREAM_URL, {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: requestMessages,
          reasoningEffort: "none",
        }),
        credentials: "include",
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`AI 对话接口请求失败（${response.status}）`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const segments = buffer.split(/\r?\n\r?\n/);
        buffer = segments.pop() ?? "";

        for (const segment of segments) {
          const parsed = parseSseSegment(segment);

          if (!parsed) {
            continue;
          }

          if (parsed.event === "chunk") {
            const data = parsed.data as WebAiChatStreamChunk;
            const delta = typeof data.delta === "string" ? data.delta : "";

            if (delta) {
              setMessages((current) =>
                current.map((message) =>
                  message.id === assistantMessage.id
                    ? { ...message, content: message.content + delta }
                    : message,
                ),
              );
            }
          }

          if (parsed.event === "error") {
            throw new Error(
              getErrorMessage(parsed.data as WebAiChatStreamError),
            );
          }
        }
      }
    } catch (exception) {
      if (controller.signal.aborted) {
        return;
      }

      const message = getErrorMessage(exception);

      setError(message);
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantMessage.id && !item.content
            ? { ...item, content: `请求失败：${message}` }
            : item,
        ),
      );
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }

      if (!controller.signal.aborted) {
        setIsSending(false);
      }
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return {
    sidebarOpen,
    input,
    messages,
    conversations,
    activeConversationId,
    messageEndRef,
    hasMessages,
    isSending,
    error,
    startNewConversation,
    sendMessage,
    handleKeyDown,
    handleInputChange,
    toggleSidebar,
    handleConversationClick,
  };
};
export default useAiassistant;
