-- Runs ONCE, when the database volume is created for the first time.
-- A separate database for automated tests, so tests can never touch your real data.
CREATE DATABASE expenses_test;
