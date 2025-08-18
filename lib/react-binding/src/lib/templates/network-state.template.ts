import {typescript} from "common";
import * as path from 'path'

export function reactNetworkStateTemplate(_path: string) {
  const ts = typescript(path.resolve(_path, "src", "network-state.tsx"))
  return ts`import { ZodError } from 'zod';
import {AxiosResponseHeaders, RawAxiosResponseHeaders} from "axios";

/**
 * State of an asynchronous call. Network state follows the state diagram given below.
 *
 *
 * <pre>
 *                 ┌──────┐
 *   ┌─────────────► Init ◄────────────┐
 *   │             └▲────┬┘            │
 *   │              │    │             │
 *   │           Reset  Execute        │
 * Reset            │    │           Reset
 *   │           ┌──┴────┴──┐          │
 *   │      ┌────► Pending  ◄────┐     │
 *   │      │    └──┬────┬──┘    │     │
 *   │   Execute    │    │    Execute  │
 *   │      │       │    │       │     │
 *   │      │ OnSuccess OnError  │     │
 *   │ ┌────┴──┐    │    │    ┌──┴───┐ │
 *   └─┤Success◄────┘    └────►Error ├─┘
 *     └───────┘              └──────┘
 *
 * </pre>
 */
export interface NetworkState<T = unknown> {
  state: 'init' | 'pending' | 'success' | 'error';
}

/**
 * Network call is not yet started
 */
export interface InitState<T> extends NetworkState<T> {
  state: 'init';
}

/**
 * Checks whether the state is init state
 * @param state
 */
export function isInit<T>(
  state: NetworkState<T>,
): state is InitState<T> {
  return state.state === 'init';
}

/**
 * Initializes a new state.
 *
 * @template T The type of the state.
 * @return {InitState<T>} An object representing the initial state.
 */
export function init<T>(): InitState<T> {
  return {
    state: 'init',
  };
}

/**
 * Network call is not yet completed
 */
export interface PendingState<T> extends NetworkState<T> {
  state: 'pending';
  progress?: Progress;
  data?: T;
}

/**
 * Interface representing progress information for an upload or download operation.
 *
 * @typedef {object} Progress
 *
 * @property {'upload' | 'download'} type - The type of the operation.
 *
 * @property {number} loaded - The amount of data that has been loaded so far.
 *
 * @property {number} [total] - The total amount of data to be loaded (if known).
 */
export interface Progress {
  type?: 'upload' | 'download';
  loaded: number;
  total?: number;
}

/**
 * Checks whether the state is pending state
 * @param state
 */
export function isPending<T>(
  state: NetworkState<T>,
): state is PendingState<T> {
  return state.state === 'pending';
}

/**
 * Generates a PendingState object with a state of "pending".
 *
 * @return {PendingState<T>} An object representing the pending state.
 */
export function pending<T>(
  progress: Progress | undefined = undefined,
  data: T | undefined = undefined,
): PendingState<T> {
  return {
    state: 'pending',
    progress,
    data,
  };
}

/**
 * Network call is completed with success state
 */
export interface SuccessState<T> extends NetworkState<T> {
  state: 'success';
  data: T;
  headers?: Record<string, any | undefined>;
}

/**
 * Checks whether the state is success response
 * @param state
 */
export function isSuccess<T>(
  state: NetworkState<T>,
): state is SuccessState<T> {
  return state.state === 'success';
}

/**
 * Creates a success state object with the provided data.
 *
 * @param {T} data - The data to be included in the success state.
 * @param headers
 * @return {SuccessState<T>} An object representing a success state containing the provided data.
 */
export function success<T>(
  data: T,
  headers?: Record<string, any | undefined>,
): SuccessState<T> {
  return {
    state: 'success',
    data,
    headers,
  };
}

/**
 * Network call is completed with error response
 */
export interface ErrorState<T> extends NetworkState<T> {
  state: 'error';
  error: IntrigError;
}

/**
 * Checks whether the state is error state
 * @param state
 */
export function isError<T>(
  state: NetworkState<T>,
): state is ErrorState<T> {
  return state.state === 'error';
}

/**
 * Constructs an ErrorState object representing an error.
 *
 * @param {any} error - The error object or message.
 * @param {string} [statusCode] - An optional status code associated with the error.
 * @return {ErrorState<T>} An object representing the error state.
 */
export function error<T>(
  error: IntrigError,
): ErrorState<T> {
  return {
    state: 'error',
    error
  };
}

/**
 * Represents the base structure for error information in the application.
 *
 * This interface is used to define the type of error encountered in various contexts.
 *
 * Properties:
 * - type: Specifies the category of the error which determines its nature and source.
 *   - 'http': Indicates the error is related to HTTP operations.
 *   - 'network': Indicates the error occurred due to network issues.
 *   - 'request-validation': Represents errors that occurred during request validation.
 *   - 'response-validation': Represents errors that occurred during response validation.
 *   - 'config': Pertains to errors associated with configuration issues.
 */
export interface IntrigErrorBase {
  type: 'http' | 'network' | 'request-validation' | 'response-validation' | 'config';
}

/**
 * Interface representing an HTTP-related error.
 * Extends the \`IntrigErrorBase\` base interface to provide information specific to HTTP errors.
 *
 * @property type - The type identifier for the error, always set to 'http'.
 * @property status - The HTTP status code associated with the error.
 * @property url - The URL that caused the error.
 * @property method - The HTTP method used in the request that resulted in the error.
 * @property headers - Optional. The HTTP headers relevant to the request and/or response, represented as a record of key-value pairs.
 * @property body - Optional. The parsed body of the server error, if available.
 */
export interface HttpError extends IntrigErrorBase {
  type: 'http';
  status: number;
  url: string;
  method: string;
  headers?: RawAxiosResponseHeaders | AxiosResponseHeaders;
  body?: unknown; // parsed server error body if any
}

/**
 * Determines if the given error is an HTTP error.
 *
 * @param {IntrigError} error - The error object to check.
 * @return {boolean} Returns true if the error is an instance of HttpError; otherwise, false.
 */
export function isHttpError(error: IntrigError): error is HttpError {
  return error.type === 'http';
}

/**
 * Creates an object representing an HTTP error.
 *
 * @param {number} status - The HTTP status code of the error.
 * @param {string} url - The URL associated with the HTTP error.
 * @param {string} method - The HTTP method that resulted in the error.
 * @param {Record<string, string | string[] | undefined>} [headers] - Optional headers involved in the HTTP error.
 * @param {unknown} [body] - Optional body data related to the HTTP error.
 * @return {HttpError} An object encapsulating details about the HTTP error.
 */
export function httpError(
  status: number,
  url: string,
  method: string,
  headers?: RawAxiosResponseHeaders | AxiosResponseHeaders,
  body?: unknown
): HttpError {
  return {
    type: 'http',
    status,
    url,
    method,
    headers,
    body
  };
}

/**
 * Represents a network-related error. This error type is used to indicate issues during network operations.
 * Extends the base error functionality from IntrigErrorBase.
 *
 * Properties:
 * - \`type\`: Specifies the type of error as 'network'.
 * - \`reason\`: Indicates the specific reason for the network error. Possible values include:
 *   - 'timeout': Occurs when the network request times out.
 *   - 'dns': Represents DNS resolution issues.
 *   - 'offline': Indicates the device is offline or has no network connectivity.
 *   - 'aborted': The network request was aborted.
 *   - 'unknown': An unspecified network issue occurred.
 * - \`request\`: Optional property representing the network request that caused the error. Its structure can vary depending on the implementation context.
 */
export interface NetworkError extends IntrigErrorBase {
  type: 'network';
  reason: 'timeout' | 'dns' | 'offline' | 'aborted' | 'unknown';
  request?: any;
}

/**
 * Determines if the provided error is of type NetworkError.
 *
 * @param {IntrigError} error - The error object to be checked.
 * @return {boolean} Returns true if the error is of type NetworkError, otherwise false.
 */
export function isNetworkError(error: IntrigError): error is NetworkError {
  return error.type === 'network';
}

/**
 * Creates a network error object with the specified reason and optional request details.
 *
 * @param {'timeout' | 'dns' | 'offline' | 'aborted' | 'unknown'} reason - The reason for the network error.
 * @param {any} [request] - Optional information about the network request that caused the error.
 * @return {NetworkError} An object representing the network error.
 */
export function networkError(
  reason: 'timeout' | 'dns' | 'offline' | 'aborted' | 'unknown',
  request?: any,
): NetworkError {
  return {
    type: 'network',
    reason,
    request,
  };
}

/**
 * Represents an error that occurs during request validation.
 *
 * This interface extends the \`IntrigErrorBase\` to provide
 * additional details about validation errors in the request.
 *
 * \`RequestValidationError\` includes a specific error type
 * identifier, details about the validation error, and information
 * about the fields that failed validation.
 *
 * The \`type\` property indicates the error type as 'request-validation'.
 * The \`error\` property holds the ZodError object with detailed validation
 * errors from the Zod library.
 * The \`fieldErrors\` property is a mapping of field names to an array
 * of validation error messages for that field.
 */
export interface RequestValidationError extends IntrigErrorBase {
  type: 'request-validation';
  error: ZodError;
}

/**
 * Checks if the given error is of type RequestValidationError.
 *
 * @param {IntrigError} error - The error object to be checked.
 * @return {boolean} Returns true if the error is a RequestValidationError; otherwise, false.
 */
export function isRequestValidationError(error: IntrigError): error is RequestValidationError {
  return error.type === 'request-validation';
}

/**
 * Constructs a RequestValidationError object, capturing details about validation errors.
 *
 * @param {ZodError} error - The primary Zod validation error object containing detailed error information.
 * @param {Record<string, string[]>} fieldErrors - An object mapping field names to arrays of validation error messages.
 * @return {RequestValidationError} An object representing the request validation error, including the error type, detailed error, and field-specific errors.
 */
export function requestValidationError(
  error: ZodError
): RequestValidationError {
  return {
    type: 'request-validation',
    error
  };
}

/**
 * Describes an error encountered during response validation, typically
 * when the structure or content of a response does not meet the expected schema.
 *
 * This interface extends the \`IntrigErrorBase\` to provide additional
 * details specific to validation issues.
 *
 * The \`type\` property is a discriminative field, always set to 'response-validation',
 * for identifying this specific kind of error.
 *
 * The \`error\` property contains a \`ZodError\` object, which provides structured
 * details about the validation failure, including paths and specific issues.
 *
 * The optional \`raw\` property may hold the unprocessed or unparsed response data,
 * which can be useful for debugging and troubleshooting.
 */
export interface ResponseValidationError extends IntrigErrorBase {
  type: 'response-validation';
  error: ZodError;
  // optional: raw/unparsed response for troubleshooting
  raw?: unknown;
}

/**
 * Determines if the provided error is of type ResponseValidationError.
 *
 * @param {IntrigError} error - The error object to be evaluated.
 * @return {boolean} Returns true if the error is a ResponseValidationError, otherwise false.
 */
export function isResponseValidationError(error: IntrigError): error is ResponseValidationError {
  return error.type === 'response-validation';
}

/**
 * Constructs a ResponseValidationError object to represent a response validation failure.
 *
 * @param {ZodError} error - The error object representing the validation issue.
 * @param {unknown} [raw] - Optional raw data related to the validation error.
 * @return {ResponseValidationError} An object containing the type of error, the validation error object, and optional raw data.
 */
export function responseValidationError(
  error: ZodError,
  raw?: unknown,
): ResponseValidationError {
  return {
    type: 'response-validation',
    error,
    raw,
  };
}

/**
 * Represents an error related to configuration issues.
 * ConfigError is an extension of IntrigErrorBase, designed specifically
 * to handle and provide details about errors encountered in application
 * configuration.
 *
 * @interface ConfigError
 * @extends IntrigErrorBase
 *
 * @property type - Identifies the error type as 'config'.
 * @property message - Describes the details of the configuration error encountered.
 */
export interface ConfigError extends IntrigErrorBase {
  type: 'config';
  message: string;
}

/**
 * Determines if the provided error is a configuration error.
 *
 * @param {IntrigError} error - The error object to be checked.
 * @return {boolean} Returns true if the error is of type 'ConfigError', otherwise false.
 */
export function isConfigError(error: IntrigError): error is ConfigError {
  return error.type === 'config';
}

/**
 * Generates a configuration error object with a specified error message.
 *
 * @param {string} message - The error message to be associated with the configuration error.
 * @return {ConfigError} The configuration error object containing the error type and message.
 */
export function configError(message: string): ConfigError {
  return {
    type: 'config',
    message,
  };
}

/**
 * Represents a union type for errors that may occur while handling HTTP requests,
 * network operations, request and response validations, or configuration issues.
 *
 * This type encompasses various error types to provide a unified representation
 * for different error scenarios during the execution of a program.
 *
 * Types:
 * - HttpError: Represents an error occurred in HTTP responses.
 * - NetworkError: Represents an error related to underlying network operations.
 * - RequestValidationError: Represents an error in request validation logic.
 * - ResponseValidationError: Represents an error in response validation logic.
 * - ConfigError: Represents an error related to configuration issues.
 */
export type IntrigError =
  | HttpError
  | NetworkError
  | RequestValidationError
  | ResponseValidationError
  | ConfigError;

/**
 * Represents an error state with additional contextual information.
 *
 * @typedef {Object} ErrorWithContext
 * @template T
 * @extends ErrorState<T>
 *
 * @property {string} source - The origin of the error.
 * @property {string} operation - The operation being performed when the error occurred.
 * @property {string} key - A unique key identifying the specific error instance.
 */
export interface ErrorWithContext<T = unknown>
  extends ErrorState<T> {
  source: string;
  operation: string;
  key: string;
}

/**
 * Represents an action in the network context.
 *
 * @template T - The type of data associated with the network action
 *
 * @property {NetworkState<any>} state - The current state of the network action
 * @property {string} key - The unique identifier for the network action
 */
export interface NetworkAction<T> {
  key: string;
  source: string;
  operation: string;
  state: NetworkState<T>;
  handled?: boolean;
}

type HookWithKey = {
  key: string;
};

export type UnitHookOptions =
  | { key?: string; fetchOnMount?: false; clearOnUnmount?: boolean }
  | {
      key?: string;
      fetchOnMount: true;
      params?: Record<string, any>;
      clearOnUnmount?: boolean;
    };
export type UnitHook = ((
  options: UnitHookOptions,
) => [
  NetworkState<never>,
  (params?: Record<string, any>) => DispatchState<any>,
  () => void,
]) &
  HookWithKey;
export type ConstantHook<T> = ((
  options: UnitHookOptions,
) => [
  NetworkState<T>,
  (params?: Record<string, any>) => DispatchState<any>,
  () => void,
]) &
  HookWithKey;

export type UnaryHookOptions<P> =
  | { key?: string; fetchOnMount?: false; clearOnUnmount?: boolean }
  | { key?: string; fetchOnMount: true; params: P; clearOnUnmount?: boolean };
export type UnaryProduceHook<P> = ((
  options?: UnaryHookOptions<P>,
) => [NetworkState<never>, (params: P) => DispatchState<any>, () => void]) &
  HookWithKey;
export type UnaryFunctionHook<P, T> = ((
  options?: UnaryHookOptions<P>,
) => [NetworkState<T>, (params: P) => DispatchState<any>, () => void]) &
  HookWithKey;

export type BinaryHookOptions<P, B> =
  | { key?: string; fetchOnMount?: false; clearOnUnmount?: boolean }
  | {
      key?: string;
      fetchOnMount: true;
      params: P;
      body: B;
      clearOnUnmount?: boolean;
    };
export type BinaryProduceHook<P, B> = ((
  options?: BinaryHookOptions<P, B>,
) => [
  NetworkState<never>,
  (body: B, params: P) => DispatchState<any>,
  () => void,
]) &
  HookWithKey;
export type BinaryFunctionHook<P, B, T> = ((
  options?: BinaryHookOptions<P, B>,
) => [
  NetworkState<T>,
  (body: B, params: P) => DispatchState<any>,
  () => void,
]) &
  HookWithKey;

export type IntrigHookOptions<P = undefined, B = undefined> =
  | UnitHookOptions
  | UnaryHookOptions<P>
  | BinaryHookOptions<P, B>;
export type IntrigHook<P = undefined, B = undefined, T = any> =
  | UnitHook
  | ConstantHook<T>
  | UnaryProduceHook<P>
  | UnaryFunctionHook<P, T>
  | BinaryProduceHook<P, B>
  | BinaryFunctionHook<P, B, T>;

export interface AsyncRequestOptions {
  hydrate?: boolean;
  key?: string;
}

// Async hook variants for transient (promise-returning) network requests

export type UnaryFunctionAsyncHook<P, T> = (() => [
  (params: P) => Promise<T>,
  () => void,
]) & {
  key: string;
};

export type BinaryFunctionAsyncHook<P, B, T> = (() => [
  (body: B, params: P) => Promise<T>,
  () => void,
]) & {
  key: string;
};

export type UnaryProduceAsyncHook<P> = (() => [
  (params: P) => Promise<void>,
  () => void,
]) & {
  key: string;
};

export type BinaryProduceAsyncHook<P, B> = (() => [
  (body: B, params: P) => Promise<void>,
  () => void,
]) & {
  key: string;
};

/**
 * Represents the dispatch state of a process.
 *
 * @template T The type of the state information.
 * @interface
 *
 * @property {string} state The current state of the dispatch process.
 */
export interface DispatchState<T> {
  state: string;
}

/**
 * Represents a successful dispatch state.
 *
 * @template T - Type of the data associated with the dispatch.
 *
 * @extends DispatchState<T>
 *
 * @property {string} state - The state of the dispatch, always 'success'.
 */
export interface SuccessfulDispatch<T> extends DispatchState<T> {
  state: 'success';
}

/**
 * Indicates a successful dispatch state.
 *
 * @return {DispatchState<T>} An object representing a successful state.
 */
export function successfulDispatch<T>(): DispatchState<T> {
  return {
    state: 'success',
  };
}

/**
 * Determines if the provided dispatch state represents a successful dispatch.
 *
 * @param {DispatchState<T>} value - The dispatch state to check.
 * @return {value is SuccessfulDispatch<T>} - True if the dispatch state indicates success, false otherwise.
 */
export function isSuccessfulDispatch<T>(
  value: DispatchState<T>,
): value is SuccessfulDispatch<T> {
  return value.state === 'success';
}

/**
 * ValidationError interface represents a specific type of dispatch state
 * where a validation error has occurred.
 *
 * @typeparam T - The type of the data associated with this dispatch state.
 */
export interface ValidationError<T> extends DispatchState<T> {
  state: 'validation-error';
  error: any;
}

/**
 * Generates a ValidationError object.
 *
 * @param error The error details that caused the validation to fail.
 * @return The ValidationError object containing the error state and details.
 */
export function validationError<T>(error: any): ValidationError<T> {
  return {
    state: 'validation-error',
    error,
  };
}

/**
 * Determines if a provided DispatchState object is a ValidationError.
 *
 * @param {DispatchState<T>} value - The DispatchState object to evaluate.
 * @return {boolean} - Returns true if the provided DispatchState object is a ValidationError, otherwise returns false.
 */
export function isValidationError<T>(
  value: DispatchState<T>,
): value is ValidationError<T> {
  return value.state === 'validation-error';
}

  `
}
