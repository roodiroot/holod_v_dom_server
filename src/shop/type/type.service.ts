import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';

import { CreateTypeDto } from './dto';
import { FilesService } from 'src/files/files.service';

@Injectable()
export class TypeService {
    constructor(private prismaService: PrismaService, private filesService: FilesService) {}

    async create(dto: CreateTypeDto, img?: Express.Multer.File) {
        const curent_name = await this.getOneByName(dto.name);
        if (curent_name) {
            throw new BadRequestException('Тип с таким именем уже существует');
        }
        let img_name = '';
        if (img) {
            img_name = await this.filesService.createFile(img);
        }
        const type = await this.prismaService.type.upsert({
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
        return type;
    }

    async update(id: string, dto: any, img?: Express.Multer.File) {
        if (dto?.name) {
            const curent_name = await this.getOneByName(dto.name);
            if (curent_name && curent_name?.id !== Number(id))
                throw new BadRequestException('Тип с таким именем уже существует');
        }
        let img_name = '';
        if (img) img_name = await this.filesService.createFile(img);
        const type = await this.prismaService.type.update({
            where: { id: Number(id) },
            data: {
                name: dto?.name ?? undefined,
                description: dto?.description ?? undefined,
                img: img_name === '' ? undefined : img_name,
            },
        });
        return type;
    }

    async getList(filters?: { typeId?: number }, sort?: string[] | any, range?: any) {
        const options = {
            orderBy: {
                id: sort[0] === 'id' ? sort[1].toLowerCase() : undefined,
                name: sort[0] === 'name' ? sort[1].toLowerCase() : undefined,
            },
            take: range[0],
            skip: range[1],
        };
        const count = await this.prismaService.type.count(options);
        const types = await this.prismaService.type.findMany(options);
        return { types, count };
    }

    async getOne(id: number) {
        if (!id) throw new BadRequestException('Не верный формат id');
        const type = await this.prismaService.type.findUnique({ where: { id } });
        return type;
    }
    private async getOneByName(name: string) {
        if (!name) {
            return null;
        }
        const type = await this.prismaService.type.findUnique({ where: { name } });
        return type;
    }

    async getMany(ids: number[]) {
        const types = await this.prismaService.type.findMany({ where: { id: { in: [...ids] } } });
        return types;
    }

    async delete(id: number) {
        const del = await this.prismaService.type.delete({ where: { id } });
        return del;
    }
    async deleteMany(ids: number[]) {
        await this.prismaService.type.deleteMany({ where: { id: { in: [...ids] } } });
        return ids;
    }
}
