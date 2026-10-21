/**
 * Unsaved drafts of screens that were unmounted without the trainer leaving them — an expired
 * token's 401 signs out, and `Stack.Protected` unmounts all of `(app)` with it. The screen puts
 * its draft here on unmount and takes it back when it opens again after the re-login.
 *
 * Memory only, never on disk: a draft is the trainer's data, and the token it was made under is
 * gone. Keys carry the user id, so another account signing in on the device never sees it, and a
 * deliberate sign-out ("Sair") clears everything.
 */
const drafts = new Map<string, unknown>();

export function stashDraft(key: string, draft: unknown) {
  drafts.set(key, draft);
}

export function peekDraft<T>(key: string): T | undefined {
  return drafts.get(key) as T | undefined;
}

/** Returns the stashed draft and forgets it: a draft is restored once. */
export function takeDraft<T>(key: string): T | undefined {
  const draft = drafts.get(key) as T | undefined;
  drafts.delete(key);
  return draft;
}

export function clearDrafts() {
  drafts.clear();
}
