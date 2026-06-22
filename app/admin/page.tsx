import { redirect } from "next/navigation";

import { AdminDashboard, type AdminWorkspace } from "@/components/admin-dashboard";
import { adminAuthenticated } from "@/lib/admin-auth";
import { query } from "@/lib/database";

export default async function AdminPage() {
  if (!(await adminAuthenticated())) redirect("/admin/login");
  const workspaces = await query<AdminWorkspace>(`SELECT o.id, o.name, o.slug, o.credits_remaining, o.created_at, COALESCE((SELECT u.email FROM users u JOIN memberships m ON m.user_id = u.id WHERE m.organization_id = o.id ORDER BY m.created_at ASC LIMIT 1), '') AS owner_email, COALESCE((SELECT u.name FROM users u JOIN memberships m ON m.user_id = u.id WHERE m.organization_id = o.id ORDER BY m.created_at ASC LIMIT 1), '') AS owner_name, (SELECT COUNT(*) FROM sites WHERE sites.organization_id = o.id) AS site_count, (SELECT COUNT(*) FROM scans WHERE scans.organization_id = o.id) AS scan_count FROM organizations o ORDER BY o.created_at DESC LIMIT 250`);
  return <AdminDashboard workspaces={workspaces.map((workspace) => ({ ...workspace, credits_remaining: Number(workspace.credits_remaining), site_count: Number(workspace.site_count), scan_count: Number(workspace.scan_count) }))} />;
}
