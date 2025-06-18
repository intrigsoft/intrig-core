import { OpenAPIV3_1 } from 'openapi-types';
import * as _ from 'lodash';
import { produce } from 'immer';

export interface Differences {
  paths?: {
    added?: string[];
    removed?: string[];
    modified?: Array<{
      path: string;
      methods: {
        added?: string[];
        removed?: string[];
        modified?: Array<{
          method: string;
          parameters?: {
            added?: OpenAPIV3_1.ParameterObject[];
            removed?: OpenAPIV3_1.ParameterObject[];
            modified?: OpenAPIV3_1.ParameterObject[];
          };
          requestBody?: {
            old: OpenAPIV3_1.RequestBodyObject;
            new: OpenAPIV3_1.RequestBodyObject;
          };
          responses?: {
            added?: string[];
            removed?: string[];
            modified?: Array<{
              statusCode: string;
              old: OpenAPIV3_1.ResponseObject;
              new: OpenAPIV3_1.ResponseObject;
            }>;
          };
        }>;
      };
    }>;
  };
  components?: {
    added?: string[];
    removed?: string[];
    modified?: Array<{
      component: string;
      fields?: {
        added?: string[];
        removed?: string[];
        modified?: Array<{
          field: string;
          old: any;
          new: any;
        }>;
      };
    }>;
  };
  securitySchemes?: {
    added?: string[];
    removed?: string[];
    modified?: string[];
  };
  tags?: {
    added?: string[];
    removed?: string[];
  };
  servers?: {
    added?: OpenAPIV3_1.ServerObject[];
    removed?: OpenAPIV3_1.ServerObject[];
  };
}

/**
 * Compare parameters between old and new method
 */
export function compareParameters(
  oldMethod: any,
  newMethod: any
): {
  added?: OpenAPIV3_1.ParameterObject[];
  removed?: OpenAPIV3_1.ParameterObject[];
  modified?: OpenAPIV3_1.ParameterObject[];
} | undefined {
  const oldParams: OpenAPIV3_1.ParameterObject[] = oldMethod?.parameters || [];
  const newParams: OpenAPIV3_1.ParameterObject[] = newMethod?.parameters || [];

  const addedParams = _.differenceWith(newParams, oldParams, _.isEqual);
  const removedParams = _.differenceWith(oldParams, newParams, _.isEqual);
  const modifiedParams = _.intersectionWith(oldParams, newParams, (a, b) => a.name === b.name && !_.isEqual(a, b));

  if (addedParams.length > 0 || removedParams.length > 0 || modifiedParams.length > 0) {
    return {
      added: addedParams.length > 0 ? addedParams : undefined,
      removed: removedParams.length > 0 ? removedParams : undefined,
      modified: modifiedParams.length > 0 ? modifiedParams : undefined
    };
  }

  return undefined;
}

/**
 * Compare request bodies between old and new method
 */
export function compareRequestBodies(
  oldMethod: any,
  newMethod: any
): {
  old: OpenAPIV3_1.RequestBodyObject;
  new: OpenAPIV3_1.RequestBodyObject;
} | undefined {
  if (!_.isEqual(oldMethod?.requestBody, newMethod?.requestBody)) {
    return {
      old: oldMethod?.requestBody as OpenAPIV3_1.RequestBodyObject,
      new: newMethod?.requestBody as OpenAPIV3_1.RequestBodyObject
    };
  }

  return undefined;
}

/**
 * Compare responses between old and new method
 */
export function compareResponses(
  oldMethod: any,
  newMethod: any
): {
  added?: string[];
  removed?: string[];
  modified?: Array<{
    statusCode: string;
    old: OpenAPIV3_1.ResponseObject;
    new: OpenAPIV3_1.ResponseObject;
  }>;
} | undefined {
  const oldResponses = oldMethod?.responses || {};
  const newResponses = newMethod?.responses || {};

  const addedResponses = _.difference(Object.keys(newResponses), Object.keys(oldResponses));
  const removedResponses = _.difference(Object.keys(oldResponses), Object.keys(newResponses));
  const commonResponses = _.intersection(Object.keys(oldResponses), Object.keys(newResponses));

  const modifiedResponses: Array<{
    statusCode: string;
    old: OpenAPIV3_1.ResponseObject;
    new: OpenAPIV3_1.ResponseObject;
  }> = [];

  commonResponses.forEach((code) => {
    if (!_.isEqual(oldResponses[code], newResponses[code])) {
      modifiedResponses.push({
        statusCode: code,
        old: oldResponses[code] as OpenAPIV3_1.ResponseObject,
        new: newResponses[code] as OpenAPIV3_1.ResponseObject
      });
    }
  });

  if (addedResponses.length > 0 || removedResponses.length > 0 || modifiedResponses.length > 0) {
    return {
      added: addedResponses.length > 0 ? addedResponses : undefined,
      removed: removedResponses.length > 0 ? removedResponses : undefined,
      modified: modifiedResponses.length > 0 ? modifiedResponses : undefined
    };
  }

  return undefined;
}

