
"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Bot,
  LoaderCircle,
  MessageCircle,
  Send,
  UserRound,
} from "lucide-react";

import { askRouteAssistant } from "@/lib/api";
import type { RoutePlanResponse } from "@/types/routes";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

type RouteAssistantProps = {
  result: RoutePlanResponse;
};

const suggestions = [
  "Which route is fastest?",
  "Which route has the lowest weather risk?",
  "Explain the recommended route.",
  "Where are the highest-risk checkpoints?",
];

export default function RouteAssistant({
  result,
}: RouteAssistantProps) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "I'm Spotter. Ask me about route alternatives, travel time, weather exposure, or high-risk checkpoints in your current plan.",
    },
  ]);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content:
          "Your route plan is ready. Ask me to compare routes, explain the recommendation, or identify weather-related risks.",
      },
    ]);
    setError(null);
    setQuestion("");
  }, [result]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const submittedQuestion = question.trim();

    if (!submittedQuestion || loading) return;

    setMessages((current) => [
      ...current,
      { role: "user", content: submittedQuestion },
    ]);
    setQuestion("");
    setError(null);
    setLoading(true);

    try {
      const response = await askRouteAssistant(
        submittedQuestion,
        result,
      );

      setMessages((current) => [
        ...current,
        { role: "assistant", content: response.answer },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reach the route assistant.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-950 px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
          <Bot className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-white">
            Spotter AI Route Assistant
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Answers grounded in your current route plan
          </p>
        </div>

        <MessageCircle className="h-5 w-5 text-slate-400" />
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={loading}
              onClick={() => setQuestion(suggestion)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div
          aria-live="polite"
          className="max-h-105 min-h-40 space-y-4 overflow-y-auto rounded-xl bg-slate-50 p-3 sm:p-4"
        >
          {messages.map((message, index) => (
            <div
              key={`${index}-${message.role}`}
              className={`flex gap-2.5 ${
                message.role === "user"
                  ? "flex-row-reverse"
                  : "flex-row"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  message.role === "assistant"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {message.role === "assistant" ? (
                  <Bot className="h-4 w-4" />
                ) : (
                  <UserRound className="h-4 w-4" />
                )}
              </div>

              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-3 text-sm leading-6 ${
                  message.role === "assistant"
                    ? "border border-slate-200 bg-white text-slate-700"
                    : "bg-blue-600 text-white"
                }`}
              >
                <p className="whitespace-pre-wrap wrap-break-words">
                  {message.content}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Analyzing route and checkpoint data...
            </div>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about routes, weather risks..."
            maxLength={2000}
            disabled={loading}
            aria-label="Ask Spotter about the route plan"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          />

          <button
            type="submit"
            disabled={loading || !question.trim()}
            aria-label="Send question"
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Ask</span>
          </button>
        </form>

        <p className="text-xs leading-5 text-slate-500">
          AI responses are based on available route-plan data and are not a
          guarantee of road safety or live road conditions.
        </p>
      </div>
    </section>
  );
}
