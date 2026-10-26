import { redirect } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { can } from "@/domain/permissions";
import { getT } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { listAudit } from "@/server/services/audit";
import { getStore } from "@/server/store/memory-store";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";

export const metadata = { title: "Administrasi" };

export default async function AdminPage() {
  const user = await requireUser();
  if (!can(user, "administration")) redirect("/");
  const { t, locale } = await getT();
  const profiles = getStore().profiles;
  const audit = listAudit(30);
  const en = locale === "en";

  const matrix: [string, string][] = en
    ? [
        [t.classification.general_internal, "All active users"],
        [t.classification.department_restricted, "Same department, President Director, General Manager"],
        [t.classification.confidential, "Head of the owning department, President Director"],
        [t.classification.highly_confidential, "Explicit grant only"],
        ["All classes", "Contributor, owner and assigned reviewer of the item"],
      ]
    : [
        [t.classification.general_internal, "Semua pengguna aktif"],
        [t.classification.department_restricted, "Departemen yang sama, Presiden Direktur, General Manager"],
        [t.classification.confidential, "Kepala departemen pemilik, Presiden Direktur"],
        [t.classification.highly_confidential, "Hanya dengan grant eksplisit"],
        ["Semua kelas", "Kontributor, pemilik, dan reviewer yang ditugaskan"],
      ];

  const approval: [string, string][] = en
    ? [
        [t.action.verify, "Reviewer, head of the owning department, or top management. Never the contributor."],
        [`${t.action.approve_official} (${t.type.technical_standard})`, "Head of the owning department or top management"],
        [
          `${t.action.approve_official} (${t.type.approved_policy}, ${t.type.management_directive})`,
          "President Director or General Manager",
        ],
        [`${t.type.personal_experience}, ${t.type.historical_record}`, "Can be verified, never official"],
        ["AI", "Can never change status"],
      ]
    : [
        [t.action.verify, "Reviewer, kepala departemen pemilik, atau manajemen puncak. Tidak boleh kontributor sendiri."],
        [`${t.action.approve_official} (${t.type.technical_standard})`, "Kepala departemen pemilik atau manajemen puncak"],
        [
          `${t.action.approve_official} (${t.type.approved_policy}, ${t.type.management_directive})`,
          "Presiden Direktur atau General Manager",
        ],
        [`${t.type.personal_experience}, ${t.type.historical_record}`, "Bisa diverifikasi, tidak pernah menjadi resmi"],
        ["AI", "Tidak pernah bisa mengubah status"],
      ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t.admin.title} />
      <p className="flex gap-2 rounded-lg border border-warn/25 bg-warn-tint px-4 py-3 text-sm text-warn">
        <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
        {t.admin.draftBanner}
      </p>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <SectionTitle>{t.admin.matrix}</SectionTitle>
          <Table rows={matrix} />
        </section>
        <section>
          <SectionTitle>{t.admin.approval}</SectionTitle>
          <Table rows={approval} />
        </section>
      </div>

      <section>
        <SectionTitle>{t.admin.users}</SectionTitle>
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-2xs text-ink-3">
              <tr>
                <th className="px-4 py-2 font-medium">Nama</th>
                <th className="px-4 py-2 font-medium">{t.admin.department}</th>
                <th className="px-4 py-2 font-medium">{t.admin.role}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2">
                    <span className="block text-ink">{p.name}</span>
                    <span className="block text-2xs text-ink-3">{p.title}</span>
                  </td>
                  <td className="px-4 py-2 text-ink-2">{t.department[p.departmentId]}</td>
                  <td className="px-4 py-2 text-ink-2">{p.roles.map((r) => t.role[r]).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionTitle>{t.admin.audit}</SectionTitle>
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-line">
              {audit.map((a) => (
                <tr key={a.id}>
                  <td className="tabular px-4 py-1.5 whitespace-nowrap text-ink-3">{a.at.slice(0, 19).replace("T", " ")}</td>
                  <td className="px-4 py-1.5 text-ink-2">{a.actorId ?? "system"}</td>
                  <td className="px-4 py-1.5 font-mono text-ink">{a.action}</td>
                  <td className="px-4 py-1.5 text-ink-2">{a.targetId ?? ""}</td>
                  <td className={`px-4 py-1.5 ${a.outcome === "denied" ? "font-semibold text-shu" : "text-ink-3"}`}>{a.outcome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Table({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="card divide-y divide-line">
      {rows.map(([k, v]) => (
        <div key={k} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[12rem_1fr] sm:gap-4">
          <dt className="text-xs font-medium text-ink">{k}</dt>
          <dd className="text-xs text-ink-2">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
