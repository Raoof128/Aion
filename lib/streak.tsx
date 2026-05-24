// lib/streak.ts
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Localization from "expo-localization";
import { supabase } from "./supabase";
import { buildWeekDays, type WeekDay } from "./streak-helpers";
import type { RecordOpenResponse, StreakState, StreakDayRecord } from "./types";

const FALLBACK_TIMEZONE = "UTC";

function getTimezone(): string {
  return Localization.getCalendars()[0]?.timeZone ?? FALLBACK_TIMEZONE;
}

async function recordOpen(): Promise<RecordOpenResponse> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("No session token");

  const { data, error } = await supabase.functions.invoke<RecordOpenResponse>("record-open", {
    body: { timezone: getTimezone() },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error || !data) throw error ?? new Error("record-open returned no data");
  return data;
}

async function fetchWeekDays(weekStart: string, today: string): Promise<StreakDayRecord[]> {
  const { data, error } = await supabase
    .from("user_streak_days")
    .select("local_date, status")
    .gte("local_date", weekStart)
    .lte("local_date", today)
    .order("local_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as StreakDayRecord[];
}

// ── Context ───────────────────────────────────────────────

interface StreakContextValue {
  streak: StreakState | null;
  weekDays: WeekDay[];
  milestoneUnlocked: 7 | 30 | 100 | null;
  dismissMilestone: () => void;
  loading: boolean;
}

const StreakContext = createContext<StreakContextValue>({
  streak: null,
  weekDays: [],
  milestoneUnlocked: null,
  dismissMilestone: () => {},
  loading: true,
});

// ── Provider ──────────────────────────────────────────────

export function StreakProvider({ children }: { children: ReactNode }) {
  const [streak, setStreak] = useState<StreakState | null>(null);
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [milestoneUnlocked, setMilestoneUnlocked] = useState<7 | 30 | 100 | null>(null);
  const [loading, setLoading] = useState(true);
  const lastRecordedDate = useRef<string | null>(null);
  const isInitialised = useRef(false);

  const dismissMilestone = useCallback(() => setMilestoneUnlocked(null), []);

  const recordAndRefresh = useCallback(async () => {
    try {
      const response = await recordOpen();

      // Skip re-render if we already recorded today (same date idempotent)
      if (lastRecordedDate.current === response.local_date && isInitialised.current) return;
      lastRecordedDate.current = response.local_date;
      isInitialised.current = true;

      // Sequential: fetch days only after record-open completes
      const days = await fetchWeekDays(response.week_start, response.local_date);

      setStreak({
        current_streak: response.current_streak,
        longest_streak: response.longest_streak,
        freeze_uses_this_week: response.freeze_uses_this_week,
        last_active_date: response.local_date,
        week_start: response.week_start,
      });
      setWeekDays(buildWeekDays(response.local_date, response.week_start, days));
      if (response.milestone_unlocked) {
        setMilestoneUnlocked(response.milestone_unlocked);
      }
    } catch {
      // Non-fatal — streak UI degrades gracefully when offline or unconfigured
    } finally {
      setLoading(false);
    }
  }, []);

  // Record on mount (app open)
  useEffect(() => {
    recordAndRefresh();
  }, [recordAndRefresh]);

  // Record on app resume (background → foreground)
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        recordAndRefresh();
      }
    });
    return () => sub.remove();
  }, [recordAndRefresh]);

  return (
    <StreakContext.Provider value={{ streak, weekDays, milestoneUnlocked, dismissMilestone, loading }}>
      {children}
    </StreakContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────

export function useStreak(): StreakContextValue {
  return useContext(StreakContext);
}
