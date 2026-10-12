"use client";

import { useSyncExternalStore } from "react";
import type { RoutePlanResponse } from "@/types/routes";

export type SavedRoutePlan = {
  result: RoutePlanResponse;
  originLabel: string;
  destinationLabel: string;
  intervalMiles: number;
  savedAt: string;
};

const KEY = "spotter:last-route-plan";
const EVENT = "spotter:route-plan-changed";

// Cache the parsed value so useSyncExternalStore gets a stable reference.
let cache: { raw: string | null; value: SavedRoutePlan | null } = {
  raw: null,
  value: null,
};

function read(): SavedRoutePlan | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === cache.raw) return cache.value;
    cache = { raw, value: raw ? (JSON.parse(raw) as SavedRoutePlan) : null };
    return cache.value;
  } catch {
    return null;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function saveRoutePlan(plan: SavedRoutePlan) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(plan));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Storage can be unavailable (private mode, quota); the planner still works.
  }
}

export function clearRoutePlan() {
  try {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // ignore
  }
}

export function useSavedRoutePlan(): SavedRoutePlan | null {
  return useSyncExternalStore(subscribe, read, () => null);
}