import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useActiveTrip } from "../../hooks/useActiveTrip";
import { createSyncableFields } from "../../lib/indexed-db/database";
import { BASE_CURRENCY, convertToUsd, SUPPORTED_CURRENCIES } from "../../lib/currency/exchangeRates";
import { prepareReceiptImage } from "../../lib/images/receiptImage";
import { deriveTripDateRange } from "../../lib/trips/deriveTripDateRange";
import { tripRepository } from "../../repositories";
import type { Activity, Expense, Reservation, Trip } from "../../types/domain";
import { Button } from "../ui/Button";
import { CityAutocomplete } from "../ui/CityAutocomplete";

const activitySchema = z.object({
  title: z.string().trim().min(2, "Ingresá un título"),
  description: z.string().optional(),
  dayId: z.string().min(1),
  startTime: z.string().min(1, "Ingresá una hora"),
  endTime: z.string().optional(),
  location: z.string().trim().min(2, "Ingresá una ubicación"),
  category: z.enum(["visit", "food", "transport", "lodging", "shopping", "event", "free_time", "other"]),
  status: z.enum(["planned", "confirmed", "done"]),
  reservationId: z.string().optional(),
  participantIds: z.array(z.string()).min(1, "Elegí al menos un integrante"),
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
  providerName: z.string().trim().min(2, "Ingresá el proveedor"),
  providerReference: z.string().trim().min(2, "Ingresá el código"),
  startAt: z.string().min(1, "Ingresá fecha y hora"),
  endAt: z.string().optional(),
  city: z.string().optional(),
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
  paymentMethodLast4: z.string().max(4).optional(),
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
type ExpenseValues = z.infer<typeof expenseSchema>;
type ReservationValues = z.infer<typeof reservationSchema>;
type ExpenseInput = z.input<typeof expenseSchema>;
type ReservationInput = z.input<typeof reservationSchema>;
type TripValues = z.infer<typeof tripSchema>;

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
      {error && <small role="alert">{error}</small>}
    </label>
  );
}

function useSaveEntity(close: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (operation: () => Promise<void>) => operation(),
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
  const mutation = useSaveEntity(close);
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
      <Field label="Nombre del viaje" error={errors.name?.message}><input autoFocus {...register("name")} placeholder="Ej. Escapada a Mendoza" /></Field>
      <Field label="Descripción" error={errors.description?.message}><input {...register("description")} placeholder="Una semana de bodegas y montaña" /></Field>
      {automaticRange && (
        <p className="form-note">
          Las fechas se calculan automáticamente a partir de tus viajes, alojamientos y destinos. Para cambiarlas, editá primero esos datos.
        </p>
      )}
      <div className="form-row trip-date-row">
        <Field label="Desde" error={errors.startDate?.message}><input type="date" min={entity ? undefined : minimumDate} disabled={Boolean(automaticRange)} {...register("startDate")} /></Field>
        <Field label="Hasta" error={errors.endDate?.message}><input type="date" min={entity ? undefined : minimumDate} disabled={Boolean(automaticRange)} {...register("endDate")} /></Field>
      </div>
      <input type="hidden" value={BASE_CURRENCY} {...register("baseCurrency")} />
      <FormActions pending={mutation.isPending} editing={Boolean(entity)} entityLabel="viaje" onDelete={() => entity && mutation.mutate(() => tripRepository.deleteTrip(entity))} />
    </form>
  );
}

