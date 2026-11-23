import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext";
import { useAuth } from "../../auth/AuthContext";
import { createOrganizerProfile } from "../../api/events";
import { Button } from "../ui/Button";
import { MutationError } from "../ui/AsyncState";

// An attendee turns their account into an organizer account (POST /api/organizers/profile).
// The backend changes the role at once and returns a new token carrying it.
export function BecomeOrganizerForm({ className = "" }: { className?: string }) {
  const { tx } = useLanguage();
  const { adoptToken } = useAuth();
  const navigate = useNavigate();
  const [contact, setContact] = useState("");
  const become = useMutation({
    mutationFn: () => createOrganizerProfile(contact.trim()),
    onSuccess: (created) => {
      adoptToken(created.accessToken);
      navigate("/organizer/events");
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (contact.trim()) become.mutate();
  };

  return (
    <form onSubmit={submit} className={`space-y-3 text-left ${className}`}>
      <label className="block text-sm">
        {tx("Контакты для посетителей")}
        <input
          value={contact}
          onChange={(event) => setContact(event.target.value)}
          required
          maxLength={500}
          placeholder={tx("Телефон, email или сайт")}
          className="mt-1 w-full rounded-lg border px-3 py-2"
        />
      </label>
      <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
        <li>{tx("Аккаунт сразу станет аккаунтом организатора: вы сможете добавлять площадки и создавать мероприятия.")}</li>
        <li>{tx("Бесплатные мероприятия можно публиковать сразу. Для платных продаж нужна верификация организатора в настройках профиля.")}</li>
        <li>{tx("Вернуть роль посетителя может только администратор платформы.")}</li>
      </ul>
      <MutationError error={become.error} />
      <Button type="submit" disabled={!contact.trim() || become.isPending}>
        {become.isPending ? tx("Создаём профиль организатора…") : tx("Стать организатором")}
      </Button>
    </form>
  );
}
