'use client';

import { useEffect, useState } from 'react';

/**
 * Desktop = mesma regra do layout (sidebar em vez de bottom-nav):
 * largura ≥ 768px E altura ≥ 600px. Mobile portrait usa drag; desktop usa
 * clique-clique. (Landscape mobile não é suportado — bloqueado pelo .rotate-lock.)
 */
const DESKTOP_QUERY = '(min-width: 768px) and (min-height: 600px)';

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  return isDesktop;
}
