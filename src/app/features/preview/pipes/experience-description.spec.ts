import { ExperienceDescription } from './experience-description';

describe('Experience description', () => {
  const pipe = new ExperienceDescription();

  it('preserves intentional internal blank paragraphs and formatted content', () => {
    const html = '<p>First</p><p><br></p><p><strong>Last</strong></p>';
    expect(pipe.transform(html + '<p><br></p><p>&nbsp;</p>')).toBe(html);
  });

  it('preserves a trailing paragraph containing an image', () => {
    const html = '<p>First</p><p><img src="example.png"></p>';
    expect(pipe.transform(html)).toBe(html);
  });
});
