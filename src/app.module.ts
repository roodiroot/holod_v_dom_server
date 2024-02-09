import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { FilesModule } from './files/files.module';

import { TypeModule } from './shop/type/type.module';
import { ProductModule } from './shop/product/product.module';
import { FilesService } from './files/files.service';
import { BrandModule } from './shop/brand/brand.module';
import { OptionModule } from './shop/option/option.module';

@Module({
    imports: [
        UserModule,
        PrismaModule,
        AuthModule,
        ConfigModule.forRoot({ isGlobal: true }),
        FilesModule,
        TypeModule,
        BrandModule,
        ProductModule,
        OptionModule,
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
        FilesService,
    ],
})
export class AppModule {}
