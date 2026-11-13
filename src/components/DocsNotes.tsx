import { prisma } from "@/lib/db";
import { listValues } from "@/lib/lookups";
import { NOTE_TYPES } from "@/lib/constants";
import { date } from "@/lib/format";
import { addNote, deleteDocument, deleteNote, uploadDocuments, type Target } from "@/app/(app)/shared-actions";
import { ActionForm, Submit } from "./client";
import { Card, Empty } from "./ui";

export async function Documents({ target }: { target: Target }) {
  const [docs, folders] = await Promise.all([
    prisma.document.findMany({ where: target, orderBy: [{ folder: "asc" }, { createdAt: "desc" }], include: { uploadedBy: true } }),
    listValues("DOC_FOLDER"),
  ]);
  return (
    <Card title={`Documents (${docs.length})`}>
      {docs.length === 0 ? (
        <Empty>No documents yet.</Empty>
      ) : (
        <ul className="mb-3 divide-y divide-slate-100 text-sm">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 py-1.5">
              <div className="min-w-0">
                <a className="link block truncate" href={d.storageKey ? `/api/files/${d.id}` : d.externalUrl ?? "#"} target="_blank" rel="noreferrer">{d.fileName}</a>
                <div className="text-xs text-slate-500">{d.folder} · {date(d.createdAt)}{d.uploadedBy ? ` · ${d.uploadedBy.initials}` : ""}{d.size ? ` · ${Math.ceil(d.size / 1024)} KB` : ""}</div>
              </div>
              <form action={deleteDocument.bind(null, d.id)}>
                <Submit className="btn-danger btn-sm" pendingText="…" confirm={`Delete ${d.fileName}?`}>Delete</Submit>
              </form>
            </li>
          ))}
        </ul>
      )}
      <ActionForm action={uploadDocuments.bind(null, target)} className="grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2" resetOnSuccess>
        <div>
          <label className="label">Folder</label>
          <select name="folder" className="input" required defaultValue={folders[0]}>
            {folders.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Files</label>
          <input type="file" name="files" multiple className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">…or a link (Google Drive, etc.)</label>
          <input name="externalUrl" type="url" className="input" placeholder="https://drive.google.com/…" />
        </div>
        <div className="sm:col-span-2"><Submit pendingText="Uploading…">Upload</Submit></div>
      </ActionForm>
    </Card>
  );
}

export async function Notes({ target, contacts }: { target: Target; contacts?: { value: string; label: string }[] }) {
  const notes = await prisma.note.findMany({ where: target, orderBy: [{ date: "desc" }, { createdAt: "desc" }], include: { user: true, contact: true } });
  return (
    <Card title={`Notes & activity (${notes.length})`}>
      <ActionForm action={addNote.bind(null, target)} className="mb-3 grid gap-2 sm:grid-cols-3" resetOnSuccess>
        <div>
          <label className="label">Type</label>
          <select name="type" className="input">{NOTE_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" name="date" className="input" defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
        {contacts && contacts.length > 0 ? (
          <div>
            <label className="label">Contact</label>
            <select name="contactId" className="input"><option value="">—</option>{contacts.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
          </div>
        ) : <div />}
        <div className="sm:col-span-3">
          <textarea name="body" className="input" rows={2} placeholder="Call notes, client feedback, next steps…" required />
        </div>
        <div className="sm:col-span-3"><Submit>Add note</Submit></div>
      </ActionForm>
      {notes.length === 0 ? (
        <Empty>No notes yet.</Empty>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {notes.map((n) => (
            <li key={n.id} className="py-2">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                <span>{date(n.date)} · {n.type}{n.contact ? ` · ${n.contact.firstName} ${n.contact.lastName}` : ""}{n.user ? ` · ${n.user.initials}` : ""}</span>
                <form action={deleteNote.bind(null, n.id)}><Submit className="text-xs text-slate-400 hover:text-red-600" pendingText="…" confirm="Delete this note?">Delete</Submit></form>
              </div>
              <p className="whitespace-pre-wrap">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
