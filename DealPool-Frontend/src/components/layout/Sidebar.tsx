import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  Compass,
  FolderHeart,
  LogOut,
  PlusCircle,
  Settings,
  Shield,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { BrandMark } from "../common/BrandMark";
import { cn } from "../../lib/cn";

export function Sidebar() {
  const location = useLocation();
  const { user, isAdmin, logout } = useAuth();

  const navItems = [
    { name: "Live radar", path: "/deals", icon: Compass },
    { name: "Post a need", path: "/deals/new", icon: PlusCircle },
    { name: "My needs", path: "/my-deals", icon: FolderHeart },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  if (isAdmin) {
    navItems.push({ name: "Admin", path: "/admin", icon: Shield });
  }

  return (
    <aside className="sticky top-0 z-30 hidden h-screen w-56 shrink-0 flex-col border-r border-[var(--line)] bg-white lg:flex xl:w-60">
      <div className="border-b border-[var(--line)] px-5 py-5">
        <BrandMark size="sm" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
          Menu
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            (item.path === "/deals" && location.pathname === "/browse");
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isActive
                  ? "bg-[var(--ink)] text-white"
                  : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? "text-[var(--signal)]" : "")} />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--line)] p-3">
        {user ? (
          <div className="space-y-2">
            <Link
              to="/settings"
              className="flex min-w-0 items-center gap-3 rounded-xl p-2 transition hover:bg-[var(--surface)]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--paper)] text-xs font-bold text-[var(--pool)]">
                {user.profile_photo ? (
                  <img
                    src={user.profile_photo}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  user.username.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[var(--ink)]">{user.username}</p>
                <p className="truncate text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                  {user.role === "admin" ? "Admin" : "Member"}
                </p>
              </div>
            </Link>
            <button
              type="button"
              onClick={async () => {
                try {
                  await logout().unwrap();
                  toast.success("Signed out");
                } catch {
                  toast.error("Sign-out request failed");
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log out
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Link
              to="/login"
              className="block rounded-xl bg-[var(--signal)] py-2 text-center text-xs font-bold text-white transition hover:bg-[var(--signal-deep)]"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="block rounded-xl border border-[var(--line)] py-2 text-center text-xs font-semibold text-[var(--ink)] transition hover:bg-[var(--surface)]"
            >
              Create account
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
