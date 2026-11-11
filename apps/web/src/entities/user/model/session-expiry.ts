/**
 * Remembers that the user was signed out BY THE SERVER (session expired), so the sign-in page
 * can say "Your session expired" instead of showing a bare form. Cleared on the next sign-in.
 */
let expired = false;

export const sessionExpiry = {
  mark: () => {
    expired = true;
  },
  isExpired: () => expired,
  clear: () => {
    expired = false;
  },
};