export function ActivityForm({ close, entity, trip: tripOverride }: { close: () => void; entity?: Activity; trip?: Trip }) {
  const { data: activeTrip } = useActiveTrip();
  const trip = tripOverride ?? activeTrip;
  const mutation = useSaveEntity(close);
  const { register, handleSubmit, formState: { errors } } = useForm<ActivityValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: entity ? {
      title: entity.title, dayId: entity.dayId, startTime: entity.startTime,
      endTime: entity.endTime, description: entity.description,
      location: entity.location, category: entity.category, status: entity.status,
      reservationId: entity.reservationId, participantIds: entity.participantIds,
    } : {
      dayId: trip?.itinerary[0]?.id, category: "visit", startTime: "10:00",
      status: "planned", participantIds: trip?.participants.filter((person) => person.status !== "removed").map((person) => person.id) ?? [],
    },
  });
  if (!trip) return null;

  const submit = (values: ActivityValues) => {
    const activity: Activity = {
      ...(entity ?? { ...createSyncableFields(), id: crypto.randomUUID(), status: "planned" as const, participantIds: trip.participants.map((person) => person.id) }),
      ...values,
    };
    mutation.mutate(() => entity ? tripRepository.updateActivity(activity) : tripRepository.addActivity(activity));
  };

  return (
    <form className="entity-form" onSubmit={handleSubmit(submit)}>
      <Field label="Título" error={errors.title?.message}><input autoFocus {...register("title")} placeholder="Ej. Visita a la Torre Eiffel" /></Field>
      <div className="form-row">
        <Field label="Día"><select {...register("dayId")}>{trip.itinerary.map((day) => <option key={day.id} value={day.id}>{day.city} · {day.date.slice(5)}</option>)}</select></Field>
        <Field label="Hora" error={errors.startTime?.message}><input type="time" {...register("startTime")} /></Field>
      </div>
      <Field label="Hora de finalización"><input type="time" {...register("endTime")} /></Field>
      <Field label="Ubicación" error={errors.location?.message}><input {...register("location")} placeholder="Dirección o punto de encuentro" /></Field>
      <Field label="Descripción"><textarea {...register("description")} placeholder="Información útil, punto de encuentro o indicaciones" /></Field>
      <Field label="Categoría"><select {...register("category")}><option value="visit">Visita</option><option value="food">Comida</option><option value="transport">Transporte</option><option value="lodging">Alojamiento</option><option value="free_time">Tiempo libre</option><option value="other">Otro</option></select></Field>
      <Field label="Estado"><select {...register("status")}><option value="planned">Planificada</option><option value="confirmed">Confirmada</option><option value="done">Realizada</option></select></Field>
      <Field label="Reserva asociada"><select {...register("reservationId")}><option value="">Ninguna</option>{trip.reservations.filter((item) => item.status !== "cancelled").map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field>
      <div className="form-field"><span>Participan</span><div className="form-check-grid">{trip.participants.filter((person) => person.status !== "removed").map((person) => <label key={person.id}><input type="checkbox" value={person.id} {...register("participantIds")} /> {person.name}</label>)}</div>{errors.participantIds?.message && <small role="alert">{errors.participantIds.message}</small>}</div>
      <FormActions pending={mutation.isPending} editing={Boolean(entity)} entityLabel="actividad" onDelete={() => entity && mutation.mutate(() => tripRepository.deleteActivity(entity))} />
    </form>
  );
}

