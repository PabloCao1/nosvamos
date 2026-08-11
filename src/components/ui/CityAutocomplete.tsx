import { useEffect, useState } from "react";
import { searchCities, type CitySuggestion } from "../../lib/locations/searchCities";
import { Icon } from "./Icon";

export function CityAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Buscar ciudad",
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (city: CitySuggestion) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [results, setResults] = useState<CitySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (value.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      searchCities(value, controller.signal)
        .then((items) => {
          setResults(items);
          setOpen(true);
        })
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, 320);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  return (
    <div className="city-autocomplete">
      <div className="city-input">
        <Icon name="location" size={17} />
        <input
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          autoComplete="off"
          required={required}
        />
        {loading && <span className="city-loading" aria-label="Buscando" />}
      </div>
      {open && results.length > 0 && (
        <div className="city-results" role="listbox">
          {results.map((city) => (
            <button
              type="button"
              role="option"
              key={`${city.id}-${city.latitude}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(city.name);
                onSelect?.(city);
                setOpen(false);
              }}
            >
              <Icon name="location" size={16} />
              <span><strong>{city.name}</strong><small>{[city.region, city.country].filter(Boolean).join(", ")}</small></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
