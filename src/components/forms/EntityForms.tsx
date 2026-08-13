import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useActiveTrip } from "../../hooks/useActiveTrip";
import { createSyncableFields } from "../../lib/indexed-db/database";
import { BASE_CURRENCY, convertToUsd, SUPPORTED_CURRENCIES } from "../../lib/currency/exchangeRates";
import { prepareReceiptImage } from "../../lib/images/receiptImage";
import { deriveTripDateRange } from "../../lib/trips/deriveTripDateRange";
import { tripRepository } from "../../repositories";
import { supabase } from "../../lib/supabase";
import type { Activity, Expense, Reservation, Trip } from "../../types/domain";
import type { DocumentImportDraft } from "../../types/documentImport";
import { Button } from "../ui/Button";
import { useSaveFeedback } from "../ui/SaveFeedback";
import type { IconName } from "../ui/Icon";

const activitySchema = z.object({
  title: z.string().trim().min(2, "Ingresá un título"),
  description: z.string().optional(),
  dayId: z.string().min(1),
  startTime: z.string().min(1, "Ingresá una hora"),
  endTime: z.string().optional(),
  location: z.string().trim().min(2, "Ingresá una ubicación"),
  category: z.enum(["excursion", "visit", "food", "transport", "lodging", "shopping", "event", "outdoor", "free_time", "other"]),
  status: z.enum(["planned", "confirmed", "done"]),
  reservationId: z.string().optional(),
  participantIds: z.array(z.string()).min(1, "Elegí al menos un integrante"),
  totalAmount: z.coerce.number().min(0),
  currency: z.string().length(3),
  paid: z.boolean().optional(),
  paidBy: z.string().optional(),
  payOnArrival: z.boolean().optional(),
  hasReservation: z.boolean().optional(),
  providerName: z.string().trim().optional(),
  confirmationCode: z.string().trim().optional(),
  externalUrl: z.string().trim().optional(),
  reservationConfirmed: z.boolean().optional(),
});

const expenseSchema = z.object({
  description: z.string().trim().min(2, "Ingresá una descripción"),
  amount: z.coerce.number().positive("El importe debe ser mayor a cero"),
  currency: z.string().length(3),
  paidBy: z.string().min(1),
  category: z.string().min(1),
  customCategory: z.string().optional(),
  date: z.string().min(1),
  reservationId: z.string().optional(),
  participantIds: z.array(z.string()).min(1, "Elegí al menos un integrante"),
});

const reservationSchema = z.object({
  title: z.string().trim().min(2, "Ingresá un título"),
  type: z.enum(["flight", "train", "bus", "ferry", "hotel", "apartment", "restaurant", "activity", "car", "insurance", "other"]),
  providerName: z.string().trim().optional(),
  providerReference: z.string().trim().optional(),
  startAt: z.string().optional(),
  excursionDate: z.string().optional(),
  excursionTime: z.string().optional(),
  endAt: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  originCity: z.string().optional(),
  destinationCity: z.string().optional(),
  originPlace: z.string().optional(),
  destinationPlace: z.string().optional(),
  serviceNumber: z.string().optional(),
  address: z.string().optional(),
  totalAmount: z.coerce.number().min(0),
  currency: z.string().length(3),
  paymentStatus: z.enum(["unpaid", "partially_paid", "paid", "refunded"]),
  status: z.enum(["draft", "pending", "confirmed", "completed", "cancelled"]),
  confirmationCode: z.string().optional(),
  externalUrl: z.string().optional(),
  paid: z.boolean().optional(),
  paidBy: z.string().optional(),
  payOnArrival: z.boolean().optional(),
  confirmed: z.boolean().optional(),
  differentDropoffCity: z.boolean().optional(),
});

const tripSchema = z.object({
  name: z.string().trim().min(3, "Ingresá un nombre"),
  description: z.string().trim().min(3, "Contanos brevemente el plan"),
  startDate: z.string().min(1, "Ingresá una fecha"),
  endDate: z.string().min(1, "Ingresá una fecha"),
  baseCurrency: z.string().length(3, "Usá un código de tres letras"),
}).refine((values) => values.endDate >= values.startDate, {
  message: "La fecha final debe ser posterior al inicio",
  path: ["endDate"],
});

type ActivityValues = z.infer<typeof activitySchema>;
type ActivityInput = z.input<typeof activitySchema>;
type ExpenseValues = z.infer<typeof expenseSchema>;
type ReservationValues = z.infer<typeof reservationSchema>;
type ExpenseInput = z.input<typeof expenseSchema>;
type ReservationInput = z.input<typeof reservationSchema>;
type TripValues = z.infer<typeof tripSchema>;

function Field(props: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  const { label, error, children } = props;
  const required = Boolean(props.required);
  return (
    <label className="form-field">
      <span>{label}{required && <b className="required-mark" aria-hidden="true"> *</b>}</span>
      {children}
      {error && <small role="alert">{error}</small>}
    </label>
  );
}

function useSaveEntity(close: () => void, icon: IconName) {
  const queryClient = useQueryClient();
  const { runSave } = useSaveFeedback();
  return useMutation({
    mutationFn: async (operation: () => Promise<void>) => runSave(operation, icon),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["trips"] }),
        queryClient.invalidateQueries({ queryKey: ["sync"] }),
      ]);
      close();
    },
  });
}

