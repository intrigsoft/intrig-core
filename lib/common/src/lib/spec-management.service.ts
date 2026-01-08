import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path'
import * as fs from 'fs'
import * as lockfile from 'proper-lockfile';
import compareSwaggerDocs from "./util/openapi3-diff";
import {OpenAPIV3_1} from "openapi-types";
import {ConfigService} from "@nestjs/config";
import * as process from "node:process";

@Injectable()
export class SpecManagementService {
  private readonly logger = new Logger(SpecManagementService.name);

  constructor(private config: ConfigService) {
  }

  private specsDir: string = this.config.get('specsDir') ?? path.resolve(process.cwd(), '.intrig', 'specs');

  async save(apiName: string, content: string) {
    const filePath = path.join(this.specsDir, `${apiName}-latest.json`);
    const tempPath = path.join(this.specsDir, `${apiName}-latest.json.tmp`);
    
    let release: (() => Promise<void>) | undefined;
    
    try {
      // Ensure directory exists
      fs.mkdirSync(this.specsDir, {recursive: true});

      // Create the file if it doesn't exist (proper-lockfile requires the file to exist)
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '', 'utf-8');
      }

      // Acquire lock for the file
      release = await lockfile.lock(filePath, {
        retries: {
          retries: 5,
          factor: 2,
          minTimeout: 100,
          maxTimeout: 2000
        }
      });

      // Read current content with lock protection
      const currentContent = await this.readWithoutLock(apiName);
      
      if (currentContent) {
        const differences = compareSwaggerDocs(
          currentContent,
          JSON.parse(content),
        );

        if (!Object.keys(differences).length) {
          this.logger.debug(`No changes detected for ${apiName}, skipping save`);
          return;
        }
      }

      // Atomic write: write to temp file first, then rename
      fs.writeFileSync(tempPath, content, 'utf-8');
      fs.renameSync(tempPath, filePath);
      
      this.logger.debug(`Successfully saved spec for ${apiName}`);
      
    } catch (error: any) {
      // Clean up temp file if it exists
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (cleanupError) {
          this.logger.warn(`Failed to cleanup temp file ${tempPath}: ${cleanupError}`);
        }
      }
      
      this.logger.error(`Failed to save spec for ${apiName}: ${error.message}`, error);
      throw new Error(`Failed to save spec for ${apiName}: ${error.message}`);
    } finally {
      // Always release the lock
      if (release) {
        try {
          await release();
        } catch (releaseError) {
          this.logger.warn(`Failed to release lock for ${filePath}: ${releaseError}`);
        }
      }
    }
  }

  async read(apiName: string): Promise<OpenAPIV3_1.Document | undefined> {
    const filePath = path.join(this.specsDir, `${apiName}-latest.json`);
    
    let release: (() => Promise<void>) | undefined;
    
    try {
      // Acquire lock for reading
      release = await lockfile.lock(filePath, {
        retries: {
          retries: 3,
          factor: 2,
          minTimeout: 50,
          maxTimeout: 1000
        }
      });
      
      return await this.readWithoutLock(apiName);
      
    } catch (error: any) {
      if (error.code === 'ENOENT' || !fs.existsSync(filePath)) {
        // File doesn't exist, this is normal for first-time sync
        this.logger.debug(`Spec file not found for ${apiName}, returning undefined`);
        return undefined;
      }
      
      this.logger.error(`Failed to read spec for ${apiName}: ${error.message}`, error);
      throw new Error(`Failed to read spec for ${apiName}: ${error.message}`);
    } finally {
      // Always release the lock
      if (release) {
        try {
          await release();
        } catch (releaseError) {
          this.logger.warn(`Failed to release lock for ${filePath}: ${releaseError}`);
        }
      }
    }
  }

  private async readWithoutLock(apiName: string): Promise<OpenAPIV3_1.Document | undefined> {
    const fileName = `${apiName}-latest.json`
    const specPath = path.join(this.specsDir, fileName);

    if (fs.existsSync(specPath)) {
      try {
        const content = fs.readFileSync(specPath, 'utf-8');
        // Handle empty files (created for locking purposes)
        if (!content || content.trim() === '') {
          return undefined;
        }
        return JSON.parse(content);
      } catch (error: any) {
        this.logger.error(`Failed to parse JSON for ${apiName}: ${error.message}`);
        throw new Error(`Invalid JSON in spec file for ${apiName}: ${error.message}`);
      }
    }

    return undefined;
  }
}
