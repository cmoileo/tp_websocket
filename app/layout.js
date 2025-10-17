import "./globals.css";
import "./styles.css";

export const metadata = {
  title: "Hub Temps Réel",
  description: "Application WebSocket interactive",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
