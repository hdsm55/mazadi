import Link from "next/link";
import { getSessionUser } from "@/server/auth/session";
import { logoutAction } from "@/server/actions/auth";
import { Search, Gavel, User, LayoutDashboard, Store, ShieldCheck, LogOut } from "lucide-react";

export async function Navbar() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
            <Gavel className="h-5 w-5" aria-hidden />
          </span>
          <span className="font-serif text-2xl font-bold tracking-tight text-foreground">
            Mazadi
          </span>
        </Link>

        {/* Primary nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/auctions"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Auctions
          </Link>
          <Link
            href="/search"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Search
          </Link>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/search"
            aria-label="Search"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
          >
            <Search className="h-5 w-5" aria-hidden />
          </Link>

          {user ? (
            <>
              <Link
                href="/buyer"
                className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:flex"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden />
                My Bids
              </Link>
              {user.role === "SELLER" && (
                <Link
                  href="/seller"
                  className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:flex"
                >
                  <Store className="h-4 w-4" aria-hidden />
                  Seller
                </Link>
              )}
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:flex"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                  Admin
                </Link>
              )}
              <span className="hidden items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-foreground lg:flex">
                <User className="h-4 w-4 text-accent" aria-hidden />
                {user.name}
              </span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10"
                  aria-label="Logout"
                >
                  <LogOut className="h-5 w-5" aria-hidden />
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="btn-gold !px-5 !py-2.5"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
