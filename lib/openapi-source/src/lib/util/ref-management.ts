import {OpenAPIV3_1} from "openapi-types";
import ReferenceObject = OpenAPIV3_1.ReferenceObject;

export function isRef(ob: any): ob is ReferenceObject {
  return ob?.$ref !== undefined;
}

export function deref(spec: OpenAPIV3_1.Document): <T> (ob: ReferenceObject | T) => T | undefined {
  return <T> (ob: ReferenceObject | T) => {
    if (isRef(ob)) {
      return ob.$ref.split('/').slice(1).reduce((acc: any, curr) => {
        return acc?.[curr];
      }, spec);
    }
    return ob;
  }
}