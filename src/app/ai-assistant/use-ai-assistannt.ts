import { useState, useRef, useEffect } from "react";

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

const starterPrompts = ["帮我梳理产品需求", "生成接口联调计划", "总结这段材料"];

const useAiassistant = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [activeConversationId, setActiveConversationId] = useState(1);
  const messageEndRef = useRef<HTMLDivElement>(null);

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
    messageEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const startNewConversation = () => {
    const nextConversation = {
      id: Date.now(),
      title: "新的对话",
      updatedAt: "刚刚",
    };

    setConversations((current) => [nextConversation, ...current]);
    setActiveConversationId(nextConversation.id);
    setMessages([]);
    setInput("");
  };

  const sendMessage = () => {
    const content = input.trim();

    if (!content) {
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content,
    };

    const assistantMessage: ChatMessage = {
      id: Date.now() + 1,
      role: "assistant",
      content:
        "我已经收到你的消息。接下来可以接入真实模型接口，让这里返回实际回答。",
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setInput("");
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
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
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
    startNewConversation,
    sendMessage,
    handleKeyDown,
    handleInputChange,
    toggleSidebar,
    handleConversationClick,
  };
};
export default useAiassistant;