/**
 * Compare methods between old and new paths
 */
export function compareMethods(
  path: string,
  oldMethods: any,
  newMethods: any
): {
  path: string;
  methods: {
    added?: string[];
    removed?: string[];
    modified?: Array<{
      method: string;
      parameters?: {
        added?: OpenAPIV3_1.ParameterObject[];
        removed?: OpenAPIV3_1.ParameterObject[];
        modified?: OpenAPIV3_1.ParameterObject[];
      };
      requestBody?: {
        old: OpenAPIV3_1.RequestBodyObject;
        new: OpenAPIV3_1.RequestBodyObject;
      };
      responses?: {
        added?: string[];
        removed?: string[];
        modified?: Array<{
          statusCode: string;
          old: OpenAPIV3_1.ResponseObject;
          new: OpenAPIV3_1.ResponseObject;
        }>;
      };
    }>;
  };
} | undefined {
  const addedMethods = _.difference(Object.keys(newMethods), Object.keys(oldMethods));
  const removedMethods = _.difference(Object.keys(oldMethods), Object.keys(newMethods));
  const commonMethods = _.intersection(Object.keys(oldMethods), Object.keys(newMethods));

  const modifiedMethods: Array<{
    method: string;
    parameters?: {
      added?: OpenAPIV3_1.ParameterObject[];
      removed?: OpenAPIV3_1.ParameterObject[];
      modified?: OpenAPIV3_1.ParameterObject[];
    };
    requestBody?: {
      old: OpenAPIV3_1.RequestBodyObject;
      new: OpenAPIV3_1.RequestBodyObject;
    };
    responses?: {
      added?: string[];
      removed?: string[];
      modified?: Array<{
        statusCode: string;
        old: OpenAPIV3_1.ResponseObject;
        new: OpenAPIV3_1.ResponseObject;
      }>;
    };
  }> = [];

  commonMethods.forEach((method) => {
    const oldMethod: any = oldMethods[method as keyof typeof oldMethods];
    const newMethod: any = newMethods[method as keyof typeof newMethods];
    if (!_.isEqual(oldMethod, newMethod)) {
      const methodDiff: {
        method: string;
        parameters?: {
          added?: OpenAPIV3_1.ParameterObject[];
          removed?: OpenAPIV3_1.ParameterObject[];
          modified?: OpenAPIV3_1.ParameterObject[];
        };
        requestBody?: {
          old: OpenAPIV3_1.RequestBodyObject;
          new: OpenAPIV3_1.RequestBodyObject;
        };
        responses?: {
          added?: string[];
          removed?: string[];
          modified?: Array<{
            statusCode: string;
            old: OpenAPIV3_1.ResponseObject;
            new: OpenAPIV3_1.ResponseObject;
          }>;
        };
      } = { method };

      // Compare parameters
      const parametersDiff = compareParameters(oldMethod, newMethod);
      if (parametersDiff) {
        methodDiff.parameters = parametersDiff;
      }

      // Compare request body
      const requestBodyDiff = compareRequestBodies(oldMethod, newMethod);
      if (requestBodyDiff) {
        methodDiff.requestBody = requestBodyDiff;
      }

      // Compare responses
      const responsesDiff = compareResponses(oldMethod, newMethod);
      if (responsesDiff) {
        methodDiff.responses = responsesDiff;
      }

      modifiedMethods.push(methodDiff);
    }
  });

  if (addedMethods.length > 0 || removedMethods.length > 0 || modifiedMethods.length > 0) {
    return {
      path,
      methods: {
        added: addedMethods.length > 0 ? addedMethods : undefined,
        removed: removedMethods.length > 0 ? removedMethods : undefined,
        modified: modifiedMethods.length > 0 ? modifiedMethods : undefined
      }
    };
  }

  return undefined;
}

/**
 * Compare paths between old and new OpenAPI documents
 */
