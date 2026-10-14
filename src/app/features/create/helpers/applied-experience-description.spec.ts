import { appliedExperienceDescription } from './applied-experience-description';

describe('Applied experience description', () => {
  it('retains rich text and appends multiline responsibilities as escaped paragraphs', () => {
    const description = '<p>A <strong>CRM</strong> project.</p>';
    const responsibilities = 'Build forms & dashboards.\r\nIntegrate <internal> APIs.\n\nAdd tests.';
    expect(appliedExperienceDescription({ description, responsibilities }))
      .toBe(description + '<p>Build forms &amp; dashboards.</p><p>Integrate &lt;internal&gt; APIs.</p><p></p><p>Add tests.</p>');
  });

  it('preserves the description when responsibilities are absent or blank', () => {
    const description = '<p>Project description</p>';
    expect(appliedExperienceDescription({ description })).toBe(description);
    expect(appliedExperienceDescription({ description, responsibilities: ' \r\n ' })).toBe(description);
  });

  it('uses responsibilities as the description when the project description is empty', () => {
    expect(appliedExperienceDescription({ description: '', responsibilities: 'Develop the frontend.' }))
      .toBe('<p>Develop the frontend.</p>');
  });

  it('does not duplicate responsibilities when an already combined experience is applied again', () => {
    const experience = { description: '<p>Project</p>', responsibilities: 'Build UI.\nAdd tests.' };
    const description = appliedExperienceDescription(experience);
    expect(appliedExperienceDescription({ ...experience, description })).toBe(description);
  });
});
