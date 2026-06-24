-- CreateTable
CREATE TABLE "CustomSticker" (
    "id" SERIAL NOT NULL,
    "boardId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "states" JSONB,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomSticker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomSticker_boardId_text_key" ON "CustomSticker"("boardId", "text");

-- AddForeignKey
ALTER TABLE "CustomSticker" ADD CONSTRAINT "CustomSticker_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
