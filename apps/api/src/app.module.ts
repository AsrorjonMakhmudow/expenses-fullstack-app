import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ROOT_ENV_FILE, validateEnv } from './config/env.js';
import { DatabaseModule } from './infra/database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ExpensesModule } from './modules/expenses/expenses.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { ImportsModule } from './modules/imports/imports.module.js';

/**
 * The root module: plugs all features together.
 * Add a feature = add its module here. Remove a feature = delete its folder + its line here.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ROOT_ENV_FILE, validate: validateEnv }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    ExpensesModule,
    ImportsModule,
  ],
})
export class AppModule {}
