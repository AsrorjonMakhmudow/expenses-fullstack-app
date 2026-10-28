import { ExpenseIdSchema, MAX_IMPORT_FILE_BYTES } from '@expenses/shared';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { ImportsService } from './imports.service.js';
import type { UploadedImportFile } from './imports.service.js';

/**
 * File upload = multipart/form-data with one field named "file".
 * Without a `dest`, multer keeps the file in memory (never written to disk). It is limited in
 * size — an upload endpoint without a limit is an easy way to crash a server (→ 413 error).
 */
const uploadFile = FileInterceptor('file', {
  limits: { fileSize: MAX_IMPORT_FILE_BYTES, files: 1 },
});

@Controller({ path: 'imports', version: '1' })
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  /** Step 1: what WOULD be imported. Saves nothing. */
  @Post('preview')
  @HttpCode(200)
  @UseInterceptors(uploadFile)
  preview(@CurrentUserId() userId: string, @UploadedFile() file?: UploadedImportFile) {
    return this.imports.preview(userId, file);
  }

  /** Step 2: import for real (same file again). */
  @Post()
  @UseInterceptors(uploadFile)
  commit(@CurrentUserId() userId: string, @UploadedFile() file?: UploadedImportFile) {
    return this.imports.commit(userId, file);
  }

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.imports.list(userId);
  }

  /** Undo an import: removes the batch and every expense it created. */
  @Delete(':id')
  @HttpCode(204)
  async undo(
    @CurrentUserId() userId: string,
    @Param('id', new ZodValidationPipe(ExpenseIdSchema)) id: string,
  ): Promise<void> {
    await this.imports.undo(userId, id);
  }
}
