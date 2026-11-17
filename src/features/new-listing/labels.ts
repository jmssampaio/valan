import type { ChoiceOption } from '@/components/segmented-control';
import { t } from '@/i18n';
import type { CatalogueRelease } from '@/services/catalogue';
import type { Enums } from '@/types/database';

type RecordGrade = Enums<'record_condition'>;
type EquipmentCondition = Enums<'equipment_condition'>;

const DETAIL_SEPARATOR = ' · ';

/** The second line of a catalogue result: what tells one edition of a record from another. */
export function releaseDetail(release: CatalogueRelease): string {
  return [release.artist, release.format, release.year, release.country]
    .filter((part) => part !== null)
    .join(DETAIL_SEPARATOR);
}

/** "Onda Discos – OD 1042", or whichever of the two the catalogue has. */
export function releaseLabel({ label, catalogueNumber }: CatalogueRelease): string | null {
  if (label && catalogueNumber) return t('newListing.release.label', { label, catalogueNumber });
  return label ?? catalogueNumber;
}

// The Goldmine scale, best to worst. The codes are the same in every language.
const grades: readonly RecordGrade[] = ['M', 'NM', 'VG+', 'VG', 'G+', 'G', 'F', 'P'];

export const gradeOptions: readonly ChoiceOption<RecordGrade>[] = grades.map((grade) => ({
  value: grade,
  label: grade,
}));

export function gradeDetail(grade: RecordGrade): string {
  return t(`newListing.grade.${grade}`);
}

// Valan's own scale, best to worst.
const equipmentConditions: readonly EquipmentCondition[] = [
  'new',
  'like_new',
  'good',
  'fair',
  'for_parts',
];

export function equipmentConditionOptions(): ChoiceOption<EquipmentCondition>[] {
  return equipmentConditions.map((condition) => ({
    value: condition,
    label: t(`newListing.equipmentCondition.${condition}`),
  }));
}

export function equipmentConditionDetail(condition: EquipmentCondition): string {
  return t(`newListing.equipmentCondition.${condition}.detail`);
}

const STEPS = 4;

/** What the header of each step shows and says about how far along the flow is. */
export function stepHeader(step: number) {
  return {
    step,
    steps: STEPS,
    stepLabel: t('newListing.stepShort', { step, steps: STEPS }),
    stepAccessibilityLabel: t('newListing.step', { step, steps: STEPS }),
  };
}
