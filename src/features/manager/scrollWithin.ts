export interface ScrollInset {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

/**
 * Moves only `container`'s scroll position so `target` sits inside its visible
 * box. Ancestor scrollers, including the page, stay where they are.
 */
export function scrollWithin(
  container: HTMLElement,
  target: HTMLElement,
  inset: ScrollInset = {}
): void {
  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const top = containerRect.top + (inset.top ?? 0);
  const left = containerRect.left + (inset.left ?? 0);
  const bottom = containerRect.bottom - (inset.bottom ?? 0);
  const right = containerRect.right - (inset.right ?? 0);

  let nextTop = container.scrollTop;
  let nextLeft = container.scrollLeft;
  if (targetRect.top < top) nextTop += targetRect.top - top;
  else if (targetRect.bottom > bottom) nextTop += targetRect.bottom - bottom;
  if (targetRect.left < left) nextLeft += targetRect.left - left;
  else if (targetRect.right > right) nextLeft += targetRect.right - right;

  if (nextTop !== container.scrollTop) container.scrollTop = nextTop;
  if (nextLeft !== container.scrollLeft) container.scrollLeft = nextLeft;
}

/**
 * Brings every target into the container when they fit together. A conflict
 * pair should not leave the second lesson under the fold just because the
 * first one was already visible.
 */
export function scrollGroupWithin(
  container: HTMLElement,
  targets: readonly HTMLElement[],
  inset: ScrollInset = {}
): void {
  if (targets.length === 0) return;
  if (targets.length === 1) {
    scrollWithin(container, targets[0], inset);
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const rects = targets.map((target) => target.getBoundingClientRect());
  const unionTop = Math.min(...rects.map((rect) => rect.top));
  const unionBottom = Math.max(...rects.map((rect) => rect.bottom));
  const unionLeft = Math.min(...rects.map((rect) => rect.left));
  const unionRight = Math.max(...rects.map((rect) => rect.right));
  const top = containerRect.top + (inset.top ?? 0);
  const left = containerRect.left + (inset.left ?? 0);
  const bottom = containerRect.bottom - (inset.bottom ?? 0);
  const right = containerRect.right - (inset.right ?? 0);

  if (unionBottom - unionTop <= bottom - top && unionRight - unionLeft <= right - left) {
    let nextTop = container.scrollTop;
    let nextLeft = container.scrollLeft;
    if (unionTop < top) nextTop += unionTop - top;
    else if (unionBottom > bottom) nextTop += unionBottom - bottom;
    if (unionLeft < left) nextLeft += unionLeft - left;
    else if (unionRight > right) nextLeft += unionRight - right;
    if (nextTop !== container.scrollTop) container.scrollTop = nextTop;
    if (nextLeft !== container.scrollLeft) container.scrollLeft = nextLeft;
    return;
  }

  scrollWithin(container, targets[0], inset);
}
