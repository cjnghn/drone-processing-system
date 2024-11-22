import { promises as fs } from 'fs';
import { join } from 'path';
import { FileUtil } from './file.util';

describe('FileUtil', () => {
  const tempDir = join(process.cwd(), 'test/temp');
  let testFilePath: string;

  beforeAll(async () => {
    await fs.mkdir(tempDir, { recursive: true });
    testFilePath = join(tempDir, 'test.txt');
    await fs.writeFile(testFilePath, 'test content');
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('validateFiles', () => {
    it('should validate existing files', async () => {
      await expect(
        FileUtil.validateFiles([testFilePath]),
      ).resolves.not.toThrow();
    });

    it('should throw error for non-existing files', async () => {
      await expect(
        FileUtil.validateFiles(['non-existing.txt']),
      ).rejects.toThrow('File not found');
    });
  });

  describe('copyToTemp', () => {
    it('should copy file to temp directory', async () => {
      const { path, fileName } = await FileUtil.copyToTemp(
        testFilePath,
        tempDir,
      );
      expect(fileName).toBe('test.txt');
      const exists = await fs
        .access(path)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });
  });
});
