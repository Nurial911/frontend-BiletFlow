import { useEffect, useMemo, type KeyboardEvent, type MouseEvent } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { useLanguage } from "../../i18n/LanguageContext";
import { getSectionSeats, type Seat, type SeatMap, type SeatSection } from "../../api/seating";
import { formatPrice } from "../../lib/format";
import { MutationError } from "../ui/AsyncState";
import { Button } from "../ui/Button";

// A seat the attendee picked. Lives in the browser until checkout sends its id in seatIds.
export interface SelectedSeat {
  id: number;
  sectionId: number;
  sectionName: string;
  row: string;
  number: number;
  ticketTypeId: number;
  ticketTypeName: string;
  price: number;
}

interface Props {
  eventId: number;
  map: SeatMap;
  selected: Record<number, SelectedSeat>;
  activeSectionId: number | null;
  onSelectSection: (sectionId: number | null) => void;
  onToggle: (seat: SelectedSeat) => void;
  // Selected seats that someone else took meanwhile (seen when the section refreshes).
  onSeatsGone: (seatIds: number[]) => void;
  disabled?: boolean;
}

const SEATS_REFRESH_MS = 15_000;

const pickable = (section: SeatSection) =>
  section.kind === "SEATED" && section.onSale && section.ticketTypeId !== null && section.available > 0;

