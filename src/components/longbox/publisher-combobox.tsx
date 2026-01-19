'use client'

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { PUBLISHERS_MAP } from "@/lib/publishers"

export function PublisherCombobox({ 
    value, 
    onChange 
}: { 
    value: string, 
    onChange: (val: string) => void 
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full md:w-[220px] justify-between text-muted-foreground"
        >
          {value && value !== 'all'
            ? PUBLISHERS_MAP.find((p) => p.id === value)?.label
            : "Select Publisher..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0">
        <Command>
          <CommandInput placeholder="Search publisher..." />
          <CommandList>
            <CommandEmpty>No publisher found.</CommandEmpty>
            <CommandGroup>
               <CommandItem
                  value="all"
                  onSelect={() => {
                    onChange('all')
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === 'all' ? "opacity-100" : "opacity-0"
                    )}
                  />
                  All Publishers
                </CommandItem>
              {PUBLISHERS_MAP.map((publisher) => (
                <CommandItem
                  key={publisher.id}
                  value={publisher.label} // Value used for filtering logic in command
                  onSelect={() => {
                    onChange(publisher.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === publisher.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {publisher.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

