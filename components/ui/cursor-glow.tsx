import React, { useEffect, useRef } from 'react';

interface CursorGlowProps {
    color?: string;
    size?: number;
    opacity?: number;
}

export const CursorGlow: React.FC<CursorGlowProps> = ({
    color = '16, 185, 129', // emerald-500 RGB
    size = 600,
    opacity = 0.12,
}) => {
    const glowRef = useRef<HTMLDivElement>(null);
    const posRef = useRef({ x: 0, y: 0 });
    const animRef = useRef<number>(0);
    const targetRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            targetRef.current = { x: e.clientX, y: e.clientY };
        };

        const animate = () => {
            // Smooth lerp towards target
            posRef.current.x += (targetRef.current.x - posRef.current.x) * 0.08;
            posRef.current.y += (targetRef.current.y - posRef.current.y) * 0.08;

            if (glowRef.current) {
                glowRef.current.style.background = `radial-gradient(${size}px circle at ${posRef.current.x}px ${posRef.current.y}px, rgba(${color}, ${opacity}), transparent 60%)`;
            }

            animRef.current = requestAnimationFrame(animate);
        };

        window.addEventListener('mousemove', handleMouseMove);
        animRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animRef.current);
        };
    }, [color, size, opacity]);

    return (
        <div
            ref={glowRef}
            className="fixed inset-0 z-[1] pointer-events-none transition-opacity duration-700"
            aria-hidden="true"
        />
    );
};