export function comparePaths(
  oldDoc: OpenAPIV3_1.Document,
  newDoc: OpenAPIV3_1.Document,
  draft: Differences
): void {
  const oldPaths = oldDoc.paths || {};
  const newPaths = newDoc.paths || {};

  const addedPaths = _.difference(Object.keys(newPaths), Object.keys(oldPaths));
  const removedPaths = _.difference(Object.keys(oldPaths), Object.keys(newPaths));
  const commonPaths = _.intersection(Object.keys(oldPaths), Object.keys(newPaths));

  if (addedPaths.length > 0) {
    draft.paths = draft.paths || {};
    draft.paths.added = addedPaths;
  }
  if (removedPaths.length > 0) {
    draft.paths = draft.paths || {};
    draft.paths.removed = removedPaths;
  }

  commonPaths.forEach((path) => {
    const oldMethods = oldPaths[path]!;
    const newMethods = newPaths[path]!;

    const methodsDiff = compareMethods(path, oldMethods, newMethods);
    if (methodsDiff) {
      draft.paths = draft.paths || {};
      draft.paths.modified = draft.paths.modified || [];
      draft.paths.modified.push(methodsDiff);
    }
  });
}

/**
 * Compare fields between old and new components
 */
export function compareFields(
  oldComponent: any,
  newComponent: any
): {
  added?: string[];
  removed?: string[];
  modified?: Array<{
    field: string;
    old: any;
    new: any;
  }>;
} | undefined {
  const addedFields = _.difference(Object.keys(newComponent), Object.keys(oldComponent));
  const removedFields = _.difference(Object.keys(oldComponent), Object.keys(newComponent));
  const commonFields = _.intersection(Object.keys(oldComponent), Object.keys(newComponent));

  const modifiedFields: Array<{
    field: string;
    old: any;
    new: any;
  }> = [];

  commonFields.forEach((field) => {
    const oldField = (oldComponent as Record<string, unknown>)[field];
    const newField = (newComponent as Record<string, unknown>)[field];
    if (!_.isEqual(oldField, newField)) {
      modifiedFields.push({
        field,
        old: oldField,
        new: newField
      });
    }
  });

  if (addedFields.length > 0 || removedFields.length > 0 || modifiedFields.length > 0) {
    return {
      added: addedFields.length > 0 ? addedFields : undefined,
      removed: removedFields.length > 0 ? removedFields : undefined,
      modified: modifiedFields.length > 0 ? modifiedFields : undefined
    };
  }

  return undefined;
}

/**
 * Compare components between old and new OpenAPI documents
 */
export function compareComponents(
  oldDoc: OpenAPIV3_1.Document,
  newDoc: OpenAPIV3_1.Document,
  draft: Differences
): void {
  const oldComponents = oldDoc.components && oldDoc.components.schemas ? oldDoc.components.schemas : {};
  const newComponents = newDoc.components && newDoc.components.schemas ? newDoc.components.schemas : {};

  const addedComponents = _.difference(Object.keys(newComponents), Object.keys(oldComponents));
  const removedComponents = _.difference(Object.keys(oldComponents), Object.keys(newComponents));
  const commonComponents = _.intersection(Object.keys(oldComponents), Object.keys(newComponents));

  draft.components = draft.components || {};
  draft.components.modified = [];
  if (addedComponents.length > 0) {
    draft.components.added = addedComponents;
  }
  if (removedComponents.length > 0) {
    draft.components.removed = removedComponents;
  }

  commonComponents.forEach((component) => {
    const oldComponent = oldComponents[component];
    const newComponent = newComponents[component];

    const fieldsDiff = compareFields(oldComponent, newComponent);
    if (fieldsDiff) {
      draft.components = draft.components || {};
      draft.components.modified = draft.components.modified || [];
      draft.components.modified.push({
        component,
        fields: fieldsDiff
      });
    }
  });
}

/**
 * Compare security schemes between old and new OpenAPI documents
 */
