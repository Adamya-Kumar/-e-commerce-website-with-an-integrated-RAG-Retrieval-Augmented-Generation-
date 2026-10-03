export const fieldClass = (state) => {
  const border =
    state === 'invalid'
      ? 'border-sys-red focus:border-sys-red focus:shadow-focus-danger'
      : state === 'valid'
        ? 'border-sys-green focus:border-sys-green focus:shadow-focus-success'
        : 'border-input focus:border-forest-medium focus:shadow-focus';

  return [
    'block w-full rounded-lg border bg-card px-4 py-2.5 text-sm font-medium text-main',
    'placeholder:text-placeholder',
    'transition duration-200 ease-in-out',
    'focus:outline-none',
    'disabled:cursor-not-allowed disabled:border-subtle disabled:bg-surface-muted disabled:text-muted-green disabled:opacity-80',
    border,
  ].join(' ');
};

export const labelClass =
  'mb-2 inline-block text-[0.85rem] font-bold text-main';
