"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  AlertTriangle,
  Bot,
  LoaderCircle,
  MapPin,
  RotateCcw,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { askRouteAssistant } from "@/lib/api";
import { riskOf, riskRank } from "@/lib/Checkpointutils";
import type { PlannedRoute, RoutePlanResponse } from "@/types/routes";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  at: number;
};

export type RouteAssistantContext = {
  originLabel: string;
  destinationLabel: string;
  intervalMiles: number;
  savedAt: string;
};

type RouteAssistantProps = {
  result: RoutePlanResponse;
  context?: RouteAssistantContext;
};

const MAX_LENGTH = 2000;

const suggestions = [
  "Which route is fastest?",
  "Which route has the lowest weather risk?",
  "Explain the recommended route.",
  "Where are the highest-risk checkpoints?",
];

const GREETING =
  "Your route plan is loaded. Ask me to compare routes, explain the recommendation, or identify weather-related risks along the way.";

function makeMessage(
  role: ChatMessage["role"],
  content: string,
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    at: Date.now(),
  };
}

function formatTime(ms: number) {
  return new Date(ms).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function RouteAssistant({
  result,
  context,
}: RouteAssistantProps) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Adjust if your RoutePlanResponse names the route list differently.
  const routes = useMemo(
    () =>
      ((result as unknown as { routes?: PlannedRoute[] }).routes ??
        []) as PlannedRoute[],
    [result],
  );

  const routeStats = useMemo(
    () =>
      routes.map((route, index) => ({
        id: route.route_id,
        label: `Route ${index + 1}`,
        checkpoints: route.checkpoints.length,
        highRisk: route.checkpoints.filter(
          (cp) => riskRank(riskOf(cp)) >= riskRank("high"),
        ).length,
      })),
    [routes],
  );

  const resetConversation = useCallback(() => {
    setMessages([makeMessage("assistant", GREETING)]);
    setError(null);
    setLastQuestion(null);
    setQuestion("");
  }, []);

  useEffect(() => {
    resetConversation();
  }, [result, resetConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, error]);

  const send = useCallback(
    async (text: string, addUserMessage = true) => {
      const submitted = text.trim();
      if (!submitted || loading) return;

      if (addUserMessage) {
        setMessages((current) => [...current, makeMessage("user", submitted)]);
      }
      setQuestion("");
      setError(null);
      setLastQuestion(submitted);
      setLoading(true);

      try {
        const response = await askRouteAssistant(submitted, result);
        setMessages((current) => [
          ...current,
          makeMessage("assistant", response.answer),
        ]);
        setLastQuestion(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to reach the route assistant.",
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, result],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(question);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(question);
    }
  }

  const hasConversation = messages.some((m) => m.role === "user");

  return (
    <section className="flex h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Context rail */}
      <aside className="hidden w-80 shrink-0 flex-col border-r border-slate-200 bg-slate-50 lg:flex">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-slate-900">
              Spotter AI
            </h2>
            <p className="text-xs text-slate-500">Route assistant</p>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {context && (
            <section>
              <h3 className="text-xs font-semibold text-slate-500">
                Current plan
              </h3>
              <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <p className="flex items-start gap-2 text-slate-800">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                  <span className="min-w-0">
                    <span className="block text-xs text-slate-500">From</span>
                    <span className="block wrap-break-words">
                      {context.originLabel}
                    </span>
                  </span>
                </p>
                <p className="flex items-start gap-2 text-slate-800">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <span className="min-w-0">
                    <span className="block text-xs text-slate-500">To</span>
                    <span className="block wrap-break-words">
                      {context.destinationLabel}
                    </span>
                  </span>
                </p>
                <p className="border-t border-slate-100 pt-2 text-xs text-slate-500">
                  Checkpoints every {context.intervalMiles} mi. Planned{" "}
                  {new Date(context.savedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </section>
          )}

          {routeStats.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-slate-500">
                Routes in this plan
              </h3>
              <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {routeStats.map((stat) => (
                  <li
                    key={stat.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{stat.label}</p>
                      <p className="text-xs text-slate-500">
                        {stat.checkpoints} checkpoints
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        stat.highRisk > 0
                          ? "bg-orange-50 text-orange-700 ring-orange-600/20"
                          : "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                      }`}
                    >
                      {stat.highRisk > 0
                        ? `${stat.highRisk} high-risk`
                        : "No high-risk"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="text-xs font-semibold text-slate-500">
              Suggested questions
            </h3>
            <div className="mt-2 space-y-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={loading}
                  onClick={() => void send(suggestion)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="flex items-start gap-2 border-t border-slate-200 px-5 py-4 text-xs leading-5 text-slate-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          Answers use only the data in this route plan. They do not guarantee
          road safety or reflect live road conditions.
        </div>
      </aside>

      {/* Conversation */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-slate-900">
              Route assistant
            </h1>
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Grounded in your current route plan
            </p>
          </div>

          <button
            type="button"
            onClick={resetConversation}
            disabled={loading || !hasConversation}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            New conversation
          </button>
        </header>

        <div
          aria-live="polite"
          className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-6 sm:px-6"
        >
          <div className="mx-auto w-full max-w-3xl space-y-6">
            {messages.map((message) => {
              const isUser = message.role === "user";

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isUser
                        ? "bg-slate-200 text-slate-700"
                        : "bg-blue-700 text-white"
                    }`}
                  >
                    {isUser ? (
                      <UserRound className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>

                  <div
                    className={`flex min-w-0 max-w-[85%] flex-col ${
                      isUser ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                        isUser
                          ? "rounded-tr-sm bg-blue-700 text-white"
                          : "rounded-tl-sm border border-slate-200 bg-slate-50 text-slate-800"
                      }`}
                    >
                      <p className="whitespace-pre-wrap wrap-break-words">
                        {message.content}
                      </p>
                    </div>
                    <span className="mt-1 text-[11px] text-slate-400">
                      {isUser ? "You" : "Spotter"} · {formatTime(message.at)}
                    </span>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <span className="flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Analyzing route and checkpoint data...
                </span>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="wrap-break-words">{error}</p>
                  {lastQuestion && (
                    <button
                      type="button"
                      onClick={() => void send(lastQuestion, false)}
                      className="mt-2 text-xs font-semibold underline underline-offset-2"
                    >
                      Try again
                    </button>
                  )}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div className="mx-auto w-full max-w-3xl space-y-3">
            {!hasConversation && (
              <div className="flex gap-2 overflow-x-auto lg:hidden">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={loading}
                    onClick={() => void send(suggestion)}
                    className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-slate-300 bg-white transition focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20"
            >
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about routes, weather risks, or checkpoints"
                maxLength={MAX_LENGTH}
                rows={2}
                disabled={loading}
                aria-label="Ask Spotter about the route plan"
                className="block w-full resize-none rounded-xl bg-transparent px-4 pt-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60"
              />

              <div className="flex items-center justify-between gap-3 px-3 pb-2.5 pt-1">
                <p className="text-[11px] text-slate-400">
                  Enter to send, Shift+Enter for a new line
                  <span className="ml-3 tabular-nums">
                    {question.length}/{MAX_LENGTH}
                  </span>
                </p>

                <button
                  type="submit"
                  disabled={loading || !question.trim()}
                  aria-label="Send question"
                  className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Ask
                </button>
              </div>
            </form>

            <p className="text-center text-[11px] text-slate-400 lg:hidden">
              Answers are based on your route plan, not live road conditions.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}