import { cn } from './cn.js';

const variants = {
  primary:
    'bg-forest-medium text-white hover:bg-forest-dark disabled:hover:bg-forest-medium',
  accent:
    'bg-lime text-forest-medium hover:bg-lime-hover disabled:hover:bg-lime',
  'dark-pill':
    'rounded-full bg-main text-white shadow-spark-sm hover:-translate-y-px hover:bg-ink disabled:hover:translate-y-0 disabled:hover:bg-main',
  outline:
    'border-forest-medium bg-transparent text-forest-medium hover:bg-forest-medium hover:text-white disabled:hover:bg-transparent disabled:hover:text-forest-medium',
  ghost:
    'bg-transparent text-main hover:bg-canvas disabled:hover:bg-transparent',
  danger:
    'bg-sys-red text-white hover:bg-sys-red-hover disabled:hover:bg-sys-red',
};

const sizes = {
  sm: 'rounded-md px-3 py-1.5 text-xs',
  md: 'rounded-lg px-5 py-2.5 text-sm',
  lg: 'rounded-xl px-7 py-3 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 border border-transparent font-semibold leading-normal',
        'transition duration-200 ease-drawer',
        'focus-visible:outline-none focus-visible:shadow-focus-strong',
        'active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        '[&_i]:text-[1.25rem]',
        sizes[size],
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
