
import type { RoutePlanRequest, RoutePlanResponse } from "@/types/routes";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export type RouteAssistantResponse = {
  answer: string;
};

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

export async function askRouteAssistant(
  question: string,
  routeData: RoutePlanResponse,
): Promise<RouteAssistantResponse> {
  const response = await fetch(
    `${API_URL}/api/v1/ai/route-assistant`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
        route_data: routeData,
      }),
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof data?.detail === "string"
        ? data.detail
        : `AI assistant failed with status ${response.status}.`;

    throw new Error(message);
  }

  return data as RouteAssistantResponse;
}
