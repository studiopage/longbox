'use client'

import * as React from "react"
import { Loader2, Library, Globe, ArrowRight, X, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useDebounce } from "use-debounce" 

import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { smartSearch, type SearchResult } from "@/actions/smart-search"

export function SmartSearch() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [debouncedQuery] = useDebounce(query, 300)
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const router = useRouter()
  
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setOpen(query.length > 0)
  }, [query])

  React.useEffect(() => {
    async function fetchResults() {
      if (debouncedQuery.length < 2) {
        setResults([])
        return
      }
      setLoading(true)
      const data = await smartSearch(debouncedQuery)
      setResults(data)
      setLoading(false)
    }
    fetchResults()
  }, [debouncedQuery])

  const handleSelect = (url: string) => {
    setOpen(false)
    setQuery("")
    router.push(url)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation() 
    setQuery("")
    setOpen(false)
    inputRef.current?.focus()
  }

  const handleShowAll = () => {
    setOpen(false)
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  const handleContainerClick = () => {
    inputRef.current?.focus()
  }

  const localItems = results.filter(r => r.source === 'local')
  const remoteItems = results.filter(r => r.source === 'remote')

  return (
    <div className="w-full relative group">
      <div 
        onClick={handleContainerClick}
        className="flex items-center w-full rounded-lg border shadow-sm bg-muted/50 transition-all duration-200 focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/20 cursor-text px-3 h-12 relative"
      >
        <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0 opacity-50" />

        {/* CRITICAL FIX: shouldFilter={false} prevents cmdk from hiding your footer */}
        <Command 
            shouldFilter={false} 
            className="bg-transparent border-none shadow-none h-full overflow-visible"
        >
            <div className="flex items-center w-full h-full relative">
                <CommandInput 
                    ref={inputRef}
                    placeholder="Search comics or series..." 
                    value={query}
                    onValueChange={setQuery}
                    className="flex-1 h-full bg-transparent text-sm outline-none placeholder:text-muted-foreground border-none focus:ring-0 shadow-none p-0 w-full"
                />
                
                {query.length > 0 && (
                    <button 
                        onClick={handleClear}
                        className="p-1 ml-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Clear search"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {open && query.length > 0 && (
                <div className="absolute top-[calc(100%+6px)] left-0 w-full z-50 rounded-md border bg-popover text-popover-foreground shadow-lg outline-none animate-in fade-in-0 slide-in-from-top-1">
                    <CommandList className="max-h-[500px] overflow-y-auto">
                        
                        {loading && (
                            <div className="py-6 text-center text-sm text-muted-foreground flex justify-center items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" /> Searching...
                            </div>
                        )}
                        
                        {!loading && results.length === 0 && debouncedQuery.length > 2 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                No results found.
                            </div>
                        )}

                        {!loading && results.length > 0 && (
                            <>
                                {localItems.length > 0 && (
                                    <CommandGroup heading="In Your Library">
                                    {localItems.map((item) => (
                                        <CommandItem
                                        key={item.id}
                                        value={item.id} // Simple value since we disabled filtering
                                        onSelect={() => handleSelect(item.url)}
                                        className="cursor-pointer"
                                        >
                                        <Library className="mr-2 h-4 w-4 text-green-500" />
                                        <div className="flex flex-col">
                                            <span className="font-medium">{item.title}</span>
                                            <span className="text-xs text-muted-foreground">{item.publisher} • {item.year}</span>
                                        </div>
                                        </CommandItem>
                                    ))}
                                    </CommandGroup>
                                )}
                                
                                {localItems.length > 0 && remoteItems.length > 0 && <CommandSeparator />}

                                {remoteItems.length > 0 && (
                                    <CommandGroup heading="Global Database">
                                    {remoteItems.map((item) => (
                                        <CommandItem
                                        key={item.id}
                                        value={item.id}
                                        onSelect={() => handleSelect(item.url)}
                                        className="cursor-pointer"
                                        >
                                        <Globe className="mr-2 h-4 w-4 text-blue-500" />
                                        <div className="flex flex-col">
                                            <span className="font-medium">{item.title}</span>
                                            <span className="text-xs text-muted-foreground">{item.publisher} • {item.year}</span>
                                        </div>
                                        <ArrowRight className="ml-auto h-4 w-4 opacity-50" />
                                        </CommandItem>
                                    ))}
                                    </CommandGroup>
                                )}

                                 {/* FOOTER: Now protected from filtering */}
                                 <CommandSeparator />
                                 <div className="p-1">
                                    <CommandItem 
                                        value="show-all-results"
                                        onSelect={handleShowAll}
                                        className="justify-center text-primary font-bold cursor-pointer py-3 bg-accent/20 hover:bg-accent/40 rounded-sm flex items-center"
                                    >
                                        Show all results for "{query}"
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </CommandItem>
                                 </div>
                            </>
                        )}
                    </CommandList>
                </div>
            )}
        </Command>
      </div>
    </div>
  )
}
