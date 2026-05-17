import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Sidebar, TopAppBar, BottomNav } from "./components/layout/Navigation";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EasyTimetable — Academic Portal",
  description: "Your personalized university timetable, exams, and calendar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jakarta.variable} h-full antialiased`}
      style={{ colorScheme: 'light' }}
    >
      <head>
        <link rel="preload" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" as="style" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-bg-app text-text-primary flex min-h-screen font-primary overflow-x-hidden">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-4 focus:bg-primary focus:text-white">Skip to content</a>
        
        <Sidebar />
        
        <main id="main-content" className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
          <TopAppBar />
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
            {children}
          </div>
        </main>

        <BottomNav />
      </body>
    </html>
  );
}
