import Link from "next/link";
import { getSessionUser } from "@/server/auth/session";
import { logoutAction } from "@/server/actions/auth";

export async function Navbar() {
  const user = await getSessionUser();

  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Mazadi
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/auctions" className="text-sm font-medium hover:underline">
            Auctions
          </Link>
          <Link href="/search" className="text-sm font-medium hover:underline">
            Search
          </Link>
          {user ? (
            <>
              <Link href="/buyer" className="text-sm font-medium hover:underline">
                My Bids
              </Link>
              {user.role === "SELLER" && (
                <Link href="/seller" className="text-sm font-medium hover:underline">
                  Seller
                </Link>
              )}
              {user.role === "ADMIN" && (
                <Link href="/admin" className="text-sm font-medium hover:underline">
                  Admin
                </Link>
              )}
              <span className="text-sm text-muted-foreground">{user.name}</span>
              <form action={logoutAction}>
                <button type="submit" className="text-sm font-medium text-destructive hover:underline">
                  Logout
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium hover:underline">
                Login
              </Link>
              <Link href="/register" className="text-sm font-medium hover:underline">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
