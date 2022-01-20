import { Observable, from } from "rxjs";
import { createCancellationTokenSource } from "./cancellation.js";

/**
 * Calls `factory` with a cancellation token to get an observable input and subscribes to it, while
 * managing the cancellation token. Cancellations are not thrown as errors.
 */
export function withCancellation(factory) {
  return new Observable((subscriber) => {
    let cancellation = createCancellationTokenSource();
    const subscription = from(factory(cancellation.token)).subscribe({
      complete: subscriber.complete.bind(subscriber),
      error: subscriber.error.bind(subscriber),
      next: (value) => {
        subscriber.next(value);
      },
    });
    return () => {
      cancellation.cancel();
      cancellation = createCancellationTokenSource();
      subscription.unsubscribe();
    };
  });
}