export function ExpenseForm({ close, entity, trip: tripOverride }: { close: () => void; entity?: Expense; trip?: Trip }) {
  const { data: activeTrip } = useActiveTrip();
  const trip = tripOverride ?? activeTrip;
  const mutation = useSaveEntity(close);
  const [receiptImage, setReceiptImage] = useState(entity?.receiptImageDataUrl);
  const { register, handleSubmit, setError, watch, formState: { errors } } = useForm<ExpenseInput, unknown, ExpenseValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: entity ? {
      description: entity.description, amount: entity.originalAmount, currency: entity.originalCurrency, paidBy: entity.paidBy,
      category: entity.categoryLabel ? `custom:${entity.categoryLabel}` : entity.category,
      customCategory: "", date: entity.date, reservationId: entity.reservationId,
      participantIds: entity.splits.map((split) => split.participantId),
    } : {
      category: "food", currency: BASE_CURRENCY, paidBy: trip?.participants[0]?.id,
      date: new Date().toISOString().slice(0, 10),
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
      <Field label="Descripción" error={errors.description?.message}><input autoFocus {...register("description")} placeholder="Ej. Cena del grupo" /></Field>
      <div className="form-row">
        <Field label="Importe" error={errors.amount?.message}><input type="number" inputMode="decimal" step="0.01" {...register("amount")} placeholder="0,00" /></Field>
        <Field label="Moneda"><select {...register("currency")}>{SUPPORTED_CURRENCIES.map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}</select></Field>
      </div>
      <Field label="Fecha"><input type="date" {...register("date")} /></Field>
      <Field label="Pagó"><select {...register("paidBy")}>{trip.participants.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></Field>
      <Field label="Categoría"><select {...register("category")}>
        <option value="food">Comida</option><option value="transport">Transporte</option><option value="lodging">Alojamiento</option><option value="activities">Actividades</option><option value="shopping">Compras</option><option value="insurance">Seguro</option>
        {(trip.customExpenseCategories ?? []).map((category) => <option key={category} value={`custom:${category}`}>{category}</option>)}
        <option value="other">Otra categoría…</option>
      </select></Field>
      <Field label="Reserva asociada"><select {...register("reservationId")}><option value="">Ninguna</option>{trip.reservations.filter((item) => item.status !== "cancelled").map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field>
      <div className="form-field"><span>Dividir entre</span><div className="form-check-grid">{trip.participants.filter((person) => person.status !== "removed").map((person) => <label key={person.id}><input type="checkbox" value={person.id} {...register("participantIds")} /> {person.name}</label>)}</div>{errors.participantIds?.message && <small role="alert">{errors.participantIds.message}</small>}</div>
      {selectedExpenseCategory === "other" && (
        <Field label="Nueva categoría" error={errors.customCategory?.message}>
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
}: {
  close: () => void;
  entity?: Reservation;
  variant?: "general" | "lodging" | "transport";
  trip?: Trip;
}) {
  const { data: activeTrip } = useActiveTrip();
  const trip = tripOverride ?? activeTrip;
  const lodging = variant === "lodging";
  const transport = variant === "transport";
  const mutation = useSaveEntity(close);
  const [travelerDetails, setTravelerDetails] = useState<Record<string, {
    included: boolean;
    passengerName: string;
    confirmationCode: string;
    seat: string;
    baggage: string;
  }>>({});
  const { register, control, handleSubmit, setError, watch, formState: { errors } } = useForm<ReservationInput, unknown, ReservationValues>({
    resolver: zodResolver(reservationSchema),
    defaultValues: entity ? {
      title: entity.title, type: entity.type, providerName: entity.providerName,
      providerReference: entity.providerReference, startAt: entity.startAt.slice(0, 16),
      endAt: entity.endAt?.slice(0, 16), city: entity.city,
      originCity: entity.originCity, destinationCity: entity.destinationCity,
      originPlace: entity.originPlace, destinationPlace: entity.destinationPlace,
      serviceNumber: entity.serviceNumber, address: entity.address,
      totalAmount: entity.totalAmount, paymentStatus: entity.paymentStatus,
      currency: entity.originalCurrency ?? entity.currency,
      status: entity.status, confirmationCode: entity.confirmationCode,
      externalUrl: entity.externalUrl, paymentMethodLast4: entity.paymentMethodLast4,
    } : {
      type: lodging ? "hotel" : "flight", city: "", paymentStatus: "unpaid",
      status: "confirmed", totalAmount: 0, currency: BASE_CURRENCY,
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
      title: values.title,
      type: values.type,
      providerName: values.providerName,
      providerReference: values.providerReference,
      confirmationCode: values.confirmationCode?.trim() || values.providerReference,
      externalUrl: values.externalUrl?.trim() || undefined,
      paymentMethodLast4: values.paymentMethodLast4?.trim() || undefined,
      // Reservation schedules are wall-clock times at the origin/destination.
      // Keep the entered value instead of converting it to the device timezone.
      startAt: values.startAt,
      endAt: values.endAt || undefined,
      city: values.city?.trim() || values.destinationCity?.trim() || values.originCity?.trim() || "",
      originCity: values.originCity?.trim() || undefined,
      destinationCity: values.destinationCity?.trim() || undefined,
      originPlace: values.originPlace?.trim() || undefined,
      destinationPlace: values.destinationPlace?.trim() || undefined,
      serviceNumber: values.serviceNumber?.trim() || undefined,
      address: values.address?.trim() || undefined,
      totalAmount: conversion.amount,
      currency: BASE_CURRENCY,
      originalTotalAmount: values.totalAmount,
      originalCurrency: values.currency,
      exchangeRate: conversion.rate,
      paymentStatus: values.paymentStatus,
      status: values.status,
      participantIds: Object.entries(travelerDetails).filter(([, detail]) => detail.included).map(([participantId]) => participantId),
      travelerConfirmations: isTransport
        ? Object.entries(travelerDetails)
            .filter(([, detail]) => detail.included)
            .map(([participantId, detail]) => ({
              participantId,
              passengerName: detail.passengerName.trim() || undefined,
              confirmationCode: detail.confirmationCode.trim() || values.confirmationCode?.trim() || values.providerReference,
              seat: detail.seat.trim() || undefined,
              baggage: detail.baggage.trim() || undefined,
            }))
        : undefined,
      nextAction: "Revisar y confirmar reserva",
    };
    await mutation.mutateAsync(async () => {
      if (entity) await tripRepository.updateReservation(reservation);
      else await tripRepository.addReservation(reservation);

      const destinationName = isTransport ? reservation.destinationCity : reservation.city;
      if (!destinationName) return;
      const existingDestination = trip.destinations.find(
        (item) => item.city.localeCompare(destinationName, "es", { sensitivity: "base" }) === 0,
      );
      const date = reservation.startAt.slice(0, 10);
      const departureDate = reservation.endAt?.slice(0, 10) ?? date;
      const destinations = existingDestination
        ? trip.destinations.map((item) => item.id === existingDestination.id
          ? {
              ...item,
              arrivalDate: item.arrivalDate < date ? item.arrivalDate : date,
              departureDate: item.departureDate > departureDate ? item.departureDate : departureDate,
            }
          : item)
        : [...trip.destinations, {
            id: crypto.randomUUID(),
            city: destinationName,
            country: "",
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
      <Field label={transport ? "Nombre del viaje" : lodging ? "Nombre del alojamiento" : "Nombre"} error={errors.title?.message}>
        <input autoFocus {...register("title")} placeholder={transport ? "Ej. Vuelo de ida" : lodging ? "Ej. Hotel Central" : "Ej. Reserva"} />
      </Field>
      <div className="form-row">
        <Field label="Tipo"><select {...register("type")}>
          {lodging ? (
            <><option value="hotel">Hotel</option><option value="apartment">Casa o departamento</option></>
          ) : transport ? (
            <><option value="flight">Avión</option><option value="train">Tren</option><option value="bus">Bus</option><option value="ferry">Ferry</option><option value="car">Auto alquilado</option></>
          ) : (
            <><option value="flight">Vuelo</option><option value="hotel">Hotel</option><option value="apartment">Casa o departamento</option><option value="train">Tren</option><option value="bus">Autobús</option><option value="ferry">Ferry</option><option value="restaurant">Restaurante</option><option value="activity">Actividad</option><option value="car">Auto</option><option value="insurance">Seguro</option><option value="other">Otro</option></>
          )}
        </select></Field>
        <Field label="Estado de pago"><select {...register("paymentStatus")}><option value="unpaid">Sin pagar</option><option value="partially_paid">Pago parcial</option><option value="paid">Pagada</option></select></Field>
      </div>
      <div className="form-row">
        <Field label={reservationType === "flight" ? "Aerolínea" : reservationType === "car" ? "Empresa de alquiler" : lodging ? "Alojamiento o plataforma" : "Empresa"} error={errors.providerName?.message}>
          <input {...register("providerName")} placeholder={reservationType === "flight" ? "Ej. Aerolíneas Argentinas" : lodging ? "Ej. Airbnb o nombre del hotel" : "Nombre de la empresa"} />
        </Field>
        <Field label="Código de reserva" error={errors.providerReference?.message}><input autoCapitalize="characters" {...register("providerReference")} /></Field>
      </div>
      <div className="form-row">
        <Field label="Código de confirmación"><input autoCapitalize="characters" {...register("confirmationCode")} /></Field>
        <Field label="Estado"><select {...register("status")}><option value="draft">Borrador</option><option value="pending">Pendiente</option><option value="confirmed">Confirmada</option><option value="completed">Completada</option><option value="cancelled">Anulada</option></select></Field>
      </div>
      {isTransport && <Field label={reservationType === "flight" ? "Número de vuelo" : reservationType === "car" ? "Número de reserva" : "Número de servicio"}><input {...register("serviceNumber")} placeholder={reservationType === "flight" ? "Ej. AR1132" : "Opcional"} /></Field>}
      <Field label={isLodging ? "Check-in" : reservationType === "car" ? "Retiro" : isTransport ? "Salida" : "Fecha y hora"} error={errors.startAt?.message}><input type="datetime-local" {...register("startAt")} /></Field>
      {(isLodging || isTransport) && <Field label={isLodging ? "Check-out" : reservationType === "car" ? "Devolución" : "Llegada"}><input type="datetime-local" {...register("endAt")} /></Field>}
      {isTransport && (
        <>
          <div className="form-row">
            <Field label="Ciudad de origen"><Controller control={control} name="originCity" render={({ field }) => <CityAutocomplete required value={field.value ?? ""} onChange={field.onChange} />} /></Field>
            <Field label="Ciudad de destino"><Controller control={control} name="destinationCity" render={({ field }) => <CityAutocomplete required value={field.value ?? ""} onChange={field.onChange} />} /></Field>
          </div>
          <div className="form-row">
            <Field label={reservationType === "flight" ? "Aeropuerto de salida" : reservationType === "car" ? "Lugar de retiro" : "Terminal o estación de salida"}><input {...register("originPlace")} /></Field>
            <Field label={reservationType === "flight" ? "Aeropuerto de llegada" : reservationType === "car" ? "Lugar de devolución" : "Terminal o estación de llegada"}><input {...register("destinationPlace")} /></Field>
          </div>
        </>
      )}
      {isLodging && (
        <>
          <Field label="Ciudad"><Controller control={control} name="city" render={({ field }) => <CityAutocomplete required value={field.value ?? ""} onChange={field.onChange} />} /></Field>
          <Field label="Dirección"><input {...register("address")} placeholder="Calle, número o indicaciones" /></Field>
        </>
      )}
      <Field label="Enlace del proveedor"><input type="url" inputMode="url" autoCapitalize="none" {...register("externalUrl")} placeholder="https://…" /></Field>
      <div className="form-row">
        <Field label="Total"><input type="number" inputMode="decimal" step="0.01" {...register("totalAmount")} /></Field>
        <Field label="Moneda"><select {...register("currency")}>{SUPPORTED_CURRENCIES.map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}</select></Field>
      </div>
      <Field label="Últimos 4 dígitos de la tarjeta"><input inputMode="numeric" maxLength={4} pattern="[0-9]{4}" {...register("paymentMethodLast4")} placeholder="Ej. 9620" /></Field>
      {isTransport && (
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
          {pending ? "Guardando…" : editing ? "Guardar cambios" : "Guardar en el dispositivo"}
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
  const [email, setEmail] = useState("");
  const [registered, setRegistered] = useState(false);

  if (!trip) return null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const invitations = JSON.parse(localStorage.getItem("brujula:pending-invitations") ?? "[]") as unknown[];
    invitations.push({
      id: crypto.randomUUID(),
      tripId: trip.id,
      email: email.trim().toLowerCase(),
      role: "member",
      createdAt: new Date().toISOString(),
      status: "pending",
    });
    localStorage.setItem("brujula:pending-invitations", JSON.stringify(invitations));
    setRegistered(true);
  };

  if (registered) {
    return (
      <div className="invite-success">
        <span>✓</span>
        <h3>Invitación pendiente</h3>
        <p>Registramos a {email.trim().toLowerCase()} como invitado pendiente de {trip.name}.</p>
        <Button variant="primary" fullWidth onClick={close}>Listo</Button>
      </div>
    );
  }

  return (
    <form className="entity-form" onSubmit={submit}>
      <label className="form-field">
        <span>Email del integrante</span>
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
      <Button type="submit" variant="primary" fullWidth>Registrar invitación</Button>
    </form>
  );
}
