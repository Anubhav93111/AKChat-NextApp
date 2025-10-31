'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function UserNav() {
  const pathname = usePathname();

  const navItem = (
    href: string,
    label: string,
    color: string = 'slate',
    extra?: { target?: string; rel?: string }
  ) => {
    const active = pathname?.startsWith(href);
    return (
      <Link
        href={href}
        {...extra}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 border ${
          active
            ? `border-${color}-400 text-white bg-${color}-600`
            : `border-${color}-400 text-${color}-300 bg-transparent hover:bg-gradient-to-r hover:from-${color}-500 hover:to-${color}-600 hover:text-white`
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/60 border-b border-slate-800">
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-teal-400 whitespace-nowrap overflow-hidden text-ellipsis font-[var(--font-calligraphy)]">
            Ink<span className="text-white">Sync</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          {navItem('/', 'Home', 'teal')}
          {navItem('/user', 'Dashboard', 'violet')}
         
        </div>

        {/* Mobile Nav */}
        <div className="flex md:hidden gap-2 flex-wrap justify-end">
          {navItem('/user', 'Dashboard', 'violet')}
          {navItem('/', 'Home', 'teal')}
        </div>
      </div>
    </div>
  );
}