export function TripForm({ close, entity }: { close: () => void; entity?: Trip }) {
  const { data: activeTrip } = useActiveTrip();
  const mutation = useSaveEntity(close, "suitcase");
  const automaticRange = entity ? deriveTripDateRange(entity) : null;
  const { register, handleSubmit, formState: { errors } } = useForm<TripValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: entity ? {
      name: entity.name,
      description: entity.description,
      startDate: automaticRange?.startDate ?? entity.startDate,
      endDate: automaticRange?.endDate ?? entity.endDate,
      baseCurrency: entity.baseCurrency,
    } : {
      name: "",
      description: "",
      baseCurrency: BASE_CURRENCY,
    },
  });

  const submit = (values: TripValues) => {
    const trip: Trip = {
      ...(entity ?? {
        ...createSyncableFields(),
        id: crypto.randomUUID(),
        coverUrl: "",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        status: "planning" as const,
        participants: activeTrip?.participants ?? [],
        destinations: [],
        itinerary: [],
        reservations: [],
        expenses: [],
      }),
      name: values.name,
      description: values.description,
      startDate: automaticRange?.startDate ?? values.startDate,
      endDate: automaticRange?.endDate ?? values.endDate,
      baseCurrency: BASE_CURRENCY,
    };
    mutation.mutate(() => entity ? tripRepository.updateTrip(trip) : tripRepository.addTrip(trip));
  };
  const minimumDate = new Date().toISOString().slice(0, 10);

  return (
    <form className="entity-form" onSubmit={handleSubmit(submit)}>
      <Field label="Nombre del viaje" required error={errors.name?.message}><input autoFocus {...register("name")} placeholder="Ej. Escapada a Mendoza" /></Field>
      <Field label="Descripción" required error={errors.description?.message}><input {...register("description")} placeholder="Una semana de bodegas y montaña" /></Field>
      <div className="form-row trip-date-row">
        <Field label="Desde" required error={errors.startDate?.message}><input type="date" min={entity ? undefined : minimumDate} disabled={Boolean(automaticRange)} {...register("startDate")} /></Field>
        <Field label="Hasta" required error={errors.endDate?.message}><input type="date" min={entity ? undefined : minimumDate} disabled={Boolean(automaticRange)} {...register("endDate")} /></Field>
      </div>
      <input type="hidden" value={BASE_CURRENCY} {...register("baseCurrency")} />
      <FormActions pending={mutation.isPending} editing={Boolean(entity)} entityLabel="viaje" onDelete={() => entity && mutation.mutate(() => tripRepository.deleteTrip(entity))} />
    </form>
  );
}

