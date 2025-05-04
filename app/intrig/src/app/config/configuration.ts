import * as path from "path";

export default () => {
  return ({
    port: parseInt(process.env.PORT ?? '0', 10) || 0,
    rootDir: process.env.ROOT_DIR ?? process.cwd(),
    generatedDir: path.resolve(process.env.ROOT_DIR ?? process.cwd(), '.intrig', 'generated'),
    specsDir: path.resolve(process.env.ROOT_DIR ?? process.cwd(), '.intrig', 'specs'),
  });
}