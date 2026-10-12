
"use client";

import Link from "next/link";
import { ArrowLeft, Bot } from "lucide-react";

import RouteAssistant from "@/components/RouteAssistant";
import { useSavedRoutePlan } from "@/lib/routePlanStore";

export default function RouteAssistantPage() {
  const savedPlan = useSavedRoutePlan();

  if (!savedPlan) {
    return (
      <main className="flex min-h-[calc(100dvh-2rem)] w-full items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Bot className="h-7 w-7" />
          </div>

          <h2 className="mt-5 text-xl font-semibold text-slate-900">
            No route plan available
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Generate a route plan before asking Spotter AI about routes,
            weather conditions, and checkpoint risks.
          </p>

          <Link
            href="/route-planner"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Open Route Planner
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="h-[calc(100dvh-2rem)] min-h-140 w-full p-2 sm:p-4 lg:p-5">
      <div className="h-full w-full">
        <RouteAssistant result={savedPlan.result} />
      </div>
    </main>
  );
}
