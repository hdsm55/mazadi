import Link from "next/link";
import { Gavel } from "lucide-react";

const columns = [
  {
    title: "Marketplace",
    links: [
      { label: "Live Auctions", href: "/auctions" },
      { label: "Ending Soon", href: "/auctions" },
      { label: "Search", href: "/search" },
      { label: "Recently Sold", href: "/auctions" },
    ],
  },
  {
    title: "Sell",
    links: [
      { label: "Seller Dashboard", href: "/seller" },
      { label: "Create Auction", href: "/seller" },
      { label: "Seller Guidelines", href: "/seller" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "My Bids", href: "/buyer" },
      { label: "Watchlist", href: "/buyer" },
      { label: "Payments", href: "/payments" },
      { label: "Login", href: "/login" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Gavel className="h-5 w-5" aria-hidden />
              </span>
              <span className="font-serif text-2xl font-bold">Mazadi</span>
            </Link>
            <p className="max-w-xs text-sm text-primary-foreground/70">
              A trusted global auction operating system, marketplace, and transaction network.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                {col.title}
              </h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-primary-foreground/70 transition-colors hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-primary-foreground/10 pt-6 text-xs text-primary-foreground/50 sm:flex-row">
          <p>© {new Date().getFullYear()} Mazadi. All rights reserved.</p>
          <p className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="live-dot" aria-hidden />
              Live marketplace
            </span>
            <span>Secure · Verified · Global</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
