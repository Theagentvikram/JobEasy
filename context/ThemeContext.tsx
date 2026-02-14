
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper: read the current system preference
const getSystemTheme = (): Theme =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

// Helper: apply the dark / light class on <html>
const applyTheme = (theme: Theme) => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        // If the user previously made a manual choice, respect it
        const saved = localStorage.getItem('theme');
        if (saved === 'dark' || saved === 'light') return saved;
        // Otherwise follow the OS
        return getSystemTheme();
    });

    // Track whether the user has made an explicit manual choice
    const [isManual, setIsManual] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved === 'dark' || saved === 'light';
    });

    // Whenever theme changes, apply it to <html>
    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    // Listen for OS‑level dark‑mode changes.
    // If the user hasn't manually overridden, follow the OS automatically.
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => {
            if (!isManual) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [isManual]);

    // Manual toggle — saves the choice so it survives refresh
    const toggleTheme = () => {
        setTheme(prev => {
            const next = prev === 'light' ? 'dark' : 'light';
            localStorage.setItem('theme', next);
            return next;
        });
        setIsManual(true);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
