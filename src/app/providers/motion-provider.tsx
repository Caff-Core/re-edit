import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"

/** Motion presets (REQ-008); each sets shared CSS variables in index.css. */
export const MOTION_PRESETS = ["none", "subtle", "normal", "bouncy"] as const
export type MotionPreset = (typeof MOTION_PRESETS)[number]

export const MOTION_STORAGE_KEY = "motion"
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

export function isMotionPreset(value: unknown): value is MotionPreset {
  return MOTION_PRESETS.includes(value as MotionPreset)
}

interface MotionState {
  /** The user's choice. */
  motion: MotionPreset
  /** What applies: "none" while the system asks for reduced motion. */
  effective: MotionPreset
  reducedMotion: boolean
  setMotion: (motion: MotionPreset) => void
}

const MotionContext = createContext<MotionState>({
  motion: "normal",
  effective: "normal",
  reducedMotion: false,
  setMotion: () => {},
})

function readStored(): MotionPreset {
  try {
    const stored = localStorage.getItem(MOTION_STORAGE_KEY)
    return isMotionPreset(stored) ? stored : "normal"
  } catch {
    return "normal"
  }
}

function subscribeReduced(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

const prefersReduced = () => window.matchMedia(REDUCED_MOTION_QUERY).matches

/**
 * Holds the motion preset and writes the effective one to
 * `<html data-motion>`, where CSS turns it into duration and easing.
 * Changes apply immediately.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const [motion, setMotionState] = useState(readStored)
  const reducedMotion = useSyncExternalStore(subscribeReduced, prefersReduced)
  const effective: MotionPreset = reducedMotion ? "none" : motion

  useLayoutEffect(() => {
    document.documentElement.dataset.motion = effective
  }, [effective])

  const setMotion = useCallback((next: MotionPreset) => {
    try {
      localStorage.setItem(MOTION_STORAGE_KEY, next)
    } catch {
      // Storage can be unavailable; the preset still applies this session.
    }
    setMotionState(next)
  }, [])

  const value = useMemo(
    () => ({ motion, effective, reducedMotion, setMotion }),
    [motion, effective, reducedMotion, setMotion]
  )
  return (
    <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
  )
}

export function useMotion() {
  return useContext(MotionContext)
}
