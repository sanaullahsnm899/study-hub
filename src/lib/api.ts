import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./auth";
import { StorageError } from "./storage";
import { fieldErrors } from "./validation";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data as object, init);
}

export function fail(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

/**
 * Wrap a route handler so nothing leaks a stack trace to the client.
 * Known error shapes map to useful status codes; everything else is a 500.
 */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) return fail(err.status, err.message, err.details);
      if (err instanceof ZodError) return fail(422, "Please check the highlighted fields.", fieldErrors(err));
      if (err instanceof StorageError) return fail(err.status, err.message);
      console.error("[api]", err);
      return fail(500, "Something went wrong on our side. Please try again.");
    }
  };
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Expected a JSON body.");
  }
}
