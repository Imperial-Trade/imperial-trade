
export class ForumPost {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly content: string,
    public readonly userId: string,
    public readonly category: 'discussion' | 'question' | 'analysis' | 'news' | 'strategy',
    public readonly tags: string[],
    public readonly likes: number,
    public readonly repliesCount: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  public canBeEditedBy(userId: string): boolean {
    return this.userId === userId;
  }

  public canBeDeletedBy(userId: string): boolean {
    return this.userId === userId;
  }
}