// Assigned seating: an overview of the venue's sections, then the seats of the chosen section.
export function SeatMapPicker({ eventId, map, selected, activeSectionId, onSelectSection, onToggle, onSeatsGone, disabled }: Props) {
  const { tx, locale } = useLanguage();
  const sections = map.sections;
  const active = sections.find((s) => s.id === activeSectionId) ?? null;
  const selectedList = Object.values(selected);

  // Map size: the layout's own, or the sections' bounding box if the layout has none.
  const width = map.width ?? Math.max(...sections.map((s) => s.x + s.width), 1);
  const height = map.height ?? Math.max(...sections.map((s) => s.y + s.height), 1);
  const font = Math.max(width, height) / 55;

  const seats = useQuery({
    queryKey: ["seat-section", eventId, activeSectionId],
    queryFn: () => getSectionSeats(eventId, activeSectionId as number),
    enabled: activeSectionId !== null,
    refetchInterval: SEATS_REFRESH_MS,
  });

  // Keep picked seats in other sections current while another section is open.
  const pickedSectionIds = [...new Set(selectedList.map(seat => seat.sectionId))].filter(id => id !== activeSectionId);
  const pickedSections = useQueries({ queries: pickedSectionIds.map(sectionId => ({ queryKey: ["seat-section", eventId, sectionId], queryFn: () => getSectionSeats(eventId, sectionId), refetchInterval: SEATS_REFRESH_MS })) });
  const pickedVersion = pickedSections.map(query => query.dataUpdatedAt).join(",");
  // A seat picked here but no longer AVAILABLE was taken by someone else: drop it from the order.
  useEffect(() => {
    const snapshots = [seats.data, ...pickedSections.map(query => query.data)].filter(data => data !== undefined);
    const gone = snapshots.flatMap(data => {
      const status = new Map(data.seats.map(seat => [seat.id, seat.status]));
      return Object.values(selected).filter(seat => seat.sectionId === data.section.id && status.get(seat.id) !== "AVAILABLE").map(seat => seat.id);
    });
    if (gone.length > 0) onSeatsGone(gone);
  }, [seats.data, pickedVersion, selected]); // eslint-disable-line react-hooks/exhaustive-deps -- only re-check when fresh seat data arrives

  const chooseSection = (section: SeatSection) => {
    if (!disabled && pickable(section)) onSelectSection(section.id === activeSectionId ? null : section.id);
  };
  const sectionKey = (section: SeatSection) => (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); chooseSection(section); }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">{tx("Схема зала")}{map.layoutName && <span className="font-normal text-muted"> · {map.layoutName}</span>}</p>
        <p className="text-xs text-muted">{tx("Выберите сектор, затем места. Стоячие зоны покупаются количеством в списке выше.")}</p>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto max-h-[22rem] w-full rounded-lg bg-surface" role="group" aria-label={tx("Схема зала")}>
        {map.stage && (
          <g aria-hidden="true">
            <rect x={map.stage.x} y={map.stage.y} width={map.stage.width} height={map.stage.height} rx={font / 2} className="fill-gray-700" />
            <text x={map.stage.x + map.stage.width / 2} y={map.stage.y + map.stage.height / 2} fontSize={font} textAnchor="middle" dominantBaseline="middle" className="fill-white font-semibold">{map.stage.label}</text>
          </g>
        )}
        {sections.map((section) => {
          const canPick = !disabled && pickable(section);
          const isActive = section.id === activeSectionId;
          const picked = selectedList.filter((seat) => seat.sectionId === section.id).length;
          const look = section.kind === "STANDING"
            ? "fill-white stroke-gray-400"
            : isActive
              ? "fill-brand stroke-brand"
              : canPick
                ? "fill-white stroke-brand cursor-pointer hover:fill-gray-100"
                : "fill-gray-200 stroke-gray-300";
          const textLook = isActive ? "fill-white" : section.kind === "SEATED" && !canPick ? "fill-gray-400" : "fill-black";
          const label = section.kind === "STANDING"
            ? tx("{0}: стоячая зона, {1}", [section.name, section.price === null ? tx("не продаётся") : formatPrice(section.price, locale)])
            : canPick
              ? tx("{0}: {1}, свободно мест: {2}", [section.name, formatPrice(section.price ?? 0, locale), section.available])
              : tx("{0}: нет доступных мест", [section.name]);
          return (
            <g
              key={section.id}
              role={section.kind === "SEATED" ? "button" : "img"}
              tabIndex={canPick ? 0 : undefined}
              aria-label={label}
              aria-pressed={section.kind === "SEATED" ? isActive : undefined}
              aria-disabled={section.kind === "SEATED" && !canPick ? true : undefined}
              onClick={() => chooseSection(section)}
              onKeyDown={sectionKey(section)}
              className="outline-none focus-visible:[&>rect]:stroke-[6]"
            >
              <title>{label}</title>
              <rect
                x={section.x} y={section.y} width={section.width} height={section.height} rx={font / 3}
                strokeWidth={3} strokeDasharray={section.kind === "STANDING" ? `${font / 2} ${font / 3}` : undefined}
                className={`transition-colors ${look}`}
              />
              <text x={section.x + section.width / 2} y={section.y + section.height / 2 - font * 0.4} fontSize={font} textAnchor="middle" className={`pointer-events-none font-semibold ${textLook}`}>
                {section.key}{picked > 0 ? ` · ${picked}` : ""}
              </text>
              <text x={section.x + section.width / 2} y={section.y + section.height / 2 + font * 0.8} fontSize={font * 0.75} textAnchor="middle" className={`pointer-events-none ${textLook}`}>
                {section.price === null ? "—" : formatPrice(section.price, locale)}
              </text>
            </g>
          );
        })}
      </svg>

      {active && (
        <div className="rounded-lg border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              {active.name}
              <span className="font-normal text-muted"> · {active.ticketTypeName} · {formatPrice(active.price ?? 0, locale)}</span>
            </p>
            <Button variant="secondary" onClick={() => onSelectSection(null)}>{tx("Закрыть сектор")}</Button>
          </div>
          {seats.isLoading && <p role="status" className="mt-3 text-sm text-muted">{tx("Загружаем места…")}</p>}
          <MutationError error={seats.error} />
          {seats.data && (
            <SectionSeats
              section={seats.data.section}
              seats={seats.data.seats}
              selected={selected}
              disabled={disabled}
              onToggle={(seat) => onToggle({
                id: seat.id,
                sectionId: active.id,
                sectionName: active.name,
                row: seat.row,
                number: seat.number,
                ticketTypeId: active.ticketTypeId as number,
                ticketTypeName: active.ticketTypeName ?? "",
                price: active.price ?? 0,
              })}
            />
          )}
          <SeatLegend />
        </div>
      )}

      {selectedList.length > 0 && (
        <div>
          <p className="text-sm font-semibold">{tx("Выбранные места")}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {selectedList.map((seat) => (
              <li key={seat.id} className="flex items-center gap-2 rounded-full bg-surface py-1 pl-3 pr-1 text-xs">
                <span>{seat.sectionName} · {tx("ряд {0}, место {1}", [seat.row, seat.number])} · {formatPrice(seat.price, locale)}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onToggle(seat)}
                  aria-label={tx("Убрать место: ряд {0}, место {1}", [seat.row, seat.number])}
                  className="h-6 w-6 rounded-full hover:bg-gray-300 disabled:opacity-40"
                >×</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SectionSeats({ section, seats, selected, disabled, onToggle }: {
  section: SeatSection;
  seats: Seat[];
  selected: Record<number, SelectedSeat>;
  disabled?: boolean;
  onToggle: (seat: Seat) => void;
}) {
  const { tx } = useLanguage();
  const byId = useMemo(() => new Map(seats.map((seat) => [seat.id, seat])), [seats]);

  // Seat size from the closest neighbours in a row, so any layout's spacing works.
  const { radius, rows, viewBox } = useMemo(() => {
    const rowMap = new Map<string, Seat[]>();
    for (const seat of seats) rowMap.set(seat.row, [...(rowMap.get(seat.row) ?? []), seat]);
    const sortedRows = [...rowMap.entries()].map(([label, row]) => [label, [...row].sort((a, b) => a.number - b.number)] as const);
    let gap = Infinity;
    for (const [, sorted] of sortedRows) {
      for (let i = 1; i < sorted.length; i++) {
        const d = Math.hypot(sorted[i].x - sorted[i - 1].x, sorted[i].y - sorted[i - 1].y);
        if (d > 0) gap = Math.min(gap, d);
      }
    }
    const spacing = Number.isFinite(gap) ? gap : 10;
    // The row number goes just before seat 1, in the direction the row runs: left of a row in the
    // end stands, above it in the side stands, where rows run from top to bottom.
    const rows = sortedRows.map(([label, sorted]) => {
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const length = Math.hypot(last.x - first.x, last.y - first.y);
      const [dx, dy] = length > 0 ? [(last.x - first.x) / length, (last.y - first.y) / length] : [1, 0];
      return { label, x: first.x - dx * spacing * 1.3, y: first.y - dy * spacing * 1.3 };
    });
    // Frame the seats and their row numbers, whatever the section's shape.
    const xs = [...seats.map((seat) => seat.x), ...rows.map((row) => row.x)];
    const ys = [...seats.map((seat) => seat.y), ...rows.map((row) => row.y)];
    const minX = Math.min(...xs) - spacing;
    const minY = Math.min(...ys) - spacing;
    const viewBox = `${minX} ${minY} ${Math.max(...xs) + spacing - minX} ${Math.max(...ys) + spacing - minY}`;
    return { radius: spacing * 0.4, rows, viewBox };
  }, [seats]);

  if (seats.length === 0) return <p className="mt-3 text-sm text-muted">{tx("В этом секторе нет мест для выбора.")}</p>;

  // One handler for the whole section: a stadium sector has a thousand seats.
  const seatFrom = (target: EventTarget) => byId.get(Number((target as Element).getAttribute?.("data-seat-id")));
  const toggle = (seat: Seat | undefined) => {
    if (!disabled && seat && (seat.status === "AVAILABLE" || selected[seat.id])) onToggle(seat);
  };
  const onClick = (event: MouseEvent<SVGSVGElement>) => toggle(seatFrom(event.target));
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const seat = seatFrom(event.target);
    if (seat) { event.preventDefault(); toggle(seat); }
  };

  return (
    <svg viewBox={viewBox} className="mt-3 h-auto max-h-[28rem] w-full" role="group" aria-label={tx("Места сектора {0}", [section.name])} onClick={onClick} onKeyDown={onKeyDown}>
      {rows.map((row) => (
        <text key={row.label} x={row.x} y={row.y} fontSize={radius * 1.8} textAnchor="middle" dominantBaseline="middle" className="pointer-events-none fill-gray-500">{row.label}</text>
      ))}
      {seats.map((seat) => {
        const isSelected = !!selected[seat.id];
        const free = seat.status === "AVAILABLE";
        const look = isSelected
          ? "fill-brand"
          : free
            ? "fill-emerald-500 hover:fill-emerald-700 cursor-pointer"
            : seat.status === "HELD" || seat.status === "YOURS"
              ? seat.status === "YOURS" ? "fill-blue-300" : "fill-amber-300"
              : seat.status === "SOLD" ? "fill-gray-500" : "fill-gray-200";
        const stateLabel = isSelected ? tx("Выбрано") : tx(({ AVAILABLE: "Свободно", HELD: "Зарезервировано другим покупателем", YOURS: "В вашем неоплаченном заказе", SOLD: "Продано", UNAVAILABLE: "Недоступно" })[seat.status]);
        const label = tx("Ряд {0}, место {1}", [seat.row, seat.number]) + (seat.accessible ? tx(", доступная среда") : "") + ", " + stateLabel;
        const symbol = isSelected ? "✓" : seat.accessible ? "♿" : ({ AVAILABLE: String(seat.number), HELD: "…", YOURS: "Y", SOLD: "×", UNAVAILABLE: "—" })[seat.status];
        return (
          <g key={seat.id}><circle
            key={seat.id}
            data-seat-id={seat.id}
            cx={seat.x}
            cy={seat.y}
            r={radius}
            role="button"
            tabIndex={free || isSelected ? 0 : -1}
            aria-label={label}
            aria-pressed={isSelected}
            aria-disabled={!free && !isSelected}
            strokeWidth={seat.accessible ? radius * 0.45 : 0}
            className={`outline-none focus-visible:stroke-black ${seat.accessible ? "stroke-sky-600" : ""} ${look}`}
          >
            <title>{label}</title>
          </circle><text x={seat.x} y={seat.y} textAnchor="middle" dominantBaseline="central" fontSize={radius * 1.1} className="pointer-events-none fill-black" aria-hidden="true">{symbol}</text></g>
        );
      })}
    </svg>
  );
}

function SeatLegend() {
  const { tx } = useLanguage();
  const items: [string, string][] = [
    ["bg-emerald-500", tx("Свободно")],
    ["bg-brand", tx("Выбрано")],
    ["bg-amber-300", tx("Зарезервировано другим покупателем")],
    ["bg-blue-300", tx("В вашем неоплаченном заказе")],
    ["bg-gray-500", tx("Продано")],
    ["bg-gray-200", tx("Недоступно")],
    ["bg-white ring-2 ring-sky-600", tx("Доступная среда")],
  ];
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label={tx("Обозначения")}>
      {items.map(([look, text]) => (
        <li key={text} className="flex items-center gap-1.5"><span className={`inline-block h-3 w-3 rounded-full ${look}`} aria-hidden="true" />{text}</li>
      ))}
    </ul>
  );
}
