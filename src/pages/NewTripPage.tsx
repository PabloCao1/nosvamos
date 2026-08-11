import { useNavigate } from "react-router-dom";
import { TripForm } from "../components/forms/EntityForms";
import { PageHeader } from "../components/layout/PageHeader";

export function NewTripPage() {
  const navigate = useNavigate();

  return (
    <>
      <PageHeader eyebrow="Viajes" title="Nuevo viaje" />
      <section className="page-editor trip-page-editor">
        <p className="page-editor-intro">
          Cargá los datos principales. Después vas a poder sumar destinos, reservas, integrantes y gastos.
        </p>
        <TripForm close={() => navigate("/", { replace: true })} />
      </section>
    </>
  );
}
