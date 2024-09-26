-- CreateTable
CREATE TABLE "ChatCommand" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,

    CONSTRAINT "ChatCommand_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ChatCommand" ADD CONSTRAINT "ChatCommand_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
