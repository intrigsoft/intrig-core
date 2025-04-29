import { Injectable } from '@nestjs/common';
import * as path from 'path'
import * as fs from 'fs'
import compareSwaggerDocs from "./util/openapi3-diff";

@Injectable()
export class SpecManagementService {
  private specsDir: string =  path.join(process.cwd(), '.intrig', 'specs');

  async save(apiName: string, content: string) {
    let currentContent = await this.read(apiName);
    if (currentContent) {
      let differences = compareSwaggerDocs(
        JSON.parse(currentContent),
        JSON.parse(content),
      );

      if (!Object.keys(differences).length) {
        return
      }
    }

    fs.writeFileSync(path.join(this.specsDir, `${apiName}-latest.json`), content, 'utf-8');
  }

  async read(apiName: string) {
    let fileName = `${apiName}-latest.json`
    let specPath = path.join(this.specsDir, fileName);
    if (fs.existsSync(specPath)) {
      return fs.readFileSync(specPath, 'utf-8')
    }
    return undefined;
  }
}
