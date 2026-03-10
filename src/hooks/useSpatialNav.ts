import { useEffect, useCallback, useRef } from "react";

const FOCUSABLE_SELECTOR = '[data-nav]';

export function useSpatialNav() {
  const containerRef = useRef<HTMLDivElement>(null);

  const getFocusables = useCallback(() => {
    const root = containerRef.current || document;
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  }, []);

  const getRect = (el: HTMLElement) => el.getBoundingClientRect();

  const findNearest = useCallback((current: HTMLElement, direction: 'up' | 'down' | 'left' | 'right') => {
    const focusables = getFocusables().filter(el => el !== current);
    if (!focusables.length) return null;

    const cr = getRect(current);
    const cx = cr.left + cr.width / 2;
    const cy = cr.top + cr.height / 2;

    let best: HTMLElement | null = null;
    let bestDist = Infinity;

    for (const el of focusables) {
      const r = getRect(el);
      const ex = r.left + r.width / 2;
      const ey = r.top + r.height / 2;

      let valid = false;
      switch (direction) {
        case 'up': valid = ey < cy - 5; break;
        case 'down': valid = ey > cy + 5; break;
        case 'left': valid = ex < cx - 5; break;
        case 'right': valid = ex > cx + 5; break;
      }
      if (!valid) continue;

      // Weight: primary axis distance matters more
      const dx = ex - cx;
      const dy = ey - cy;
      const dist = (direction === 'left' || direction === 'right')
        ? Math.abs(dx) + Math.abs(dy) * 3
        : Math.abs(dy) + Math.abs(dx) * 3;

      if (dist < bestDist) {
        bestDist = dist;
        best = el;
      }
    }
    return best;
  }, [getFocusables]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement;
      // If nothing focused yet, focus first item
      if (!active?.hasAttribute('data-nav')) {
        const first = getFocusables()[0];
        if (first && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          first.focus();
          return;
        }
      }

      let direction: 'up' | 'down' | 'left' | 'right' | null = null;
      switch (e.key) {
        case 'ArrowUp': direction = 'up'; break;
        case 'ArrowDown': direction = 'down'; break;
        case 'ArrowLeft': direction = 'left'; break;
        case 'ArrowRight': direction = 'right'; break;
        case 'Enter':
          if (active?.hasAttribute('data-nav')) {
            e.preventDefault();
            active.click();
          }
          return;
        default: return;
      }

      e.preventDefault();
      const next = findNearest(active, direction);
      if (next) {
        next.focus();
        next.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [getFocusables, findNearest]);

  return containerRef;
}
