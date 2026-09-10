/**
 * Re-export from shared (single source of truth).
 * The shared auth.tsx is copied to src/shared/ via the prebuild script.
 */
export { AuthProvider, useAuth } from "../../shared/auth";