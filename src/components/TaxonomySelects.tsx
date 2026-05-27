import { useCallback, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { emptyTaxonomySelection, fetchTaxonomy, type TaxonomyItem, type TaxonomySelection } from "@/lib/taxonomy";

type Props = {
  value: TaxonomySelection;
  onChange: (next: TaxonomySelection) => void;
  required?: boolean;
  disabled?: boolean;
};

export function TaxonomySelects({ value, onChange, required, disabled }: Props) {
  const [subjects, setSubjects] = useState<TaxonomyItem[]>([]);
  const [systems, setSystems] = useState<TaxonomyItem[]>([]);
  const [chapters, setChapters] = useState<TaxonomyItem[]>([]);
  const [topics, setTopics] = useState<TaxonomyItem[]>([]);

  useEffect(() => {
    fetchTaxonomy("subjects")
      .then(setSubjects)
      .catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    if (!value.subjectId) {
      setSystems([]);
      return;
    }
    fetchTaxonomy("systems", value.subjectId)
      .then(setSystems)
      .catch(() => setSystems([]));
  }, [value.subjectId]);

  useEffect(() => {
    if (!value.systemId) {
      setChapters([]);
      return;
    }
    fetchTaxonomy("chapters", value.systemId)
      .then(setChapters)
      .catch(() => setChapters([]));
  }, [value.systemId]);

  useEffect(() => {
    if (!value.chapterId) {
      setTopics([]);
      return;
    }
    fetchTaxonomy("topics", value.chapterId)
      .then(setTopics)
      .catch(() => setTopics([]));
  }, [value.chapterId]);

  const pick = useCallback(
    (patch: Partial<TaxonomySelection>) => onChange({ ...value, ...patch }),
    [onChange, value],
  );

  const req = required ? " *" : "";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2">
        <Label>Subject{req}</Label>
        <Select
          value={value.subjectId || undefined}
          onValueChange={(id) => {
            const name = subjects.find((s) => s.id === id)?.name ?? "";
            onChange({ ...emptyTaxonomySelection(), subjectId: id, subjectName: name });
          }}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>System{req}</Label>
        <Select
          value={value.systemId || undefined}
          onValueChange={(id) => {
            const name = systems.find((s) => s.id === id)?.name ?? "";
            pick({
              systemId: id,
              systemName: name,
              chapterId: "",
              chapterName: "",
              topicId: "",
              topicName: "",
            });
          }}
          disabled={disabled || !value.subjectId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select system" />
          </SelectTrigger>
          <SelectContent>
            {systems.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Chapter{req}</Label>
        <Select
          value={value.chapterId || undefined}
          onValueChange={(id) => {
            const name = chapters.find((c) => c.id === id)?.name ?? "";
            pick({ chapterId: id, chapterName: name, topicId: "", topicName: "" });
          }}
          disabled={disabled || !value.systemId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select chapter" />
          </SelectTrigger>
          <SelectContent>
            {chapters.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Topic{req}</Label>
        <Select
          value={value.topicId || undefined}
          onValueChange={(id) => {
            const name = topics.find((t) => t.id === id)?.name ?? "";
            pick({ topicId: id, topicName: name });
          }}
          disabled={disabled || !value.chapterId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select topic" />
          </SelectTrigger>
          <SelectContent>
            {topics.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
