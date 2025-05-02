import * as path from "path";

export default () => {
  console.log(process.env.ROOT_DIR);
  return ({
    port: parseInt(process.env.PORT ?? '0', 10) || 0,
    rootDir: process.env.ROOT_DIR ?? __dirname,
    generatedDir: path.resolve(process.env.ROOT_DIR ?? __dirname, '.intrig', 'generated'),
    specsDir: path.resolve(process.env.ROOT_DIR ?? __dirname, '.intrig', 'specs'),
  });
}