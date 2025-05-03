import { Injectable } from '@nestjs/common';
import * as path from 'path'
import * as fs from 'fs'
import compareSwaggerDocs from "./util/openapi3-diff";
import {OpenAPIV3_1} from "openapi-types";
import {ConfigService} from "@nestjs/config";

@Injectable()
export class SpecManagementService {

  constructor(private config: ConfigService) {
  }

  private specsDir: string = this.config.get('specsDir') ?? path.resolve(__dirname, '.intrig', 'specs');

  async save(apiName: string, content: string) {
    let currentContent = await this.read(apiName);
    if (currentContent) {
      let differences = compareSwaggerDocs(
        currentContent,
        JSON.parse(content),
      );

      if (!Object.keys(differences).length) {
        return
      }
    }

    fs.mkdirSync(this.specsDir, {recursive: true});

    fs.writeFileSync(path.join(this.specsDir, `${apiName}-latest.json`), content, 'utf-8');
  }

  async read(apiName: string): Promise<OpenAPIV3_1.Document | undefined> {
    let fileName = `${apiName}-latest.json`
    let specPath = path.join(this.specsDir, fileName);
    if (fs.existsSync(specPath)) {
      let content = fs.readFileSync(specPath, 'utf-8');
      return JSON.parse(content)
    }
    return undefined
  }
}
