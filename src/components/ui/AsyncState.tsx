import { useLanguage } from "../../i18n/LanguageContext";
import { Button } from "./Button";
export function MutationError({ error }: { error: unknown }) {
  const { tx } = useLanguage();
  return error ? <p role="alert" className="my-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error instanceof Error ? tx(error.message) : tx("Не удалось выполнить действие.")}</p> : null;
}
export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  const { tx } = useLanguage();
  return totalPages > 1 ? <div className="mt-4 flex items-center justify-center gap-3">
    <Button variant="secondary" disabled={page === 0} onClick={() => onChange(page - 1)}>{tx("Назад")}</Button>
    <span className="text-sm">{page + 1} / {totalPages}</span>
    <Button variant="secondary" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>{tx("Далее")}</Button>
  </div> : null;
}
