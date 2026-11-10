import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useCreator } from "./creator-context";
type Notice = { id: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };
function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  return minutes < 1 ? "Just now" : minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`;
}
export function NotificationsMenu() {
  const { user } = useCreator();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Notice[]>([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    const [list, unread] = await Promise.all([
      supabase.from("notifications").select("id, title, body, link, read_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
    ]);
    setError(Boolean(list.error || unread.error));
    if (!list.error) setRows(list.data ?? []);
    if (!unread.error) setCount(unread.count ?? 0);
  }, [user.id]);
  useEffect(() => { void refresh(); const id = window.setInterval(() => void refresh(), 60000); return () => window.clearInterval(id); }, [refresh]);
  async function markRead(id?: string) {
    let query = supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
    if (id) query = query.eq("id", id);
    const { error } = await query;
    if (error) { toast.error("Couldn't mark notifications as read."); return false; }
    await refresh(); return true;
  }
  return <Popover open={open} onOpenChange={value => { setOpen(value); if (value) void refresh(); }}><PopoverTrigger asChild><Button variant="ghost" size="icon" className="notif-bell" aria-label={`Notifications, ${count} unread`}><Bell aria-hidden="true" />{count > 0 && <span className="notif-badge">{count > 99 ? "99+" : count}</span>}</Button></PopoverTrigger><PopoverContent align="start" className="notif-menu"><div className="notif-heading"><strong>Notifications</strong><Button variant="ghost" disabled={!count || busy} onClick={async () => { setBusy(true); try { await markRead(); } finally { setBusy(false); } }}>Mark all as read</Button></div>{error && <p role="alert">Couldn't load notifications. <button onClick={() => void refresh()}>Retry</button></p>}{!error && rows.length === 0 && <p>No notifications yet.</p>}<ul>{rows.map(row => <li key={row.id}><button disabled={busy} className={`notif-item ${row.read_at ? "" : "notif-unread"}`} onClick={async () => {
    setBusy(true);
    try {
      if (!row.read_at && !await markRead(row.id)) return;
      setOpen(false);
      // Notification links are app-local. Reject protocol-relative and external targets.
      if (row.link?.startsWith("/") && !row.link.startsWith("//") && !row.link.includes("\\")) await navigate({ to: row.link });
    } finally { setBusy(false); }
  }}><strong>{row.title}</strong>{row.body && <span>{row.body}</span>}<time dateTime={row.created_at}>{relativeTime(row.created_at)}</time>{!row.read_at && <span className="notif-state">Unread</span>}</button></li>)}</ul></PopoverContent></Popover>;
}
