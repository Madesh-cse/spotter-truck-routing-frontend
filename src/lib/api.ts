
import type { RoutePlanRequest, RoutePlanResponse } from "@/types/routes";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export async function createRoutePlan(
  request: RoutePlanRequest,
): Promise<RoutePlanResponse> {
  const response = await fetch(`${API_URL}/api/v1/routes/plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    const message =
      typeof errorData?.detail === "string"
        ? errorData.detail
        : `Route planning failed with status ${response.status}.`;

    throw new Error(message);
  }

  return response.json() as Promise<RoutePlanResponse>;
}
