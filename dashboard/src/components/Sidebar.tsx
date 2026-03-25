import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Box,
  ScrollText,
  Wallet,
  Settings,
  LogOut,
} from "lucide-react";
import { api } from "@/api/client";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/teams", icon: Users, label: "Teams" },
  { to: "/models", icon: Box, label: "Models" },
  { to: "/logs", icon: ScrollText, label: "Logs" },
  { to: "/budgets", icon: Wallet, label: "Budgets" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const handleLogout = async () => {
    await api.logout();
    window.location.href = "/login";
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold">MYLLM Proxy</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
