import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IconButton } from "../ui/Button";

export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const showBack = location.pathname !== "/";
  const goBack = () => {
    if (typeof window.history.state?.idx === "number" && window.history.state.idx > 0) navigate(-1);
    else navigate("/");
  };

  return (
    <header className="page-header">
      <div className="page-header-main">
        {showBack && (
          <IconButton icon="chevronLeft" label="Volver" onClick={goBack} />
        )}
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
        </div>
      </div>
      {action}
    </header>
  );
}
