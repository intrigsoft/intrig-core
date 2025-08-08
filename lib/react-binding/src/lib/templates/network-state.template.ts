import {typescript} from "common";
import * as path from 'path'

export function reactNetworkStateTemplate(_path: string) {
  const ts = typescript(path.resolve(_path, "src", "network-state.tsx"))
  return ts`import { ZodError } from 'zod';

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
export interface NetworkState<T = unknown, E = unknown> {
  state: 'init' | 'pending' | 'success' | 'error';
}

/**
 * Network call is not yet started
 */
export interface InitState<T, E = unknown> extends NetworkState<T, E> {
  state: 'init';
}

/**
 * Checks whether the state is init state
 * @param state
 */
export function isInit<T, E = unknown>(state: NetworkState<T, E>): state is InitState<T, E> {
  return state.state === 'init';
}

/**
 * Initializes a new state.
 *
 * @template T The type of the state.
 * @return {InitState<T>} An object representing the initial state.
 */
export function init<T, E = unknown>(): InitState<T, E> {
  return {
    state: 'init',
  };
}

/**
 * Network call is not yet completed
 */
export interface PendingState<T, E = unknown> extends NetworkState<T, E> {
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
export function isPending<T, E = unknown>(state: NetworkState<T, E>): state is PendingState<T, E> {
  return state.state === 'pending';
}

/**
 * Generates a PendingState object with a state of "pending".
 *
 * @return {PendingState<T>} An object representing the pending state.
 */
export function pending<T, E = unknown>(
  progress: Progress | undefined = undefined,
  data: T | undefined = undefined
): PendingState<T, E> {
  return {
    state: 'pending',
    progress,
    data,
  };
}

/**
 * Network call is completed with success state
 */
export interface SuccessState<T, E = unknown> extends NetworkState<T, E> {
  state: 'success';
  data: T;
}

/**
 * Checks whether the state is success response
 * @param state
 */
export function isSuccess<T, E = unknown>(state: NetworkState<T, E>): state is SuccessState<T, E> {
  return state.state === 'success';
}

/**
 * Creates a success state object with the provided data.
 *
 * @param {T} data - The data to be included in the success state.
 * @return {SuccessState<T>} An object representing a success state containing the provided data.
 */
export function success<T, E = unknown>(data: T): SuccessState<T, E> {
  return {
    state: 'success',
    data,
  };
}

/**
 * Network call is completed with error response
 */
export interface ErrorState<T, E = unknown> extends NetworkState<T, E> {
  state: 'error';
  error: E;
  statusCode?: number;
  request?: any;
}

/**
 * Checks whether the state is error state
 * @param state
 */
export function isError<T, E = unknown>(state: NetworkState<T, E>): state is ErrorState<T, E> {
  return state.state === 'error';
}

/**
 * Constructs an ErrorState object representing an error.
 *
 * @param {any} error - The error object or message.
 * @param {string} [statusCode] - An optional status code associated with the error.
 * @return {ErrorState<T>} An object representing the error state.
 */
export function error<T, E = unknown>(
  error: E,
  statusCode?: number,
  request?: any
): ErrorState<T> {
  return {
    state: 'error',
    error,
    statusCode,
    request,
  };
}

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
export interface ErrorWithContext<T = unknown, E = unknown> extends ErrorState<T, E> {
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
export interface NetworkAction<T, E> {
  key: string;
  source: string;
  operation: string;
  state: NetworkState<T, E>;
  handled?: boolean;
}

type HookWithKey = {
  key: string;
}


export type UnitHookOptions = { key?: string; fetchOnMount?: false; clearOnUnmount?: boolean } | { key?: string; fetchOnMount: true; params?: Record<string, any>; clearOnUnmount?: boolean };
export type UnitHook<E = unknown> = ((options: UnitHookOptions) => [NetworkState<never, E>, (params?: Record<string, any>) => DispatchState<any>, () => void]) & HookWithKey;
export type ConstantHook<T, E = unknown> = ((options: UnitHookOptions) => [NetworkState<T, E>, (params?: Record<string, any>) => DispatchState<any>, () => void]) & HookWithKey;

export type UnaryHookOptions<P> = { key?: string, fetchOnMount?: false, clearOnUnmount?: boolean } | { key?: string, fetchOnMount: true, params: P, clearOnUnmount?: boolean };
export type UnaryProduceHook<P, E = unknown> = ((options?: UnaryHookOptions<P>) => [NetworkState<never, E>, (params: P) => DispatchState<any>, () => void]) & HookWithKey;
export type UnaryFunctionHook<P, T, E = unknown> = ((options?: UnaryHookOptions<P>) => [NetworkState<T, E>, (params: P) => DispatchState<any>, () => void]) & HookWithKey;

export type BinaryHookOptions<P, B> = { key?: string, fetchOnMount?: false, clearOnUnmount?: boolean } | { key?: string, fetchOnMount: true, params: P, body: B, clearOnUnmount?: boolean };
export type BinaryProduceHook<P, B, E = unknown> = ((options?: BinaryHookOptions<P, B>) => [NetworkState<never, E>, (body: B, params: P) => DispatchState<any>, () => void]) & HookWithKey;
export type BinaryFunctionHook<P, B, T, E = unknown> = ((options?: BinaryHookOptions<P, B>) => [NetworkState<T, E>, (body: B, params: P) => DispatchState<any>, () => void]) & HookWithKey;

export type IntrigHookOptions<P = undefined, B = undefined> = UnitHookOptions | UnaryHookOptions<P> | BinaryHookOptions<P, B>;
export type IntrigHook<P = undefined, B = undefined, T = any, E = unknown> = UnitHook<E> | ConstantHook<T, E> | UnaryProduceHook<P, E> | UnaryFunctionHook<P, T, E> | BinaryProduceHook<P, B, E> | BinaryFunctionHook<P, B, T, E>;

export interface AsyncRequestOptions {
  hydrate?: boolean;
  key?: string;
}

// Async hook variants for transient (promise-returning) network requests

export type UnaryFunctionAsyncHook<P, T, E = unknown> = ((
) => [(params: P) => Promise<T>, () => void]) & {
  key: string;
};

export type BinaryFunctionAsyncHook<P, B, T, E = unknown> = ((
) => [(body: B, params: P) => Promise<T>, () => void]) & {
  key: string;
};

export type UnaryProduceAsyncHook<P, E = unknown> = ((
) => [(params: P) => Promise<void>, () => void]) & {
  key: string;
};

export type BinaryProduceAsyncHook<P, B, E = unknown> = ((
) => [(body: B, params: P) => Promise<void>, () => void]) & {
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
  state: string
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
export interface SuccessfulDispatch<T> extends DispatchState<T>{
  state: 'success'
}

/**
 * Indicates a successful dispatch state.
 *
 * @return {DispatchState<T>} An object representing a successful state.
 */
export function successfulDispatch<T>(): DispatchState<T> {
  return {
    state: 'success'
  }
}

/**
 * Determines if the provided dispatch state represents a successful dispatch.
 *
 * @param {DispatchState<T>} value - The dispatch state to check.
 * @return {value is SuccessfulDispatch<T>} - True if the dispatch state indicates success, false otherwise.
 */
export function isSuccessfulDispatch<T>(value: DispatchState<T>): value is SuccessfulDispatch<T> {
  return value.state === 'success'
}

/**
 * ValidationError interface represents a specific type of dispatch state
 * where a validation error has occurred.
 *
 * @typeparam T - The type of the data associated with this dispatch state.
 */
export interface ValidationError<T> extends DispatchState<T>{
  state: 'validation-error'
  error: any
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
    error
  }
}

/**
 * Determines if a provided DispatchState object is a ValidationError.
 *
 * @param {DispatchState<T>} value - The DispatchState object to evaluate.
 * @return {boolean} - Returns true if the provided DispatchState object is a ValidationError, otherwise returns false.
 */
export function isValidationError<T>(value: DispatchState<T>): value is ValidationError<T> {
  return value.state === 'validation-error'
}

/**
 * Represents an error structure with a specified type and associated data.
 *
 * @template T - The type of the data associated with the error.
 * @template E - The type of the error detail.
 *
 * @property {string} type - A string representing the type of the error.
 */
export interface IntrigError<T, E> {
  type: string
}

/**
 * Represents an error encountered during a network operation.
 * Extends from the \`IntrigError\` interface, adding network-specific properties.
 *
 * @template T - The type of the intrinsic data associated with the error.
 * @template E - The type of the error details, defaulting to \`unknown\`.
 *
 * @property {string} type - A constant property representing the error type, always set to 'network'.
 * @property {string} statusCode - A string representation of the HTTP status code associated with the error, indicating the nature of the network failure.
 * @property {E} error - The detailed error information specific to the failure, type extends from the generic E, allowing flexibility in the error details.
 * @property {any} request - The request object that was attempted when the network error occurred, providing context for what operation failed.
 */
export interface NetworkError<T, E = unknown> extends IntrigError<T, E>{
  type: 'network'
  statusCode: string
  error: E
  request: any
}

/**
 * Constructs a network error object.
 *
 * @param error The error object corresponding to the network request.
 * @param statusCode A string representing the HTTP status code returned.
 * @param request The request object associated with the network operation.
 * @return A NetworkError object containing the error type, status code, error details, and the original request.
 */
export function networkError<T, E>(error: E, statusCode: string, request: any): NetworkError<T, E> {
  return {
    type: 'network',
    statusCode,
    error,
    request
  }
}

/**
 * Determines if the provided IntrigError is of type 'network'.
 *
 * @param {IntrigError<T, E>} value - The error value to check the type of.
 * @return {boolean} - Returns true if the error is of type 'network', otherwise false.
 */
export function isNetworkError<T, E>(value: IntrigError<T, E>): value is NetworkError<T, E> {
  return value.type === 'network'
}

/**
 * Interface representing a request validation error.
 *
 * This error occurs when a validation process on a request fails. It extends the IntrigError interface
 * by adding specific properties related to request validation.
 *
 * @template T - The type of the data associated with the error.
 * @template E - The optional type of additional error information. Defaults to unknown.
 *
 * @extends IntrigError<T, E>
 *
 * @property {string} type - A string literal indicating the error type as 'request-validation'.
 * @property {ZodError} error - An instance of ZodError containing detailed validation error information.
 */
export interface RequestValidationError<T, E = unknown> extends IntrigError<T, E>{
  type: 'request-validation'
  error: ZodError
}

/**
 * Constructs a RequestValidationError object encapsulating the ZodError.
 *
 * @param {ZodError} error - The error object resulting from Zod schema validation.
 * @return {RequestValidationError<T, E>} A RequestValidationError object containing the validation error information.
 */
export function requestValidationError<T, E>(error: ZodError): RequestValidationError<T, E> {
  return {
    type: 'request-validation',
    error
  }
}

/**
 * Determines if a given error is of type RequestValidationError.
 *
 * @param value The error object to check, which implements the IntrigError interface.
 * @return A boolean indicating whether the error is a RequestValidationError.
 */
export function isRequestValidationError<T, E>(value: IntrigError<T, E>): value is RequestValidationError<T, E> {
  return value.type === 'request-validation'
}

/**
 * ResponseValidationError interface is designed to extend the capabilities of the IntrigError interface,
 * specifically for handling errors related to response validation.
 *
 * @template T - Represents the type of the data or payload associated with the error.
 * @template E - Represents the type of any additional error information. Defaults to unknown.
 *
 * @extends IntrigError
 *
 * @property type - A string literal that identifies the type of error as 'response-validation'.
 * @property error - An instance of ZodError representing the validation error encountered.
 */
export interface ResponseValidationError<T, E = unknown> extends IntrigError<T, E>{
  type: 'response-validation'
  error: ZodError
}

/**
 * Constructs a ResponseValidationError object with a specified error.
 *
 * @param {ZodError} error - The validation error encountered during response validation.
 * @return {ResponseValidationError<T, E>} An error object containing the type of error and the validation error details.
 */
export function responseValidationError<T, E>(error: ZodError): ResponseValidationError<T, E> {
  return {
    type: 'response-validation',
    error
  }
}

/**
 * Determines if the given error is a response validation error.
 *
 * @param {IntrigError<T, E>} value - The error object to assess.
 * @return {boolean} True if the error is a response validation error, otherwise false.
 */
export function isResponseValidationError<T, E>(value: IntrigError<T, E>): value is ResponseValidationError<T, E> {
  return value.type === 'response-validation'
}

  `
}