export function ActivityForm({ close, entity, trip: tripOverride }: { close: () => void; entity?: Activity; trip?: Trip }) {
  const { data: activeTrip } = useActiveTrip();
  const trip = tripOverride ?? activeTrip;
  const linkedReservation = trip?.reservations.find((item) => item.id === entity?.reservationId);
  const mutation = useSaveEntity(close, "calendar");
  const { register, handleSubmit, setError, watch, formState: { errors } } = useForm<ActivityInput, unknown, ActivityValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: entity ? {
      title: entity.title, dayId: entity.dayId, startTime: entity.startTime,
      endTime: entity.endTime, description: entity.description,
      location: entity.location, category: entity.category, status: entity.status,
      reservationId: entity.reservationId, participantIds: entity.participantIds,
      totalAmount: entity.originalTotalAmount ?? entity.totalAmount ?? 0,
      currency: entity.originalCurrency ?? entity.currency ?? BASE_CURRENCY,
      paid: entity.paymentStatus === "paid", paidBy: entity.paidBy, payOnArrival: entity.payOnArrival,
      hasReservation: Boolean(entity.reservationId), providerName: linkedReservation?.providerName ?? "",
      confirmationCode: linkedReservation?.confirmationCode ?? linkedReservation?.providerReference ?? "",
      externalUrl: linkedReservation?.externalUrl ?? "", reservationConfirmed: linkedReservation?.status === "confirmed",
    } : {
      dayId: trip?.itinerary[0]?.id, category: "other", startTime: "10:00",
      status: "planned", participantIds: trip?.participants.filter((person) => person.status !== "removed").map((person) => person.id) ?? [],
      totalAmount: 0, currency: BASE_CURRENCY, paid: false, payOnArrival: false,
      hasReservation: false, providerName: "", confirmationCode: "", externalUrl: "", reservationConfirmed: false,
    },
  });
  if (!trip) return null;

  const submit = async (values: ActivityValues) => {
    if (values.paid && !values.paidBy) { setError("paidBy", { message: "Seleccioná quién pagó" }); return; }
    const conversion = await convertToUsd(values.totalAmount, values.currency).catch((reason: unknown) => {
      setError("root", { message: reason instanceof Error ? reason.message : "No pudimos convertir el total a USD." });
      return null;
    });
    if (!conversion) return;
    const reservationId = values.hasReservation ? linkedReservation?.id ?? entity?.reservationId ?? crypto.randomUUID() : undefined;
    const activity: Activity = {
      ...(entity ?? { ...createSyncableFields(), id: crypto.randomUUID(), status: "planned" as const, participantIds: trip.participants.map((person) => person.id) }),
      title: values.title,
      description: values.description,
      dayId: values.dayId,
      startTime: values.startTime,
      endTime: values.endTime,
      location: values.location,
      category: values.category,
      status: values.status,
      participantIds: values.participantIds,
      totalAmount: conversion.amount,
      currency: BASE_CURRENCY,
      originalTotalAmount: values.totalAmount,
      originalCurrency: values.currency,
      exchangeRate: conversion.rate,
      paymentStatus: values.paid ? "paid" : "unpaid",
      paidBy: values.paid ? values.paidBy : undefined,
      payOnArrival: Boolean(values.payOnArrival),
      reservationId,
    };
    await mutation.mutateAsync(async () => {
      if (values.hasReservation && reservationId) {
        const day = trip.itinerary.find((item) => item.id === values.dayId);
        const confirmationCode = values.confirmationCode?.trim();
        const reservation: Reservation = {
          ...(linkedReservation ?? {
            ...createSyncableFields(), id: reservationId, tripId: trip.id, provider: "generic" as const,
            participantIds: values.participantIds, availableOffline: true, importSource: "manual" as const,
          }),
          type: "activity",
          title: values.title,
          providerName: values.providerName?.trim() || "Sin plataforma",
          providerReference: confirmationCode || "Sin código",
          confirmationCode: confirmationCode || undefined,
          externalUrl: values.externalUrl?.trim() || undefined,
          startAt: `${day?.date ?? ""}T${values.startTime}`,
          endAt: values.endTime ? `${day?.date ?? ""}T${values.endTime}` : undefined,
          city: day?.city ?? "",
          address: values.location,
          totalAmount: conversion.amount,
          currency: BASE_CURRENCY,
          originalTotalAmount: values.totalAmount,
          originalCurrency: values.currency,
          exchangeRate: conversion.rate,
          paymentStatus: values.paid ? "paid" : "unpaid",
          paidBy: values.paid ? values.paidBy : undefined,
          payOnArrival: Boolean(values.payOnArrival),
          status: values.reservationConfirmed ? "confirmed" : "pending",
          participantIds: values.participantIds,
          nextAction: values.payOnArrival ? "Pagar al llegar" : undefined,
        };
        if (linkedReservation) await tripRepository.updateReservation(reservation);
        else await tripRepository.addReservation(reservation);
      }
      if (entity) await tripRepository.updateActivity(activity);
      else await tripRepository.addActivity(activity);
    });
  };

  return (
    <form className="entity-form" onSubmit={handleSubmit(submit)}>
      <Field label="Título" required error={errors.title?.message}><input autoFocus {...register("title")} placeholder="Ej. Visita a la Torre Eiffel" /></Field>
      <div className="form-row">
        <Field label="Día" required><select {...register("dayId")}>{trip.itinerary.map((day) => <option key={day.id} value={day.id}>{day.city} · {day.date.slice(5)}</option>)}</select></Field>
        <Field label="Hora" required error={errors.startTime?.message}><input type="time" {...register("startTime")} /></Field>
      </div>
      <Field label="Hora de finalización"><input type="time" {...register("endTime")} /></Field>
      <Field label="Ubicación" required error={errors.location?.message}><input {...register("location")} placeholder="Dirección o punto de encuentro" /></Field>
      <Field label="Descripción"><textarea {...register("description")} placeholder="Información útil, punto de encuentro o indicaciones" /></Field>
      <Field label="Tipo" required><select {...register("category")}><option value="other">Actividad general</option><option value="excursion">Excursión o tour</option><option value="visit">Visita</option><option value="food">Gastronomía</option><option value="event">Evento o espectáculo</option><option value="outdoor">Aire libre o deporte</option><option value="free_time">Tiempo libre</option><option value="shopping">Compras</option><option value="transport">Transporte</option><option value="lodging">Alojamiento</option></select></Field>
      <Field label="Estado" required><select {...register("status")}><option value="planned">Planificada</option><option value="confirmed">Confirmada</option><option value="done">Realizada</option></select></Field>
      <section className="form-subsection">
        <label className="traveler-toggle"><input type="checkbox" {...register("hasReservation")} /><strong>Tiene reserva</strong></label>
        {watch("hasReservation") && <>
          <div className="form-row">
            <Field label="Empresa o plataforma"><input {...register("providerName")} placeholder="Ej. Civitatis" /></Field>
            <Field label="Código de reserva"><input autoCapitalize="characters" {...register("confirmationCode")} /></Field>
          </div>
          <Field label="Enlace del proveedor"><input type="url" inputMode="url" autoCapitalize="none" {...register("externalUrl")} placeholder="https://…" /></Field>
          <label className="traveler-toggle"><input type="checkbox" {...register("reservationConfirmed")} /><strong>Reserva confirmada</strong></label>
        </>}
      </section>
      <div className="form-row">
        <Field label="Total"><input type="number" inputMode="decimal" step="0.01" {...register("totalAmount")} /></Field>
        <Field label="Moneda"><select {...register("currency")}>{SUPPORTED_CURRENCIES.map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}</select></Field>
      </div>
      <section className="form-subsection">
        <label className="traveler-toggle"><input type="checkbox" {...register("paid")} /><strong>Pagado</strong></label>
        {watch("paid") && <Field label="Pagado por" required error={errors.paidBy?.message}><select {...register("paidBy")}><option value="">Seleccionar integrante</option>{trip.participants.filter((person) => person.status !== "removed").map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></Field>}
        <label className="traveler-toggle"><input type="checkbox" {...register("payOnArrival")} /><strong>Se paga al llegar</strong></label>
      </section>
      <div className="form-field"><span>Participan<b className="required-mark" aria-hidden="true"> *</b></span><div className="form-check-grid">{trip.participants.filter((person) => person.status !== "removed").map((person) => <label key={person.id}><input type="checkbox" value={person.id} {...register("participantIds")} /> {person.name}</label>)}</div>{errors.participantIds?.message && <small role="alert">{errors.participantIds.message}</small>}</div>
      {errors.root?.message && <p className="form-error" role="alert">{errors.root.message}</p>}
      <FormActions pending={mutation.isPending} editing={Boolean(entity)} entityLabel="actividad" onDelete={() => entity && mutation.mutate(() => tripRepository.deleteActivity(entity))} />
    </form>
  );
}

