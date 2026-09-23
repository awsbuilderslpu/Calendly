import { createDatabaseAdmin } from "@/lib/db/admin";

export async function listScorecards() {
  const database = createDatabaseAdmin();
  const { data, error } = await database
    .from("scorecard_templates")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function getScorecard(id: string) {
  const database = createDatabaseAdmin();
  const { data: template, error } = await database
    .from("scorecard_templates")
    .select("*")
    .eq("id", id)
    .single();
  
  if (error || !template) return null;

  const { data: sections } = await database
    .from("scorecard_sections")
    .select("*, scorecard_questions(*)")
    .eq("template_id", id)
    .order("sort_order", { ascending: true });

  const formattedSections = (sections || []).map(section => ({
    ...section,
    questions: (section.scorecard_questions || []).sort((a: any /* eslint-disable-line @typescript-eslint/no-explicit-any */, b: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => a.sort_order - b.sort_order)
  }));

  return { ...template, sections: formattedSections };
}

export async function createScorecard(data: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
  const database = createDatabaseAdmin();
  
  const { data: template, error } = await database
    .from("scorecard_templates")
    .insert({
      name: data.name,
      description: data.description,
      job_role: data.jobRole,
      version: 1,
      is_active: true
    })
    .select()
    .single();

  if (error || !template) throw new Error("Failed to create template");

  if (data.sections && data.sections.length > 0) {
    for (let i = 0; i < data.sections.length; i++) {
      const section = data.sections[i];
      const { data: createdSection } = await database
        .from("scorecard_sections")
        .insert({
          template_id: template.id,
          name: section.name,
          description: section.description,
          sort_order: i
        })
        .select()
        .single();
        
      if (createdSection && section.questions) {
        const questionsToInsert = section.questions.map((q: any /* eslint-disable-line @typescript-eslint/no-explicit-any */, qIdx: number) => ({
          section_id: createdSection.id,
          question: q.question,
          description: q.description,
          response_type: q.responseType,
          required: q.required ?? true,
          sort_order: qIdx
        }));
        if (questionsToInsert.length > 0) {
          await database.from("scorecard_questions").insert(questionsToInsert);
        }
      }
    }
  }

  return getScorecard(template.id);
}
