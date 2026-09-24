import { useState, type FormEvent } from 'react';
import './home.css';

type SearchBarProps = {
  /** Controlled value. Omit for an uncontrolled field that reports on submit. */
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
};

/** Pressed-in search field. Controlled on the menu page, submit-to-navigate on the home screen. */
export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search drinks, toppings',
}: SearchBarProps) {
  const [internal, setInternal] = useState('');
  const current = value ?? internal;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.(current.trim());
  };

  return (
    <form className="search" role="search" onSubmit={submit}>
      <label htmlFor="drink-search" className="visually-hidden">
        Search drinks
      </label>
      <svg
        className="search__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        id="drink-search"
        type="search"
        className="search__input"
        placeholder={placeholder}
        value={current}
        onChange={(event) => {
          setInternal(event.target.value);
          onChange?.(event.target.value);
        }}
        autoComplete="off"
      />
    </form>
  );
}
