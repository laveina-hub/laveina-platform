"use client";

import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { Loader2, MapPin, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button, Input } from "@/components/atoms";
import { cn } from "@/lib/utils";

const POSTCODE_REGEX = /^[0-9]{5}$/;
const PARTIAL_POSTCODE_REGEX = /^[0-9]{1,5}$/;
const DEBOUNCE_MS = 300;

interface Suggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

interface PostcodeSearchProps {
  id: string;
  placeholder?: string;
  searchLabel?: string;
  hasError?: boolean;
  errorId?: string;
  defaultValue?: string;
  className?: string;
  onPostcodeResolved: (postcode: string) => void;
}

function PostcodeSearch({
  id,
  placeholder,
  searchLabel,
  hasError,
  errorId,
  defaultValue = "",
  className,
  onPostcodeResolved,
}: PostcodeSearchProps) {
  const placesLib = useMapsLibrary("places");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const [inputValue, setInputValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const updateDropdownPosition = useCallback(() => {
    if (!inputWrapperRef.current) return;
    const rect = inputWrapperRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const resolvePostcode = useCallback(
    (postcode: string) => {
      if (POSTCODE_REGEX.test(postcode)) {
        onPostcodeResolved(postcode);
      }
    },
    [onPostcodeResolved]
  );

  const fetchSuggestions = useCallback(
    async (input: string) => {
      if (!placesLib) return;

      try {
        const response = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          includedRegionCodes: ["es"],
          includedPrimaryTypes: ["geocode"],
          language: document.documentElement.lang || "es",
        });

        const mapped: Suggestion[] = response.suggestions
          .filter((s) => s.placePrediction)
          .map((s) => ({
            placeId: s.placePrediction!.placeId,
            mainText: s.placePrediction!.mainText?.text ?? "",
            secondaryText: s.placePrediction!.secondaryText?.text ?? "",
          }));

        setSuggestions(mapped);
        if (mapped.length > 0) {
          updateDropdownPosition();
          setIsOpen(true);
        } else {
          setIsOpen(false);
        }
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
        setIsOpen(false);
      }
    },
    [placesLib, updateDropdownPosition]
  );

  const resolvePlace = useCallback(
    async (placeId: string) => {
      if (!placesLib) return;

      setIsOpen(false);
      setSuggestions([]);
      setIsResolving(true);

      try {
        const place = new placesLib.Place({ id: placeId });
        await place.fetchFields({ fields: ["addressComponents"] });

        const postcodeComponent = place.addressComponents?.find((c: { types: string[] }) =>
          c.types.includes("postal_code")
        );

        if (postcodeComponent?.longText) {
          const postcode = postcodeComponent.longText;
          setInputValue(postcode);
          resolvePostcode(postcode);
        }
      } catch {
        // Place resolution failed
      } finally {
        setIsResolving(false);
      }
    },
    [placesLib, resolvePostcode]
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (POSTCODE_REGEX.test(value)) {
        setIsOpen(false);
        setSuggestions([]);
        debounceRef.current = setTimeout(() => {
          resolvePostcode(value);
        }, DEBOUNCE_MS);
        return;
      }

      if (value.length > 2 && !PARTIAL_POSTCODE_REGEX.test(value)) {
        debounceRef.current = setTimeout(() => {
          fetchSuggestions(value);
        }, DEBOUNCE_MS);
      } else {
        setIsOpen(false);
        setSuggestions([]);
      }
    },
    [resolvePostcode, fetchSuggestions]
  );

  const handleSelectSuggestion = useCallback(
    (suggestion: Suggestion) => {
      setInputValue(suggestion.mainText);
      resolvePlace(suggestion.placeId);
    },
    [resolvePlace]
  );

  const handleSearchClick = useCallback(() => {
    resolvePostcode(inputValue.trim());
  }, [inputValue, resolvePostcode]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || suggestions.length === 0) {
        if (e.key === "Enter") {
          e.preventDefault();
          resolvePostcode(inputValue.trim());
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < suggestions.length) {
            handleSelectSuggestion(suggestions[activeIndex]);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setSuggestions([]);
          setActiveIndex(-1);
          break;
      }
    },
    [isOpen, suggestions, activeIndex, inputValue, resolvePostcode, handleSelectSuggestion]
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        inputWrapperRef.current &&
        !inputWrapperRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reposition dropdown on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    const reposition = () => updateDropdownPosition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isOpen, updateDropdownPosition]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && dropdownRef.current) {
      const item = dropdownRef.current.children[activeIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const isSearchDisabled = isResolving || inputValue.trim().length < 2;

  return (
    <div ref={inputWrapperRef} className={cn("flex gap-2", className)}>
      <div className="relative flex-1">
        <span className="text-text-muted pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2">
          <MapPin className="h-4 w-4" />
        </span>
        <Input
          id={id}
          type="text"
          autoComplete="off"
          inputMode={PARTIAL_POSTCODE_REGEX.test(inputValue) ? "numeric" : "text"}
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              updateDropdownPosition();
              setIsOpen(true);
            }
          }}
          hasError={hasError}
          aria-invalid={hasError}
          aria-describedby={errorId}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={isOpen ? `${id}-suggestions` : undefined}
          aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
          role="combobox"
          className="pl-10"
        />
      </div>
      <Button
        type="button"
        variant="secondary"
        onClick={handleSearchClick}
        disabled={isSearchDisabled}
        className="gap-2"
      >
        {isResolving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">{searchLabel}</span>
      </Button>

      {isOpen &&
        suggestions.length > 0 &&
        createPortal(
          <ul
            ref={dropdownRef}
            id={`${id}-suggestions`}
            role="listbox"
            style={{
              position: "fixed",
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
            }}
            className="border-border-default z-9999 max-h-52 overflow-auto rounded-xl border bg-white py-1 shadow-(--shadow-overlay)"
          >
            {suggestions.map((suggestion, idx) => (
              <li
                key={suggestion.placeId}
                id={`${id}-option-${idx}`}
                role="option"
                aria-selected={activeIndex === idx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectSuggestion(suggestion);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={cn(
                  "flex cursor-pointer items-start gap-3 px-4 py-2.5 transition-colors",
                  activeIndex === idx
                    ? "bg-primary-50 text-primary-700"
                    : "text-text-primary hover:bg-primary-50/50"
                )}
              >
                <MapPin className="text-text-muted mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{suggestion.mainText}</p>
                  {suggestion.secondaryText && (
                    <p className="text-text-muted truncate text-xs">{suggestion.secondaryText}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>,
          document.body
        )}
    </div>
  );
}

export { PostcodeSearch, type PostcodeSearchProps };
