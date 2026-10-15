import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "../src/ui/styles.css";
export const metadata: Metadata = {
  title: "Физика в действии — личная лаборатория",
  description:
    "Изучайте физику в 27 темах, проверяйте идеи в интерактивных опытах и сохраняйте свои результаты.",
  metadataBase: new URL(
    "https://physics-in-action-lab.young-isle-4822.chatgpt.site",
  ),
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
