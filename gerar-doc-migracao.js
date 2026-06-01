const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        WidthType, BorderStyle, ShadingType, AlignmentType } = require('docx');
const fs = require('fs');

const csvLines = fs.readFileSync('/mnt/documents/fj1-patients-export.csv', 'utf8').split('\n').filter(l => l.trim());
const rows = csvLines.slice(1).map(line => {
  const p = line.split(',');
  return { legacy_id: p[0], email: p[1], full_name: p[2], nutritionist_email: p[3] || '', created_at: p[4] };
});

const total = rows.length;
const semNutri = rows.filter(r => !r.nutritionist_email.trim());
const testK = ['test','qa','validador','agent-','demo','example','fake','fluxo.humano'];
const testEmails = rows.filter(r => testK.some(k => r.email.toLowerCase().includes(k)));

const byNutri = {};
rows.forEach(r => { const ne = r.nutritionist_email.trim() || '(sem nutricionista)'; byNutri[ne] = (byNutri[ne]||0)+1; });
const nutriSorted = Object.entries(byNutri).sort((a,b) => b[1]-a[1]);

const cb = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const cbs = { top: cb, bottom: cb, left: cb, right: cb };

function C(text, opts={}) {
  const { bold=false, w, fill, align=AlignmentType.LEFT } = opts;
  return new TableCell({ borders: cbs, width: w?{size:w,type:WidthType.DXA}:undefined, shading: fill?{fill,type:ShadingType.CLEAR}:undefined, children: [new Paragraph({ alignment: align, children: [new TextRun({text, bold, size:20, font:"Arial"})] })] });
}
function H(text, w) { return C(text, { bold:true, w, fill:"1e3a5f", align:AlignmentType.CENTER }); }

const resumoRows = [
  new TableRow({ children: [H("Métrica",3600), H("Valor",5760)] }),
  new TableRow({ children: [C("Total de pacientes"), C(String(total), {align:AlignmentType.RIGHT})] }),
  new TableRow({ children: [C("Sem nutricionista vinculado"), C(String(semNutri.length), {align:AlignmentType.RIGHT})] }),
  new TableRow({ children: [C("Emails de teste/QA"), C(String(testEmails.length), {align:AlignmentType.RIGHT})] }),
  new TableRow({ children: [C("Nutricionistas distintos"), C(String(nutriSorted.length), {align:AlignmentType.RIGHT})] }),
];
nutriSorted.forEach(([email,count]) => { resumoRows.push(new TableRow({ children: [C(email), C(String(count), {align:AlignmentType.RIGHT})] })); });
const resumoTable = new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[3600,5760], rows: resumoRows });

const semRows = [new TableRow({ children: [H("Legacy ID",2700), H("Email",3300), H("Nome",3360)] })];
semNutri.forEach(r => { semRows.push(new TableRow({ children: [C(r.legacy_id, {w:2700}), C(r.email, {w:3300}), C(r.full_name, {w:3360})] })); });
const semTable = new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[2700,3300,3360], rows: semRows });

const testRows = [new TableRow({ children: [H("Email",4000), H("Nome",5360)] })];
testEmails.forEach(r => { testRows.push(new TableRow({ children: [C(r.email, {w:4000}), C(r.full_name, {w:5360})] })); });
const testTable = new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[4000,5360], rows: testRows });

const fullRows = [new TableRow({ children: [H("#",360), H("Legacy ID",1800), H("Email",2800), H("Nome",2200), H("Nutricionista",2200)] })];
rows.forEach((r,i) => { fullRows.push(new TableRow({ children: [C(String(i+1), {w:360,align:AlignmentType.CENTER}), C(r.legacy_id, {w:1800}), C(r.email, {w:2800}), C(r.full_name, {w:2200}), C(r.nutritionist_email||"—", {w:2200})] })); });
const fullTable = new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[360,1800,2800,2200,2200], rows: fullRows });

const children = [];
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: "MIGRAÇÃO DE PACIENTES — FJ1.0 → FJ2.0", bold: true, size: 32, font: "Arial" })] }));
children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "Relatório de exportação de pacientes do FitJourney 1.0 para importação no FitJourney 2.0.", size: 22, font: "Arial" })] }));
children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: `Gerado em: ${new Date().toISOString().split('T')[0]}`, size: 20, font: "Arial", color: "666666" })] }));
children.push(new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: "1. RESUMO EXECUTIVO", bold: true, size: 26, font: "Arial" })] }));
children.push(resumoTable);
children.push(new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: "2. PACIENTES SEM NUTRICIONISTA VINCULADO", bold: true, size: 26, font: "Arial" })] }));
children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: `${semNutri.length} pacientes sem nutricionista. O agente do FJ2.0 deve decidir: pular ou exigir vínculo manual antes da migração.`, size: 20, font: "Arial", italics: true })] }));
children.push(semTable);
children.push(new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: "3. EMAILS DE TESTE / QA", bold: true, size: 26, font: "Arial" })] }));
children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: `${testEmails.length} pacientes de teste. Recomendado: filtrar antes da migração para não criar usuários fantasmas no FJ2.0.`, size: 20, font: "Arial", italics: true })] }));
children.push(testTable);
children.push(new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: "4. LISTA COMPLETA DE PACIENTES", bold: true, size: 26, font: "Arial" })] }));
children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: `${total} pacientes. Use legacy_id como source_legacy_id no FJ2.0.`, size: 20, font: "Arial", italics: true })] }));
children.push(fullTable);
children.push(new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: "5. INSTRUÇÕES PARA O AGENTE DO FJ2.0", bold: true, size: 26, font: "Arial" })] }));
const inst = [
  "Usar legacy_id como source_legacy_id no FJ2.0 (garante idempotência).",
  "Mapear nutritionist_email para o ID do nutricionista correspondente no FJ2.0.",
  "Criar auth.users com senha aleatória descartada e app_metadata.needs_password_change=true.",
  "Inserir patient_consents com consent_type='legacy_migration_v1' e consent_version='fj1.0'.",
  "Gerar recovery link por paciente (validade 24h) e entregar em CSV para envio posterior.",
  "NÃO migrar: birth_date, telefone, sexo, status, planos, anamneses, check-ins — paciente refaz anamnese V2.",
  "Nutricionista wylkem.nutri.ufpa@gmail.com concentra 279 pacientes — confirmar existência no FJ2.0 antes de rodar."
];
inst.forEach((txt, i) => { children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: `${i + 1}. ${txt}`, size: 20, font: "Arial" })] })); });

const doc = new Document({ styles: { default: { document: { run: { font: "Arial", size: 22 } } } }, sections: [{ properties: { page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } }, children }] });

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/mnt/documents/FJ1_Pacientes_Migracao.docx', buffer);
  console.log('OK: /mnt/documents/FJ1_Pacientes_Migracao.docx');
}).catch(err => { console.error('Erro:', err); process.exit(1); });
