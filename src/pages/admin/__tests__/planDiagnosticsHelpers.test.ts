/**
 * Testes unitários dos helpers do painel /admin/plan-loading-diagnostics
 * e da nova coluna `PlanStatusKnown` no CSV de auditoria.
 *
 * Cobertura:
 *  • buildTrend monta 7d / 30d com contagens corretas para
 *    PLAN_STATUS_UNKNOWN e PLAN_VISIBILITY_DROP, respeitando o range.
 *  • aggregateUnknownByWorkspace soma corretamente por
 *    (plan_status × workspace), excluindo null/"" e itens do catálogo.
 *  • buildAuditCsv inclui a coluna PlanStatusKnown classificando como
 *    "conhecido" / "desconhecido" / "ausente".
 */
import { describe, it, expect } from "vitest";
import {
  buildTrend,
  aggregateUnknownByWorkspace,
  summarizeTrend,
} from "../planDiagnosticsHelpers";
import { buildAuditCsv } from "@/lib/auditExportUtils";

const FIXED_NOW = new Date("2026-04-24T12:00:00Z");

describe("planDiagnosticsHelpers — buildTrend", () => {
  it("constrói 7 buckets ordenados e contabiliza PLAN_STATUS_UNKNOWN / PLAN_VISIBILITY_DROP", () => {
    const rows = [
      // hoje (2026-04-24)
      { alert_type: "PLAN_STATUS_UNKNOWN", created_at: "2026-04-24T08:00:00Z" },
      { alert_type: "PLAN_STATUS_UNKNOWN", created_at: "2026-04-24T09:00:00Z" },
      { alert_type: "PLAN_VISIBILITY_DROP", created_at: "2026-04-24T11:00:00Z" },
      // ontem
      { alert_type: "PLAN_VISIBILITY_DROP", created_at: "2026-04-23T07:00:00Z" },
      // 5 dias atrás
      { alert_type: "PLAN_STATUS_UNKNOWN", created_at: "2026-04-19T07:00:00Z" },
      // fora do range (8 dias)
      { alert_type: "PLAN_STATUS_UNKNOWN", created_at: "2026-04-16T07:00:00Z" },
      // tipo não rastreado — deve ser ignorado
      { alert_type: "OTHER_ALERT", created_at: "2026-04-24T10:00:00Z" },
    ];

    const buckets = buildTrend(rows, 7, FIXED_NOW);

    expect(buckets).toHaveLength(7);
    // Ordenado do mais antigo para o mais recente
    expect(buckets[0].date).toBe("2026-04-18");
    expect(buckets[6].date).toBe("2026-04-24");

    const today = buckets.find((b) => b.date === "2026-04-24")!;
    expect(today.PLAN_STATUS_UNKNOWN).toBe(2);
    expect(today.PLAN_VISIBILITY_DROP).toBe(1);

    const yesterday = buckets.find((b) => b.date === "2026-04-23")!;
    expect(yesterday.PLAN_STATUS_UNKNOWN).toBe(0);
    expect(yesterday.PLAN_VISIBILITY_DROP).toBe(1);

    const fiveAgo = buckets.find((b) => b.date === "2026-04-19")!;
    expect(fiveAgo.PLAN_STATUS_UNKNOWN).toBe(1);
    expect(fiveAgo.PLAN_VISIBILITY_DROP).toBe(0);

    // Total geral bate com o esperado (3 + 2 = 5 dentro do range)
    const totalUnknown = buckets.reduce((s, b) => s + b.PLAN_STATUS_UNKNOWN, 0);
    const totalDrop = buckets.reduce((s, b) => s + b.PLAN_VISIBILITY_DROP, 0);
    expect(totalUnknown).toBe(3);
    expect(totalDrop).toBe(2);
  });

  it("constrói 30 buckets e zera dias sem ocorrências", () => {
    const rows = [
      { alert_type: "PLAN_STATUS_UNKNOWN", created_at: "2026-04-10T10:00:00Z" },
    ];
    const buckets = buildTrend(rows, 30, FIXED_NOW);
    expect(buckets).toHaveLength(30);
    const day = buckets.find((b) => b.date === "2026-04-10")!;
    expect(day.PLAN_STATUS_UNKNOWN).toBe(1);
    // Outros dias permanecem em 0
    const sumOthers = buckets
      .filter((b) => b.date !== "2026-04-10")
      .reduce((s, b) => s + b.PLAN_STATUS_UNKNOWN + b.PLAN_VISIBILITY_DROP, 0);
    expect(sumOthers).toBe(0);
  });
});

