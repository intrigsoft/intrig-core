import { Injectable } from '@nestjs/common';
import * as path from 'path'
import * as fs from 'fs'
import {CompiledContent} from "@intrig/plugin-sdk";

@Injectable()
export class SourceManagementService {
  async dump(content: Promise<CompiledContent>) {
    const output = await content;
    const dir = path.parse(output.path).dir;
    fs.mkdirSync(dir, {recursive: true});
    fs.writeFileSync(output.path, output.content, 'utf-8');
  }
}
