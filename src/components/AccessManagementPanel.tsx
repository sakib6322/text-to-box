import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Shield, Trash2, UserPlus } from "lucide-react";
import {
  createAccessUser,
  deleteAccessUser,
  fetchAccessUsers,
  fetchPermissionGroups,
  updateAccessUser,
  type AccessUser,
} from "@/lib/accessUsers";
import { ALL_PERMISSION_KEYS, PERMISSION_GROUPS, type PermissionGroup } from "@/lib/permissions";

function PermissionCheckboxGrid({
  groups,
  selected,
  onChange,
}: {
  groups: PermissionGroup[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const toggle = (key: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(key);
    else next.delete(key);
    onChange(next);
  };

  const toggleGroup = (group: PermissionGroup, checked: boolean) => {
    const next = new Set(selected);
    for (const p of group.permissions) {
      if (checked) next.add(p.key);
      else next.delete(p.key);
    }
    onChange(next);
  };

  return (
    <ScrollArea className="h-[min(420px,50vh)] rounded-md border p-3">
      <div className="space-y-4 pr-2">
        {groups.map((group) => {
          const keys = group.permissions.map((p) => p.key);
          const allOn = keys.every((k) => selected.has(k));
          const someOn = keys.some((k) => selected.has(k));
          return (
            <div key={group.id} className="rounded-lg border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`grp-${group.id}`}
                  checked={allOn ? true : someOn ? "indeterminate" : false}
                  onCheckedChange={(v) => toggleGroup(group, v === true)}
                />
                <Label htmlFor={`grp-${group.id}`} className="text-sm font-semibold cursor-pointer">
                  {group.label}
                </Label>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 pl-6">
                {group.permissions.map((p) => (
                  <div key={p.key} className="flex items-center gap-2">
                    <Checkbox
                      id={p.key}
                      checked={selected.has(p.key)}
                      onCheckedChange={(v) => toggle(p.key, v === true)}
                    />
                    <Label htmlFor={p.key} className="text-xs font-normal cursor-pointer leading-tight">
                      {p.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

type FormState = {
  email: string;
  password: string;
  displayName: string;
  permissions: Set<string>;
};

const emptyForm = (): FormState => ({
  email: "",
  password: "",
  displayName: "",
  permissions: new Set(),
});

export function AccessManagementPanel() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [groups, setGroups] = useState<PermissionGroup[]>(PERMISSION_GROUPS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AccessUser | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AccessUser | null>(null);

  const staffUsers = useMemo(() => users.filter((u) => u.role === "staff"), [users]);
  const adminUsers = useMemo(() => users.filter((u) => u.role === "admin"), [users]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, groupsRes] = await Promise.all([fetchAccessUsers(), fetchPermissionGroups()]);
      setUsers(usersRes.users ?? []);
      setGroups(groupsRes.groups ?? PERMISSION_GROUPS);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load access users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (user: AccessUser) => {
    setEditing(user);
    setForm({
      email: user.email,
      password: "",
      displayName: user.display_name ?? "",
      permissions: new Set(user.permissions.filter((k) => ALL_PERMISSION_KEYS.includes(k))),
    });
    setDialogOpen(true);
  };

  const save = async () => {
    const email = form.email.trim();
    if (!email) return toast.error("Gmail / email required");
    const permissions = [...form.permissions];
    if (permissions.length === 0) return toast.error("Select at least one permission");

    setSaving(true);
    try {
      if (editing) {
        await updateAccessUser(editing.id, {
          email,
          permissions,
          displayName: form.displayName.trim() || undefined,
          password: form.password.trim() || undefined,
        });
        toast.success("Access updated — staff can sign in via Login → Admin tab");
      } else {
        if (!form.password.trim()) {
          toast.error("Password required");
          return;
        }
        await createAccessUser({
          email,
          password: form.password,
          permissions,
          displayName: form.displayName.trim() || undefined,
        });
        toast.success("Account created — sign in with this email & password on Login → Admin tab");
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAccessUser(deleteTarget.id);
      toast.success("Account removed");
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading access settings…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Access control
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              Add staff accounts with Gmail and password. Tick only the pages and actions they may use. Staff log in
              via the <strong>Admin</strong> tab on the login page.
            </p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            Add access
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Staff accounts</h3>
        {staffUsers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No staff accounts yet. Click Add access to create one.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs">{u.email}</TableCell>
                  <TableCell className="text-xs">{u.display_name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{u.permissions.length} enabled</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDeleteTarget(u)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {adminUsers.length > 0 ? (
        <Card className="p-4 space-y-2 border-dashed">
          <h3 className="text-sm font-semibold text-muted-foreground">Full administrators</h3>
          <ul className="text-xs space-y-1">
            {adminUsers.map((u) => (
              <li key={u.id} className="font-mono">
                {u.email} <Badge variant="outline" className="ml-1">all access</Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit access" : "Add access"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Gmail / Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="user@gmail.com"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Password {editing ? "(leave blank to keep)" : ""}</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Display name (optional)</Label>
                <Input
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  className="text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-semibold">Page & action permissions</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setForm((f) => ({ ...f, permissions: new Set(ALL_PERMISSION_KEYS) }))}
                  >
                    Select all
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setForm((f) => ({ ...f, permissions: new Set() }))}
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <PermissionCheckboxGrid
                groups={groups.filter((g) => g.id !== "settings_access")}
                selected={form.permissions}
                onChange={(permissions) => setForm((f) => ({ ...f, permissions }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              {editing ? "Save changes" : "Create account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove access account?"
        description={
          deleteTarget ? `Delete ${deleteTarget.email}? They will no longer be able to sign in.` : undefined
        }
        onConfirm={confirmDelete}
      />
    </div>
  );
}
