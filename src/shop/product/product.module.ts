import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { TypeModule } from '../type/type.module';
import { FilesModule } from 'src/files/files.module';
import { BrandModule } from '../brand/brand.module';
import { OptionModule } from '../option/option.module';

@Module({
    providers: [ProductService],
    controllers: [ProductController],
    imports: [TypeModule, BrandModule, OptionModule, FilesModule],
})
export class ProductModule {}
