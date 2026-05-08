import { useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parse, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';
import 'react-day-picker/style.css';
import './EventDatePicker.css';

function parseYmd(value) {
  if (!value || !String(value).trim()) {
    return undefined;
  }
  const d = parse(String(value).trim(), 'yyyy-MM-dd', new Date());
  return isValid(d) ? d : undefined;
}

export default function EventDatePicker({ id, value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const selected = parseYmd(value);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    function onDocMouseDown(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  function handleSelect(date) {
    onChange(date ? format(date, 'yyyy-MM-dd') : '');
    setOpen(false);
  }

  const labelText = selected
    ? format(selected, 'd MMMM yyyy', { locale: ru })
    : 'Выберите дату';

  return (
    <div className="event-date-picker" ref={wrapRef}>
      <button
        type="button"
        id={id}
        className="event-date-picker__trigger"
        disabled={disabled}
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="material-symbols-outlined event-date-picker__trigger-icon" aria-hidden>
          calendar_month
        </span>
        <span className="event-date-picker__trigger-text">{labelText}</span>
        <span className="event-date-picker__chevron" aria-hidden>
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open && (
        <div className="event-date-picker__popover" role="dialog" aria-label="Выбор даты">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            locale={ru}
            defaultMonth={selected ?? new Date()}
            captionLayout="dropdown"
            startMonth={new Date(2000, 0)}
            endMonth={new Date(2040, 11)}
            className="event-date-picker__rdp"
          />
          {selected && (
            <button
              type="button"
              className="event-date-picker__clear"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              Очистить дату
            </button>
          )}
        </div>
      )}
    </div>
  );
}
