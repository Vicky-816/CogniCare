/** Every screen in the app. `:id` is replaced by a demo profile id. */
export const STATIC_PAGES = ["/", "/auth/login", "/auth/signup", "/family", "/play"];

export const PROFILE_PAGES = [
  "/family/profiles/:id",
  "/family/profiles/:id/life-story",
  "/family/profiles/:id/schedule",
  "/play/:id",
  "/play/:id/activities",
  "/play/:id/games/memory-match",
  "/play/:id/games/sequence-recall",
  "/play/:id/games/pattern-practice",
  "/play/:id/games/daily-routine",
  "/play/:id/games/who-is-this",
];
