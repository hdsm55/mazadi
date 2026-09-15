import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Gavel,
  Store,
  ShieldCheck,
  Wallet,
  Bell,
  User,
  Eye,
  Package,
  BarChart,
  ScrollText,
  Trophy,
} from "lucide-react";

export interface DashboardNavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function DashboardShell({
  title,
  subtitle,
  nav,
  active,
  children,
}: {
  title: string;
  subtitle?: string;
  nav: DashboardNavItem[];
  active: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-2 shadow-soft lg:flex-col">
            {nav.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === active;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" aria-hidden />}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <div className="min-w-0 space-y-8">{children}</div>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", accent ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground")}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export const buyerNav: DashboardNavItem[] = [
  { label: "Overview", href: "/buyer", icon: LayoutDashboard },
  { label: "My Bids", href: "/buyer/my-bids", icon: Gavel },
  { label: "Winning", href: "/buyer/winning", icon: Trophy },
  { label: "Outbid", href: "/buyer/outbid", icon: Gavel },
  { label: "Won", href: "/buyer/won", icon: Trophy },
  { label: "Watchlist", href: "/buyer/watchlist", icon: Eye },
  { label: "Payments", href: "/buyer/payments", icon: Wallet },
  { label: "Notifications", href: "/buyer/notifications", icon: Bell },
  { label: "Profile & Security", href: "/buyer/profile", icon: User },
];

export const sellerNav: DashboardNavItem[] = [
  { label: "Overview", href: "/seller", icon: LayoutDashboard },
  { label: "Auctions", href: "/seller/auctions", icon: Gavel },
  { label: "Lots", href: "/seller/lots", icon: Package },
  { label: "Drafts", href: "/seller/drafts", icon: Package },
  { label: "Orders & Payments", href: "/seller/orders", icon: Wallet },
  { label: "Payouts", href: "/seller/payouts", icon: Wallet },
  { label: "Customers", href: "/seller/customers", icon: User },
  { label: "Team", href: "/seller/team", icon: User },
  { label: "Reports", href: "/seller/reports", icon: BarChart },
  { label: "Settings", href: "/seller/settings", icon: ScrollText },
];

export const adminNav: DashboardNavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: User },
  { label: "Sellers", href: "/admin/sellers", icon: Store },
  { label: "Auction Houses", href: "/admin/auction-houses", icon: Store },
  { label: "Auctions", href: "/admin/auctions", icon: Gavel },
  { label: "Lots", href: "/admin/lots", icon: Package },
  { label: "Categories", href: "/admin/categories", icon: Package },
  { label: "Payments", href: "/admin/payments", icon: Wallet },
  { label: "Payouts", href: "/admin/payouts", icon: Wallet },
  { label: "Commissions", href: "/admin/commissions", icon: Wallet },
  { label: "Disputes", href: "/admin/disputes", icon: ShieldCheck },
  { label: "Moderation & Risk", href: "/admin/moderation", icon: ShieldCheck },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText },
  { label: "Reports", href: "/admin/reports", icon: BarChart },
  { label: "Settings", href: "/admin/settings", icon: ScrollText },
];
