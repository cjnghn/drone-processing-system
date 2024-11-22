// src/common/utils/file.util.ts
import { promises as fs } from 'fs';
import { join, basename } from 'path';

export class FileUtil {
  static async validateFiles(paths: string[]): Promise<void> {
    await Promise.all(
      paths.map(async (path) => {
        try {
          await fs.access(path);
        } catch (error) {
          throw new Error(`File not found: ${path}`);
        }
      }),
    );
  }

  static async copyToTemp(
    sourcePath: string,
    tempDir: string,
  ): Promise<{ path: string; fileName: string }> {
    await fs.mkdir(tempDir, { recursive: true });

    const fileName = basename(sourcePath);
    const targetPath = join(tempDir, fileName);

    await fs.copyFile(sourcePath, targetPath);

    return { path: targetPath, fileName };
  }
}
