
import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useOptimizedSearch } from '@/hooks/useOptimizedSearch';

interface CompactSignalSearchProps {
  onSearchChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function CompactSignalSearch({ 
  onSearchChange, 
  placeholder = "Search signals...",
  className = ""
}: CompactSignalSearchProps) {
  const { searchTerm, handleSearchChange, clearSearch } = useOptimizedSearch('', {
    delay: 300,
    minLength: 0
  });

  React.useEffect(() => {
    onSearchChange(searchTerm);
  }, [searchTerm, onSearchChange]);

  return (
    <div className={`relative w-80 ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      <Input
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="pl-10 pr-8 bg-black/20 border-gray-700/50 text-white placeholder:text-gray-400 focus:border-green-500/50"
      />
      {searchTerm && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearSearch}
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-white"
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}
