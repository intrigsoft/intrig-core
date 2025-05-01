import * as prettier from 'prettier'

export function typescript(path: string) {
  return async (strings: TemplateStringsArray, ...values: any[]) => {
    const rawCode = strings.reduce((acc, str, i) => {
      if (str.startsWith("*/")) str = str.slice(2);
      const [before] = str.split("/*!");
      return acc + before + (values?.[i] || '');
    }, '');

    const content = await prettier.format(rawCode, {
      parser: 'typescript',
      singleQuote: true
    });

    return {
      path,
      content
    }
  }
}
