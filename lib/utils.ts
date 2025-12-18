import type { ReactNode } from 'react';

import type {
  ChatViewerHandle,
  IdentifiableMessage,
  MessageId,
  ScrollToItemOpts,
} from './types';

export const normalizeNegativeIndex = (index: number, length: number) => {
  return index < 0 ? length + index : index;
};

export const toItem = <M extends IdentifiableMessage>(
  id: MessageId<M>,
  element: ReactNode,
) => ({
  id,
  element,
});

/**
 * We use 1.5 as a zero offset to account for the fact that
 * window.devicePixelRatio can be a decimal value and be greater than 1.
 *
 * Example: on MacBook with Retina display, the device pixel ratio is 2.
 *
 * Docs: https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio
 */
const ZERO_OFFSET = 1.5;

export const isAtBottom = (
  offset: number,
  scrollSize: number,
  viewportSize: number,
) => scrollSize - (offset + viewportSize) < ZERO_OFFSET;

export const isAtTop = (offset: number) => offset < ZERO_OFFSET;

/**
 * Max frames to wait for content to stabilize (~166ms at 60fps).
 * Enough for React to commit DOM changes after async rendering.
 * @internal
 */
const MAX_SCROLL_ITERATIONS = 10;

/**
 * Scrolls to bottom with iterative stabilization for async content.
 * Handles layout shifts by monitoring scrollSize and re-scrolling until stable.
 * @internal
 */
export function stabilizeAtBottom<M extends IdentifiableMessage>(
  chat: ChatViewerHandle<M>,
  opts: ScrollToItemOpts,
): void {
  let prevScrollSize = chat.scrollSize ?? 0;
  let iterations = 0;

  const shouldStabilize = () => {
    const currentScrollSize = chat.scrollSize ?? 0;
    const viewportSize = chat.viewportSize ?? 0;
    const scrollOffset = chat.scrollOffset ?? 0;

    const isInitialized = currentScrollSize > 0 && viewportSize > 0;
    const contentStable = currentScrollSize === prevScrollSize;
    const atBottom = isInitialized && isAtBottom(scrollOffset, currentScrollSize, viewportSize);

    // Scroll if not at bottom or content changed
    if (!atBottom || !contentStable) {
      chat.scrollToBottom(opts);
    }

    // Continue iterating if:
    // 1. Not yet initialized (VList not ready)
    // 2. Content changed (async rendering)
    // 3. Not at bottom yet
    const needsMoreIterations = !isInitialized || !contentStable || !atBottom;

    if (needsMoreIterations && iterations < MAX_SCROLL_ITERATIONS) {
      prevScrollSize = currentScrollSize;
      iterations++;
      requestAnimationFrame(shouldStabilize);
    }
  };

  requestAnimationFrame(shouldStabilize);
}
