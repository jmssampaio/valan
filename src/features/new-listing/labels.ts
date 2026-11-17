import type { ChoiceOption } from '@/components/segmented-control';
import { t } from '@/i18n';
import type { MarketplaceReach } from './draft';

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

export type Carrier = 'vinyl' | 'cd' | 'cassette' | 'unknown';

// Matched against the first part of the catalogue's format ("2×LP" in "2×LP, Album").
const carrierPatterns: readonly [Carrier, RegExp][] = [
  ['cd', /cd/i],
  ['cassette', /cass/i],
  ['vinyl', /lp|vinyl|\d+"|\bep\b|single|flexi|shellac/i],
];

export function carrierOf(format: string | null): Carrier {
  const main = format?.split(',')[0] ?? '';
  return carrierPatterns.find(([, pattern]) => pattern.test(main))?.[0] ?? 'unknown';
}

/**
 * A record can be vinyl, a CD or a cassette, so the condition of the medium is named
 * after what the catalogue says it is; without that, it is just "the medium".
 */
export function mediaConditionLabel(format: string | null): string {
  return t(`newListing.condition.media.${carrierOf(format)}`);
}

const NAME_SEPARATOR = ', ';

function namesOf(reach: readonly MarketplaceReach[]): string {
  return reach.map(({ marketplace }) => marketplace.name).join(NAME_SEPARATOR);
}

/** The marketplaces the listing reaches, in the order the app lists them. */
export function reachedNames(reach: readonly MarketplaceReach[]): string[] {
  return reach.filter(({ available }) => available).map(({ marketplace }) => marketplace.name);
}

export type ReachNotice = {
  tag: string;
  title: string;
  body: string;
};

/**
 * What to tell the seller when some marketplace is left out: which, why, and where the
 * listing still goes. Null when it reaches them all. The names come from the marketplaces
 * themselves, so the words follow whatever marketplaces the app supports.
 *
 * `why` is how the listing came to be without a catalogue edition, or 'linked' when it has one.
 */
export function reachNotice(
  reach: readonly MarketplaceReach[],
  why: 'linked' | 'declined' | 'none' | 'failed',
): ReachNotice | null {
  const excluded = reach.filter(({ available }) => !available);
  if (excluded.length === 0) return null;

  const reached = reachedNames(reach);
  const names = reached.join(NAME_SEPARATOR);
  const excludedNames = namesOf(excluded);

  const tag =
    reached.length === 1
      ? t('newListing.reach.only', { name: names })
      : t('newListing.reach.without', { names: excludedNames });

  return { tag, title: t('newListing.reach.title', { names: excludedNames }), body: body() };

  function body(): string {
    if (reached.length === 0) return [...reasons(), t('newListing.reach.nowhere')].join(' ');
    // The search may work on another try, so the seller is told that before the reasons.
    if (why === 'failed') return t('newListing.reach.failed', { names, excluded: excludedNames });

    const goes = t(why === 'linked' ? 'newListing.reach.goes.linked' : 'newListing.reach.goes', {
      names,
    });
    return [...reasons(), goes].join(' ');
  }

  function reasons(): string[] {
    return excluded.flatMap(({ marketplace, reason }) =>
      reason === null ? [] : [t(`newListing.reach.reason.${reason}`, { name: marketplace.name })],
    );
  }
}
