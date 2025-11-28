import "./globals.css";

export const metadata = {
  title: "Terminal IRC",
  description: "Secure WebSocket Channel",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
