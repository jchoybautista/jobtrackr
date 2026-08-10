"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { Briefcase, LayoutDashboard, KanbanSquare, Bell, Settings, Plus } from "lucide-react";
import { useApp } from "@/lib/store";
import { Dialog } from "@/components/ui/Dialog";

export function CommandK({
  open, onClose, onAddJob,
}: { open: boolean; onClose: () => void; onAddJob: () => void }) {
  const router = useRouter();
  const { applications, selectApp } = useApp();

  const go = (fn: () => void) => { onClose(); fn(); };
  const item = "flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm data-[selected=true]:bg-sunken";

  return (
    <Dialog open={open} onClose={onClose} title="Search" maxWidth="max-w-md">
      <Command label="Command menu">
        <Command.Input
          placeholder="Search jobs or jump to…" autoFocus
          className="mb-2 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm placeholder:text-ink-3"
        />
        <Command.List className="max-h-72 overflow-y-auto">
          <Command.Empty className="px-3 py-6 text-center text-sm text-ink-3">No results.</Command.Empty>
          <Command.Group heading="Applications" className="text-[10px] font-bold uppercase tracking-wider text-ink-3 [&_[cmdk-group-items]]:mt-1">
            {applications.map((a) => (
              <Command.Item key={a.id} value={`${a.company} ${a.role}`} className={item}
                onSelect={() => go(() => { router.push("/"); selectApp(a.id); })}>
                <Briefcase className="h-4 w-4 text-ink-3" aria-hidden />
                <span className="font-semibold">{a.role}</span>
                <span className="text-ink-3">{a.company}</span>
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Actions" className="mt-2 text-[10px] font-bold uppercase tracking-wider text-ink-3 [&_[cmdk-group-items]]:mt-1">
            <Command.Item className={item} onSelect={() => go(onAddJob)}>
              <Plus className="h-4 w-4 text-ink-3" aria-hidden /> Add job
            </Command.Item>
            {([["Dashboard", "/dashboard", LayoutDashboard], ["Board", "/", KanbanSquare],
               ["Reminders", "/reminders", Bell], ["Settings", "/settings", Settings]] as const
            ).map(([label, href, Icon]) => (
              <Command.Item key={href} className={item} onSelect={() => go(() => router.push(href))}>
                <Icon className="h-4 w-4 text-ink-3" aria-hidden /> Go to {label}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </Dialog>
  );
}
