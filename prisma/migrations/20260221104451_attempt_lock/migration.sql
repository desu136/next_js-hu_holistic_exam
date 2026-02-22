-- AlterTable
ALTER TABLE `attempt` ADD COLUMN `lockToken` VARCHAR(191) NULL,
    ADD COLUMN `lockUpdatedAt` DATETIME(3) NULL;
