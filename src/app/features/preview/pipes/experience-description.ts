import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'experienceDescription' })
export class ExperienceDescription implements PipeTransform {
  transform(html: string): string {
    const document = new DOMParser().parseFromString(html, 'text/html');
    let last = document.body.lastElementChild;
    while (last?.matches('p') && !last.textContent?.trim() &&
      !last.querySelector('img, svg, video, audio, iframe, object, embed, hr')) {
      last.remove();
      last = document.body.lastElementChild;
    }
    return document.body.innerHTML;
  }
}
