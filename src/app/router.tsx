import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { LoadingState } from "../components/ui/PageState";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { AuthPage } from "../pages/AuthPage";
import { AuthCallbackPage } from "../pages/AuthCallbackPage";

const HomePage = lazy(() => import("../pages/HomePage").then((module) => ({ default: module.HomePage })));
const ItineraryPage = lazy(() => import("../pages/ItineraryPage").then((module) => ({ default: module.ItineraryPage })));
const ExpensesPage = lazy(() => import("../pages/ExpensesPage").then((module) => ({ default: module.ExpensesPage })));
const TripPage = lazy(() => import("../pages/TripPage").then((module) => ({ default: module.TripPage })));
const ReservationsPage = lazy(() => import("../pages/ReservationsPage").then((module) => ({ default: module.ReservationsPage })));
const SyncQueuePage = lazy(() => import("../pages/SyncQueuePage").then((module) => ({ default: module.SyncQueuePage })));
const PastTripsPage = lazy(() => import("../pages/PastTripsPage").then((module) => ({ default: module.PastTripsPage })));
const NotificationsPage = lazy(() => import("../pages/NotificationsPage").then((module) => ({ default: module.NotificationsPage })));
const DocumentsPage = lazy(() => import("../pages/DocumentsPage").then((module) => ({ default: module.DocumentsPage })));
const DestinationPage = lazy(() => import("../pages/DestinationPage").then((module) => ({ default: module.DestinationPage })));
const EditDestinationsPage = lazy(() => import("../pages/EditDestinationsPage").then((module) => ({ default: module.EditDestinationsPage })));
const MembersPage = lazy(() => import("../pages/MembersPage").then((module) => ({ default: module.MembersPage })));
const MemberDetailPage = lazy(() => import("../pages/MemberDetailPage").then((module) => ({ default: module.MemberDetailPage })));
const EventDetailPage = lazy(() => import("../pages/EventDetailPage").then((module) => ({ default: module.EventDetailPage })));
const EditTripPage = lazy(() => import("../pages/EditTripPage").then((module) => ({ default: module.EditTripPage })));
const NewTripPage = lazy(() => import("../pages/NewTripPage").then((module) => ({ default: module.NewTripPage })));
const EntityFormPage = lazy(() => import("../pages/EntityFormPage").then((module) => ({ default: module.EntityFormPage })));
const MemberFormPage = lazy(() => import("../pages/MemberFormPage").then((module) => ({ default: module.MemberFormPage })));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));
const PersonalDataPage = lazy(() => import("../pages/PersonalDataPage").then((module) => ({ default: module.PersonalDataPage })));
const NotificationSettingsPage = lazy(() => import("../pages/NotificationSettingsPage").then((module) => ({ default: module.NotificationSettingsPage })));
const TodayPage = lazy(() => import("../pages/TodayPage").then((module) => ({ default: module.TodayPage })));
const DocumentImportPage = lazy(() => import("../pages/DocumentImportPage").then((module) => ({ default: module.DocumentImportPage })));

const page = (element: React.ReactNode) => <Suspense fallback={<LoadingState />}>{element}</Suspense>;

export const router = createBrowserRouter([
  {
    path: "/ingresar",
    element: <AuthPage mode="login" />,
  },
  {
    path: "/crear-cuenta",
    element: <AuthPage mode="register" />,
  },
  {
    path: "/recuperar-clave",
    element: <AuthPage mode="forgot" />,
  },
  {
    path: "/actualizar-clave",
    element: <AuthPage mode="update" />,
  },
  {
    path: "/auth/callback",
    element: <AuthCallbackPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
      { path: "/", element: page(<HomePage />) },
      { path: "/viajes/nuevo", element: page(<NewTripPage />) },
      { path: "/nuevo/:formType", element: page(<EntityFormPage />) },
      { path: "/itinerario", element: page(<ItineraryPage />) },
      { path: "/gastos", element: page(<ExpensesPage />) },
      { path: "/viaje", element: page(<TripPage />) },
      { path: "/viaje/:tripId", element: page(<TripPage />) },
      { path: "/viaje/:tripId/editar", element: page(<EditTripPage />) },
      { path: "/viaje/:tripId/nuevo/:formType", element: page(<EntityFormPage />) },
      { path: "/viaje/:tripId/editar/:formType/:entityId", element: page(<EntityFormPage />) },
      { path: "/viaje/:tripId/itinerario", element: page(<ItineraryPage />) },
      { path: "/viaje/:tripId/gastos", element: page(<ExpensesPage />) },
      { path: "/viaje/:tripId/reservas", element: page(<ReservationsPage />) },
      { path: "/viaje/:tripId/documentos", element: page(<DocumentsPage />) },
      { path: "/viaje/:tripId/importar", element: page(<DocumentImportPage />) },
      { path: "/viaje/:tripId/destino/:destinationId", element: page(<DestinationPage />) },
      { path: "/viaje/:tripId/destinos/editar", element: page(<EditDestinationsPage />) },
      { path: "/viaje/:tripId/itinerario/editar", element: page(<EditDestinationsPage />) },
      { path: "/viaje/:tripId/integrantes", element: page(<MembersPage />) },
      { path: "/viaje/:tripId/integrantes/nuevo", element: page(<MemberFormPage />) },
      { path: "/viaje/:tripId/integrantes/:memberId", element: page(<MemberDetailPage />) },
      { path: "/viaje/:tripId/integrantes/:memberId/editar", element: page(<MemberFormPage />) },
      { path: "/viaje/:tripId/evento/:eventType/:eventId", element: page(<EventDetailPage />) },
      { path: "/perfil", element: <Navigate to="/" replace /> },
      { path: "/datos-personales", element: page(<PersonalDataPage />) },
      { path: "/ajustes-notificaciones", element: page(<NotificationSettingsPage />) },
      { path: "/reservas", element: page(<ReservationsPage />) },
      { path: "/sincronizacion", element: page(<SyncQueuePage />) },
      { path: "/viajes/pasados", element: page(<PastTripsPage />) },
      { path: "/notificaciones", element: page(<NotificationsPage />) },
      { path: "/hoy", element: page(<TodayPage />) },
      { path: "*", element: page(<NotFoundPage />) },
        ],
      },
    ],
  },
], {
  basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/",
});
