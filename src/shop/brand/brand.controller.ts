import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    FileTypeValidator,
    Get,
    MaxFileSizeValidator,
    Param,
    ParseFilePipe,
    Post,
    Put,
    Query,
    UploadedFile,
    UseGuards,
    UseInterceptors,
    ValidationPipe,
} from '@nestjs/common';

import { Public, Roles } from '@common/decorators';
import { FileInterceptor } from '@nestjs/platform-express';
import { RolesGuard } from '@auth/guards/role.guard';
import { Role } from '@prisma/client';
import { CreateBrandDto } from './dto';
import { BrandService } from './brand.service';

@Controller('brand')
export class BrandController {
    constructor(private brandService: BrandService) {}

    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    @Post()
    @UseInterceptors(FileInterceptor('img'))
    async create(
        @Body(new ValidationPipe()) dto: CreateBrandDto,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }),
                    new MaxFileSizeValidator({ maxSize: 2600000 }),
                ],
                fileIsRequired: false,
            }),
        )
        img?: Express.Multer.File,
    ) {
        const brand = await this.brandService.create(dto, img);
        return brand;
    }

    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    @Put(':id')
    @UseInterceptors(FileInterceptor('img'))
    async update(
        @Body(new ValidationPipe()) dto: any,
        @Param('id') id: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }),
                    new MaxFileSizeValidator({ maxSize: 2600000 }),
                ],
                fileIsRequired: false,
            }),
        )
        img?: Express.Multer.File,
    ) {
        const brand = await this.brandService.update(id, dto, img);
        return brand;
    }

    @Public()
    @Get()
    async getList(@Query() params: { filter?: string; range?: string; sort?: string }) {
        const filters_all = { filter: '', sort: '', range: '' };
        filters_all.filter = params?.filter ?? '{}';
        filters_all.sort = params?.sort ?? '[]';
        filters_all.range = params?.range ?? '[]';
        const { brands, count } = await this.brandService.getList(
            JSON.parse(filters_all.filter),
            JSON.parse(filters_all.sort),
            JSON.parse(filters_all.range),
        );
        return { data: brands, count };
    }

    @Public()
    @Get(':id')
    async getOne(@Param('id') id: string) {
        if (isNaN(Number(id))) {
            throw new BadRequestException('Не верный формат парамера id.');
        }
        const brand = await this.brandService.getOne(Number(id));
        return brand;
    }

    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    @Delete(':id')
    async delete(@Param('id') id: string) {
        if (isNaN(Number(id))) {
            throw new BadRequestException('Не верный формат парамера id.');
        }
        const del = await this.brandService.delete(Number(id));
        return del;
    }

    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    @Delete()
    async deleteMany(@Body() ids: number[]) {
        const delElements = await this.brandService.deleteMany(ids);
        return delElements;
    }
}
