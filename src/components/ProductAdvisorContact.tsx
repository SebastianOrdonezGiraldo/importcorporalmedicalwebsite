"use client";

import { useId, useRef } from "react";
import { WhatsApp } from "./Icons";

type Advisor = { name: string; role: string; initials: string; href: string };

export default function ProductAdvisorContact({ productName, advisors }: { productName: string; advisors: Advisor[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button className="btn btn-violet" type="button" onClick={() => dialog.current?.showModal()} aria-haspopup="dialog">
        <WhatsApp />Consultar por WhatsApp
      </button>
      <dialog ref={dialog} className="advisor-dialog" aria-labelledby={titleId} onClick={(event) => {
        if (event.target === event.currentTarget) dialog.current?.close();
      }}>
        <div className="advisor-dialog-content">
          <form method="dialog" className="advisor-dialog-head">
            <h2 id={titleId}>¿Con qué asesor quieres hablar?</h2>
            <button type="submit" className="advisor-close" aria-label="Cerrar selección de asesor">×</button>
          </form>
          <p className="advisor-product">Consulta sobre {productName}</p>
          <div className="advisor-options">
            {advisors.map((advisor) => (
              <a key={advisor.href} className="advisor-choice" href={advisor.href} target="_blank" rel="noopener" onClick={() => dialog.current?.close()}>
                <span className="avatar" aria-hidden="true">{advisor.initials}</span>
                <span className="advisor-choice-name"><b>{advisor.name}</b><small>{advisor.role}</small></span>
                <WhatsApp />
              </a>
            ))}
          </div>
        </div>
      </dialog>
    </>
  );
}
