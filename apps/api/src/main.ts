import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import type { Env } from './config/env.js';

const app = configureApp(await NestFactory.create<NestExpressApplication>(AppModule));
const port = app.get<ConfigService<Env, true>>(ConfigService).get('PORT', { infer: true });

await app.listen(port);
Logger.log(`API ready on http://localhost:${port}/api/v1/health`, 'Bootstrap');
