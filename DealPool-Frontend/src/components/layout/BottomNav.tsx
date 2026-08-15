import { Link, useLocation } from "react-router-dom";
import { Compass, FolderHeart, PlusCircle, Settings, Shield } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { cn } from "../../lib/cn";

export function BottomNav() {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const items = [
    { name: "Radar", path: "/deals", icon: Compass },
    { name: "Post", path: "/deals/new", icon: PlusCircle },
    { name: "Mine", path: "/my-deals", icon: FolderHeart },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  if (isAdmin) {
    items.push({ name: "Admin", path: "/admin", icon: Shield });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-stretch justify-around border-t border-[var(--line)] bg-white/95 px-1 py-1.5 backdrop-blur-md lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          location.pathname === item.path ||
          (item.path === "/deals" && location.pathname === "/browse");
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition",
              isActive ? "text-[var(--signal)]" : "text-[var(--muted)] hover:text-[var(--ink)]"
            )}
          >
            <Icon className={cn("h-5 w-5", item.path === "/deals/new" && "h-6 w-6")} />
            <span className="max-w-full truncate">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
