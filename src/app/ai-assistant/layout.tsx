import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Assistant",
  description: "AI assistant chat workspace",
};

export default function AiAssistantLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
