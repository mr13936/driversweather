import { useState, useRef, useEffect } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Suggestion {
  display_name: string;
  place_id: string;
}

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  iconColor?: string;
}

export const CityAutocomplete = ({ 
  value, 
  onChange, 
  placeholder, 
  iconColor = 'text-muted-foreground' 
}: CityAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'RouteWeatherPlanner/1.0' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.map((item: any) => ({
          display_name: formatDisplayName(item),
          place_id: item.place_id
        })));
      }
    } catch (error) {
      console.error('Autocomplete error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDisplayName = (item: any): string => {
    const parts = [];
    if (item.address?.city) parts.push(item.address.city);
    else if (item.address?.town) parts.push(item.address.town);
    else if (item.address?.village) parts.push(item.address.village);
    else if (item.name) parts.push(item.name);
    
    if (item.address?.state) parts.push(item.address.state);
    if (item.address?.country) parts.push(item.address.country);
    
    return parts.length > 0 ? parts.join(', ') : item.display_name.split(',').slice(0, 3).join(',');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(true);
    setHighlightedIndex(-1);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  const handleSelect = (suggestion: Suggestion) => {
    onChange(suggestion.display_name.split(',')[0].trim());
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <MapPin className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${iconColor}`} />
      <Input
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => value.length >= 2 && setShowSuggestions(true)}
        placeholder={placeholder}
        className="pl-10"
        required
        autoComplete="off"
      />
      {isLoading && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
      
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.place_id}
              onClick={() => handleSelect(suggestion)}
              className={`cursor-pointer px-3 py-2 text-sm hover:bg-accent ${
                index === highlightedIndex ? 'bg-accent' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{suggestion.display_name}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
