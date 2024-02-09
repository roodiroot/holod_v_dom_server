import { ProductService } from './product.service';
import { Public, Roles } from '@common/decorators';
import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
    ValidationPipe,
} from '@nestjs/common';
import { CreateProductDto, UpdateProductDto } from './dto';
import { RolesGuard } from '@auth/guards/role.guard';
import { Role } from '@prisma/client';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FileSizeValidationPipe } from './guards/file.guard';

@Controller('product')
export class ProductController {
    constructor(private productService: ProductService) {}

    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    // @UseInterceptors(
    //     FileFieldsInterceptor([
    //         // { name: 'img', maxCount: 4 },
    //         { name: 'logo', maxCount: 1 },
    //     ]),
    // )
    @Post()
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'img', maxCount: 4 },
            { name: 'logo', maxCount: 1 },
        ]),
    )
    async create(
        @UploadedFiles(new FileSizeValidationPipe())
        files: { img: Express.Multer.File[]; logo: Express.Multer.File[] },
        @Body(new ValidationPipe()) dto: CreateProductDto,
    ) {
        const logo = files?.logo?.length ? files.logo[0] : undefined;
        const product = await this.productService.create(dto, files?.img, logo);
        return product;
    }

    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'img', maxCount: 4 },
            { name: 'logo', maxCount: 1 },
        ]),
    )
    @Put(':id')
    async update(
        @Param('id') id: string,
        @UploadedFiles(new FileSizeValidationPipe())
        files: { img: Express.Multer.File[]; logo: Express.Multer.File[] },
        @Body(new ValidationPipe()) dto: UpdateProductDto,
    ) {
        const logo = files?.logo?.length ? files.logo[0] : undefined;
        const product = await this.productService.update(id, dto, files?.img, logo);
        return product;
    }

    @Public()
    @Get()
    async getList(@Query() params: { filter: string; sort: string; range: string }) {
        console.log(new Date(), 'get list');
        const filters_all = { filter: '', sort: '', range: '' };
        filters_all.filter = params?.filter ?? '{}';
        filters_all.sort = params?.sort ?? '[]';
        filters_all.range = params?.range ?? '[]';
        const { products, count } = await this.productService.getList(
            JSON.parse(filters_all.filter) ?? null,
            JSON.parse(filters_all.sort) ?? null,
            JSON.parse(filters_all.range) ?? null,
        );
        return { data: products, count };
    }

    @Public()
    @Get(':id')
    async getOne(@Param('id') id: string) {
        console.log(new Date(), 'get-: ' + id);
        const product = await this.productService.getOne(id);
        return product;
    }

    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    @Delete(':id')
    async delete(@Param('id') id: string) {
        if (isNaN(Number(id))) {
            throw new BadRequestException('Не верный формат парамера id.');
        }
        const del = await this.productService.delete(id);
        return del;
    }

    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    @Delete()
    async deleteMany(@Body() ids: string[]) {
        const delElements = await this.productService.deleteMany(ids);
        return delElements;
    }
}
