
export class Reply {
  constructor(
    public readonly id: string,
    public readonly content: string,
    public readonly userId: string,
    public readonly postId: string,
    public readonly likes: number,
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
