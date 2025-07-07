
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { ChevronsUpDown, Check, PlusCircle } from 'lucide-react';
import type { Event } from '@/lib/types';
import RoopkothaLogo from './icons/roopkotha-logo';
import { CreateEventDialog } from './create-event-dialog';

type EventSwitcherProps = {
  events: Event[];
  activeEvent: Event | undefined;
  onSwitchEvent: (eventId: string) => void;
  onCreateEvent: (name: string) => Promise<Event>;
  disabled: boolean;
};

export function EventSwitcher({
  events,
  activeEvent,
  onSwitchEvent,
  onCreateEvent,
  disabled,
}: EventSwitcherProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-4">
        <RoopkothaLogo showTagline={false} width={150} height={36} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-label="Select an event"
              className="w-[220px] justify-between"
              disabled={disabled && events.length === 0}
            >
              {activeEvent ? activeEvent.name : 'Select Event'}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[220px]">
            <DropdownMenuRadioGroup
              value={activeEvent?.id}
              onValueChange={(value) => onSwitchEvent(value)}
            >
              <DropdownMenuLabel>Available Events</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {events.map((event) => (
                <DropdownMenuRadioItem key={event.id} value={event.id}>
                  {event.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => setIsCreateDialogOpen(true)}
              disabled={disabled}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Event
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CreateEventDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateEvent={onCreateEvent}
      />
    </>
  );
}
