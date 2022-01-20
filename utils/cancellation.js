import { Observable } from "rxjs";

/**
 * Creates a cancellation token source.
 */
export function createCancellationTokenSource() {
  let cancelled = false;
  let disposed = false;
  let cancelHandlers = [];
  let disposeHandlers = [];

  const token = createCancellationToken(
    () => cancelled,
    addCancellationHandler,
    addDisposeHandler
  );

  return {
    cancel,
    dispose,
    token,
    onDispose: addDisposeHandler,
  };

  /**
   * Cancels the token.
   */
  function cancel() {
    if (!cancelled && !disposed) {
      cancelled = true;
      cancelHandlers.forEach((h) => h());
      dispose();
    }
  }

  /**
   * Disposes of all cancellation and dispose handlers.
   */
  function dispose() {
    disposed = true;
    cancelHandlers = [];

    const disposeRefs = disposeHandlers;
    disposeHandlers = [];
    disposeRefs.forEach((h) => h());
  }

  /**
   * Adds a cancellation handler.
   *
   * @param {*} handler
   */
  function addCancellationHandler(handler) {
    if (disposed) {
      if (cancelled) {
        handler();
      }
      return noop;
    }

    cancelHandlers.push(handler);
    return () => {
      const idx = cancelHandlers.indexOf(handler);
      if (idx !== -1) {
        cancelHandlers.splice(idx, 1);
      }
    };
  }

  /**
   * Adds a dispose handler.
   *
   * @param {*} handler
   */
  function addDisposeHandler(handler) {
    if (disposed) {
      handler();
      return noop;
    }

    disposeHandlers.push(handler);
    return () => {
      const idx = disposeHandlers.indexOf(handler);
      if (idx !== -1) {
        disposeHandlers.splice(idx, 1);
      }
    };
  }
}

/**
 * A cancellation token that never cancels.
 */
export const defaultCancellationToken = createCancellationToken(
  () => false,
  () => () => undefined,
  invokeOnRegister
);

export const cancelledCancellationToken = createCancellationToken(
  () => true,
  invokeOnRegister,
  invokeOnRegister
);

export function combineCancellationTokens(...tokens) {
  const source = createCancellationTokenSource();
  if (tokens.some((t) => t.isCancelled)) {
    source.cancel();
  } else {
    tokens.forEach((t) => t.onCancel(source.cancel));
  }
  return source.token;
}

/**
 * Creates a cancellation token.
 *
 * @param {() => boolean)} isCancelled a function for getting whether the token has been cancelled.
 * @param {(fn) => () => undefined)} onCancel registers a cancellation handler, and returns a function for de-registering it.
 */
function createCancellationToken(isCancelled, onCancel, onDispose) {
  const cancelPromise = new Promise(onCancel);

  const cancelled$ = new Observable((observer) => {
    const removeCancelHandler = onCancel(() => {
      observer.next();
    });

    const removeDisposeHandler = onDispose(() => {
      observer.complete();
    });

    return () => {
      removeCancelHandler();
      removeDisposeHandler();
    };
  });

  return {
    /**
     * Determines whether the token has been cancelled.
     */
    get isCancelled() {
      return isCancelled();
    },
    onCancel,
    onDispose,
    throwIfCancelled,
    thenThrowIfCancelled,
    asObservable,
    waitForCancellation,
    race,
  };

  /**
   * Throws if the token has been cancelled.
   */
  function throwIfCancelled(msg) {
    if (isCancelled()) {
      throw new Cancellation(msg);
    }
  }

  function asObservable() {
    return cancelled$;
  }

  /**
   * Higher-order function that returns a `.then`-style handler that checks for cancellation.
   *
   * @example
   *  somePromise
   *  .then(token.thenThrowIfCancelled('Cancelled after such and such'))
   *  .then(result => { ... })
   */
  function thenThrowIfCancelled(msg) {
    return (result) => {
      throwIfCancelled(msg);
      return result;
    };
  }

  /**
   * Waits for the cancellation and then throws a Cancelled error.
   * @param {string} msg
   */
  function waitForCancellation(msg) {
    return cancelPromise.then(thenThrowIfCancelled());
  }

  /**
   *
   * @param {Promise<T>} promise
   * @returns {Promise<T | undefined>}
   */
  function race(promise) {
    return new Promise((resolve, reject) => {
      const dispose = onCancel(() => resolve(undefined));
      promise.then(
        (r) => {
          dispose();
          resolve(r);
        },
        (err) => {
          reject(err);
          dispose();
        }
      );
    });
  }
}

/**
 * Thrown when cancelled.
 */
export class Cancellation extends Error {
  constructor(message = "The operation was cancelled.") {
    super(message);
    if ("captureStackTrace" in Error) {
      Error.captureStackTrace(this, this.constructor);
    }
    this.message = message;
    this.name = "Cancelled";
  }

  static ignore(valueToReturnOnCatch = null) {
    return ignoreError(this)(valueToReturnOnCatch);
  }
}

/**
 * Utility for ignoring certain errors and returning a default value.
 *
 * @param {Array<new () => Error>} errorClasses
 */
function ignoreError(...errorClasses) {
  return function createIgnoreFn(valToReturnOnCatch) {
    return function ignoreImpl(err) {
      if (errorClasses.some((C) => err instanceof C)) {
        return valToReturnOnCatch;
      }
      throw err;
    };
  };
}

/**
 * Invokes the callback when registered. Used
 * for the predefined cancellation tokens
 * @param cb
 */
function invokeOnRegister(cb) {
  cb();
  return noop;
}

/**
 * No-op.
 */
function noop() {
  //
}
