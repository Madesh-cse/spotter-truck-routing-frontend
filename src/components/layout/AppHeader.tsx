
"use client";

import { usePathname } from "next/navigation";
import { Menu, PanelTop } from "lucide-react";

type AppHeaderProps = {
  onMenuClick: () => void;
};

const pageTitles: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Route Planner",
    description: "Plan and compare weather-aware truck routes.",
  },
  "/dashboard": {
    title: "Fleet Dashboard",
    description: "Monitor fleet operations and route safety.",
  },
  "/route-planner": {
    title: "Route Planner",
    description: "Plan and compare weather-aware truck routes.",
  },
  "/weather-risk": {
    title: "Weather Risk Center",
    description: "Monitor weather conditions and route alerts.",
  },
  "/checkpoints": {
    title: "Checkpoints",
    description: "Review checkpoint forecasts and risk levels.",
  },
  "/analytics": {
    title: "Route Analytics",
    description: "Explore route performance and risk trends.",
  },
  "/settings": {
    title: "Settings",
    description: "Manage application preferences.",
  },
};

export default function AppHeader({ onMenuClick }: AppHeaderProps) {
  const pathname = usePathname();

  const page =
    pageTitles[pathname] ??
    Object.entries(pageTitles).find(
      ([path]) => path !== "/" && pathname.startsWith(`${path}/`)
    )?.[1] ?? {
      title: "Fleet Intelligence",
      description: "Weather-aware truck routing platform.",
    };

  return (
    <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="rounded-xl border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50 lg:hidden"
        >
          <Menu size={21} />
        </button>

        <div className="min-w-0">
          <div className="mb-1 hidden items-center gap-2 text-xs text-slate-400 sm:flex">
            <PanelTop size={13} />
            <span>Workspace</span>
            <span>/</span>
            <span className="text-slate-500">{page.title}</span>
          </div>

          <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            {page.title}
          </h1>

          <p className="mt-0.5 hidden text-sm text-slate-500 sm:block">
            {page.description}
          </p>
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 sm:flex">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <span className="text-xs font-medium text-emerald-700">
          Routing system
        </span>
      </div>
    </header>
  );
}
