import { Injectable } from '@nestjs/common';
import {CompiledContent} from "./model/content-types";
import * as path from 'path'
import * as fs from 'fs'

@Injectable()
export class SourceManagementService {
  async dump(content: Promise<CompiledContent>) {
    const output = await content;
    const dir = path.parse(output.path).dir;
    fs.mkdirSync(dir, {recursive: true});
    fs.writeFileSync(output.path, output.content, 'utf-8');
  }
}
