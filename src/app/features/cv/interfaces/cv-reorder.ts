export interface CvReorder {
  readonly cvId: string;
  readonly targetId: string;
  readonly position: 'before' | 'after';
}
