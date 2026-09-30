import { useEffect, useState } from 'react';

/**
 * The section of the page the reader is in, among `ids`, for a navigation
 * bar that marks it.
 *
 * A section is current once its top reached the line where a jump to its
 * anchor leaves it: its own `scroll-margin-top`, which already accounts for
 * the sticky header and bar. The current one is the last that reached it.
 * Before the first one does, the first counts as current, and at the bottom
 * of the page the last one does, because a short last section may never
 * reach that line.
 *
 * It listens to the scroll and the resize, at most once per frame.
 */
export function useActiveSection(ids: readonly string[]): string | undefined {
  const [active, setActive] = useState<string | undefined>(ids[0]);
  const key = ids.join(' ');

  useEffect(() => {
    const sectionIds = key.split(' ').filter(Boolean);
    let frame = 0;

    const update = (): void => {
      frame = 0;
      const sections = sectionIds
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => el !== null);
      if (sections.length === 0) return;

      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom && window.scrollY > 0) {
        setActive(sections[sections.length - 1].id);
        return;
      }

      let current = sections[0].id;
      for (const section of sections) {
        const margin = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
        if (section.getBoundingClientRect().top - margin <= 1) current = section.id;
      }
      setActive(current);
    };

    const schedule = (): void => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [key]);

  return active;
}
