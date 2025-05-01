import * as prettier from 'prettier'

export function jsonLiteral(path: string) {
  return async (strings: TemplateStringsArray, ...values: any[]) => {
    const rawCode = strings.reduce((acc, str, i) =>
      acc + str + (values[i] || ''), '');

    let content = await prettier.format(rawCode, {
      parser: 'json',
      singleQuote: true
    });

    return {
      path,
      content
    }
  }
}
