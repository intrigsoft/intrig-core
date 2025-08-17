# Hook Conventions

Intrig’s generated hooks follow a consistent set of conventions designed to make your code more readable, predictable for experienced users, and easy to maintain. By understanding these conventions, you can quickly navigate the SDK, identify the correct hook for a task, and apply it effectively in your React components.

## Naming Convention

Each hook name is derived directly from the **operationId** in your API specification, ensuring a one-to-one mapping between backend operations and frontend calls. This removes guesswork and keeps frontend and backend teams aligned.

### Examples

| operationId        | Hook Name             |
| ------------------ | --------------------- |
| getEmployee        | useGetEmployee        |
| createOrder        | useCreateOrder        |
| listProducts       | useListProducts       |
| deleteEmployeeById | useDeleteEmployeeById |
| searchEmployees    | useSearchEmployees    |

**Notes**

* If an **operationId changes**, the **hook name changes**, and your imports will fail until updated (TypeScript will surface the break).
* Avoid relying on path/method for naming. The operationId is the single source of naming truth.
* Consistency matters: prefer verbs like `get*`, `create*`, `update*`, `delete*`, `list*`, `search*` in your API spec to keep hook names intuitive.

## Hook Signature

### Stateful Hooks

A typical stateful hook usage looks like:

```ts
const [sourceResp, fetchSource, clearSource] = useGetSourcesById();
```

1. **sourceResp** – A `NetworkState` object representing the current state, including status, data, and errors.
2. **fetchSource** – The function to trigger the API request. Its signature depends on whether the endpoint requires a body:

    * Without a body: `(params) => DispatchState`
    * With a body: `(body, params) => DispatchState`
    * `body` is the request body.
    * `params` is an object containing path variables and documented query parameters. Any additional properties will be added as query parameters.
    * `DispatchState` indicates whether the dispatch was successful or failed; it’s best practice to keep handling of this concise.
    * **All parameters, body, and the returned responses are strongly typed**, and Intrig-generated types are always used.
3. **clearSource** – Cancels the current execution (if any) and resets the state to initial for stateful hooks.

### Stateless Hooks

A typical stateless hook usage looks like:

```ts
const [fetchSource, clearSource] = useGetSourceByIdAsync();
```

1. **fetchSource** – An async function returning the response value. Parameters follow the same conventions as the stateful `fetchSource` function.
2. **clearSource** – Cancels the current execution. For stateful hooks, it also resets the state to initial.

Any other generated hook in Intrig will follow one of these two base hook types (stateful or stateless), ensuring predictable usage patterns across your codebase.

## Hook Options

Hook options are mostly applicable for stateful hooks and allow you to control behavior during the component lifecycle or at call time. All options are optional unless otherwise specified.

| Option           | Description                                                                                           | Required | Default   |
| ---------------- | ----------------------------------------------------------------------------------------------------- | -------- | --------- |
| `key`            | Unique identifier for the network call result.                                                        | No       | `default` |
| `clearOnUnmount` | Ensures the network state resets to initial when the component unmounts.                              | No       | `false`   |
| `fetchOnMount`   | Executes the network call when the component mounts.                                                  | No       | `false`   |
| `params`         | Parameters to be used in `fetch`. Mandatory if `fetchOnMount` is `true`.                              | Yes\*    | —         |
| `body`           | Request body to be used in `fetch`. Mandatory if `fetchOnMount` is `true` and the request has a body. | Yes\*    | —         |

\*Conditional requirement based on `fetchOnMount`.

## Integration with IntrigProvider

All hooks use the **IntrigProvider** for executing network calls and keeping track of state, consuming configuration and state storage from it. This centralizes network communication logic, ensures uniformity in how requests are made, and provides consistent state management across the application without requiring any additional setup.

By following these conventions, Intrig ensures that every hook you use is consistent, type-safe, and easy to reason about across your codebase.

---

**Next Steps:**

* Learn about [State Management](/docs/react/core-concepts/state-management) to see how hook states are stored and shared.
* Explore [Stateful vs Stateless Hooks](/docs/react/core-concepts/stateful-vs-stateless) for deeper insight into choosing the right hook for each use case.
