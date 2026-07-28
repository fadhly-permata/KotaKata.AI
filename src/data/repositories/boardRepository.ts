import { getDatabase } from "../sources/database";
import type { SavedBoardDoc } from "../models/schemas";

export const boardRepository = {
  async getById(boardId: string): Promise<SavedBoardDoc | null> {
    return (await getDatabase().saved_boards.findOne(boardId).exec()) ?? null;
  },

  async getByUser(userId: string): Promise<SavedBoardDoc[]> {
    return getDatabase()
      .saved_boards.find({
        selector: { user_id: { $eq: userId } },
        sort: [{ updated_at: "desc" }],
      })
      .exec();
  },

  async getInProgress(userId: string): Promise<SavedBoardDoc[]> {
    return getDatabase()
      .saved_boards.find({
        selector: { user_id: { $eq: userId }, is_finished: { $eq: false } },
      })
      .exec();
  },

  async save(board: SavedBoardDoc): Promise<void> {
    await getDatabase().saved_boards.upsert(board);
  },

  async markFinished(boardId: string): Promise<void> {
    const board = await this.getById(boardId);
    if (board) {
      await this.save({
        ...board,
        is_finished: true,
        updated_at: new Date().toISOString(),
      });
    }
  },

  async delete(boardId: string): Promise<void> {
    const doc = await getDatabase().saved_boards.findOne(boardId).exec();
    if (doc) await doc.remove();
  },
};
