import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { ErrorState, LoadingState } from "../components/ui/PageState";
import { useTrip } from "../hooks/useTrips";
import { tripRepository } from "../repositories";

const colors = ["#8edcc5", "#a78bfa", "#ff9b82", "#7dd3fc", "#f7c873"];

export function MemberFormPage() {
  const { tripId, memberId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: trip, isLoading, isError, refetch } = useTrip(tripId);
  const member = trip?.participants.find((person) => person.id === memberId);
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");

  useEffect(() => {
    if (!member) return;
    setName(member.name);
    setEmail(member.email ?? "");
  }, [member]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!trip) return;
      const words = name.trim().split(/\s+/);
      const initials = words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
      const participants = member
        ? trip.participants.map((person) => person.id === member.id
          ? { ...person, name: name.trim(), email: email.trim().toLowerCase(), initials }
          : person)
        : [...trip.participants, {
            id: crypto.randomUUID(),
            name: name.trim(),
            email: email.trim().toLowerCase(),
            initials,
            color: colors[trip.participants.length % colors.length],
            role: "member" as const,
            status: "active" as const,
            joinedAt: new Date().toISOString(),
          }];
      await tripRepository.updateTrip({ ...trip, participants });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      navigate(`/viaje/${tripId}/integrantes`, { replace: true });
    },
  });

  if (isLoading) return <LoadingState />;
  if (isError || !trip || (memberId && !member)) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <>
      <PageHeader eyebrow={trip.name} title={member ? "Editar integrante" : "Agregar integrante"} />
      <section className="page-editor entity-form-page">
        <form className="entity-form" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
          <label className="form-field">
            <span>Nombre</span>
            <input autoFocus required minLength={2} value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="form-field">
            <span>Email</span>
            <input required type="email" inputMode="email" autoCapitalize="none" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <div className="form-actions">
            <Button type="submit" variant="primary" icon="save" fullWidth className="form-action-important" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando…" : member ? "Guardar cambios" : "Agregar integrante"}
            </Button>
          </div>
        </form>
      </section>
    </>
  );
}
