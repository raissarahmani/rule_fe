import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
// import { AuthProvider } from "@/context/auth-context";
import { Toaster } from "@/components/ui/sonner";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "RULE",
  description: "Remittance Managament System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className={`${poppins.className} min-h-full flex flex-col`}>
        {/* <AuthProvider> */}
          {children}
          <Toaster position="top-right" />
        {/* </AuthProvider> */}
      </body>
    </html>
  );
}