'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/** Progress for internal page navigation; same-page anchors stay instantaneous. */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const route = `${pathname}?${searchParams.toString()}`;
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadline = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clear = () => {
      if (interval.current) clearInterval(interval.current);
      if (deadline.current) clearTimeout(deadline.current);
      if (hide.current) clearTimeout(hide.current);
    };
    const start = () => {
      clear();
      setProgress(12);
      setVisible(true);
      interval.current = setInterval(() => {
        setProgress(value => Math.min(90, value + (94 - value) * 0.12));
      }, 180);
      // Never leave a stuck indicator after a cancelled or failed navigation.
      deadline.current = setTimeout(() => {
        clear();
        setVisible(false);
        setProgress(0);
      }, 15000);
    };
    const click = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
      const target = new URL(anchor.href, location.href);
      if (target.origin !== location.origin || (target.pathname === location.pathname && target.search === location.search)) return;
      start();
    };
    document.addEventListener('click', click, true);
    window.addEventListener('constrack:navigation-start', start);

    return () => {
      clear();
      document.removeEventListener('click', click, true);
      window.removeEventListener('constrack:navigation-start', start);

    };
  }, []);

  useEffect(() => {
    if (interval.current) clearInterval(interval.current);
    if (deadline.current) clearTimeout(deadline.current);
    setProgress(100);
    hide.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 220);
    return () => { if (hide.current) clearTimeout(hide.current); };
  }, [route]);

  return <div aria-hidden="true" className="navigation-progress" style={{ opacity: visible ? 1 : 0, transform: `scaleX(${progress / 100})` }} />;
}

export function startNavigation() {
  window.dispatchEvent(new Event('constrack:navigation-start'));
}
