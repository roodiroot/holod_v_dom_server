import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';

import { FilesService } from 'src/files/files.service';
import { CreateBrandDto } from './dto';

@Injectable()
export class BrandService {
    constructor(private prismaService: PrismaService, private filesService: FilesService) {}

    async create(dto: CreateBrandDto, img?: Express.Multer.File) {
        const curent_name = await this.getOneByName(dto.name);
        if (curent_name) {
            throw new BadRequestException('Тип с таким именем уже существует');
        }
        let img_name = '';
        if (img) {
            img_name = await this.filesService.createFile(img);
        }
        const brand = await this.prismaService.brand.upsert({
            where: { name: dto.name },
            update: {
                name: dto.name ?? undefined,
                description: dto?.description ?? undefined,
                img: img_name ?? undefined,
            },
            create: {
                name: dto.name,
                description: dto?.description,
                img: img_name === '' ? undefined : img_name,
            },
        });
        return brand;
    }

    async update(id: string, dto: any, img?: Express.Multer.File) {
        const curent_id = await this.getOne(Number(id));
        if (!curent_id) {
            throw new BadRequestException('Бренд с таким id не существует');
        }
        const curent_name = await this.getOneByName(dto.name);
        if (curent_name?.id !== Number(id)) {
            throw new BadRequestException('Тип с таким именем уже существует');
        }
        let img_name = '';
        if (img) {
            img_name = await this.filesService.createFile(img);
        }
        const brand = await this.prismaService.brand.update({
            where: { id: Number(id) },
            data: {
                name: dto?.name,
                description: dto?.description,
                img: img_name === '' ? undefined : img_name,
            },
        });
        return brand;
    }

    async getList(filters?: { brandId?: number }, sort?: string[] | any, range?: any) {
        const count = await this.prismaService.brand.count({});
        const brands = await this.prismaService.brand.findMany({
            orderBy: {
                id: sort[0] === 'id' ? sort[1].toLowerCase() : undefined,
                name: sort[0] === 'name' ? sort[1].toLowerCase() : undefined,
            },
            take: range[0],
            skip: range[1],
        });
        return { brands, count };
    }

    async getOne(id: number) {
        if (!id) throw new BadRequestException('Не верный формат id');
        const brand = await this.prismaService.brand.findUnique({ where: { id } });
        return brand;
    }
    private async getOneByName(name: string) {
        if (!name) {
            return null;
        }
        const brand = await this.prismaService.brand.findUnique({ where: { name } });
        return brand;
    }

    async getMany(ids: number[]) {
        const brands = await this.prismaService.brand.findMany({ where: { id: { in: [...ids] } } });
        return brands;
    }

    async delete(id: number) {
        const del = await this.prismaService.brand.delete({ where: { id } });
        return del;
    }
    async deleteMany(ids: number[]) {
        await this.prismaService.brand.deleteMany({ where: { id: { in: [...ids] } } });
        return ids;
    }
}
