import type { Radar } from "./digest";

export type RadarChange = { rank: number; move: "new" | number; delta?: number };
export type RadarModel = Radar["models"][number] & RadarChange;
export type RadarRepo = Radar["repos"][number] & RadarChange;

/**
 * Day-over-day movement, computed from two editions' source data: rank change (positive = climbed),
 * and likes or stars gained since the previous edition. Nothing here is model-written.
 */
export function radarWithChanges(today: Radar, previous?: Radar) {
  const before = <T,>(list: T[] | undefined, key: (entry: T) => string) => new Map((list ?? []).map((entry, index) => [key(entry), { entry, rank: index + 1 }]));
  const models = before(previous?.models, (model) => model.id);
  const repos = before(previous?.repos, (repo) => repo.name);
  return {
    models: today.models.map((model, index): RadarModel => {
      const old = models.get(model.id);
      return { ...model, rank: index + 1, move: old ? old.rank - (index + 1) : "new", delta: old ? model.likes - old.entry.likes : undefined };
    }),
    repos: today.repos.map((repo, index): RadarRepo => {
      const old = repos.get(repo.name);
      return { ...repo, rank: index + 1, move: old ? old.rank - (index + 1) : "new", delta: old ? repo.stars - old.entry.stars : undefined };
    }),
  };
}