export function ExpenseForm({ close, entity, trip: tripOverride, importDraft }: { close: () => void; entity?: Expense; trip?: Trip; importDraft?: DocumentImportDraft }) {
  const { data: activeTrip } = useActiveTrip();
  const trip = tripOverride ?? activeTrip;
  const mutation = useSaveEntity(close, "wallet");
  const [receiptImage, setReceiptImage] = useState(entity?.receiptImageDataUrl);
  const { register, handleSubmit, setError, watch, formState: { errors } } = useForm<ExpenseInput, unknown, ExpenseValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: entity ? {
      description: entity.description, amount: entity.originalAmount, currency: entity.originalCurrency, paidBy: entity.paidBy,
      category: entity.categoryLabel ? `custom:${entity.categoryLabel}` : entity.category,
      customCategory: "", date: entity.date, reservationId: entity.reservationId,
      participantIds: entity.splits.map((split) => split.participantId),
    } : {
      description: importDraft?.title ?? "", amount: importDraft?.amount ?? undefined,
      category: importDraft?.expenseCategory ?? "food", currency: importDraft?.currency ?? BASE_CURRENCY, paidBy: trip?.participants[0]?.id,
      date: importDraft?.expenseDate ?? new Date().toISOString().slice(0, 10),
      participantIds: trip?.participants.filter((person) => person.status !== "removed").map((person) => person.id) ?? [],
    },
  });
  if (!trip) return null;
  const selectedExpenseCategory = watch("category");

  const submit = async (values: ExpenseValues) => {
    const conversion = await convertToUsd(values.amount, values.currency).catch((reason: unknown) => {
      setError("root", {
        message: reason instanceof Error ? reason.message : "No pudimos convertir el importe a USD.",
      });
      return null;
    });
    if (!conversion) return;
    const customCategory = values.category === "other"
      ? values.customCategory?.trim()
      : values.category.startsWith("custom:")
        ? values.category.slice(7)
        : undefined;
    if (values.category === "other" && !customCategory) {
      setError("customCategory", { message: "Ingresá un nombre para la categoría." });
      return;
    }
    const standardCategory = values.category.startsWith("custom:") || values.category === "other"
      ? "other"
      : values.category as Expense["category"];
    const selectedParticipants = values.participantIds;
    const share = Math.round((conversion.amount / selectedParticipants.length) * 100) / 100;
    const expense: Expense = {
      ...(entity ?? { ...createSyncableFields(), id: crypto.randomUUID(), tripId: trip.id }),
      description: values.description,
      category: standardCategory,
      categoryLabel: customCategory,
      originalAmount: values.amount,
      originalCurrency: values.currency,
      exchangeRate: conversion.rate,
      convertedAmount: conversion.amount,
      paidBy: values.paidBy,
      date: values.date,
      reservationId: values.reservationId || undefined,
      status: entity?.status ?? "active",
      receiptImageDataUrl: receiptImage,
      splits: selectedParticipants.map((participantId, index) => ({
        participantId,
        amount: index === selectedParticipants.length - 1
          ? Math.round((conversion.amount - share * (selectedParticipants.length - 1)) * 100) / 100
          : share,
      })),
    };
    await mutation.mutateAsync(async () => {
      if (entity) await tripRepository.updateExpense(expense);
      else await tripRepository.addExpense(expense);
      if (customCategory && !(trip.customExpenseCategories ?? []).some((item) => item.localeCompare(customCategory, "es", { sensitivity: "base" }) === 0)) {
        await tripRepository.updateTrip({
          ...trip,
          customExpenseCategories: [...(trip.customExpenseCategories ?? []), customCategory],
        });
      }
    });
  };

  return (
    <form className="entity-form" onSubmit={handleSubmit(submit)}>
      <Field label="Descripción" required error={errors.description?.message}><input autoFocus {...register("description")} placeholder="Ej. Cena del grupo" /></Field>
      <div className="form-row">
        <Field label="Importe" required error={errors.amount?.message}><input type="number" inputMode="decimal" step="0.01" {...register("amount")} placeholder="0,00" /></Field>
        <Field label="Moneda" required><select {...register("currency")}>{SUPPORTED_CURRENCIES.map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}</select></Field>
      </div>
      <Field label="Fecha" required><input type="date" {...register("date")} /></Field>
      <Field label="Pagó" required><select {...register("paidBy")}>{trip.participants.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></Field>
      <Field label="Categoría" required><select {...register("category")}>
        <option value="food">Comida</option><option value="transport">Transporte</option><option value="lodging">Alojamiento</option><option value="activities">Actividades</option><option value="shopping">Compras</option><option value="insurance">Seguro</option>
        {(trip.customExpenseCategories ?? []).map((category) => <option key={category} value={`custom:${category}`}>{category}</option>)}
        <option value="other">Otra categoría…</option>
      </select></Field>
      <Field label="Reserva asociada"><select {...register("reservationId")}><option value="">Ninguna</option>{trip.reservations.filter((item) => item.status !== "cancelled").map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field>
      <div className="form-field"><span>Dividir entre<b className="required-mark" aria-hidden="true"> *</b></span><div className="form-check-grid">{trip.participants.filter((person) => person.status !== "removed").map((person) => <label key={person.id}><input type="checkbox" value={person.id} {...register("participantIds")} /> {person.name}</label>)}</div>{errors.participantIds?.message && <small role="alert">{errors.participantIds.message}</small>}</div>
      {selectedExpenseCategory === "other" && (
        <Field label="Nueva categoría" required error={errors.customCategory?.message}>
          <input {...register("customCategory")} placeholder="Ej. Excursiones" />
        </Field>
      )}
      <label className="receipt-upload">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setReceiptImage(await prepareReceiptImage(file));
          }}
        />
        {receiptImage ? (
          <>
            <img src={receiptImage} alt="Comprobante del gasto" />
            <div><strong>Cambiar comprobante</strong><p>Tomá otra foto o elegí una imagen</p></div>
          </>
        ) : (
          <>
            <span>+</span>
            <div><strong>Agregar ticket o factura</strong><p>Usar cámara o elegir desde Fotos</p></div>
          </>
        )}
      </label>
      {receiptImage && <Button variant="ghost" size="small" onClick={() => setReceiptImage(undefined)}>Quitar comprobante</Button>}
      <p className="form-note">Convertiremos el importe a USD con la cotización de referencia más reciente y lo dividiremos entre {trip.participants.length} personas.</p>
      {errors.root?.message && <p className="form-error" role="alert">{errors.root.message}</p>}
      <FormActions
        pending={mutation.isPending}
        editing={Boolean(entity)}
        entityLabel="gasto"
        destructiveLabel="Anular gasto"
        confirmTitle="¿Anular gasto?"
        confirmDescription="El movimiento seguirá visible en el historial, pero no afectará los balances."
        onDelete={() => entity && mutation.mutate(() => tripRepository.deleteExpense(entity))}
      />
    </form>
  );
}

