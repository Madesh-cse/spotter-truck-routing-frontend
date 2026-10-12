"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  Check,
  ChevronDown,
  LoaderCircle,
  MapPin,
  Search,
  X,
} from "lucide-react";

export type LocationSuggestion = {
  label: string;
  latitude: number;
  longitude: number;
};

type LocationAutocompleteProps = {
  label: string;
  placeholder: string;
  value: LocationSuggestion | null;
  onChange: (location: LocationSuggestion | null) => void;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export default function LocationAutocomplete({
  label,
  placeholder,
  value,
  onChange,
}: LocationAutocompleteProps) {
  const inputId = useId();
  const listId = `${inputId}-list`;

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(value?.label ?? "");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Keep the displayed query synchronized with the selected value.
  useEffect(() => {
    setQuery(value?.label ?? "");
  }, [value]);

  // Search the geocoding API with debounce and request cancellation.
  useEffect(() => {
    const searchTerm = query.trim();

    if (
      searchTerm.length < 2 ||
      (value !== null && searchTerm === value.label)
    ) {
      setSuggestions([]);
      setLoading(false);
      setError("");
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_URL}/api/v1/geocoding/search?q=${encodeURIComponent(searchTerm)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(
            "Location search is temporarily unavailable. Try again.",
          );
        }

        const data: { results: LocationSuggestion[] } =
          await response.json();

        if (controller.signal.aborted) return;

        const results = data.results ?? [];

        setSuggestions(results);
        setIsOpen(true);
        setActiveIndex(-1);

        if (results.length === 0) {
          setError("No matching locations found. Try another search.");
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setSuggestions([]);
          setError(err.message);
          setIsOpen(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, value]);

  // Close the suggestions when clicking outside the component.
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const selectLocation = useCallback(
    (location: LocationSuggestion) => {
      setQuery(location.label);
      setSuggestions([]);
      setError("");
      setIsOpen(false);
      setActiveIndex(-1);
      onChange(location);
    },
    [onChange],
  );

  function handleInputChange(text: string) {
    setQuery(text);
    setError("");
    setActiveIndex(-1);
    setIsOpen(text.trim().length >= 2);

    if (value) {
      onChange(null);
    }
  }

  function clearLocation() {
    setQuery("");
    setSuggestions([]);
    setError("");
    setIsOpen(false);
    setActiveIndex(-1);
    onChange(null);
    inputRef.current?.focus();
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (suggestions.length > 0) {
        setIsOpen(true);
        setActiveIndex((current) =>
          current < suggestions.length - 1 ? current + 1 : 0,
        );
      }

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (suggestions.length > 0) {
        setActiveIndex((current) =>
          current > 0 ? current - 1 : suggestions.length - 1,
        );
      }

      return;
    }

    if (event.key === "Enter" && isOpen) {
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        event.preventDefault();
        selectLocation(suggestions[activeIndex]);
      } else if (suggestions.length > 0) {
        event.preventDefault();
        selectLocation(suggestions[0]);
      }
    }
  }

  const hasError = !value && Boolean(error);
  const showDropdown =
    isOpen &&
    !value &&
    (loading || suggestions.length > 0 || Boolean(error));

  return (
    <div ref={containerRef} className="min-w-0">
      {/* Field label */}
      <label
        htmlFor={inputId}
        className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"
      >
        <MapPin size={15} className="text-slate-500" />
        {label}
        <span className="text-red-500">*</span>
      </label>

      {/* Input container */}
      <div className="relative">
        <div
          className={`relative flex min-h-12 items-center rounded-xl border bg-white transition-all duration-200 ${
            hasError
              ? "border-red-300 ring-4 ring-red-500/5"
              : value
                ? "border-emerald-300 bg-emerald-50/30"
                : "border-slate-200 hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10"
          }`}
        >
          <div className="pointer-events-none absolute left-3.5 flex items-center justify-center">
            {loading ? (
              <LoaderCircle
                size={18}
                className="animate-spin text-blue-600"
              />
            ) : value ? (
              <Check size={18} className="text-emerald-600" />
            ) : (
              <Search size={18} className="text-slate-400" />
            )}
          </div>

          <input
            ref={inputRef}
            id={inputId}
            type="text"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={showDropdown}
            aria-activedescendant={
              activeIndex >= 0
                ? `${listId}-option-${activeIndex}`
                : undefined
            }
            aria-invalid={hasError}
            aria-describedby={`${inputId}-help`}
            placeholder={placeholder}
            value={query}
            onFocus={() => {
              if (
                !value &&
                (suggestions.length > 0 || error)
              ) {
                setIsOpen(true);
              }
            }}
            onChange={(event) =>
              handleInputChange(event.target.value)
            }
            onKeyDown={handleKeyDown}
            className="h-12 w-full min-w-0 rounded-xl bg-transparent py-3 pl-11 pr-11 text-sm font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
          />

          {query && (
            <button
              type="button"
              onClick={clearLocation}
              aria-label={`Clear ${label.toLowerCase()}`}
              className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {showDropdown && (
          <div
            className="absolute left-0 right-0 top-full z-9999] mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-3.5 py-2.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Location results
              </span>

              {loading ? (
                <span className="flex items-center gap-1.5 text-xs text-blue-600">
                  <LoaderCircle size={12} className="animate-spin" />
                  Searching
                </span>
              ) : suggestions.length > 0 ? (
                <span className="text-xs text-slate-400">
                  {suggestions.length} found
                </span>
              ) : null}
            </div>

            <ul
              id={listId}
              role="listbox"
              aria-label={`${label} suggestions`}
              className="max-h-64 overflow-y-auto overscroll-contain p-1.5"
            >
              {suggestions.map((location, index) => {
                const isActive = activeIndex === index;

                return (
                  <li
                    key={`${location.longitude}-${location.latitude}-${index}`}
                    id={`${listId}-option-${index}`}
                    role="option"
                    aria-selected={isActive}
                  >
                    <button
                      type="button"
                      tabIndex={-1}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectLocation(location)}
                      className={`flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
                        isActive
                          ? "bg-blue-50"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isActive
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <MapPin size={16} />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-5 text-slate-800">
                          {location.label}
                        </span>

                        <span className="mt-1 block text-xs tabular-nums text-slate-400">
                          {location.latitude.toFixed(4)},{" "}
                          {location.longitude.toFixed(4)}
                        </span>
                      </span>

                      <ChevronDown
                        size={15}
                        className={`mt-2 shrink-0 -rotate-90 ${
                          isActive
                            ? "text-blue-600"
                            : "text-slate-300"
                        }`}
                      />
                    </button>
                  </li>
                );
              })}

              {!loading && error && (
                <li role="presentation" className="px-3 py-5 text-center">
                  <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                    <MapPin size={17} />
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    {error}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Check your search and try again.
                  </p>
                </li>
              )}

              {loading && suggestions.length === 0 && (
                <li
                  role="presentation"
                  className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-slate-500"
                >
                  <LoaderCircle
                    size={16}
                    className="animate-spin text-blue-600"
                  />
                  Finding locations...
                </li>
              )}
            </ul>

            <div className="border-t border-slate-100 px-3.5 py-2">
              <p className="text-[10px] text-slate-400">
                Use ↑ ↓ to navigate and Enter to select.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Helper text and selected state */}
      {value ? (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
          <Check
            size={14}
            className="mt-0.5 shrink-0 text-emerald-600"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-emerald-800">
              Location confirmed
            </p>
            <p className="mt-0.5 wrap-break-words text-[11px] tabular-nums text-emerald-700/80">
              {value.latitude.toFixed(5)},{" "}
              {value.longitude.toFixed(5)}
            </p>
          </div>
        </div>
      ) : (
        <p
          id={`${inputId}-help`}
          className={`mt-2 text-xs ${
            hasError ? "text-red-600" : "text-slate-400"
          }`}
          role={hasError ? "status" : undefined}
        >
          {error
            ? error
            : query.trim().length > 0 && query.trim().length < 2
              ? "Enter at least 2 characters to search."
              : "Search for a city, address, or destination."}
        </p>
      )}
    </div>
  );
}