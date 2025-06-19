import * as prettier from 'prettier';

export function mdLiteral(path: string) {
  return async (strings: TemplateStringsArray, ...values: any[]) => {
    let rawCode = strings.reduce((acc, str, i) =>
      acc + str + (values[i] || ''), '');

    rawCode = rawCode.replace("<hint>", "<hint style='display:none'>");

    const content = await prettier.format(rawCode, {
      parser: 'markdown'
    })

    return {
      path,
      content
    }
  }
}