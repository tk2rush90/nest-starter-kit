import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { configs } from './configs/configs';
import { join } from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { utilities, WinstonModule } from 'nest-winston';
import { format, transports } from 'winston';
import 'winston-daily-rotate-file';
import { Account } from './entities/account';
import { SignedAccount } from './entities/signed-account';
import { AuthApiModule } from './modules/auth-api/auth-api.module';
import { UploadDetail } from './entities/upload-detail';
import { FileApiModule } from './modules/file-api/file-api.module';
import { ProfileApiModule } from './modules/profile-api/profile-api.module';
import { CustomNamingStrategy } from './utils/typeorm';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: configs.paths.assets,
      serveRoot: '/assets',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: configs.db.host,
      port: configs.db.port,
      database: configs.db.database,
      username: configs.db.username,
      password: configs.db.password,
      entities: [Account, SignedAccount, UploadDetail],
      migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
      migrationsRun: true,
      synchronize: !configs.etc.production,
      namingStrategy: new CustomNamingStrategy(),
    }),
    WinstonModule.forRoot({
      transports: [
        new transports.Console({
          format: format.combine(
            format.timestamp(),
            format.ms(),
            utilities.format.nestLike(configs.etc.appName, {
              colors: true,
              prettyPrint: true,
            }),
          ),
        }),
        new transports.DailyRotateFile({
          filename: join(configs.paths.logs, `%DATE%.${configs.etc.appName}.log`),
          datePattern: 'YYYYMMDD',
          json: false,
          maxFiles: '3d',
          format: format.combine(
            format.timestamp(),
            format.ms(),
            utilities.format.nestLike(configs.etc.appName, {
              colors: false,
              prettyPrint: true,
            }),
          ),
        }),
      ],
    }),
    AuthApiModule,
    FileApiModule,
    ProfileApiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
