import { Module } from '@nestjs/common';

import { FilesModule } from 'src/files/files.module';
import { BrandService } from './brand.service';
import { BrandController } from './brand.controller';

@Module({
    providers: [BrandService],
    controllers: [BrandController],
    exports: [BrandService],
    imports: [FilesModule],
})
export class BrandModule {}
