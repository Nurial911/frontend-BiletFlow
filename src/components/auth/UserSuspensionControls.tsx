import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setUserSuspended } from "../../api/users";
import type { User } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";
import { Button } from "../ui/Button";
import { RequestError } from "../events/EventExtras";
export function UserSuspensionControls({ user }: { user: User }) {
  const { tx } = useLanguage();
  const auth = useAuth();
  const cache = useQueryClient();
  const [open,setOpen] = useState(false);
  const mutation = useMutation({ mutationFn: (reason?: string) => setUserSuspended(user.id,!user.suspended,reason), onSuccess: async () => { setOpen(false); await cache.invalidateQueries({ queryKey: ["admin-users"] }); await cache.invalidateQueries({ queryKey: ["admin-overview"] }); } });
  if (auth.user?.id === user.id || user.role.replace(/^ROLE_/,"") === "PLATFORM_ADMIN") return null;
  return <div className="mt-3"><p>{user.suspended && tx("Аккаунт приостановлен")} {user.suspensionReason}</p><Button variant="secondary" disabled={mutation.isPending} onClick={() => user.suspended ? mutation.mutate(undefined) : setOpen(!open)}>{tx(user.suspended ? "Восстановить аккаунт" : "Приостановить аккаунт")}</Button>{open && <form className="my-3 flex gap-3" onSubmit={e => { e.preventDefault(); mutation.mutate(String(new FormData(e.currentTarget).get("reason") ?? "")); }}><input name="reason" aria-label={tx("Причина")} maxLength={500} placeholder={tx("Причина")} className="rounded border p-2" /><Button type="submit" disabled={mutation.isPending}>{tx("Подтвердить")}</Button></form>}<RequestError error={mutation.error} /></div>;
}
