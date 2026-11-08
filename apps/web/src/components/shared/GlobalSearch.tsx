import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Search } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '@/lib/supabase';
import {
  loadGlobalSearchSuggestions,
  type GlobalSearchSuggestion,
} from '@/features/catalog/shop/globalSearchService';

type GlobalSearchProps = {
  className: string;
};

export default function GlobalSearch({ className }: GlobalSearchProps) {
  const reduceMotion = useReducedMotion();
  const location = useLocation();
  const navigate = useNavigate();
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(() => {
    const params = new URLSearchParams(location.search);
    return location.pathname.startsWith('/shop') ? (params.get('q') ?? '') : '';
  });
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [suggestionResult, setSuggestionResult] = useState<{
    query: string;
    suggestions: GlobalSearchSuggestion[];
    error: string;
  }>({ query: '', suggestions: [], error: '' });
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const suggestions = suggestionResult.query === debouncedQuery ? suggestionResult.suggestions : [];
  const error = suggestionResult.query === debouncedQuery ? suggestionResult.error : '';
  const isLoading =
    isFocused && debouncedQuery.length >= 2 && suggestionResult.query !== debouncedQuery;

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim()), 240);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!isFocused || debouncedQuery.length < 2) {
      return;
    }

    let isCurrent = true;
    void (async () => {
      try {
        const client = await getSupabaseClient();
        const results = await loadGlobalSearchSuggestions(client, debouncedQuery);
        if (isCurrent) {
          setSuggestionResult({ query: debouncedQuery, suggestions: results, error: '' });
        }
      } catch (loadError) {
        if (isCurrent) {
          setSuggestionResult({
            query: debouncedQuery,
            suggestions: [],
            error:
              loadError instanceof Error
                ? loadError.message
                : 'Search suggestions could not be loaded.',
          });
        }
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [debouncedQuery, isFocused]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsFocused(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [isFocused]);

  const navigateToSearch = (searchQuery = query) => {
    const trimmed = searchQuery.trim();
    navigate(trimmed ? `/shop?q=${encodeURIComponent(trimmed)}` : '/shop');
    setIsFocused(false);
    setActiveIndex(-1);
  };

  const chooseSuggestion = (suggestion: GlobalSearchSuggestion) => {
    navigate(suggestion.href);
    setIsFocused(false);
    setActiveIndex(-1);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      chooseSuggestion(suggestions[activeIndex]);
      return;
    }
    navigateToSearch();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && suggestions.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp' && suggestions.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === 'Escape') {
      setIsFocused(false);
      setActiveIndex(-1);
    }
  };

  const showSuggestions = isFocused && (debouncedQuery.length >= 2 || isLoading || Boolean(error));

  return (
    <div className={`global-search ${className}`} ref={containerRef}>
      <form className="global-search-form" role="search" onSubmit={handleSubmit}>
        <Search className="global-search-icon" aria-hidden="true" />
        <input
          type="search"
          value={query}
          placeholder="Search considered essentials"
          aria-label="Search products, brands, or categories"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button
            type="button"
            className="global-search-clear"
            aria-label="Clear search"
            onClick={() => {
              setQuery('');
              navigateToSearch('');
            }}
          >
            Clear
          </button>
        )}
        <kbd className="search-shortcut" aria-hidden="true">
          ⌘ K
        </kbd>
      </form>

      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            className="global-search-suggestions"
            initial={reduceMotion ? false : { opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : -5 }}
            transition={{ duration: reduceMotion ? 0 : 0.16 }}
          >
            <div className="global-search-suggestion-heading">
              {isLoading ? 'Searching the collection…' : 'SUGGESTIONS'}
            </div>
            <ul id={listId} role="listbox" aria-label="Search suggestions">
              {suggestions.map((suggestion, index) => (
                <li key={`${suggestion.type}-${suggestion.id}`} role="presentation">
                  <button
                    id={`${listId}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={activeIndex === index}
                    className="global-search-suggestion"
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => chooseSuggestion(suggestion)}
                  >
                    <span>
                      <strong>{suggestion.label}</strong>
                      <small>{suggestion.detail}</small>
                    </span>
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            {!isLoading && !error && suggestions.length === 0 && (
              <p className="global-search-no-suggestions" role="status">
                No suggestions yet. Press Enter to search for “{debouncedQuery}”.
              </p>
            )}
            {error && (
              <p className="global-search-no-suggestions" role="status">
                {error}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
