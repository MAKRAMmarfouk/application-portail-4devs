import React from 'react';
import { Printer, Download } from 'lucide-react';

interface PrintableDocumentProps {
  title: string;
  documentNumber: string;
  establishmentName?: string;
  establishmentCode?: string;
  date?: string;
  children: React.ReactNode;
  visas?: Array<{ role: string; label: string; date?: string; status?: string; signatureName?: string }>;
}

export const PrintableDocument: React.FC<PrintableDocumentProps> = ({
  title,
  documentNumber,
  establishmentName = "Section d'Instruction Générale Régionale",
  establishmentCode = 'SIGR',
  date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
  children,
  visas,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-100 p-4 rounded-xl">
      {/* Action Bar (hidden on print) */}
      <div className="print:hidden flex items-center justify-between mb-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="font-semibold text-institutional-dark">Aperçu avant impression (Format A4)</span>
          <span className="text-slate-300">|</span>
          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono">
            Réf: {documentNumber}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-institutional-primary text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            Imprimer / Exporter en PDF
          </button>
        </div>
      </div>

      {/* A4 Sheet Container */}
      <div
        id="printable-area"
        className="printable-sheet bg-white mx-auto shadow-xl print:shadow-none p-10 max-w-[800px] min-h-[1120px] text-institutional-text relative flex flex-col justify-between border border-slate-200 print:border-none print:m-0 print:p-8"
      >
        {/* Top Header */}
        <div>
          <div className="border-b-2 border-institutional-dark pb-4 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest uppercase text-slate-700">RÉPUBLIQUE DÉMOCRATIQUE</p>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider">Ministère des Forces Armées & de l'Instruction</p>
                <p className="text-xs font-semibold text-institutional-primary mt-1">
                  DIRECTION GÉNÉRALE DE LA FORMATION (ERG)
                </p>
                <p className="text-xs font-medium text-slate-800">
                  {establishmentName} ({establishmentCode})
                </p>
              </div>
              <div className="text-right">
                <div className="inline-block border border-slate-300 rounded px-3 py-1 bg-slate-50 text-right">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">N° D'ENREGISTREMENT</p>
                  <p className="text-xs font-mono font-bold text-institutional-dark">{documentNumber}</p>
                </div>
                <p className="text-xs text-slate-500 mt-2">Fait le : {date}</p>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="mt-6 text-center py-2 bg-slate-50 border-y border-slate-200">
              <h1 className="text-lg font-extrabold uppercase tracking-wide text-institutional-dark">
                {title}
              </h1>
            </div>
          </div>

          {/* Document Dynamic Body */}
          <div className="text-sm leading-relaxed text-slate-800">{children}</div>
        </div>

        {/* Visas & Signatures Section */}
        <div className="mt-12 pt-4 border-t border-slate-200">
          {visas && visas.length > 0 && (
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                CIRCUIT OFFICIEL DES VISAS ET VALIDATIONS
              </p>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {visas.map((v, i) => (
                  <div key={i} className="border border-slate-200 rounded p-2 bg-slate-50/50 flex flex-col justify-between min-h-[90px]">
                    <div>
                      <p className="font-bold text-[11px] text-institutional-dark">{v.role}</p>
                      <p className="text-[10px] text-slate-500">{v.label}</p>
                    </div>
                    <div className="my-1 border-t border-dashed border-slate-200 pt-1">
                      {v.status && (
                        <span className={`inline-block text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          v.status.includes('VALIDEE') || v.status.includes('ACCEPTE')
                            ? 'bg-emerald-100 text-emerald-800'
                            : v.status.includes('REFUSE')
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {v.status}
                        </span>
                      )}
                      {v.signatureName && (
                        <p className="text-[10px] font-medium text-slate-700 italic mt-0.5">{v.signatureName}</p>
                      )}
                      {v.date && <p className="text-[9px] text-slate-400">{v.date}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Official Footer */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-3">
            <span>Document certifié conforme issu du Système National de Gestion Administrative</span>
            <span>Page 1 / 1</span>
            <span className="font-mono">SYS-ADMIN-SECURE-STAMP</span>
          </div>
        </div>
      </div>
    </div>
  );
};
