"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  CloudLightning,
  LayoutDashboard,
  MapPin,
  Route,
  Settings,
  Truck,
  X,
} from "lucide-react";

type AppSidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
};

const navigation = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Route Planner",
    href: "/route-planner",
    icon: Route,
  },
  {
    label: "Weather Risk Center",
    href: "/weather-risk",
    icon: CloudLightning,
  },
  {
    label: "Checkpoints",
    href: "/checkpoints",
    icon: MapPin,
  },
  {
    label: "Route Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    label: "Route Assistant",
    href: "/route-assistant",
    icon: Bot,
  },
];

export default function AppSidebar({ mobileOpen, onClose }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-200 px-3">
          <Link href="/" onClick={onClose} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Truck size={22} />
            </div>

            <div>
              <p className="text-base font-bold tracking-tight text-slate-900">
                Spotter
              </p>
              <p className="text-xs font-medium text-slate-500">
                Fleet Intelligence
              </p>
            </div>
          </Link>

          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>

          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon
                  size={19}
                  className={
                    active
                      ? "text-blue-600"
                      : "text-slate-400 group-hover:text-slate-600"
                  }
                />

                <span className="flex-1">{item.label}</span>

                {active && (
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700">
              Weather-aware routing
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Plan safer routes with weather risk insights.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
