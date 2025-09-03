import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface SearchFilterProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

export function SearchFilter({ value, onChange, onClear }: SearchFilterProps) {
  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 z-10" />
      
      {!value && (
        <div className="absolute left-10 top-1/2 transform -translate-y-1/2 pointer-events-none text-sm text-muted-foreground z-10">
          Search{' '}
          <span className="bg-gradient-to-r from-primary via-primary/70 to-primary/40 bg-clip-text text-transparent font-medium">
            signals
          </span>
          ...
        </div>
      )}
      
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 pr-10 h-10 bg-background/50 border-border/60 focus:border-primary/50 transition-all duration-200"
        style={{
          color: undefined,
          backgroundColor: undefined
        }}
      />
      
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive z-10"
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}