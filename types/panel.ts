export type Panel = {
  id: string;
  name: string;
  description: string | null;
  requiredInterviewers: number;
  createdAt: string;
  updatedAt: string;
  members: { id: string; name: string; email: string }[];
};

export function mapPanel(row: Record<string, unknown>, members: Panel["members"] = []): Panel {
  return { id: String(row.id), name: String(row.name), description: typeof row.description === "string" ? row.description : null, requiredInterviewers: Number(row.required_interviewers), createdAt: String(row.created_at), updatedAt: String(row.updated_at), members };
}
