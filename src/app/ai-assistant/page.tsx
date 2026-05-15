"use client";

import {
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusOutlined,
  RobotOutlined,
  SearchOutlined,
  SendOutlined,
  LogoutOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import React from "react";

import AuthGuard from "@/components/auth-guard";
import { clearAccessToken } from "@/lib/auth-token";

import AiSettingsDialog from "./ai-settings-dialog";
import useAiassistant from "./use-ai-assistannt";

const starterPrompts = ["帮我梳理产品需求", "生成接口联调计划", "总结这段材料"];

const AppPages: React.FC = () => {
  const router = useRouter();
  const {
    sidebarOpen,
    input,
    messages,
    conversations,
    activeConversationId,
    hasMessages,
    isSending,
    settingsOpen,
    error,
    messageEndRef,
    startNewConversation,
    sendMessage,
    handleKeyDown,
    handleInputChange,
    toggleSidebar,
    openSettings,
    closeSettings,
    handleConfigSaved,
    handleConversationClick,
  } = useAiassistant();

  const handleLogout = () => {
    clearAccessToken();
    router.replace("/login" as Route);
  };

  return (
    <AuthGuard>
    <main className="h-screen min-h-0 overflow-hidden bg-[#09091b] text-slate-100">
      <div className="flex h-full min-h-0">
        <aside
          className={`min-h-0 shrink-0 border-r border-[#24233b] bg-[#19192d] transition-[width] duration-200 ${
            sidebarOpen ? "w-[288px]" : "w-0 overflow-hidden border-r-0"
          }`}
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex h-[62px] items-center gap-2 border-b border-[#24233b] px-3">
              <button
                type="button"
                onClick={startNewConversation}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[#4b3688] bg-[#2a1f4d] text-sm font-medium text-[#b58cff] transition hover:bg-[#33245f]"
              >
                <PlusOutlined className="text-xs" />
                <span>新建对话</span>
              </button>
            </div>

            <div className="p-3">
              <label className="relative block">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <SearchOutlined />
                </span>
                <input
                  type="search"
                  placeholder="搜索对话..."
                  className="h-10 w-full rounded-lg border border-[#31304f] bg-[#252641] pl-9 pr-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-[#6d55c8]"
                />
              </label>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              {conversations.length === 0 ? (
                <div className="grid h-28 place-items-center text-center text-sm text-slate-500">
                  暂无对话
                </div>
              ) : (
                <div className="space-y-1">
                  {conversations.map((conversation) => {
                    const active = conversation.id === activeConversationId;

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => handleConversationClick(conversation.id)}
                        className={`flex h-12 w-full items-center justify-between rounded-lg px-3 text-left transition ${
                          active
                            ? "bg-[#272643] text-slate-100"
                            : "text-slate-400 hover:bg-[#202038] hover:text-slate-200"
                        }`}
                      >
                        <span className="truncate text-sm">
                          {conversation.title}
                        </span>
                        <span className="ml-3 shrink-0 text-xs text-slate-500">
                          {conversation.updatedAt}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </nav>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[62px] shrink-0 items-center justify-between border-b border-[#24233b] bg-[#0d0d21] px-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={sidebarOpen ? "收起侧边栏" : "展开侧边栏"}
                title={sidebarOpen ? "收起侧边栏" : "展开侧边栏"}
                onClick={toggleSidebar}
                className="grid h-8 w-8 place-items-center rounded-md text-slate-400 transition hover:bg-[#1b1b32] hover:text-slate-100"
              >
                {sidebarOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
              </button>
              <h1 className="text-sm font-semibold text-slate-100">
                AI Assistant
              </h1>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="文档"
                title="文档"
                className="grid h-8 w-8 place-items-center rounded-md text-slate-500 transition hover:bg-[#1b1b32] hover:text-slate-100"
              >
                <FileTextOutlined />
              </button>
              <button
                type="button"
                aria-label="设置"
                title="设置"
                onClick={openSettings}
                className="grid h-8 w-8 place-items-center rounded-md text-slate-500 transition hover:bg-[#1b1b32] hover:text-slate-100"
              >
                <SettingOutlined />
              </button>
              <button
                type="button"
                aria-label="退出登录"
                title="退出登录"
                onClick={handleLogout}
                className="grid h-8 w-8 place-items-center rounded-md text-slate-500 transition hover:bg-[#1b1b32] hover:text-slate-100"
              >
                <LogoutOutlined />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[#080819]">
            {hasMessages ? (
              <div className="flex min-h-full w-full flex-col justify-end px-5 py-6 sm:px-8 lg:px-12 lg:py-8">
                <div className="flex flex-col gap-6">
                  {messages.map((message, index) => {
                    const isUser = message.role === "user";
                    const isStreamingAssistant =
                      !isUser &&
                      isSending &&
                      index === messages.length - 1;

                    return (
                      <div
                        key={message.id}
                        className={`flex items-end gap-3 ${
                          isUser ? "justify-end" : "justify-start"
                        }`}
                      >
                        {!isUser && (
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#34325d] bg-[#20203a] text-xs font-semibold text-[#b69cff]">
                            <RobotOutlined />
                          </div>
                        )}
                        <article
                          className={`max-w-[min(78%,720px)] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                            isUser
                              ? "rounded-br-md border border-[#6d55c8]/60 bg-[#3a2a65] text-slate-50"
                              : "rounded-bl-md border border-[#2c2b48] bg-[#17172b] text-slate-300"
                          }`}
                        >
                          {!isUser && message.reasoning && (
                            <details className="mb-3 rounded-lg border border-[#2a2948] bg-[#10101f] px-3 py-2">
                              <summary className="cursor-pointer select-none text-xs text-slate-500">
                                思考过程
                              </summary>
                              <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-slate-500">
                                {message.reasoning}
                              </p>
                            </details>
                          )}
                          <p className="whitespace-pre-wrap break-words">
                            {message.content ||
                              (isUser
                                ? ""
                                : message.reasoning
                                  ? ""
                                  : "正在生成回复...")}
                          </p>
                          {isStreamingAssistant &&
                            !message.content &&
                            message.reasoning && (
                              <p className="mt-1 text-xs text-slate-500">
                                正在组织最终回复...
                              </p>
                            )}
                        </article>
                      </div>
                    );
                  })}
                  <div ref={messageEndRef} />
                </div>
              </div>
            ) : (
              <div className="mx-auto grid h-full w-full max-w-5xl place-items-center px-5 sm:px-8 lg:px-12">
                <div className="w-full pb-24 text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[#34325d] bg-[#20203a] text-2xl text-[#9a72ff]">
                    <RobotOutlined />
                  </div>
                  <p className="mt-5 text-base font-semibold text-slate-100">
                    开始新对话
                  </p>
                  <div className="mt-6 grid gap-2 sm:grid-cols-3">
                    {starterPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleInputChange(prompt)}
                        className="min-h-11 rounded-lg border border-[#2d2c48] bg-[#141429] px-3 py-2 text-left text-sm text-slate-400 transition hover:border-[#5d45b4] hover:bg-[#1d1b37] hover:text-slate-100"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <footer className="shrink-0 border-t border-[#24233b] bg-[#0d0d21] px-5 py-4 sm:px-8 lg:px-12">
            <div className="relative w-full">
              <textarea
                value={input}
                onChange={(event) => handleInputChange(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={
                  isSending
                    ? "正在等待回复..."
                    : "输入消息...（Enter 发送，Shift+Enter 换行）"
                }
                className="max-h-36 min-h-14 w-full resize-none rounded-2xl border border-[#3a3369] bg-[#18182b] py-4 pl-4 pr-14 text-sm leading-6 text-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.22)] outline-none placeholder:text-slate-500 focus:border-[#7b61dd]"
              />
              <button
                type="button"
                aria-label="发送"
                title="发送"
                onClick={sendMessage}
                disabled={!input.trim() || isSending}
                className="absolute bottom-4 right-3 grid h-8 w-8 place-items-center rounded-full bg-[#332c68] text-slate-300 transition enabled:hover:bg-[#7b61dd] enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <SendOutlined />
              </button>
            </div>
            {error && (
              <p className="mt-2 text-xs leading-5 text-rose-300">{error}</p>
            )}
          </footer>
        </section>
      </div>
      <AiSettingsDialog
        open={settingsOpen}
        onClose={closeSettings}
        onConfigSaved={handleConfigSaved}
      />
    </main>
    </AuthGuard>
  );
};

export default AppPages;
