import {ResourceDescriptor} from "./resource-descriptor";
import {ApiProperty} from "@nestjs/swagger";
import {RelatedType, Tab} from "./common";

export class Variable {
  @ApiProperty({description: 'Name of the variable'})
  name: string;

  @ApiProperty({description: 'Location of the variable'})
  in: string;

  @ApiProperty({description: 'Reference of the variable'})
  ref: string;

  @ApiProperty({description: 'Related type of the variable'})
  relatedType?: RelatedType;

  constructor(name: string, in_: string, ref: string) {
    this.name = name;
    this.in = in_;
    this.ref = ref;
  }

  static from(variable: Variable) {
    return new Variable(variable.name, variable.in, variable.ref);
  }
}

export interface ErrorResponse {
  response?: string,
  responseType?: string
}

export interface RestData {
  method: string;
  paths: string[];
  operationId: string;
  requestBody?: string;
  contentType?: string;
  response?: string;
  responseType?: string;
  requestUrl?: string;
  variables?: Variable[];
  description?: string;
  summary?: string;
  responseExamples?: Record<string, string>;
  errorResponses?: Record<string, ErrorResponse>;
}

export function isRestDescriptor(descriptor: ResourceDescriptor<any>): descriptor is ResourceDescriptor<RestData> {
  return descriptor.type === 'rest';
}

export class RestDocumentation {
  @ApiProperty({description: 'Unique identifier'})
  id: string;

  @ApiProperty({description: 'Name of the REST documentation'})
  name: string;

  @ApiProperty({description: 'HTTP method'})
  method: string;

  @ApiProperty({description: 'API path'})
  path: string;

  @ApiProperty({description: 'Documentation description', required: false})
  description?: string;

  @ApiProperty({description: 'Request body description', required: false})
  requestBody?: RelatedType;

  @ApiProperty({description: 'Content type', required: false})
  contentType?: string;

  @ApiProperty({description: 'Response description', required: false})
  response?: RelatedType;

  @ApiProperty({description: 'Response type', required: false})
  responseType?: string;

  @ApiProperty({description: 'Request URL'})
  requestUrl: string;

  @ApiProperty({description: 'List of variables', type: [Variable]})
  variables: Variable[];

  @ApiProperty({description: 'Response examples'})
  responseExamples: Record<string, string>;

  @ApiProperty({description: 'Documentation tabs', type: [Tab]})
  tabs: Tab[];

  constructor(
    id: string,
    name: string,
    method: string,
    path: string,
    description: string | undefined,
    requestBody: RelatedType | undefined,
    contentType: string | undefined,
    response: RelatedType | undefined,
    responseType: string | undefined,
    requestUrl: string,
    variables: Variable[],
    responseExamples: Record<string, string>,
    tabs: Tab[]
  ) {
    this.id = id;
    this.name = name;
    this.method = method;
    this.path = path;
    this.description = description;
    this.requestBody = requestBody;
    this.contentType = contentType;
    this.response = response;
    this.responseType = responseType;
    this.requestUrl = requestUrl;
    this.variables = variables;
    this.responseExamples = responseExamples;
    this.tabs = tabs;
  }

  static from(doc: RestDocumentation) {
    return new RestDocumentation(
      doc.id,
      doc.name,
      doc.method,
      doc.path,
      doc.description,
      doc.requestBody,
      doc.contentType,
      doc.response,
      doc.responseType,
      doc.requestUrl,
      doc.variables,
      doc.responseExamples,
      doc.tabs
    );
  }
}