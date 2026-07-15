import { Home, Info, Layers, ListOrdered, Settings } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@dubforge/ui';

const navItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/jobs', label: 'Jobs', icon: ListOrdered, end: false },
  { to: '/models', label: 'Models', icon: Layers, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
  { to: '/about', label: 'About', icon: Info, end: false },
] as const;

export function AppLayout(): React.JSX.Element {
  return (
    <div className="bg-background flex h-screen min-w-[1100px]">
      <aside className="border-border bg-secondary flex w-52 shrink-0 flex-col border-r lg:w-56">
        <div className="px-5 pb-6 pt-12 lg:px-6">
          <h1 className="text-lg font-semibold tracking-tight">DubForge</h1>
          <p className="text-muted-foreground mt-1 text-xs">Offline localization</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Main navigation">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
                  isActive
                    ? 'bg-card text-foreground'
                    : 'text-muted-foreground hover:bg-card/50 hover:text-foreground',
                )
              }
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
