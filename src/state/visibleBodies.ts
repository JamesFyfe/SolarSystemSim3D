import CelestialBody from '../classes/CelestialBody';

/**
 * A body that currently has a React component in the scene. Bodies far from
 * the camera are drawn as a single point (`fullyRendered: false`) instead of a
 * textured sphere.
 */
export interface VisibleBody {
  body: CelestialBody;
  fullyRendered: boolean;
}

export type VisibleBodiesAction =
  | { type: 'setFullyRendered'; body: CelestialBody; fullyRendered: boolean }
  /** The camera focus moved from `previous` to `next`. */
  | { type: 'select'; previous: CelestialBody; next: CelestialBody };

/** The root body plus its direct children, with only the root fully rendered. */
export function initialVisibleBodies(root: CelestialBody): VisibleBody[] {
  return [{ body: root, fullyRendered: true }, ...root.children.map((body) => ({ body, fullyRendered: false }))];
}

function setFullyRendered(state: VisibleBody[], body: CelestialBody, fullyRendered: boolean): VisibleBody[] {
  const index = state.findIndex((entry) => entry.body === body);
  if (index === -1 || state[index].fullyRendered === fullyRendered) {
    return state;
  }
  const next = state.slice();
  next[index] = { body, fullyRendered };
  return next;
}

function removeChildren(state: VisibleBody[], parent: CelestialBody): VisibleBody[] {
  const next = state.filter((entry) => !parent.children.includes(entry.body));
  return next.length === state.length ? state : next;
}

/** Marks `bodies` fully rendered, appending any that are not yet visible (order is preserved). */
function showFullyRendered(state: VisibleBody[], bodies: CelestialBody[]): VisibleBody[] {
  let next = state;
  for (const body of bodies) {
    next = next.some((entry) => entry.body === body)
      ? setFullyRendered(next, body, true)
      : [...next, { body, fullyRendered: true }];
  }
  return next;
}

/**
 * Returns the same array instance when nothing changed so React can bail out
 * of re-rendering.
 */
export function visibleBodiesReducer(state: VisibleBody[], action: VisibleBodiesAction): VisibleBody[] {
  switch (action.type) {
    case 'setFullyRendered':
      return setFullyRendered(state, action.body, action.fullyRendered);

    case 'select': {
      const { previous, next } = action;
      let result = state;

      // Moving out to the parent or across to a sibling: the previous body's
      // moons are no longer of interest and it can drop to a point.
      if (previous.parent === next || previous.parent === next.parent) {
        result = removeChildren(result, previous);
        result = setFullyRendered(result, previous, false);
      }

      // The root (the Sun) and its planets are always present already.
      if (next.parent) {
        result = showFullyRendered(result, [next, ...next.children]);
      }

      return result;
    }
  }
}
