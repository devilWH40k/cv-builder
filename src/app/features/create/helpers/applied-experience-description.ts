import { CvExperience } from '../../cv/interfaces/experience';

export function appliedExperienceDescription(
  experience: Pick<CvExperience, 'description' | 'responsibilities'>
): string {
  const responsibilities = experience.responsibilities?.trim();
  if (!responsibilities) return experience.description;

  const content = document.createElement('div');

  for (const line of responsibilities.split(/\r\n|\r|\n/)) {
    const paragraph = document.createElement('p');
    paragraph.textContent = line;
    content.append(paragraph);
  }

  const responsibilitiesHtml = content.innerHTML;
  return experience.description.trimEnd().endsWith(responsibilitiesHtml)
    ? experience.description
    : experience.description + responsibilitiesHtml;
}