describe("planDiagnosticsHelpers — aggregateUnknownByWorkspace", () => {
  it("soma ocorrências por (status × workspace) e ignora plan_status conhecidos / nulos", () => {
    const rows = [
      // status desconhecido em 2 workspaces distintos
      { plan_status: "totally_new", tenant_id: "tenant-A", nutritionist_id: null, updated_at: "2026-04-24T10:00:00Z" },
      { plan_status: "totally_new", tenant_id: "tenant-A", nutritionist_id: null, updated_at: "2026-04-23T10:00:00Z" },
      { plan_status: "totally_new", tenant_id: "tenant-B", nutritionist_id: null, updated_at: "2026-04-22T10:00:00Z" },
      // outro status desconhecido
      { plan_status: "weird_status_2", tenant_id: null, nutritionist_id: "nutri-1", updated_at: "2026-04-21T10:00:00Z" },
      // status conhecido — deve ser ignorado
      { plan_status: "draft", tenant_id: "tenant-A", nutritionist_id: null, updated_at: "2026-04-24T10:00:00Z" },
      { plan_status: "published_to_patient", tenant_id: "tenant-B", nutritionist_id: null, updated_at: "2026-04-24T10:00:00Z" },
      // null/"" — devem ser ignorados (não inflar bucket "desconhecido")
      { plan_status: null, tenant_id: "tenant-A", nutritionist_id: null, updated_at: "2026-04-24T10:00:00Z" },
      { plan_status: "", tenant_id: "tenant-A", nutritionist_id: null, updated_at: "2026-04-24T10:00:00Z" },
    ];

    const breakdown = aggregateUnknownByWorkspace(rows);

    // 3 combinações distintas
    expect(breakdown).toHaveLength(3);
    const totalNewA = breakdown.find((b) => b.plan_status === "totally_new" && b.workspace_id === "tenant-A")!;
    const totalNewB = breakdown.find((b) => b.plan_status === "totally_new" && b.workspace_id === "tenant-B")!;
    const weird = breakdown.find((b) => b.plan_status === "weird_status_2")!;

    expect(totalNewA.count).toBe(2);
    expect(totalNewA.last_seen).toBe("2026-04-24T10:00:00Z");
    expect(totalNewB.count).toBe(1);
    expect(weird.workspace_id).toBe("nutri-1");
    expect(weird.count).toBe(1);

    // Ordenação por count desc
    expect(breakdown[0].count).toBeGreaterThanOrEqual(breakdown[1].count);
  });

  it("usa '(sem workspace)' quando tenant_id e nutritionist_id estão ausentes", () => {
    const rows = [
      { plan_status: "mystery_x", tenant_id: null, nutritionist_id: null, updated_at: "2026-04-24T10:00:00Z" },
    ];
    const breakdown = aggregateUnknownByWorkspace(rows);
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].workspace_id).toBe("(sem workspace)");
  });

  it("retorna lista vazia quando não há nenhum status realmente desconhecido", () => {
    const rows = [
      { plan_status: "draft", tenant_id: "t1", nutritionist_id: null, updated_at: "2026-04-24T10:00:00Z" },
      { plan_status: null, tenant_id: "t1", nutritionist_id: null, updated_at: "2026-04-24T10:00:00Z" },
      { plan_status: "approved", tenant_id: "t2", nutritionist_id: null, updated_at: "2026-04-24T10:00:00Z" },
    ];
    expect(aggregateUnknownByWorkspace(rows)).toEqual([]);
  });
});

describe("auditExportUtils — buildAuditCsv classifica plan_status no CSV", () => {
  it("inclui as colunas PlanStatus e PlanStatusKnown e classifica corretamente", () => {
    const data = [
      {
        id: "alert-1",
        alert_type: "PLAN_STATUS_UNKNOWN",
        message: "novo status",
        correlation_id: "corr-1",
        created_at: "2026-04-24T10:00:00Z",
        metadata: { patient_id: "pat-1", plan_status: "totally_new_xyz" },
      },
      {
        id: "alert-2",
        alert_type: "PLAN_VISIBILITY_DROP",
        message: "ok",
        correlation_id: "corr-2",
        created_at: "2026-04-23T10:00:00Z",
        metadata: { patient_id: "pat-2", plan_status: "published_to_patient" },
      },
      {
        id: "alert-3",
        alert_type: "DIAGNOSTIC_FAILURE",
        message: "sem status",
        correlation_id: "corr-3",
        created_at: "2026-04-22T10:00:00Z",
        metadata: { patient_id: "pat-3" },
      },
    ];

    const csv = buildAuditCsv(data);
    const [header, ...rows] = csv.split("\n");

    expect(header).toBe(
      "ID,Type,Message,PatientID,CorrelationID,PlanStatus,PlanStatusKnown,CreatedAt",
    );

    expect(rows[0]).toContain("totally_new_xyz");
    expect(rows[0]).toContain("desconhecido");
    expect(rows[1]).toContain("published_to_patient");
    expect(rows[1]).toContain("conhecido");
    // alert sem plan_status → vazio + "ausente"
    expect(rows[2]).toMatch(/,,ausente,/);
  });

  it("escapa valores com vírgula e aspas no CSV (mensagem multi-vírgula)", () => {
    const data = [
      {
        id: "alert-x",
        alert_type: "PLAN_STATUS_UNKNOWN",
        message: 'falha grave, status: "novo"',
        correlation_id: "corr-x",
        created_at: "2026-04-24T10:00:00Z",
        metadata: { patient_id: "pat-x", plan_status: "weird" },
      },
    ];
    const csv = buildAuditCsv(data);
    // Aspas internas dobradas + campo todo entre aspas
    expect(csv).toContain('"falha grave, status: ""novo"""');
  });
});
