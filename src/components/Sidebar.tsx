import React from 'react';
import { Home, Download, Clock, Settings, Info, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
    currentPage: string;
    onNavigate: (page: string) => void;
    showInfoBadge?: boolean;
}

interface NavItem {
    id: string;
    label: string;
    icon: React.ReactNode;
}

const NavButton: React.FC<{
    item: NavItem;
    currentPage: string;
    onNavigate: (page: string) => void;
    showBadge?: boolean;
}> = ({ item, currentPage, onNavigate, showBadge = false }) => {
    const isActive = currentPage === item.id;

    return (
        <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            aria-label={item.label}
            className={cn(
                "w-full flex items-center justify-center px-3 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                isActive
                    ? "text-foreground bg-primary/10 border border-primary/30 shadow-sm"
                    : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
            )}
        >
            {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary/12 via-primary/6 to-transparent" />
            )}

            {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
            )}

            <span className={cn(
                "flex-shrink-0 transition-transform duration-150 z-10",
                isActive && "scale-110 text-primary"
            )}>
                {item.icon}
            </span>

            {showBadge && (
                <span
                    className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-warning shadow-[0_0_0_3px_rgba(255,255,255,0.1)]"
                    aria-hidden="true"
                />
            )}
        </button>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, showInfoBadge = false }) => {
    const { t } = useTranslation();

    const navItems: NavItem[] = [
        { id: 'home', label: t('sidebar.home'), icon: <Home className="w-5 h-5" /> },
        { id: 'downloads', label: t('sidebar.downloads'), icon: <Download className="w-5 h-5" /> },
        { id: 'history', label: t('sidebar.history'), icon: <Clock className="w-5 h-5" /> },
        { id: 'system', label: t('sidebar.system'), icon: <ShieldCheck className="w-5 h-5" /> },
        { id: 'settings', label: t('sidebar.settings'), icon: <Settings className="w-5 h-5" /> },
    ];

    const infoNavItem: NavItem = { id: 'info', label: t('sidebar.info'), icon: <Info className="w-5 h-5" /> };

    return (
        <aside
            className="h-full w-16 bg-secondary/40 border-r border-foreground/5 flex flex-col backdrop-blur-md"
        >
            {/* Nav Items */}
            <nav className="flex-1 py-4 px-2 space-y-2">
                {navItems.map((item) => (
                    <NavButton
                        key={item.id}
                        item={item}
                        currentPage={currentPage}
                        onNavigate={onNavigate}
                    />
                ))}
            </nav>

            <div className="px-2 pb-4 pt-2 border-t border-foreground/5">
                <NavButton
                    item={infoNavItem}
                    currentPage={currentPage}
                    onNavigate={onNavigate}
                    showBadge={showInfoBadge}
                />
            </div>
        </aside>
    );
};

export default Sidebar;
