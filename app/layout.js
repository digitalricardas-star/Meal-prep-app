import "./globals.css";
import Nav from "@/components/Nav";

export const metadata = {
  title: "Family Meal Prep",
  description: "Batch cooking, freezer meals, rotation and shopping automation",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#238050",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Meal Prep" />
      </head>
      <body className="bg-stone-50 text-stone-900 min-h-screen">
        <Nav />
        <main className="mx-auto max-w-3xl px-4 pb-24 pt-4 md:pt-6">{children}</main>
      </body>
    </html>
  );
}
