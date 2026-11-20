import { AppText } from './app-text';

export type SectionLabelProps = {
  children: string;
};

/** Names the section below it. A heading, so screen readers can jump from section to section. */
export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <AppText variant="label" color="muted" accessibilityRole="header">
      {children}
    </AppText>
  );
}
