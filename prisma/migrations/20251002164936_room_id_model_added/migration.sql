-- CreateTable
CREATE TABLE "RoomId" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomId_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RoomIdToUser" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_RoomIdToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_RoomIdToUser_B_index" ON "_RoomIdToUser"("B");

-- AddForeignKey
ALTER TABLE "_RoomIdToUser" ADD CONSTRAINT "_RoomIdToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "RoomId"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RoomIdToUser" ADD CONSTRAINT "_RoomIdToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
