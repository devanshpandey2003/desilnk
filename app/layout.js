import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Desi Link — Manage life back home, smarter",
  description:
    "Desi Link brings finances, property and family support into one secure place — built for NRIs.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