export function compareSecuritySchemes(
  oldDoc: OpenAPIV3_1.Document,
  newDoc: OpenAPIV3_1.Document,
  draft: Differences
): void {
  const oldSecuritySchemes = oldDoc.components && oldDoc.components.securitySchemes ? oldDoc.components.securitySchemes : {};
  const newSecuritySchemes = newDoc.components && newDoc.components.securitySchemes ? newDoc.components.securitySchemes : {};

  const addedSecuritySchemes = _.difference(Object.keys(newSecuritySchemes), Object.keys(oldSecuritySchemes));
  const removedSecuritySchemes = _.difference(Object.keys(oldSecuritySchemes), Object.keys(newSecuritySchemes));
  const commonSecuritySchemes = _.intersection(Object.keys(oldSecuritySchemes), Object.keys(newSecuritySchemes));

  if (addedSecuritySchemes.length > 0) {
    draft.securitySchemes = draft.securitySchemes || {};
    draft.securitySchemes.added = addedSecuritySchemes;
  }
  if (removedSecuritySchemes.length > 0) {
    draft.securitySchemes = draft.securitySchemes || {};
    draft.securitySchemes.removed = removedSecuritySchemes;
  }

  commonSecuritySchemes.forEach((scheme) => {
    if (!_.isEqual(oldSecuritySchemes[scheme], newSecuritySchemes[scheme])) {
      draft.securitySchemes = draft.securitySchemes || {};
      draft.securitySchemes.modified = draft.securitySchemes.modified || [];
      draft.securitySchemes.modified.push(scheme);
    }
  });
}

/**
 * Compare tags between old and new OpenAPI documents
 */
export function compareTags(
  oldDoc: OpenAPIV3_1.Document,
  newDoc: OpenAPIV3_1.Document,
  draft: Differences
): void {
  const oldTags = oldDoc.tags || [];
  const newTags = newDoc.tags || [];

  const addedTags = _.differenceWith(newTags, oldTags, _.isEqual);
  const removedTags = _.differenceWith(oldTags, newTags, _.isEqual);

  if (addedTags.length > 0) {
    draft.tags = draft.tags || {};
    draft.tags.added = addedTags.map(tag => tag.name);
  }
  if (removedTags.length > 0) {
    draft.tags = draft.tags || {};
    draft.tags.removed = removedTags.map(tag => tag.name);
  }
}

/**
 * Compare servers between old and new OpenAPI documents
 */
export function compareServers(
  oldDoc: OpenAPIV3_1.Document,
  newDoc: OpenAPIV3_1.Document,
  draft: Differences
): void {
  const oldServers = oldDoc.servers || [];
  const newServers = newDoc.servers || [];

  const addedServers = _.differenceWith(newServers, oldServers, _.isEqual);
  const removedServers = _.differenceWith(oldServers, newServers, _.isEqual);

  if (addedServers.length > 0) {
    draft.servers = draft.servers || {};
    draft.servers.added = addedServers;
  }
  if (removedServers.length > 0) {
    draft.servers = draft.servers || {};
    draft.servers.removed = removedServers;
  }
}

/**
 * Clean up empty properties in the draft object
 */
export function cleanupEmptyProperties(draft: Differences): void {
  if (_.isEmpty(draft.paths?.added) && _.isEmpty(draft.paths?.removed) && _.isEmpty(draft.paths?.modified)) {
    delete draft.paths;
  }
  if (_.isEmpty(draft.components?.added) && _.isEmpty(draft.components?.removed) && _.isEmpty(draft.components?.modified)) {
    delete draft.components;
  }
  if (_.isEmpty(draft.securitySchemes?.added) && _.isEmpty(draft.securitySchemes?.removed) && _.isEmpty(draft.securitySchemes?.modified)) {
    delete draft.securitySchemes;
  }
  if (_.isEmpty(draft.tags?.added) && _.isEmpty(draft.tags?.removed)) {
    delete draft.tags;
  }
  if (_.isEmpty(draft.servers?.added) && _.isEmpty(draft.servers?.removed)) {
    delete draft.servers;
  }
}

/**
 * Compare two OpenAPI documents and return the differences
 */
function compareSwaggerDocs(oldDoc: OpenAPIV3_1.Document, newDoc: OpenAPIV3_1.Document): Differences {
  return produce<Differences>({}, (draft) => {
    // Initialize draft properties
    draft.paths = draft.paths || {};
    draft.components = draft.components || {};
    draft.securitySchemes = draft.securitySchemes || {};
    draft.tags = draft.tags || {};
    draft.servers = draft.servers || {};

    // Compare different parts of the documents
    comparePaths(oldDoc, newDoc, draft);
    compareComponents(oldDoc, newDoc, draft);
    compareSecuritySchemes(oldDoc, newDoc, draft);
    compareTags(oldDoc, newDoc, draft);
    compareServers(oldDoc, newDoc, draft);

    // Cleanup empty draft properties
    cleanupEmptyProperties(draft);
  });
}

export default compareSwaggerDocs;
