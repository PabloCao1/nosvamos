import type { Trip } from "../types/domain";

// El producto inicia vacío. Los datos reales se importarán desde Supabase
// después de autenticar al usuario y aplicar las políticas de acceso.
export const mockTrips: Trip[] = [];
