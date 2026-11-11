/** "What time is it?" as a dependency, so tests can jump 15 days ahead. */
export abstract class Clock {
  abstract now(): Date;
}

export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}