export function ReservationForm({
  close,
  entity,
  variant = "general",
  trip: tripOverride,
  importDraft,
}: {
  close: () => void;
  entity?: Reservation;
  variant?: "general" | "lodging" | "transport" | "car" | "excursion";
  trip?: Trip;
  importDraft?: DocumentImportDraft;
}) {
  const { data: activeTrip } = useActiveTrip();
  const trip = tripOverride ?? activeTrip;
  const lodging = variant === "lodging";
  const carRental = variant === "car";
  const excursion = variant === "excursion";
  const transport = variant === "transport" || carRental;
  const mutation = useSaveEntity(close, carRental ? "car" : lodging ? "hotel" : "airplane");
  const [travelerDetails, setTravelerDetails] = useState<Record<string, {
    included: boolean;
    passengerName: string;
    confirmationCode: string;
    seat: string;
    baggage: string;
  }>>({});
  const { register, handleSubmit, setError, watch, formState: { errors } } = useForm<ReservationInput, unknown, ReservationValues>({
    resolver: zodResolver(reservationSchema),
    defaultValues: entity ? {
      title: entity.title, type: entity.type, providerName: entity.providerName,
      providerReference: entity.providerReference, startAt: entity.startAt.slice(0, 16),
      excursionDate: entity.startAt.slice(0, 10), excursionTime: entity.startAt.slice(11, 16),
      endAt: entity.endAt?.slice(0, 16), city: entity.city,
      country: trip?.destinations.find((destination) => destination.city.localeCompare(entity.city, "es", { sensitivity: "base" }) === 0)?.country,
      originCity: entity.originCity, destinationCity: entity.destinationCity,
      originPlace: entity.originPlace, destinationPlace: entity.destinationPlace,
      serviceNumber: entity.serviceNumber, address: entity.address,
      totalAmount: entity.totalAmount, paymentStatus: entity.paymentStatus,
      currency: entity.originalCurrency ?? entity.currency,
      status: entity.status, confirmationCode: entity.confirmationCode,
      externalUrl: entity.externalUrl,
      paid: entity.paymentStatus === "paid", paidBy: entity.paidBy,
      payOnArrival: entity.payOnArrival, confirmed: entity.status === "confirmed",
      differentDropoffCity: entity.type === "car" && Boolean(entity.destinationCity && entity.destinationCity !== entity.originCity),
    } : {
      title: carRental ? "Alquiler de auto" : importDraft?.title ?? "",
      type: carRental ? "car" : excursion ? "activity" : importDraft && importDraft.kind !== "expense" && importDraft.kind !== "other" ? importDraft.kind : lodging ? "hotel" : "flight",
      providerName: importDraft?.providerName ?? "", providerReference: importDraft?.providerReference ?? "",
      confirmationCode: importDraft?.confirmationCode ?? "", startAt: importDraft?.startAt ?? "", endAt: importDraft?.endAt ?? "",
      excursionDate: importDraft?.startAt?.slice(0, 10) ?? "", excursionTime: importDraft?.startAt?.slice(11, 16) ?? "",
      city: importDraft?.city ?? "", country: importDraft?.country ?? "", originCity: importDraft?.originCity ?? "",
      destinationCity: importDraft?.destinationCity ?? "", originPlace: importDraft?.originPlace ?? "",
      destinationPlace: importDraft?.destinationPlace ?? "", serviceNumber: importDraft?.serviceNumber ?? "", address: importDraft?.address ?? "",
      paymentStatus: importDraft?.paid ? "paid" : "unpaid",
      status: "confirmed", totalAmount: importDraft?.amount ?? 0, currency: importDraft?.currency ?? BASE_CURRENCY, paid: Boolean(importDraft?.paid),
      payOnArrival: false, confirmed: true,
      differentDropoffCity: Boolean(importDraft?.destinationCity && importDraft.destinationCity !== importDraft.originCity),
    },
  });
  useEffect(() => {
    if (!trip) return;
    setTravelerDetails(Object.fromEntries(
      trip.participants
        .filter((person) => person.status !== "removed")
        .map((person) => {
          const detail = entity?.travelerConfirmations?.find((item) => item.participantId === person.id);
          return [person.id, {
            included: entity ? entity.participantIds.includes(person.id) : true,
            passengerName: detail?.passengerName ?? person.name,
            confirmationCode: detail?.confirmationCode ?? entity?.confirmationCode ?? entity?.providerReference ?? "",
            seat: detail?.seat ?? "",
            baggage: detail?.baggage ?? "",
          }];
        }),
    ));
  }, [entity, trip]);
  if (!trip) return null;
  const reservationType = watch("type");
  const isTransport = ["flight", "train", "bus", "ferry", "car"].includes(reservationType);
  const isLodging = ["hotel", "apartment"].includes(reservationType);

  const submit = async (values: ReservationValues) => {
    if (!excursion && !values.startAt) { setError("startAt", { message: "Ingresá fecha y hora" }); return; }
    if (isLodging && !values.city?.trim()) { setError("city", { message: "Ingresá la ciudad" }); return; }
    if (isLodging && !values.country?.trim()) { setError("country", { message: "Ingresá el país" }); return; }
    if (isLodging && !values.endAt) { setError("endAt", { message: "Ingresá la fecha de check-out" }); return; }
    if (isLodging && values.paid && !values.paidBy) { setError("paidBy", { message: "Seleccioná quién pagó" }); return; }
    if (excursion && !values.excursionDate) { setError("excursionDate", { message: "Ingresá la fecha" }); return; }
    if (excursion && !values.excursionTime) { setError("excursionTime", { message: "Ingresá la hora" }); return; }
    if (excursion && values.paid && !values.paidBy) { setError("paidBy", { message: "Seleccioná quién pagó" }); return; }
    if (carRental && !values.originCity?.trim()) { setError("originCity", { message: "Ingresá la ciudad de retiro" }); return; }
    if (carRental && values.differentDropoffCity && !values.destinationCity?.trim()) { setError("destinationCity", { message: "Ingresá la ciudad de entrega" }); return; }
    if (carRental && !values.endAt) { setError("endAt", { message: "Ingresá la fecha de entrega" }); return; }
    if (values.paid && !values.paidBy) { setError("paidBy", { message: "Seleccioná quién pagó" }); return; }
    if (!isLodging && !carRental && !excursion && !values.providerName?.trim()) { setError("providerName", { message: "Ingresá el proveedor" }); return; }
    if (!isLodging && !excursion && !values.providerReference?.trim()) { setError("providerReference", { message: "Ingresá el código" }); return; }
    const conversion = await convertToUsd(values.totalAmount, values.currency).catch((reason: unknown) => {
      setError("root", {
        message: reason instanceof Error ? reason.message : "No pudimos convertir el total a USD.",
      });
      return null;
    });
    if (!conversion) return;
    const reservation: Reservation = {
      ...(entity ?? {
        ...createSyncableFields(), id: crypto.randomUUID(), tripId: trip.id,
        provider: "generic" as const, status: "draft" as const,
        participantIds: trip.participants.map((person) => person.id),
        availableOffline: true, importSource: "manual" as const,
      }),
      title: carRental ? `Auto en ${values.originCity?.trim() || "destino"}` : values.title,
      type: values.type,
      providerName: values.providerName?.trim() || (carRental ? "Alquiler de auto" : "Sin plataforma"),
      providerReference: values.providerReference?.trim() || "Sin código",
      confirmationCode: values.confirmationCode?.trim() || values.providerReference?.trim() || undefined,
      externalUrl: values.externalUrl?.trim() || undefined,
      paymentMethodLast4: undefined,
      // Reservation schedules are wall-clock times at the origin/destination.
      // Keep the entered value instead of converting it to the device timezone.
      startAt: excursion ? `${values.excursionDate}T${values.excursionTime}` : values.startAt!,
      endAt: values.endAt || undefined,
      city: values.city?.trim() || values.destinationCity?.trim() || values.originCity?.trim() || "",
      originCity: values.originCity?.trim() || undefined,
      destinationCity: carRental && !values.differentDropoffCity ? values.originCity?.trim() || undefined : values.destinationCity?.trim() || undefined,
      originPlace: values.originPlace?.trim() || undefined,
      destinationPlace: values.destinationPlace?.trim() || undefined,
      serviceNumber: values.serviceNumber?.trim() || undefined,
      address: values.address?.trim() || undefined,
      totalAmount: conversion.amount,
      currency: BASE_CURRENCY,
      originalTotalAmount: values.totalAmount,
      originalCurrency: values.currency,
      exchangeRate: conversion.rate,
      paymentStatus: values.paid ? "paid" : "unpaid",
      paidBy: values.paid ? values.paidBy || undefined : undefined,
      payOnArrival: Boolean(values.payOnArrival),
      status: isLodging || excursion ? values.confirmed ? "confirmed" : "pending" : values.status,
      participantIds: Object.entries(travelerDetails).filter(([, detail]) => detail.included).map(([participantId]) => participantId),
      travelerConfirmations: isTransport
        ? Object.entries(travelerDetails)
            .filter(([, detail]) => detail.included)
            .map(([participantId, detail]) => ({
              participantId,
              passengerName: detail.passengerName.trim() || undefined,
              confirmationCode: detail.confirmationCode.trim() || values.confirmationCode?.trim() || values.providerReference || "Sin código",
              seat: detail.seat.trim() || undefined,
              baggage: detail.baggage.trim() || undefined,
            }))
        : undefined,
      nextAction: values.payOnArrival ? "Pagar al llegar" : undefined,
    };
    await mutation.mutateAsync(async () => {
      if (entity) await tripRepository.updateReservation(reservation);
      else await tripRepository.addReservation(reservation);

      const destinationName = isLodging ? reservation.city : undefined;
      const existingDestination = trip.destinations.find(
        (item) => Boolean(destinationName) && item.city.localeCompare(destinationName!, "es", { sensitivity: "base" }) === 0,
      );
      const date = reservation.startAt.slice(0, 10);
      const departureDate = reservation.endAt?.slice(0, 10) ?? date;
      const destinations = !destinationName
        ? trip.destinations
        : existingDestination
        ? trip.destinations.map((item) => item.id === existingDestination.id
          ? {
              ...item,
              country: item.country || values.country?.trim() || "",
              arrivalDate: item.arrivalDate < date ? item.arrivalDate : date,
              departureDate: item.departureDate > departureDate ? item.departureDate : departureDate,
            }
          : item)
        : [...trip.destinations, {
            id: crypto.randomUUID(),
            city: destinationName,
            country: values.country?.trim() || "",
            arrivalDate: date,
            departureDate,
            imageUrl: "",
          }];
      const reservations = entity
        ? trip.reservations.map((item) => item.id === reservation.id ? reservation : item)
        : [...trip.reservations, reservation];
      const range = deriveTripDateRange({ destinations, reservations });
      await tripRepository.updateTrip({
        ...trip,
        destinations,
        reservations,
        ...(range ?? {}),
      });
    });
  };

  return (
    <form className="entity-form" onSubmit={handleSubmit(submit)}>
      {!carRental && <Field label={transport ? "Nombre del viaje" : lodging ? "Nombre del alojamiento" : "Nombre"} required error={errors.title?.message}>
        <input autoFocus {...register("title")} placeholder={transport ? "Ej. Vuelo de ida" : lodging ? "Ej. Hotel Central" : "Ej. Reserva"} />
      </Field>}
      {!carRental && !excursion && <div className={lodging ? "" : "form-row"}>
        <Field label="Tipo" required><select {...register("type")}>
          {lodging ? (
            <><option value="hotel">Hotel</option><option value="apartment">Casa o departamento</option></>
          ) : excursion ? (
            <option value="activity">Excursión</option>
          ) : transport ? (
            <><option value="flight">Avión</option><option value="train">Tren</option><option value="bus">Bus</option><option value="ferry">Ferry</option><option value="car">Auto alquilado</option></>
          ) : (
            <><option value="flight">Vuelo</option><option value="hotel">Hotel</option><option value="apartment">Casa o departamento</option><option value="train">Tren</option><option value="bus">Autobús</option><option value="ferry">Ferry</option><option value="restaurant">Restaurante</option><option value="activity">Actividad</option><option value="car">Auto</option><option value="insurance">Seguro</option><option value="other">Otro</option></>
          )}
        </select></Field>
      </div>}
      {!carRental && !excursion && <div className="form-row">
        <Field label={reservationType === "flight" ? "Aerolínea" : reservationType === "car" ? "Empresa de alquiler" : lodging ? "Plataforma" : "Empresa"} required={!lodging} error={errors.providerName?.message}>
          <input {...register("providerName")} placeholder={reservationType === "flight" ? "Ej. Aerolíneas Argentinas" : lodging ? "Ej. Airbnb o nombre del hotel" : "Nombre de la empresa"} />
        </Field>
        <Field label="Código de reserva" required={!lodging} error={errors.providerReference?.message}><input autoCapitalize="characters" {...register("providerReference")} /></Field>
      </div>}
      {!carRental && !excursion && <div className="form-row">
        <Field label="Código de confirmación"><input autoCapitalize="characters" {...register("confirmationCode")} /></Field>
        {!lodging && <Field label="Estado" required><select {...register("status")}><option value="draft">Borrador</option><option value="pending">Pendiente</option><option value="confirmed">Confirmada</option><option value="completed">Completada</option><option value="cancelled">Anulada</option></select></Field>}
      </div>}
      {carRental && <Field label="Código de reserva" required error={errors.providerReference?.message}><input autoFocus autoCapitalize="characters" {...register("providerReference")} /></Field>}
      {isTransport && !carRental && <Field label={reservationType === "flight" ? "Número de vuelo" : "Número de servicio"}><input {...register("serviceNumber")} placeholder={reservationType === "flight" ? "Ej. AR1132" : ""} /></Field>}
      {excursion ? <div className="form-row">
        <Field label="Fecha" required error={errors.excursionDate?.message}><input type="date" {...register("excursionDate")} /></Field>
        <Field label="Hora" required error={errors.excursionTime?.message}><input type="time" {...register("excursionTime")} /></Field>
        <input type="hidden" {...register("startAt")} />
      </div> : <Field label={isLodging ? "Check-in" : reservationType === "car" ? "Retiro" : isTransport ? "Salida" : "Fecha y hora"} required error={errors.startAt?.message}><input type="datetime-local" {...register("startAt")} /></Field>}
      {excursion && <div className="form-row">
        <Field label="Empresa" error={errors.providerName?.message}><input {...register("providerName")} placeholder="Nombre de la empresa" /></Field>
        <Field label="Código de reserva" error={errors.providerReference?.message}><input autoCapitalize="characters" {...register("providerReference")} /></Field>
      </div>}
      {(isLodging || isTransport) && <Field label={isLodging ? "Check-out" : reservationType === "car" ? "Devolución" : "Llegada"} required={isLodging || carRental} error={errors.endAt?.message}><input type="datetime-local" {...register("endAt")} /></Field>}
      {isTransport && !carRental && (
        <>
          <div className="form-row">
            <Field label="Ciudad de origen" required error={errors.originCity?.message}><input {...register("originCity")} placeholder="Ej. Buenos Aires" /></Field>
            <Field label="Ciudad de destino" required error={errors.destinationCity?.message}><input {...register("destinationCity")} placeholder="Ej. París" /></Field>
          </div>
          <div className="form-row">
            <Field label={reservationType === "flight" ? "Aeropuerto de salida" : reservationType === "car" ? "Lugar de retiro" : "Terminal o estación de salida"}><input {...register("originPlace")} /></Field>
            <Field label={reservationType === "flight" ? "Aeropuerto de llegada" : reservationType === "car" ? "Lugar de devolución" : "Terminal o estación de llegada"}><input {...register("destinationPlace")} /></Field>
          </div>
        </>
      )}
      {carRental && <>
        <Field label="Ciudad de retiro" required error={errors.originCity?.message}><input {...register("originCity")} placeholder="Ej. Madrid" /></Field>
        <label className="traveler-toggle"><input type="checkbox" {...register("differentDropoffCity")} /><strong>Se entrega en otra ciudad</strong></label>
        {watch("differentDropoffCity") && <Field label="Ciudad de entrega" required error={errors.destinationCity?.message}><input {...register("destinationCity")} placeholder="Ej. Barcelona" /></Field>}
        <Field label="Dirección de retiro"><input {...register("originPlace")} placeholder="Aeropuerto, estación o dirección" /></Field>
        {watch("differentDropoffCity") && <Field label="Dirección de entrega"><input {...register("destinationPlace")} placeholder="Aeropuerto, estación o dirección" /></Field>}
      </>}
      {isLodging && (
        <>
          <Field label="Ciudad" required error={errors.city?.message}><input {...register("city")} placeholder="Ej. Madrid" /></Field>
          <Field label="País" required error={errors.country?.message}><input {...register("country")} placeholder="Ej. España" /></Field>
          <Field label="Dirección"><input {...register("address")} placeholder="Calle, número o indicaciones" /></Field>
        </>
      )}
      {excursion && <Field label="Dirección de encuentro"><input {...register("address")} placeholder="Calle, número o indicaciones" /></Field>}
      {!lodging && !carRental && !excursion && <Field label="Enlace del proveedor"><input type="url" inputMode="url" autoCapitalize="none" {...register("externalUrl")} placeholder="https://…" /></Field>}
      <div className="form-row">
        <Field label={carRental ? "Precio" : "Total"}><input type="number" inputMode="decimal" step="0.01" {...register("totalAmount")} /></Field>
        <Field label="Moneda"><select {...register("currency")}>{SUPPORTED_CURRENCIES.map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}</select></Field>
      </div>
      <section className="form-subsection">
        <label className="traveler-toggle"><input type="checkbox" {...register("paid")} /><strong>Pagado</strong></label>
        {watch("paid") && <Field label="Pagado por" required error={errors.paidBy?.message}><select {...register("paidBy")}><option value="">Seleccionar integrante</option>{trip.participants.filter((person) => person.status !== "removed").map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></Field>}
        <label className="traveler-toggle"><input type="checkbox" {...register("payOnArrival")} /><strong>Se paga al llegar</strong></label>
        {(lodging || excursion) && <label className="traveler-toggle"><input type="checkbox" {...register("confirmed")} /><strong>Reserva confirmada</strong></label>}
      </section>
      {isTransport && !carRental && (
        <section className="form-subsection">
          <div><strong>Pasajeros</strong><p>Códigos, asientos y equipaje por integrante.</p></div>
          {trip.participants.filter((person) => person.status !== "removed").map((person) => {
            const detail = travelerDetails[person.id];
            if (!detail) return null;
            const update = (values: Partial<typeof detail>) => setTravelerDetails((current) => ({
              ...current,
              [person.id]: { ...current[person.id], ...values },
            }));
            return (
              <article className="traveler-form-card" key={person.id}>
                <label className="traveler-toggle"><input type="checkbox" checked={detail.included} onChange={(event) => update({ included: event.target.checked })} /><strong>{person.name}</strong></label>
                {detail.included && (
                  <>
                    <Field label="Nombre como figura en el pasaje"><input value={detail.passengerName} onChange={(event) => update({ passengerName: event.target.value })} /></Field>
                    <div className="form-row">
                      <Field label="Código"><input autoCapitalize="characters" value={detail.confirmationCode} onChange={(event) => update({ confirmationCode: event.target.value })} /></Field>
                      <Field label="Asiento"><input autoCapitalize="characters" value={detail.seat} onChange={(event) => update({ seat: event.target.value })} placeholder="27D" /></Field>
                    </div>
                    <Field label="Equipaje y tarifa"><input value={detail.baggage} onChange={(event) => update({ baggage: event.target.value })} placeholder="Priority y 2 equipajes de cabina" /></Field>
                  </>
                )}
              </article>
            );
          })}
        </section>
      )}
      {errors.root?.message && <p className="form-error" role="alert">{errors.root.message}</p>}
      <FormActions
        pending={mutation.isPending}
        editing={Boolean(entity)}
        entityLabel="reserva"
        destructiveLabel="Eliminar reserva"
        confirmTitle="¿Eliminar reserva?"
        confirmDescription="La reserva se eliminará del viaje. Esta acción no se puede deshacer."
        onDelete={() => entity && mutation.mutate(() => tripRepository.deleteReservation(entity))}
      />
    </form>
  );
}

function FormActions({
  pending,
  editing,
  entityLabel,
  destructiveLabel = "Eliminar",
  confirmTitle,
  confirmDescription = "Esta acción no se puede deshacer.",
  onDelete,
}: {
  pending: boolean;
  editing: boolean;
  entityLabel: string;
  destructiveLabel?: string;
  confirmTitle?: string;
  confirmDescription?: string;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <div className="form-actions">
        <Button type="submit" variant="primary" icon="save" fullWidth className="form-submit form-action-important" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        {editing && (
          <Button
            variant="danger"
            icon="trash"
            fullWidth
            className="form-action-important form-action-destructive"
            onClick={() => setConfirming(true)}
            disabled={pending}
          >
            {destructiveLabel}
          </Button>
        )}
      </div>
      {confirming && (
        <div className="confirm-layer" role="presentation">
          <button type="button" className="confirm-backdrop" onClick={() => setConfirming(false)} aria-label="Cancelar eliminación" />
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description">
            <div className="confirm-icon">!</div>
            <h2 id="delete-title">{confirmTitle ?? `¿Eliminar ${entityLabel}?`}</h2>
            <p id="delete-description">{confirmDescription}</p>
            <div className="confirm-actions">
              <Button variant="secondary" onClick={() => setConfirming(false)}>Cancelar</Button>
              <Button variant="danger" icon="trash" onClick={onDelete} disabled={pending}>
                {pending ? "Procesando…" : destructiveLabel}
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export function InviteForm({ close, trip: tripOverride }: { close: () => void; trip?: Trip }) {
  const { data: activeTrip } = useActiveTrip();
  const trip = tripOverride ?? activeTrip;
  const queryClient = useQueryClient();
  const { runSave } = useSaveFeedback();
  const [email, setEmail] = useState("");
  const [registered, setRegistered] = useState(false);
  const [linked, setLinked] = useState(false);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => runSave(async () => {
      if (!trip) return false;
      const normalizedEmail = email.trim().toLowerCase();
      const alreadyExists = trip.participants.some((participant) => participant.email?.toLowerCase() === normalizedEmail);
      if (!alreadyExists) {
        const label = normalizedEmail.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
        const words = label.split(/\s+/);
        await tripRepository.updateTrip({
          ...trip,
          participants: [...trip.participants, {
            id: crypto.randomUUID(), name: label, email: normalizedEmail,
            initials: words.slice(0, 2).map((word) => word[0]).join("").toUpperCase(),
            color: "#8edcc5", role: "member", status: "active", joinedAt: new Date().toISOString(),
          }],
        });
      }
      const { data, error: inviteError } = await supabase.rpc("invite_trip_member_by_email", {
        target_trip_id: trip.id, target_email: normalizedEmail,
      });
      if (inviteError) throw inviteError;
      return Boolean(data);
    }, "users"),
    onSuccess: async (isLinked) => {
      setLinked(isLinked);
      setRegistered(true);
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "No pudimos registrar la invitación."),
  });

  if (!trip) return null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    mutation.mutate();
  };

  if (registered) {
    return (
      <div className="invite-success">
        <span>✓</span>
        <h3>{linked ? "Integrante agregado" : "Invitación pendiente"}</h3>
        <p>{linked
          ? `${email.trim().toLowerCase()} ya puede acceder a ${trip.name}.`
          : `Cuando ${email.trim().toLowerCase()} cree su cuenta, tendrá acceso a ${trip.name}.`}</p>
        <Button variant="primary" fullWidth onClick={close}>Listo</Button>
      </div>
    );
  }

  return (
    <form className="entity-form" onSubmit={submit}>
      <label className="form-field">
        <span>Email del integrante<b className="required-mark" aria-hidden="true"> *</b></span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoFocus
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nombre@ejemplo.com"
        />
      </label>
      <div className="invite-role">
        <span>+</span>
        <div><strong>Integrante</strong><p>Podrá ver y agregar información al viaje.</p></div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button type="submit" variant="primary" fullWidth disabled={mutation.isPending}>
        {mutation.isPending ? "Guardando…" : "Registrar invitación"}
      </Button>
    </form>
  );
}
